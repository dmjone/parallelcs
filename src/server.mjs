// ParallelCS, single self-updating Cloud Run service.
// Fastify 5, ESM, no API keys. Scales to zero; a page request lazily triggers
// a decoupled weekly self-update without blocking page serving.
import { randomBytes, timingSafeEqual } from 'node:crypto';
import Fastify from 'fastify';
import { env } from './lib/env.mjs';
import { loggerOptions } from './lib/logger.mjs';
import { getCurriculum, getState } from './lib/curriculum.mjs';
import { bucketReachable } from './lib/gcs.mjs';
import { maybeTriggerUpdate, runUpdateNow } from './lib/update.mjs';
import { captureError } from './lib/errors.mjs';
import {
  page,
  homeView,
  startView,
  tracksView,
  trackView,
  graphView,
  projectsView,
  challengeView,
  notFoundView,
  statusView,
  readyView,
  learnView,
} from './views/index.mjs';
import { pitchPage } from './views/pitch.mjs';
import { pitchCloPage } from './views/pitch-clo.mjs';
import { getDeepDive } from './lib/deepdive.mjs';
import { foundationsHomeView, foundationsWeekView, FOUNDATIONS_CSS } from './views/foundations.mjs';
import { getFoundations, getWeek } from './lib/foundations.mjs';
import { coachReply } from './lib/coach.mjs';
import {
  getResourceExplainer,
  getReflectionPrompts,
  reviewArtifact,
} from './lib/foundations-ai.mjs';

const app = Fastify({
  logger: loggerOptions,
  trustProxy: true, // behind Cloud Run + Cloudflare proxy
  disableRequestLogging: false,
});

// --- Security headers + per-response CSP nonce ----------------------------
// Page routes only, /health* and other non-HTML responses skip the gate but
// still get the baseline security headers.
app.addHook('onRequest', async (req, reply) => {
  const nonce = randomBytes(16).toString('base64');
  req.cspNonce = nonce;

  reply.headers({
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    'Content-Security-Policy': [
      "default-src 'self'",
      "base-uri 'none'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "img-src 'self' data:",
      "font-src 'self'",
      "connect-src 'self'",
      `style-src 'self' 'nonce-${nonce}'`,
      `script-src 'self' 'nonce-${nonce}'`,
      'upgrade-insecure-requests',
    ].join('; '),
  });
});

// --- Self-update gate (page routes only) ----------------------------------
const HTML_ROUTES = new Set(['/', '/start', '/tracks', '/graph', '/projects', '/challenge', '/status', '/ready', '/foundations']);
// Bare Foundations week page only. The Phase 2.5 sub-paths
// (/foundations/week/N/explain, /foundations/week/N/reflect) are JSON endpoints
// and must NOT pay the self-update gate cost.
const FOUNDATIONS_WEEK_PAGE_RE = /^\/foundations\/week\/\d+$/;
function isPageRoute(url) {
  const path = url.split('?')[0];
  // /foundations/coach and /foundations/review are JSON POST endpoints, not
  // pages; never self-update gate them.
  if (path === '/foundations/coach') return false;
  if (path === '/foundations/review') return false;
  return (
    HTML_ROUTES.has(path) ||
    path.startsWith('/track/') ||
    path.startsWith('/learn/') ||
    FOUNDATIONS_WEEK_PAGE_RE.test(path)
  );
}

// --- Per-IP token bucket guarding the model-backed /learn route ----------
// Cheap, in-memory (single instance, maxScale=1). Cached deep-dives are served
// freely; this only throttles bursts that could trigger live generation or
// abuse the endpoint. Refills to LEARN_BURST tokens over LEARN_WINDOW_MS.
const LEARN_BURST = 20;
const LEARN_WINDOW_MS = 60_000;
const learnBuckets = new Map();
function learnAllowed(ip) {
  const now = Date.now();
  const b = learnBuckets.get(ip) || { tokens: LEARN_BURST, at: now };
  const refill = ((now - b.at) / LEARN_WINDOW_MS) * LEARN_BURST;
  b.tokens = Math.min(LEARN_BURST, b.tokens + refill);
  b.at = now;
  if (b.tokens < 1) {
    learnBuckets.set(ip, b);
    return false;
  }
  b.tokens -= 1;
  learnBuckets.set(ip, b);
  // Bound memory: drop the map if it grows unreasonably (single instance).
  if (learnBuckets.size > 5000) learnBuckets.clear();
  return true;
}

