// Pre-push guard. Blocks a push when the LIVE curriculum has evolved past the
// bundled seed, so a cold start / DR restore can never regress production to
// stale local content. Compares src/content/seed-curriculum.json.version with
// the live /api/curriculum.version.
//
// Fails OPEN: if the server is unreachable or the seed is unreadable, the push
// is allowed (never block work just because the network is down). Bypass
// explicitly with SKIP_SEED_CHECK=1 (or `git push --no-verify`).
//
// Uses core node:http(s) rather than fetch(): on Windows, process.exit() right
// after an undici fetch can trip a libuv assertion and exit non-zero, which
// would wrongly block the push.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import https from 'node:https';
import http from 'node:http';

const BASE_URL = (process.env.PARALLELCS_URL || 'https://parallelcs.dmj.one').replace(/\/+$/, '');
const SEED_PATH = fileURLToPath(new URL('../src/content/seed-curriculum.json', import.meta.url));
const TIMEOUT_MS = 15_000;

const color = (code, s) => (process.stderr.isTTY ? `\x1b[${code}m${s}\x1b[0m` : s);
const red = (s) => color('31', s);
const green = (s) => color('32', s);
const yellow = (s) => color('33', s);
const dim = (s) => color('2', s);

function allow(msg) {
  if (msg) process.stderr.write(`${msg}\n`);
  process.exit(0);
}

/** GET JSON over core http(s); resolves parsed body or rejects. */
function getJson(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https:') ? https : http;
    const req = mod.get(url, { headers: { accept: 'application/json' } }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(err);
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => req.destroy(new Error('timeout')));
  });
}

async function main() {
  if (process.env.SKIP_SEED_CHECK) allow(dim('pre-push: SKIP_SEED_CHECK set, skipping seed freshness check.'));

  let localVersion;
  try {
    localVersion = JSON.parse(await readFile(SEED_PATH, 'utf8')).version;
  } catch (err) {
    allow(yellow(`pre-push: cannot read local seed (${err.message}); allowing push.`));
  }

  let serverVersion;
  try {
    const live = await getJson(`${BASE_URL}/api/curriculum`, TIMEOUT_MS);
    serverVersion = live.version;
  } catch (err) {
    allow(yellow(`pre-push: server unreachable (${err.message}); cannot verify seed freshness, allowing push.`));
  }

  if (typeof serverVersion === 'number' && serverVersion > localVersion) {
    process.stderr.write(
      `${red('pre-push BLOCKED: the live curriculum has evolved past your seed.')}\n` +
        `  server (${BASE_URL}) version: ${green(String(serverVersion))}\n` +
        `  local seed version:          ${red(String(localVersion))}\n\n` +
        `Pushing now risks a cold start / DR seeding production with stale content.\n` +
        `Refresh the seed from the server, then commit and push:\n\n` +
        `  ${dim('node scripts/sync-seed.mjs')}\n` +
        `  ${dim(`git add src/content/seed-curriculum.json && git commit -m "Sync seed with live curriculum v${serverVersion}"`)}\n\n` +
        `Bypass for a code-only push: ${dim('SKIP_SEED_CHECK=1 git push')}  (or ${dim('git push --no-verify')})\n`,
    );
    process.exit(1);
  }

  allow(dim(`pre-push: seed v${localVersion} >= live v${serverVersion}, OK.`));
}

main();
