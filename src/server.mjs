// ParallelCS, single self-updating Cloud Run service.
// Fastify 5, ESM, no API keys. Scales to zero; a page request lazily triggers
// a decoupled weekly self-update without blocking page serving.
import { randomBytes } from 'node:crypto';
import Fastify from 'fastify';
import { env } from './lib/env.mjs';
import { loggerOptions } from './lib/logger.mjs';
import { getCurriculum, getState } from './lib/curriculum.mjs';
import { bucketReachable } from './lib/gcs.mjs';
import { maybeTriggerUpdate, runUpdateNow } from './lib/update.mjs';
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
} from './views/index.mjs';
import { pitchPage } from './views/pitch.mjs';
import { pitchCloPage } from './views/pitch-clo.mjs';

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
const HTML_ROUTES = new Set(['/', '/start', '/tracks', '/graph', '/projects', '/challenge', '/status', '/ready']);
function isPageRoute(url) {
  const path = url.split('?')[0];
  return HTML_ROUTES.has(path) || path.startsWith('/track/');
}

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
        'Pick one track, ship one product. Begin with our recommendation, run the first four weeks with a cohort, or go solo. There is no wrong door.',
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
        'Eight 12-week tracks. Pick one and start learning today, frontier AI engineering, knowledge-graph-routed through the best free material on Earth.',
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
      title: 'Kickstart, weeks 1-4 of your track, ParallelCS',
      description: 'The kickstart is the first four weeks of any track, run with a cohort so you start strong and ship a first milestone.',
      path: '/challenge',
      bodyHtml: challengeView(curriculum),
      nonce: req.cspNonce,
    }),
  );
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
  reply.code(err.statusCode && err.statusCode < 500 ? err.statusCode : 500);
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
