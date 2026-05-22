// Shared data contracts for ParallelCS. Authoritative, do not fork these shapes.
// Both the curriculum content (seed JSON) and the Vertex self-update must validate here.
import { z } from 'zod';

export const ResourceSchema = z.object({
  title: z.string().min(1),
  url: z.string().url(),
  source: z.string().min(1), // e.g. "3Blue1Brown", "MIT OCW", "Anthropic"
  type: z.enum(['video', 'article', 'course', 'guide', 'repo', 'paper', 'interactive']),
  free: z.boolean(),
});

export const ConceptSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  summary: z.string().min(1),
  trackId: z.string().min(1),
  week: z.number().int().min(1).max(12),
  prereqs: z.array(z.string()).default([]), // concept ids
  resources: z.array(ResourceSchema).min(1),
  // How this advanced concept connects to a classic CS subject, so a learner
  // sees the bridge (e.g. "Operating Systems", "Distributed Systems"). Optional.
  subjectLink: z.string().optional(),
});

export const ProjectSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  trackId: z.string().min(1),
  week: z.number().int().min(1).max(12),
  brief: z.string().min(1),
  deliverable: z.string().min(1),
  evalRubric: z.array(z.string()).min(1),
  // The classic CS subject this enterprise-grade project bridges to, used to
  // SHOW the link, never to constrain scope (e.g. "Distributed Systems").
  syllabusTag: z.string().min(1),
  // Real production stack / AI tooling a builder orchestrates for this project.
  stack: z.array(z.string()).optional(),
  // Why this matters in industry and the role it makes the builder ready for.
  industryContext: z.string().optional(),
  // Detailed, concrete feature list, what the shipped product actually does.
  features: z.array(z.string()).optional(),
  // Real, researched market demand: who wants this product and why investors
  // fund it. Grounds the project as a real product, not coursework.
  marketSignal: z.string().optional(),
});

export const TrackSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  tagline: z.string().min(1),
  focus: z.string().min(1),
});

export const ChangelogEntrySchema = z.object({
  date: z.string(),
  version: z.number().int(),
  summary: z.string(),
});

export const CurriculumSchema = z.object({
  version: z.number().int().min(1),
  generatedAt: z.string(),
  tracks: z.array(TrackSchema).min(1),
  concepts: z.array(ConceptSchema).min(1),
  projects: z.array(ProjectSchema).min(1),
  changelog: z.array(ChangelogEntrySchema).default([]),
});

export const StateSchema = z.object({
  lastUpdateDate: z.string(), // YYYY-MM-DD in IST
  lastVersion: z.number().int(),
  lastRunAt: z.string(), // ISO timestamp
  lastResult: z.enum(['updated', 'unchanged', 'failed', 'skipped', 'seeded']),
  note: z.string().default(''),
});

/** @typedef {import('zod').infer<typeof CurriculumSchema>} Curriculum */
/** @typedef {import('zod').infer<typeof StateSchema>} State */
