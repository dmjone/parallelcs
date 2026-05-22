// Weekly agentic curriculum-evolution engine, decoupled from page serving.
//
// A page request only TRIGGERS the update (a fast, fire-and-forget call to the
// service's own /__internal/refresh endpoint) and is never blocked by it. The
// heavy three-step agentic harness (research -> propose -> self-verify) runs
// inside that internal request, which keeps Cloud Run CPU allocated throughout.
//
// At most one real update runs per IST week, enforced by a state-week check and
// an atomic GCS lock. The model's proposed diff is applied only through hard
// deterministic guardrails (change caps, floors, schema + referential checks),
// and the previous curriculum is backed up to GCS before any commit. Everything
// is wrapped in try/catch: a slow or failed update can never break page serving.
import { CurriculumSchema, ConceptSchema, ProjectSchema, TrackSchema } from './schema.mjs';
import { acquireUpdateLock, writeJson } from './gcs.mjs';
import { getCurriculum, saveCurriculum, getState, saveState } from './curriculum.mjs';
import { env } from './env.mjs';
import { pickBestModel, researchTrends, proposeCurriculumDiff, verifyRevision } from './vertex.mjs';

// Hard wall-clock cap for the whole agentic pass (3 max-thinking calls). The
// internal refresh request runs this long; Cloud Run --timeout must exceed it.
const UPDATE_TIMEOUT_MS = 1_500_000; // 25 min

// How long a page request waits for the self-refresh call to be dispatched.
const TRIGGER_DISPATCH_MS = 4_000;

// --- Guardrails: bound how far one weekly run can move the curriculum --------
const MAX_OPS = 36;          // total operations applied per run
const MAX_TRACK_ADD = 2;     // new tracks per run
const MAX_TRACK_REMOVE = 1;  // retired tracks per run
const FLOOR_TRACKS = 5;      // never fall below this many tracks
const FLOOR_CONCEPTS = 40;   // ...concepts
const FLOOR_PROJECTS = 12;   // ...projects

// Process-local fast path: once we know this week is handled we skip all I/O.
let freshPeriod = '';

/**
 * Current ISO-week key in IST (Asia/Kolkata), e.g. "2026-W21".
 * @returns {string}
 */
