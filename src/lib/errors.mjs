// Dependency-free Sentry-style error reporter for ParallelCS.
// Builds a minimal Sentry envelope and POSTs it to the project's store endpoint
// derived from SENTRY_DSN. Empty DSN disables reporting. Every failure path is
// swallowed; this shim must never throw and must never block the request.
import { randomUUID } from 'node:crypto';
import { env } from './env.mjs';

const SEND_TIMEOUT_MS = 4000;

/**
 * Parse a Sentry DSN of the form `https://PUBLIC@HOST/PROJECT_ID` into the
 * pieces needed to address the legacy store endpoint and build the auth header.
 *
 * @param {string} dsn
 * @returns {{ protocol: string, host: string, publicKey: string, projectId: string } | null}
 */
function parseDsn(dsn) {
  try {
    const u = new URL(dsn);
    if (!u.username) return null;
    const projectId = u.pathname.replace(/^\/+/, '').split('/').filter(Boolean).pop();
    if (!projectId) return null;
    return {
      protocol: u.protocol.replace(/:$/, ''),
      host: u.host,
      publicKey: u.username,
      projectId,
    };
  } catch {
    return null;
  }
}

/**
 * Best-effort error capture. Sends a minimal Sentry envelope to the configured
 * DSN's store endpoint. Always resolves, never throws, never rejects.
 *
 * @param {unknown} err
 * @param {{ tags?: Record<string, string|number>, extra?: Record<string, unknown> }} [ctx]
 * @returns {Promise<void>}
 */
export async function captureError(err, ctx) {
  if (!env.SENTRY_DSN) return;
  const parsed = parseDsn(env.SENTRY_DSN);
  if (!parsed) return;

  const e = err instanceof Error ? err : new Error(typeof err === 'string' ? err : 'unknown error');

  const envelope = {
    event_id: randomUUID().replace(/-/g, ''),
    timestamp: new Date().toISOString(),
    level: 'error',
    platform: 'node',
    server_name: process.env.K_SERVICE || 'parallelcs',
    exception: {
      values: [
        {
          type: e.name || 'Error',
          value: e.message || String(e),
          stacktrace: { frames: [] },
        },
      ],
    },
    contexts: {
      runtime: { name: 'node', version: process.version },
    },
    tags: (ctx && ctx.tags) || {},
    extra: (ctx && ctx.extra) || {},
  };

  const url = `${parsed.protocol}://${parsed.host}/api/${parsed.projectId}/store/`;
  const auth = `Sentry sentry_version=7, sentry_client=parallelcs/1, sentry_key=${parsed.publicKey}`;

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), SEND_TIMEOUT_MS);
  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sentry-Auth': auth,
      },
      body: JSON.stringify(envelope),
      signal: ctl.signal,
    });
  } catch {
    // Swallow every failure: network, abort, DNS, 4xx, 5xx, malformed DSN.
  } finally {
    clearTimeout(timer);
  }
}
