// Google Cloud Storage wrapper for the ParallelCS content bucket.
// Auth is ADC from the attached service account, no keys, no credentials in source.
import { Storage } from '@google-cloud/storage';
import { env } from './env.mjs';

// One Storage client per process; the SDK pools connections internally.
const storage = new Storage({ projectId: env.GCP_PROJECT });
const bucket = storage.bucket(env.CONTENT_BUCKET);

/**
 * Read a JSON object from the bucket.
 * @param {string} path object path within the bucket
 * @returns {Promise<unknown>} parsed JSON
 */
export async function readJson(path) {
  const [buf] = await bucket.file(path).download();
  return JSON.parse(buf.toString('utf8'));
}

/**
 * Write an object as pretty-printed JSON to the bucket.
 * @param {string} path object path within the bucket
 * @param {unknown} obj serializable value
 */
export async function writeJson(path, obj) {
  await bucket.file(path).save(JSON.stringify(obj, null, 2), {
    contentType: 'application/json',
    resumable: false,
  });
}

/**
 * Check whether an object exists in the bucket.
 * @param {string} path object path within the bucket
 * @returns {Promise<boolean>}
 */
export async function exists(path) {
  const [ok] = await bucket.file(path).exists();
  return ok;
}

/**
 * Atomically claim the update lock for one period.
 *
 * Creates `meta/lock-<periodKey>` using the GCS generation precondition
 * `ifGenerationMatch: 0`, which only succeeds when the object does not yet
 * exist. Across concurrent Cloud Run instances exactly one create wins; the
 * losers get HTTP 412 and we report `false`. This is the single source of
 * truth for "one update per period" (the period is one IST week).
 *
 * @param {string} periodKey e.g. "2026-W21" (IST week)
 * @returns {Promise<boolean>} true only if THIS caller created the lock
 */
export async function acquireUpdateLock(periodKey) {
  const file = bucket.file(`meta/lock-${periodKey}`);
  try {
    await file.save(JSON.stringify({ claimedAt: new Date().toISOString() }), {
      contentType: 'application/json',
      resumable: false,
      preconditionOpts: { ifGenerationMatch: 0 },
    });
    return true;
  } catch (err) {
    // 412 Precondition Failed -> the lock already exists (another instance won).
    if (err && err.code === 412) return false;
    // Any other failure is a real error, surface it to the caller's try/catch.
    throw err;
  }
}

/**
 * Liveness probe for the bucket, used by /health/ready.
 *
 * `bucket.exists()` issues a bucket GET, so the service account needs
 * `storage.buckets.get` (e.g. roles/storage.legacyBucketReader). Object-only
 * roles like roles/storage.objectAdmin do NOT grant it.
 * @returns {Promise<boolean>}
 */
export async function bucketReachable() {
  const [ok] = await bucket.exists();
  return ok;
}
