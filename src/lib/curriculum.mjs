// Curriculum loading with a short in-memory cache.
// On first ever run, seeds the bucket from the bundled seed file.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { CurriculumSchema, StateSchema } from './schema.mjs';
import { readJson, writeJson, exists } from './gcs.mjs';

export const CURRICULUM_PATH = 'content/curriculum.json';
export const STATE_PATH = 'meta/state.json';

const SEED_PATH = fileURLToPath(
  new URL('../content/seed-curriculum.json', import.meta.url),
);

// Cache TTL, long enough to spare GCS reads on bursty traffic, short enough
// that a self-update written by another instance is picked up quickly.
const CACHE_TTL_MS = 60_000;

/** @type {{ value: import('./schema.mjs').Curriculum, at: number } | null} */
let cache = null;

/** Drop the cache so the next read re-fetches from GCS (called after a write). */
export function invalidateCurriculumCache() {
  cache = null;
}

/**
 * Emit a structured warning to stderr. Mirrors `env.mjs`, no `console.*`, and
 * Cloud Logging maps `severity`. Used when GCS is unreachable and we degrade.
 * @param {string} msg
 * @param {unknown} err
 */
function warn(msg, err) {
  process.stderr.write(
    `${JSON.stringify({
      level: 'warn',
      severity: 'WARNING',
      module: 'curriculum',
      msg,
      err: err instanceof Error ? err.message : err ? String(err) : undefined,
      time: new Date().toISOString(),
    })}\n`,
  );
}

/**
 * Load and validate the curriculum from the bundled seed file.
 * @returns {Promise<import('./schema.mjs').Curriculum>}
 */
async function loadSeed() {
  const raw = JSON.parse(await readFile(SEED_PATH, 'utf8'));
  return CurriculumSchema.parse(raw);
}

/**
 * Get the live curriculum. On a cold bucket this seeds `content/curriculum.json`
 * from the bundled seed file and writes a `seeded` state, then returns it.
 *
 * Resilience: if GCS is unreachable or misconfigured, page serving must never go
 * down when a valid curriculum is baked into the image. We log a WARNING and
 * serve the bundled seed. `/health/ready` still reports the bucket as unhealthy,
 * so monitoring keeps its loud signal while learners keep seeing the lessons.
 *
 * @returns {Promise<import('./schema.mjs').Curriculum>}
 */
export async function getCurriculum() {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) return cache.value;

  try {
    if (!(await exists(CURRICULUM_PATH))) {
      const seed = await loadSeed();
      await writeJson(CURRICULUM_PATH, seed);
      /** @type {import('./schema.mjs').State} */
      const state = {
        lastUpdateDate: '',
        lastVersion: seed.version,
        lastRunAt: new Date().toISOString(),
        lastResult: 'seeded',
        note: 'Bucket cold-started from bundled seed curriculum.',
      };
      await writeJson(STATE_PATH, StateSchema.parse(state));
      cache = { value: seed, at: now };
      return seed;
    }

    const value = CurriculumSchema.parse(await readJson(CURRICULUM_PATH));
    cache = { value, at: now };
    return value;
  } catch (err) {
    warn('GCS unavailable; serving bundled seed curriculum', err);
    const seed = await loadSeed();
    cache = { value: seed, at: now };
    return seed;
  }
}

/**
 * Persist a new curriculum to GCS and refresh the in-memory cache.
 * @param {import('./schema.mjs').Curriculum} curriculum validated curriculum
 */
export async function saveCurriculum(curriculum) {
  await writeJson(CURRICULUM_PATH, curriculum);
  cache = { value: curriculum, at: Date.now() };
}

/**
 * Read the self-update state. Returns null when no state object exists yet.
 * @returns {Promise<import('./schema.mjs').State | null>}
 */
export async function getState() {
  try {
    if (!(await exists(STATE_PATH))) return null;
    return StateSchema.parse(await readJson(STATE_PATH));
  } catch (err) {
    warn('GCS unavailable; no self-update state to report', err);
    return null;
  }
}

/**
 * Persist the self-update state.
 * @param {import('./schema.mjs').State} state validated state
 */
export async function saveState(state) {
  await writeJson(STATE_PATH, StateSchema.parse(state));
}
