// Structured logging for ParallelCS.
// Fastify ships pino built-in; the server passes its options here so request
// logs and standalone module logs share one configuration. NO console.* anywhere.
import { env } from './env.mjs';

/**
 * Fastify logger options. Pretty transport is intentionally omitted, Cloud Run
 * collects structured JSON from stdout, and adding pino-pretty would mean an
 * extra dependency for a benefit only visible during local dev.
 */
export const loggerOptions = {
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  // Cloud Logging maps `severity`; pino's default `level` int is also fine,
  // but redacting nothing sensitive keeps logs safe by construction.
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie'],
    remove: true,
  },
};