// --- Per-IP token bucket guarding the Foundations Socratic coach ---------
// Same shape as learnAllowed but a separate Map: a learner working through a
// week can exchange more turns with the coach than they would hit /learn pages,
// and the burst/window are tuned for short back-and-forth chat.
const COACH_BURST = 30;
const COACH_WINDOW_MS = 60_000;
const coachBuckets = new Map();
function coachAllowed(ip) {
  const now = Date.now();
  const b = coachBuckets.get(ip) || { tokens: COACH_BURST, at: now };
  const refill = ((now - b.at) / COACH_WINDOW_MS) * COACH_BURST;
  b.tokens = Math.min(COACH_BURST, b.tokens + refill);
  b.at = now;
  if (b.tokens < 1) {
    coachBuckets.set(ip, b);
    return false;
  }
  b.tokens -= 1;
  coachBuckets.set(ip, b);
  if (coachBuckets.size > 5000) coachBuckets.clear();
  return true;
}

// --- Per-IP token bucket guarding the Foundations AI surfaces ------------
// Shared across the explainer, reflection prompts and artifact review JSON
// endpoints. Explainer and reflection both hit a per-week GCS cache so most
// traffic never touches the model, but the bucket still bounds the burst that
// could trigger live generation or abuse the artifact review (which is never
// cached). Same shape as learnAllowed / coachAllowed.
const AI_BURST = 20;
const AI_WINDOW_MS = 60_000;
const aiBuckets = new Map();
function aiAllowed(ip) {
  const now = Date.now();
  const b = aiBuckets.get(ip) || { tokens: AI_BURST, at: now };
  const refill = ((now - b.at) / AI_WINDOW_MS) * AI_BURST;
  b.tokens = Math.min(AI_BURST, b.tokens + refill);
  b.at = now;
  if (b.tokens < 1) {
    aiBuckets.set(ip, b);
    return false;
  }
  b.tokens -= 1;
  aiBuckets.set(ip, b);
  if (aiBuckets.size > 5000) aiBuckets.clear();
  return true;
}

// --- Cloudflare edge gate -------------------------------------------------
// Cloud Run exposes a direct *.run.app URL that bypasses Cloudflare. When
// CF_EDGE_SECRET is set, Cloudflare injects the same value via the
// `cf-edge-secret` header on every proxied request, and we reject anything
// arriving without it. The compare is constant time. Empty secret disables the
// gate entirely, which is the safe rollout default. Probes, the internal
// refresh route (own REFRESH_KEY guard) and the curriculum JSON skip the gate
// so health checks and cache warmers keep working.
const CF_GATE_SKIP = new Set([
  '/__internal/refresh',
  '/health',
  '/health/ready',
  '/favicon.ico',
  '/api/curriculum',
]);

function cfGateSkip(url) {
  const path = url.split('?')[0];
  return CF_GATE_SKIP.has(path);
}

