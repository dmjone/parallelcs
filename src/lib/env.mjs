// Environment loader for ParallelCS.
// Zod-validated at import time, the process crashes immediately with a clear
// message on misconfiguration rather than failing later in an obscure way.
import { z } from 'zod';

const EnvSchema = z.object({
  // Cloud Run injects PORT automatically; default for local runs.
  PORT: z.coerce.number().int().positive().default(8080),
  // GCS bucket holding curriculum + state. Required, no `gs://` prefix.
  CONTENT_BUCKET: z.string().min(1, 'CONTENT_BUCKET is required'),
  // GCP project id, used for Vertex AI in IAM/ADC mode.
  GCP_PROJECT: z.string().min(1, 'GCP_PROJECT is required'),
  // Vertex AI location. `global` is the most reliable endpoint for Gemini
  // with Google Search grounding; the deploy also sets it explicitly.
  VERTEX_LOCATION: z.string().min(1).default('global'),
  // Fallback Gemini model. At run time the weekly update auto-discovers the
  // most powerful available Gemini model; this is only used if discovery fails.
  GEMINI_MODEL: z.string().min(1).default('gemini-2.5-pro'),
  // Shared secret guarding the internal self-refresh endpoint. Set at deploy;
  // empty in local dev (the weekly lock is the real guard either way).
  REFRESH_KEY: z.string().default(''),
  // In-house LLM used to generate precise per-concept study notes. The key is
  // server-side only and never reaches the browser. An empty key disables the
  // feature gracefully (pages still serve the curated, static content).
  ZS_API_URL: z
    .string()
    .url()
    .default('https://ai.zsapiens.com/v1/32b/chat/completions'),
  ZS_MODEL: z.string().min(1).default('llama-3.1-70b'),
  ZS_API_KEY: z.string().default(''),
  // Shared secret injected by Cloudflare on every edge-proxied request via the
  // `cf-edge-secret` header. When non-empty, the app rejects learner-facing
  // requests whose header does not match in constant time, which locks down the
  // direct *.run.app URL even if it leaks. Empty disables the gate (safe rollout
  // default); set via Secret Manager once a Cloudflare Transform Rule is wired.
  CF_EDGE_SECRET: z.string().default(''),
  // Sentry DSN for the dependency-free error reporter shim. Empty disables
  // reporting; set via Secret Manager when an org/project is provisioned.
  SENTRY_DSN: z.string().default(''),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('production'),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
    .join('\n');
  // No logger here yet; this runs before anything else and must be loud.
  process.stderr.write(`Invalid environment configuration:\n${issues}\n`);
  process.exit(1);
}

/** Validated, frozen environment configuration. */
export const env = Object.freeze(parsed.data);
