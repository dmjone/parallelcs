// Foundations on-ramp data: the 12-week opinionated path that feeds learners
// into the eight ParallelCS tracks. Loaded synchronously at module import from
// a bundled JSON file, validated by zod, then frozen for the process lifetime.
// No GCS, no network. The file is the source of truth.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const FOUNDATIONS_PATH = fileURLToPath(
  new URL('../content/foundations.json', import.meta.url),
);

export const FoundationsResourceSchema = z.object({
  title: z.string().min(1),
  url: z.string().url(),
  author: z.string().min(1),
  kind: z.enum(['video', 'course', 'docs', 'book', 'interactive', 'reference']),
});

export const FoundationsWeekSchema = z.object({
  week: z.number().int().min(1).max(12),
  theme: z.string().min(1),
  objective: z.string().min(1),
  shippedArtifact: z.string().min(1),
  summary: z.string().min(1),
  checkpointKind: z.enum([
    'normal',
    'coach-off-micro-checkpoint',
    'final-gate',
  ]),
  resources: z.array(FoundationsResourceSchema).min(1).max(3),
});

export const FoundationsSchema = z.object({
  version: z.number().int().min(1),
  generatedAt: z.string().min(1),
  weeks: z.array(FoundationsWeekSchema).length(12),
});

/** @typedef {import('zod').infer<typeof FoundationsSchema>} Foundations */
/** @typedef {import('zod').infer<typeof FoundationsWeekSchema>} FoundationsWeek */

/**
 * Synchronously read, validate, and deep-freeze the foundations payload.
 * Throws on any schema error. Called once at module init.
 * @returns {Foundations}
 */
function loadFoundationsOrCrash() {
  const raw = JSON.parse(readFileSync(FOUNDATIONS_PATH, 'utf8'));
  const parsed = FoundationsSchema.parse(raw);

  // Extra invariant the schema cannot express: weeks must arrive 1..12 in order.
  // A swapped pair would still validate but would break the rendered timeline,
  // so we crash loud here too. This is a developer error, not a runtime one.
  for (let i = 0; i < parsed.weeks.length; i += 1) {
    if (parsed.weeks[i].week !== i + 1) {
      throw new Error(
        `foundations.json: week at index ${i} is ${parsed.weeks[i].week}, expected ${i + 1}`,
      );
    }
  }

  // Freeze nested arrays first so the top-level freeze locks the whole tree.
  for (const week of parsed.weeks) {
    Object.freeze(week.resources);
    for (const resource of week.resources) Object.freeze(resource);
    Object.freeze(week);
  }
  Object.freeze(parsed.weeks);
  return Object.freeze(parsed);
}

/**
 * The validated, frozen foundations payload. Safe to share across handlers
 * since it is immutable after import.
 * @type {Foundations}
 */
export const FOUNDATIONS = loadFoundationsOrCrash();

/**
 * Accessor that mirrors the curriculum API surface. Returns the same frozen
 * object for the process lifetime.
 * @returns {Foundations}
 */
export function getFoundations() {
  return FOUNDATIONS;
}

/**
 * Return a single week by 1-based index, or null when out of range. Callers
 * that pass user input should treat a null return as a 404.
 * @param {number} n week number, 1..12
 * @returns {FoundationsWeek | null}
 */
export function getWeek(n) {
  if (!Number.isInteger(n) || n < 1 || n > FOUNDATIONS.weeks.length) return null;
  return FOUNDATIONS.weeks[n - 1];
}