export function currentPeriodIST() {
  const ist = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const d = new Date(Date.UTC(ist.getFullYear(), ist.getMonth(), ist.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/**
 * Page-request gate. Fast, non-blocking: if this IST week is not yet updated it
 * fires a decoupled self-refresh and returns. Never throws, never runs Vertex.
 *
 * @param {import('fastify').FastifyBaseLogger} log
 * @param {import('fastify').FastifyRequest} req
 * @returns {Promise<'fresh'|'triggered'|'seeded'|'error'>}
 */
export async function maybeTriggerUpdate(log, req) {
  const period = currentPeriodIST();
  if (freshPeriod === period) return 'fresh';
  try {
    const state = await getState();
    if (state && state.lastUpdateDate === period) {
      freshPeriod = period;
      return 'fresh';
    }
    if (!state) {
      await getCurriculum();
      log.info('curriculum bucket seeded from bundled seed');
    }
    freshPeriod = period;
    await triggerRefresh(log, req);
    return state ? 'triggered' : 'seeded';
  } catch (err) {
    log.warn({ err: String(err && err.message ? err.message : err) }, 'update gate failed');
    return 'error';
  }
}

/**
 * Fire a fast call to the service's own /__internal/refresh endpoint, waiting
 * only long enough to be sure the request was dispatched.
 */
async function triggerRefresh(log, req) {
  const host = req.headers.host;
  if (!host) return;
  const proto = req.protocol || 'https';
  const url = `${proto}://${host}/__internal/refresh`;
  const headers = env.REFRESH_KEY ? { 'x-refresh-key': env.REFRESH_KEY } : {};
  log.info('self-update: triggering decoupled weekly refresh');
  await Promise.race([
    fetch(url, { headers }).then(() => {}, () => {}),
    new Promise((resolve) => setTimeout(resolve, TRIGGER_DISPATCH_MS)),
  ]);
}

/**
 * Internal-refresh handler logic. Runs the agentic harness synchronously inside
 * the /__internal/refresh request. Idempotent and lock-guarded: at most one real
 * run per IST week regardless of how many times it is called.
 *
 * @param {import('fastify').FastifyBaseLogger} log
 * @returns {Promise<'fresh'|'claimed-by-other'|'updated'|'unchanged'|'failed'|'error'>}
 */
export async function runUpdateNow(log) {
  const period = currentPeriodIST();
  try {
    const state = await getState();
    if (state && state.lastUpdateDate === period) return 'fresh';
    await getCurriculum();
    const owned = await acquireUpdateLock(period);
    if (!owned) return 'claimed-by-other';
    return await performUpdate(period, log);
  } catch (err) {
    log.warn({ err: String(err && err.message ? err.message : err) }, 'self-update failed');
    return 'error';
  }
}

/**
 * Apply a proposed operation list to a clone of the curriculum, enforcing every
 * guardrail. Invalid, capped, or floor-breaching operations are skipped, never
 * fatal. Returns the candidate curriculum plus applied/skipped op summaries.
 *
 * @param {import('./schema.mjs').Curriculum} current
 * @param {object[]} operations
 * @returns {{ next: object, applied: string[], skipped: string[] }}
 */
export function applyOps(current, operations) {
  const next = structuredClone(current);
  const applied = [];
  const skipped = [];
  let trackAdd = 0;
  let trackRemove = 0;
  const has = (arr, id) => arr.some((x) => x.id === id);
  const ops = Array.isArray(operations) ? operations.slice(0, 200) : [];

  for (const op of ops) {
    if (applied.length >= MAX_OPS) {
      skipped.push('op cap reached');
      break;
    }
    if (!op || typeof op !== 'object') continue;
    try {
      switch (op.op) {
        case 'addTrack': {
          if (trackAdd >= MAX_TRACK_ADD) { skipped.push('addTrack: cap'); break; }
          const v = TrackSchema.safeParse(op.track);
          if (!v.success) { skipped.push('addTrack: invalid'); break; }
          if (has(next.tracks, v.data.id)) { skipped.push('addTrack: duplicate id'); break; }
          next.tracks.push(v.data);
          trackAdd += 1;
          applied.push(`added track ${v.data.id}`);
          break;
        }
        case 'updateTrack': {
          const v = TrackSchema.safeParse(op.track);
          if (!v.success) { skipped.push('updateTrack: invalid'); break; }
          const i = next.tracks.findIndex((t) => t.id === v.data.id);
          if (i < 0) { skipped.push('updateTrack: unknown id'); break; }
          next.tracks[i] = v.data;
          applied.push(`updated track ${v.data.id}`);
          break;
        }
        case 'removeTrack': {
          if (trackRemove >= MAX_TRACK_REMOVE) { skipped.push('removeTrack: cap'); break; }
          if (!op.reason || !String(op.reason).trim()) { skipped.push('removeTrack: no reason'); break; }
          const tid = op.trackId;
          if (!has(next.tracks, tid)) { skipped.push('removeTrack: unknown id'); break; }
          const losingC = next.concepts.filter((c) => c.trackId === tid);
          const losingP = next.projects.filter((p) => p.trackId === tid);
          if (
            next.tracks.length - 1 < FLOOR_TRACKS ||
            next.concepts.length - losingC.length < FLOOR_CONCEPTS ||
            next.projects.length - losingP.length < FLOOR_PROJECTS
          ) {
            skipped.push('removeTrack: would breach a floor');
            break;
          }
          const goneIds = new Set(losingC.map((c) => c.id));
          next.tracks = next.tracks.filter((t) => t.id !== tid);
          next.concepts = next.concepts.filter((c) => c.trackId !== tid);
          next.projects = next.projects.filter((p) => p.trackId !== tid);
          next.concepts.forEach((c) => { c.prereqs = (c.prereqs || []).filter((p) => !goneIds.has(p)); });
          trackRemove += 1;
          applied.push(`removed track ${tid}`);
          break;
        }
        case 'addConcept': {
          const v = ConceptSchema.safeParse(op.concept);
          if (!v.success) { skipped.push('addConcept: invalid'); break; }
          if (has(next.concepts, v.data.id)) { skipped.push('addConcept: duplicate id'); break; }
          if (!has(next.tracks, v.data.trackId)) { skipped.push('addConcept: unknown trackId'); break; }
          next.concepts.push(v.data);
          applied.push(`added concept ${v.data.id}`);
          break;
        }
        case 'updateConcept': {
          const v = ConceptSchema.safeParse(op.concept);
          if (!v.success) { skipped.push('updateConcept: invalid'); break; }
          const i = next.concepts.findIndex((c) => c.id === v.data.id);
          if (i < 0) { skipped.push('updateConcept: unknown id'); break; }
          if (!has(next.tracks, v.data.trackId)) { skipped.push('updateConcept: unknown trackId'); break; }
          next.concepts[i] = v.data;
          applied.push(`updated concept ${v.data.id}`);
          break;
        }
        case 'removeConcept': {
          if (!op.reason || !String(op.reason).trim()) { skipped.push('removeConcept: no reason'); break; }
          const cid = op.conceptId;
          if (!has(next.concepts, cid)) { skipped.push('removeConcept: unknown id'); break; }
          if (next.concepts.length - 1 < FLOOR_CONCEPTS) { skipped.push('removeConcept: floor'); break; }
          next.concepts = next.concepts.filter((c) => c.id !== cid);
          next.concepts.forEach((c) => { c.prereqs = (c.prereqs || []).filter((p) => p !== cid); });
          applied.push(`removed concept ${cid}`);
          break;
        }
        case 'addProject': {
          const v = ProjectSchema.safeParse(op.project);
          if (!v.success) { skipped.push('addProject: invalid'); break; }
          if (has(next.projects, v.data.id)) { skipped.push('addProject: duplicate id'); break; }
          if (!has(next.tracks, v.data.trackId)) { skipped.push('addProject: unknown trackId'); break; }
          next.projects.push(v.data);
          applied.push(`added project ${v.data.id}`);
          break;
        }
        case 'updateProject': {
          const v = ProjectSchema.safeParse(op.project);
          if (!v.success) { skipped.push('updateProject: invalid'); break; }
          const i = next.projects.findIndex((p) => p.id === v.data.id);
          if (i < 0) { skipped.push('updateProject: unknown id'); break; }
          if (!has(next.tracks, v.data.trackId)) { skipped.push('updateProject: unknown trackId'); break; }
          next.projects[i] = v.data;
          applied.push(`updated project ${v.data.id}`);
          break;
        }
        case 'removeProject': {
          if (!op.reason || !String(op.reason).trim()) { skipped.push('removeProject: no reason'); break; }
          const pid = op.projectId;
          if (!has(next.projects, pid)) { skipped.push('removeProject: unknown id'); break; }
          if (next.projects.length - 1 < FLOOR_PROJECTS) { skipped.push('removeProject: floor'); break; }
          next.projects = next.projects.filter((p) => p.id !== pid);
          applied.push(`removed project ${pid}`);
          break;
        }
        default:
          skipped.push(`unknown op: ${op.op}`);
      }
    } catch {
      skipped.push('op application error');
    }
  }

  // Final referential cleanup: drop any prereq pointing at a missing concept.
  const conceptIds = new Set(next.concepts.map((c) => c.id));
  next.concepts.forEach((c) => { c.prereqs = (c.prereqs || []).filter((p) => conceptIds.has(p)); });
  return { next, applied, skipped };
}

/**
 * Run the three-step agentic harness and persist the result.
 * Assumes the weekly lock is already held by this instance.
 *
 * @param {string} period ISO-week key
 * @param {import('fastify').FastifyBaseLogger} log
 * @returns {Promise<'updated'|'unchanged'|'failed'>}
 */
async function performUpdate(period, log) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPDATE_TIMEOUT_MS);
  const current = await getCurriculum();

  /** @type {import('./schema.mjs').State} */
  const state = {
    lastUpdateDate: period,
    lastVersion: current.version,
    lastRunAt: new Date().toISOString(),
    lastResult: 'failed',
    note: '',
  };

  try {
    const model = await pickBestModel(controller.signal);

    // STEP 1, research the landscape.
    log.info({ model }, 'self-update: agentic harness, researching trends');
    const findings = await researchTrends(
      model, current, `the curriculum was last revised ${current.generatedAt}`, controller.signal,
    );
    if (!findings) {
      state.lastResult = 'unchanged';
      state.note = `Research returned no findings (model: ${model}).`;
      await saveState(state);
      return 'unchanged';
    }

    // STEP 2, propose a typed diff.
    log.info('self-update: proposing curriculum diff');
    const proposal = await proposeCurriculumDiff(model, current, findings, controller.signal);
    if (proposal.noChange) {
      state.lastResult = 'unchanged';
      state.lastVersion = current.version;
      state.note = `No curriculum change warranted this week (model: ${model}).`;
      await saveState(state);
      log.info('self-update: curriculum unchanged');
      return 'unchanged';
    }

    // Apply the diff through the guardrails.
    const { next, applied, skipped } = applyOps(current, proposal.operations);
    if (applied.length === 0) {
      state.lastResult = 'unchanged';
      state.lastVersion = current.version;
      state.note = 'Proposed operations did not pass the guardrails; curriculum unchanged.';
      await saveState(state);
      log.warn({ skipped: skipped.slice(0, 8) }, 'self-update: all operations skipped');
      return 'unchanged';
    }

    const nextVersion = current.version + 1;
    next.version = nextVersion;
    next.generatedAt = new Date().toISOString();
    const summary = `${proposal.summary} (${applied.length} change(s) applied${
      skipped.length ? `, ${skipped.length} skipped by guardrails` : ''
    }).`;
    next.changelog = [
      { date: new Date().toISOString().slice(0, 10), version: nextVersion, summary },
      ...current.changelog,
    ].slice(0, 50);

    // Validate the whole revised curriculum before trusting it.
    const parsed = CurriculumSchema.safeParse(next);
    if (!parsed.success) {
      state.note = `Revised curriculum failed validation: ${parsed.error.issues
        .slice(0, 3)
        .map((i) => i.path.join('.'))
        .join(', ')}`;
      await saveState(state);
      log.warn({ note: state.note }, 'self-update: invalid revision, kept current');
      return 'failed';
    }

    // STEP 3, strict self-verification.
    log.info('self-update: self-verifying the revision');
    const verdict = await verifyRevision(model, current, parsed.data, summary, controller.signal);
    if (!verdict.approved) {
      state.note = `Self-verifier rejected the revision: ${verdict.reason}`.slice(0, 350);
      await saveState(state);
      log.warn({ note: state.note }, 'self-update: verifier rejected, kept current');
      return 'failed';
    }

    // Back up the current curriculum before committing, every change recoverable.
    try {
      await writeJson(`content/backups/curriculum-v${current.version}-${Date.now()}.json`, current);
    } catch {
      log.warn('self-update: backup write failed; continuing');
    }

    await saveCurriculum(parsed.data);
    state.lastResult = 'updated';
    state.lastVersion = nextVersion;
    state.note = `${summary} via ${model} (max thinking).`.slice(0, 400);
    await saveState(state);
    log.info({ version: nextVersion, applied: applied.length, model }, 'self-update: curriculum evolved');
    return 'updated';
  } catch (err) {
    state.lastResult = 'failed';
    state.note = controller.signal.aborted
      ? 'Agentic update exceeded the time cap and was aborted.'
      : `Update error: ${err && err.message ? err.message : String(err)}`;
    try {
      await saveState(state);
    } catch {
      // Even state persistence failed, nothing more we can safely do.
    }
    log.warn({ note: state.note }, 'self-update: harness failed');
    return 'failed';
  } finally {
    clearTimeout(timer);
  }
}