function cfSecretMatches(headerVal, expected) {
  if (typeof headerVal !== 'string' || headerVal.length === 0) return false;
  const a = Buffer.from(headerVal);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

app.addHook('preHandler', async (req, reply) => {
  if (!env.CF_EDGE_SECRET) return;
  if (cfGateSkip(req.url)) return;
  const supplied = req.headers['cf-edge-secret'];
  if (!cfSecretMatches(supplied, env.CF_EDGE_SECRET)) {
    reply
      .code(403)
      .header('Cache-Control', 'no-store')
      .type('text/plain; charset=utf-8')
      .send('forbidden');
    return reply;
  }
});

app.addHook('preHandler', async (req) => {
  // Health probes, the JSON/pitch endpoints and the internal refresh route
  // must not pay the gate cost; the gate is for human-facing curriculum pages.
  if (!isPageRoute(req.url)) return;
  // maybeTriggerUpdate never throws and is fast, it only fires a decoupled
  // background refresh when the week is stale; it never runs Vertex inline.
  await maybeTriggerUpdate(req.log, req);
});

// --- Helpers --------------------------------------------------------------
function html(reply, body) {
  reply.type('text/html; charset=utf-8').send(body);
}

// --- Routes ---------------------------------------------------------------
app.get('/', async (req, reply) => {
  const curriculum = await getCurriculum();
  const body = page({
    title: 'ParallelCS, AI-native CS curriculum',
    description:
      'A self-updating, product-centric computer science curriculum for the AI-native era.',
    path: '/',
    bodyHtml: homeView(curriculum),
    nonce: req.cspNonce,
  });
  html(reply, body);
});

app.get('/start', async (req, reply) => {
  const curriculum = await getCurriculum();
  html(
    reply,
    page({
      title: 'Start here, ParallelCS',
      description:
        'Pick one track, ship one product. Begin with our recommendation, start your first 30 days with a cohort, or go solo. There is no wrong door.',
      path: '/start',
      bodyHtml: startView(curriculum),
      nonce: req.cspNonce,
    }),
  );
});

app.get('/tracks', async (req, reply) => {
  const curriculum = await getCurriculum();
  html(
    reply,
    page({
      title: 'Tracks, ParallelCS',
      description:
        'Eight tracks. Pick one and ship a real, public product, knowledge-graph-routed through the best free material on Earth.',
      path: '/tracks',
      bodyHtml: tracksView(curriculum),
      nonce: req.cspNonce,
    }),
  );
});

app.get('/track/:id', async (req, reply) => {
  const curriculum = await getCurriculum();
  const track = curriculum.tracks.find((t) => t.id === req.params.id);
  if (!track) {
    reply.code(404);
    return html(
      reply,
      page({
        title: 'Not found, ParallelCS',
        description: 'The page you requested does not exist.',
        path: req.url,
        bodyHtml: notFoundView(),
        nonce: req.cspNonce,
      }),
    );
  }
  html(
    reply,
    page({
      title: `${track.title}, ParallelCS`,
      description: track.tagline,
      path: `/track/${track.id}`,
      bodyHtml: trackView(curriculum, track),
      nonce: req.cspNonce,
    }),
  );
});

// Per-concept study notes. Input is a concept id from our own closed set (never
// free user text), so this cannot be used as a general model proxy. Output is
// cached in GCS and escaped before render. Rate limited per IP.
app.get('/learn/:conceptId', async (req, reply) => {
  if (!learnAllowed(req.ip)) {
    reply.code(429).header('Retry-After', '30').header('Cache-Control', 'no-store');
    return html(
      reply,
      page({
        title: 'Slow down, ParallelCS',
        description: 'Too many requests.',
        path: req.url,
        bodyHtml: notFoundView(),
        nonce: req.cspNonce,
      }),
    );
  }
  const curriculum = await getCurriculum();
  const concept = curriculum.concepts.find((c) => c.id === req.params.conceptId);
  const track = concept && curriculum.tracks.find((t) => t.id === concept.trackId);
  if (!concept || !track) {
    reply.code(404);
    return html(
      reply,
      page({
        title: 'Not found, ParallelCS',
        description: 'The page you requested does not exist.',
        path: req.url,
        bodyHtml: notFoundView(),
        nonce: req.cspNonce,
      }),
    );
  }
  // Never let a generation failure break the page; learnView handles null.
  let deep = null;
  try {
    deep = await getDeepDive(concept, track.title);
  } catch {
    deep = null;
  }
  html(
    reply,
    page({
      title: `${concept.title}, study notes, ParallelCS`,
      description: concept.summary.slice(0, 180),
      path: `/learn/${concept.id}`,
      bodyHtml: learnView({ curriculum, concept, track, deep }),
      nonce: req.cspNonce,
    }),
  );
});

app.get('/graph', async (req, reply) => {
  const curriculum = await getCurriculum();
  html(
    reply,
    page({
      title: 'Knowledge graph, ParallelCS',
      description: 'How every concept in the ParallelCS curriculum connects.',
      path: '/graph',
      bodyHtml: graphView(curriculum),
      nonce: req.cspNonce,
    }),
  );
});

app.get('/projects', async (req, reply) => {
  const curriculum = await getCurriculum();
  html(
    reply,
    page({
      title: 'Projects, ParallelCS',
      description: 'Production-grade, deployable projects you orchestrate with AI, each bridged to a classic CS subject.',
      path: '/projects',
      bodyHtml: projectsView(curriculum),
      nonce: req.cspNonce,
    }),
  );
});

app.get('/challenge', async (req, reply) => {
  const curriculum = await getCurriculum();
  html(
    reply,
    page({
      title: 'The 30-Day Challenge, ParallelCS',
      description: 'Your first 30 days: join a free cohort on Discord, take the mandate, and ship your first real product in the open.',
      path: '/challenge',
      bodyHtml: challengeView(curriculum),
      nonce: req.cspNonce,
    }),
  );
});

// --- Foundations on-ramp -------------------------------------------------
// A separate concept from the eight tracks: a linear 12-week path that takes a
// third-semester student to "AI builder" through curated free material and one
// shipped artifact per week. The coach is a Socratic guardrail, never an
// explainer, and degrades to a static "go read the resource" message when the
// in-house LLM is unreachable.
app.get('/foundations', async (req, reply) => {
  const foundations = getFoundations();
  html(
    reply,
    page({
      title: 'Foundations, ParallelCS',
      description:
        'From third semester to AI builder. A free 12 week path of curated free world-class material with one shipped artifact per week.',
      path: '/foundations',
      bodyHtml: foundationsHomeView(foundations),
      nonce: req.cspNonce,
      extraStyles: FOUNDATIONS_CSS,
    }),
  );
});

app.get('/foundations/week/:n', async (req, reply) => {
  const n = Number.parseInt(req.params.n, 10);
  const valid = Number.isInteger(n) && n >= 1 && n <= 12 && String(n) === String(req.params.n).trim();
  const week = valid ? getWeek(n) : null;
  if (!week) {
    reply.code(404);
    return html(
      reply,
      page({
        title: 'Not found, ParallelCS',
        description: 'The page you requested does not exist.',
        path: req.url,
        bodyHtml: notFoundView(),
        nonce: req.cspNonce,
      }),
    );
  }
  const foundations = getFoundations();

  // Pre-fetch the AI explainer + reflection prompts on coach-on weeks only.
  // Gate weeks (coach-off-micro-checkpoint, final-gate) skip the fetch
  // entirely; the helpers throw on those weeks by design. CRITICAL: this
  // pre-fetch passes { cacheOnly: true } so a cold cache returns the static
  // fallback synchronously without calling ZS. The dedicated /explain and
  // /reflect JSON routes are the ONLY surfaces that may trigger live ZS
  // generation, and they are rate-limited via aiAllowed. Without cacheOnly,
  // a flood of cold-cache page renders bypasses every rate limit.
  let opts = { explainerHtml: '', reflectionPrompts: [] };
  const kind = week.checkpointKind;
  if (kind !== 'coach-off-micro-checkpoint' && kind !== 'final-gate') {
    try {
      const [exp, refl] = await Promise.all([
        getResourceExplainer(week, { cacheOnly: true }),
        getReflectionPrompts(week, { cacheOnly: true }),
      ]);
      opts = {
        explainerHtml: (exp && typeof exp.html === 'string') ? exp.html : '',
        reflectionPrompts: (refl && Array.isArray(refl.prompts)) ? refl.prompts : [],
      };
    } catch (err) {
      req.log.warn({ err, week: week.week }, 'foundations week page ai pre-fetch failed');
      opts = { explainerHtml: '', reflectionPrompts: [] };
    }
  }

  html(
    reply,
    page({
      title: `Week ${week.week}, ${week.theme}, Foundations, ParallelCS`,
      description: week.objective,
      path: `/foundations/week/${week.week}`,
      bodyHtml: foundationsWeekView(week, foundations, req.cspNonce, opts),
      nonce: req.cspNonce,
      extraStyles: FOUNDATIONS_CSS,
    }),
  );
});

// --- Foundations AI: per-week resource explainer (JSON) -------------------
// Cached per (week, primary resource URL) in GCS. Cache hits are public/SWR;
// misses (and degraded fallbacks) are no-store. Gate weeks 4, 8, 12 return
// 404 because the surface must not exist on coach-off weeks.
app.get('/foundations/week/:n/explain', async (req, reply) => {
  const n = Number.parseInt(req.params.n, 10);
  const valid = Number.isInteger(n) && n >= 1 && n <= 12 && String(n) === String(req.params.n).trim();
  const week = valid ? getWeek(n) : null;
  if (!week) {
    reply.code(404);
    return html(
      reply,
      page({
        title: 'Not found, ParallelCS',
        description: 'The page you requested does not exist.',
        path: req.url,
        bodyHtml: notFoundView(),
        nonce: req.cspNonce,
      }),
    );
  }
  if (week.checkpointKind === 'coach-off-micro-checkpoint' || week.checkpointKind === 'final-gate') {
    reply.code(404);
    return html(
      reply,
      page({
        title: 'Not found, ParallelCS',
        description: 'The page you requested does not exist.',
        path: req.url,
        bodyHtml: notFoundView(),
        nonce: req.cspNonce,
      }),
    );
  }
  if (!aiAllowed(req.ip)) {
    reply.code(429).header('Retry-After', '30').header('Cache-Control', 'no-store');
    return { error: 'rate_limited' };
  }
  try {
    const result = await getResourceExplainer(week);
    const cacheControl = result.cached
      ? 'public, max-age=600, stale-while-revalidate=600'
      : 'no-store';
    reply.header('Cache-Control', cacheControl);
    return {
      html: result.html,
      cached: result.cached,
      degraded: result.degraded,
      week: n,
    };
  } catch (err) {
    req.log.error({ err, week: n }, 'foundations explainer failed');
    reply.code(500).header('Cache-Control', 'no-store');
    return { error: 'explain_unavailable' };
  }
});

// --- Foundations AI: per-week retrieval-style reflection prompts (JSON) ---
// Same cache + gate + rate-limit shape as the explainer. Cache-Control mirrors
// the explainer for consistency since both are per-week cacheable.
app.get('/foundations/week/:n/reflect', async (req, reply) => {
  const n = Number.parseInt(req.params.n, 10);
  const valid = Number.isInteger(n) && n >= 1 && n <= 12 && String(n) === String(req.params.n).trim();
  const week = valid ? getWeek(n) : null;
  if (!week) {
    reply.code(404);
    return html(
      reply,
      page({
        title: 'Not found, ParallelCS',
        description: 'The page you requested does not exist.',
        path: req.url,
        bodyHtml: notFoundView(),
        nonce: req.cspNonce,
      }),
    );
  }
  if (week.checkpointKind === 'coach-off-micro-checkpoint' || week.checkpointKind === 'final-gate') {
    reply.code(404);
    return html(
      reply,
      page({
        title: 'Not found, ParallelCS',
        description: 'The page you requested does not exist.',
        path: req.url,
        bodyHtml: notFoundView(),
        nonce: req.cspNonce,
      }),
    );
  }
  if (!aiAllowed(req.ip)) {
    reply.code(429).header('Retry-After', '30').header('Cache-Control', 'no-store');
    return { error: 'rate_limited' };
  }
  try {
    const result = await getReflectionPrompts(week);
    const cacheControl = result.cached
      ? 'public, max-age=600, stale-while-revalidate=600'
      : 'no-store';
    reply.header('Cache-Control', cacheControl);
    return {
      prompts: result.prompts,
      cached: result.cached,
      degraded: result.degraded,
      week: n,
    };
  } catch (err) {
    req.log.error({ err, week: n }, 'foundations reflect failed');
    reply.code(500).header('Cache-Control', 'no-store');
    return { error: 'reflect_unavailable' };
  }
});

// --- Foundations AI: Socratic artifact review (JSON) ----------------------
// Per-student input, never cached. Hard 8000-char cap on readmeText. Gate
// check runs BEFORE the rate-limit so a request on a coach-off week is a
// clean 403, not a 429. NEVER throws to the client; unexpected failure is a
// 500 with a generic body.
app.post('/foundations/review', async (req, reply) => {
  reply.header('Cache-Control', 'no-store');
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const weekNum = Number.parseInt(body.week, 10);
  if (!Number.isInteger(weekNum) || weekNum < 1 || weekNum > 12) {
    reply.code(400);
    return { error: 'invalid week' };
  }
  // Form posts {week, readme}; the helper accepts {readmeText}. The route is
  // the only translation layer so the view contract and the lib contract stay
  // independently maintainable.
  const readmeText = body.readme;
  if (typeof readmeText !== 'string' || readmeText.length > 8000) {
    reply.code(400);
    return { error: 'readme too large or missing' };
  }
  const weekObj = getWeek(weekNum);
  if (!weekObj) {
    reply.code(400);
    return { error: 'invalid week' };
  }
  if (weekObj.checkpointKind === 'coach-off-micro-checkpoint' || weekObj.checkpointKind === 'final-gate') {
    reply.code(403);
    return { error: 'coach locked on this week' };
  }
  if (!aiAllowed(req.ip)) {
    reply.code(429).header('Retry-After', '30');
    return { error: 'rate_limited' };
  }
  try {
    const result = await reviewArtifact({ week: weekObj, readmeText });
    return {
      feedback: result.feedback,
      degraded: result.degraded,
      week: weekNum,
    };
  } catch (err) {
    req.log.error({ err, week: weekNum }, 'foundations review failed');
    reply.code(500);
    return { error: 'review_unavailable' };
  }
});

// Socratic coach endpoint. JSON in, JSON out. Never throws; never proxies
// arbitrary text to the model without validation and rate limiting. When the
// in-house LLM is unreachable (no ZS_API_KEY locally), coachReply returns a
// degraded static reply, so this endpoint stays a 200.
app.post('/foundations/coach', async (req, reply) => {
  reply.header('Cache-Control', 'no-store');
  if (!coachAllowed(req.ip)) {
    reply.code(429).header('Retry-After', '30');
    return { error: 'rate_limited' };
  }
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const week = Number.parseInt(body.week, 10);
  if (!Number.isInteger(week) || week < 1 || week > 12) {
    reply.code(400);
    return { error: 'invalid week' };
  }
  const messages = Array.isArray(body.messages) ? body.messages : null;
  if (!messages) {
    reply.code(400);
    return { error: 'invalid messages' };
  }
  for (const m of messages) {
    if (!m || typeof m !== 'object') {
      reply.code(400);
      return { error: 'invalid messages' };
    }
    if (typeof m.role !== 'string' || typeof m.content !== 'string') {
      reply.code(400);
      return { error: 'invalid messages' };
    }
    if (m.content.length > 2000) {
      reply.code(400);
      return { error: 'message too long' };
    }
  }
  try {
    const result = await coachReply({ weekNumber: week, messages, foundations: getFoundations() });
    return {
      reply: result.reply,
      degraded: result.degraded,
      week,
      model: result.model,
    };
  } catch (err) {
    req.log.error({ err }, 'foundations coach failed');
    reply.code(500);
    return { error: 'coach_unavailable' };
  }
});

app.get('/status', async (req, reply) => {
  const [curriculum, state] = await Promise.all([getCurriculum(), getState()]);
  html(
    reply,
    page({
      title: 'Self-update status, ParallelCS',
      description: 'The last self-update result for the ParallelCS curriculum.',
      path: '/status',
      bodyHtml: statusView(state, curriculum),
      nonce: req.cspNonce,
    }),
  );
});

app.get('/ready', async (req, reply) => {
  html(
    reply,
    page({
      title: 'Are you ready?, ParallelCS',
      description: 'ParallelCS is a deep, elite AI-builder path. Check the prerequisites before you start.',
      path: '/ready',
      bodyHtml: readyView(),
      nonce: req.cspNonce,
    }),
  );
});

app.get('/pitch', async (req, reply) => {
  const curriculum = await getCurriculum();
  html(reply, pitchPage(req.cspNonce, curriculum));
});

// CLO briefing, pitch pathway tuned for the academic review audience.
app.get('/pitch-clo', async (req, reply) => {
  const curriculum = await getCurriculum();
  html(reply, pitchCloPage(req.cspNonce, curriculum));
});

app.get('/api/curriculum', async (_req, reply) => {
  const curriculum = await getCurriculum();
  reply
    .header('Cache-Control', 'public, max-age=300, stale-while-revalidate=600')
    .send(curriculum);
});

// Favicon, served for browsers that probe /favicon.ico directly (the pages
// also carry an inline data-URI icon). Inline SVG, no external asset.
const FAVICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">' +
  '<rect width="32" height="32" rx="8" fill="#3b35e0"/>' +
  '<text x="16" y="23" font-size="17" font-weight="800" ' +
  'font-family="Verdana,sans-serif" fill="#ffffff" text-anchor="middle">//</text></svg>';
app.get('/favicon.ico', async (_req, reply) => {
  reply
    .type('image/svg+xml')
    .header('Cache-Control', 'public, max-age=86400')
    .send(FAVICON_SVG);
});

// Shallow liveness, no I/O, used to confirm the process is up.
app.get('/health', async (_req, reply) => {
  reply.header('Cache-Control', 'no-store').send({ status: 'ok' });
});

// Deep readiness, confirms the GCS bucket is reachable.
app.get('/health/ready', async (_req, reply) => {
  try {
    const ok = await bucketReachable();
    if (!ok) {
      reply.code(503).header('Cache-Control', 'no-store').send({ status: 'unready', reason: 'bucket' });
      return;
    }
    reply.header('Cache-Control', 'no-store').send({ status: 'ready' });
  } catch {
    reply.code(503).header('Cache-Control', 'no-store').send({ status: 'unready', reason: 'gcs' });
  }
});

// Internal weekly self-refresh. Triggered fire-and-forget by a page request;
// runs the heavy grounded, max-thinking Vertex pass to completion on its own
// request budget. Lock-guarded, at most one real update per IST week.
app.get('/__internal/refresh', async (req, reply) => {
  if (env.REFRESH_KEY && req.headers['x-refresh-key'] !== env.REFRESH_KEY) {
    reply.code(403).header('Cache-Control', 'no-store').send({ status: 'forbidden' });
    return;
  }
  const result = await runUpdateNow(req.log);
  reply.header('Cache-Control', 'no-store').send({ status: result });
});

// --- 404 + error handling -------------------------------------------------
app.setNotFoundHandler(async (req, reply) => {
  reply.code(404);
  html(
    reply,
    page({
      title: 'Not found, ParallelCS',
      description: 'The page you requested does not exist.',
      path: req.url,
      bodyHtml: notFoundView(),
      nonce: req.cspNonce,
    }),
  );
});

app.setErrorHandler(async (err, req, reply) => {
  // Log full detail server-side; never leak stack traces to the client.
  req.log.error({ err }, 'request failed');
  const statusCode = err.statusCode && err.statusCode < 500 ? err.statusCode : 500;
  // Fire and forget: best-effort Sentry report, never blocks the response and
  // never throws. No-op when SENTRY_DSN is empty.
  void captureError(err, {
    tags: { url: req.url, method: req.method },
    extra: { statusCode },
  });
  reply.code(statusCode);
  html(
    reply,
    page({
      title: 'Something went wrong, ParallelCS',
      description: 'An unexpected error occurred.',
      path: req.url,
      bodyHtml: notFoundView(),
      nonce: req.cspNonce ?? randomBytes(16).toString('base64'),
    }),
  );
});

// --- Boot -----------------------------------------------------------------
try {
  await app.listen({ host: '0.0.0.0', port: env.PORT });
} catch (err) {
  app.log.error({ err }, 'failed to start server');
  process.exit(1);
}

// Graceful shutdown so Cloud Run can drain in-flight requests cleanly.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    app.log.info({ signal }, 'shutting down');
    await app.close();
    process.exit(0);
  });
}
