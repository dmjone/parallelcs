# ParallelCS, Build Contract (authoritative)

Single self-updating Cloud Run service. Node 24, ESM. Everything runs **inside one service**.
No second service, no scheduler, no API keys. Vertex AI auth = IAM (attached service account / ADC).

## File ownership (do NOT edit files outside your area)

- **app-engineer** owns: `src/server.mjs`, `src/lib/*.mjs` (except `schema.mjs` which is locked),
  `Dockerfile`, `.dockerignore`, `.gcloudignore`, `.env.example`.
- **design-lead** owns: `src/views/*.mjs`, `src/content/seed-curriculum.json`, `README.md`.
- **cloud-infra** owns: GCP resources (service accounts, IAM, GCS bucket), `deploy/*`,
  `autoconfig.sh`, `autoconfig.bat`, `CHANGELOG.md`. Runs the actual deploy.

`src/lib/schema.mjs` and `package.json` are already written, locked, do not change shapes.

## Data shapes

See `src/lib/schema.mjs` (Zod). `Curriculum` = { version, generatedAt, tracks[], concepts[], projects[], changelog[] }.
`Concept` has trackId + week (1-12) + prereqs[] + resources[]. `Project` maps to a Shoolini syllabus tag.

## View module interface, `src/views/index.mjs` (design-lead provides, app-engineer consumes)

Export these pure functions (return strings, no I/O):

```js
export function page({ title, description, path, bodyHtml }) // -> full <!doctype html> string (layout + inlined CSS)
export function homeView(curriculum)        // -> bodyHtml string
export function trackView(curriculum, track)// track = one TrackSchema obj; -> bodyHtml
export function graphView(curriculum)       // knowledge-graph page; -> bodyHtml
export function projectsView(curriculum)    // -> bodyHtml
export function challengeView(curriculum)   // The 30-Day Challenge; -> bodyHtml
export function notFoundView()              // -> bodyHtml
export function statusView(state, curriculum) // shows last self-update result; -> bodyHtml
```

`src/views/pitch.mjs`:
```js
export function pitchPage() // -> full self-contained 10-slide HTML deck (Guy Kawasaki format)
```

Rules for views: all CSS inlined in `page()` via a `<style>` block. Zero external/CDN assets.
Skeuomorphic, distinctive, tactile design. WCAG 2.2 AA: semantic HTML, ARIA, keyboard nav,
focus order, alt text, no color-only meaning, `prefers-reduced-motion` respected. Escape all
dynamic strings (provide an `esc()` helper inside the views module).

## Routes (app-engineer wires in server.mjs)

`GET /` home · `GET /track/:id` · `GET /graph` · `GET /projects` · `GET /challenge`
`GET /status` (self-update status) · `GET /pitch` · `GET /api/curriculum` (JSON)
`GET /health` (shallow 200) · `GET /health/ready` (deep: GCS reachable)
404 -> notFoundView. Errors never leak stack traces.

## Self-update behavior (app-engineer, `src/lib/update.mjs`)

- On a page request (NOT /health*), check in-memory `freshToday` flag. If set, skip.
- Else read `meta/state.json` from GCS. If `lastUpdateDate === todayIST` -> set flag, skip.
- Else acquire atomic lock: create `meta/lock-<todayIST>` with GCS precondition
  `ifGenerationMatch: 0`. 412 -> another instance owns today -> skip. Success -> we own it.
- Run update **synchronously within the request** (AbortController, 50s cap):
  1. Vertex Gemini 2.5 Flash + Google Search grounding -> research latest free CS/AI
     learning resources & the 2026 AI-native stack (text findings).
  2. Vertex Gemini 2.5 Flash (JSON out) -> merge findings into current curriculum.
  3. Validate with `CurriculumSchema`. Invalid -> keep old, result `failed`.
  4. Changed -> write `content/curriculum.json`, bump `version`, prepend changelog.
     Unchanged -> result `unchanged`. Either way write `meta/state.json` with today's date.
- Hard cap: at most ONE update per IST day, enforced by the date check + atomic lock.
- All wrapped in try/catch, a failed update must NEVER break page serving.
- First run: if `content/curriculum.json` missing in GCS, seed it from
  `src/content/seed-curriculum.json` (result `seeded`).

## GCS layout (bucket name from env `CONTENT_BUCKET`)

- `content/curriculum.json`, the live curriculum
- `meta/state.json`, StateSchema
- `meta/lock-YYYY-MM-DD`, daily lock object

## Env (`src/lib/env.mjs`, Zod-validated, crash on misconfig)

- `PORT` (default 8080) · `CONTENT_BUCKET` (required) · `GCP_PROJECT` (required)
- `VERTEX_LOCATION` (default `asia-south1`) · `GEMINI_MODEL` (default `gemini-2.5-flash`)
- `NODE_ENV`
No secrets/API keys. Vertex uses ADC from the attached service account.

## Cloud Run deploy params (cloud-infra)

Region `asia-south1`. `--min-instances=0` (scale to zero, $0 idle),
`--max-instances=4`, `--cpu=1 --memory=512Mi`, `--concurrency=80`, `--timeout=120`,
`--allow-unauthenticated`, default CPU throttling (billed only during requests),
`--service-account=parallelcs-run@dmjone.iam.gserviceaccount.com`,
env vars set via `--set-env-vars`. Build via `gcloud run deploy --source .` (no local Docker).
