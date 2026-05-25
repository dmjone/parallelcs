// Sync the bundled seed curriculum with the LIVE, self-evolved curriculum.
//
// The running service evolves its curriculum weekly and stores it in GCS. The
// repo's `src/content/seed-curriculum.json` is only ever used to seed a COLD
// bucket (first run / disaster recovery), so if it drifts behind the live
// version, a cold start would regress production to stale content. This script
// pulls the live curriculum, validates it against the schema, and writes it to
// the seed file, but never downgrades: it refuses to overwrite a newer seed
// with an older server version unless --force is passed.
//
//   node scripts/sync-seed.mjs            # sync from production
//   PARALLELCS_URL=http://localhost:8099 node scripts/sync-seed.mjs
//   node scripts/sync-seed.mjs --force    # allow a same/lower version write
//
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const BASE_URL = (process.env.PARALLELCS_URL || 'https://parallelcs.dmj.one').replace(/\/+$/, '');
const ENDPOINT = `${BASE_URL}/api/curriculum`;
const SEED_PATH = fileURLToPath(new URL('../src/content/seed-curriculum.json', import.meta.url));
const FORCE = process.argv.includes('--force');

function fail(msg) {
  process.stderr.write(`sync-seed: ${msg}\n`);
  process.exit(1);
}

/**
 * Lightweight structural sanity check. The live curriculum is already validated
 * against the full Zod schema server-side before it is ever served, so this only
 * needs to reject the realistic failure modes (an error page, partial JSON, the
 * wrong endpoint), not re-implement the schema. Keeping it dependency-free lets
 * this script run in CI and git hooks with no install step.
 * @returns {string[]} list of problems, empty when the shape looks valid
 */
function structuralProblems(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return ['payload is not an object'];
  const problems = [];
  if (typeof data.version !== 'number') problems.push('version must be a number');
  for (const key of ['tracks', 'concepts', 'projects']) {
    if (!Array.isArray(data[key]) || data[key].length === 0) {
      problems.push(`${key} must be a non-empty array`);
    }
  }
  if (Array.isArray(data.tracks) && data.tracks[0] && typeof data.tracks[0].id !== 'string') {
    problems.push('tracks[].id must be a string');
  }
  const c = Array.isArray(data.concepts) ? data.concepts[0] : null;
  if (c && (typeof c.id !== 'string' || typeof c.trackId !== 'string')) {
    problems.push('concepts[] must carry string id and trackId');
  }
  return problems;
}

async function main() {
  // Current seed version (0 if the file is missing or unparseable).
  let localVersion = 0;
  try {
    localVersion = JSON.parse(await readFile(SEED_PATH, 'utf8')).version ?? 0;
  } catch {
    localVersion = 0;
  }

  // Fetch the live curriculum.
  let payload;
  try {
    const res = await fetch(ENDPOINT, { headers: { accept: 'application/json' } });
    if (!res.ok) fail(`server responded ${res.status} for ${ENDPOINT}`);
    payload = await res.json();
  } catch (err) {
    fail(`could not reach ${ENDPOINT}: ${err.message}`);
  }

  // Sanity-check the shape before trusting it. A malformed live response must
  // never land in the seed and silently break a future cold start.
  const problems = structuralProblems(payload);
  if (problems.length) {
    fail(`live curriculum failed a sanity check; refusing to write. Problems: ${problems.slice(0, 3).join(', ')}`);
  }
  const live = payload;

  if (live.version < localVersion && !FORCE) {
    fail(
      `server version (${live.version}) is OLDER than the local seed (${localVersion}). ` +
        `Refusing to downgrade. Pass --force to override.`,
    );
  }
  if (live.version === localVersion && !FORCE) {
    process.stdout.write(`sync-seed: already in sync at version ${localVersion}. Nothing to do.\n`);
    return;
  }

  // Pretty-print 2-space with a trailing newline to match the existing file.
  await writeFile(SEED_PATH, `${JSON.stringify(live, null, 2)}\n`, 'utf8');
  process.stdout.write(
    `sync-seed: updated seed ${localVersion} -> ${live.version} ` +
      `(${live.tracks.length} tracks, ${live.concepts.length} concepts, ${live.projects.length} projects) ` +
      `from ${BASE_URL}\n`,
  );
}

main();
