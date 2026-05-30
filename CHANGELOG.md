# Changelog

All notable changes to ParallelCS are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
this project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Security

- **`REFRESH_KEY` migrated from a plain Cloud Run env var to Secret Manager**
  (`refresh-key:latest`). The runtime SA holds `secretmanager.secretAccessor` only
  on this secret. Zero downtime; verified `/__internal/refresh` is 403 without the
  header and `{"status":"fresh"}` with it. Same hardening applied earlier to
  `zs-api-key`; the service now has zero plain-text secret material in env.
- **Branch protection enabled on `main`** (`required_status_checks=["Verify"]`,
  `required_linear_history=true`, `allow_force_pushes=false`, `allow_deletions=false`).
  Admins can bypass to preserve the solo-push workflow; non-admin PRs must pass
  the Verify CI before merging.
- **Cloudflare-only ingress check on learner routes** (`src/server.mjs` preHandler).
  When the `CF_EDGE_SECRET` env is set, requests without a matching `cf-edge-secret`
  header are rejected with `403 forbidden` in constant time
  (`crypto.timingSafeEqual`). Closes the `*.run.app` bypass of the Cloudflare proxy.
  Default empty for safe rollout; the gate flips on the moment the env is set.
  `/__internal/refresh`, `/health`, `/health/ready`, `/favicon.ico`, `/api/curriculum`
  are intentionally skipped.

### Added

- **CI Verify workflow gating the deploy** (`.github/workflows/verify.yml`). On
  every push, PR, and on demand: `pnpm install --frozen-lockfile`, typecheck
  (`node --check` across `src`, `test`, `scripts`), ESLint v9 flat config
  (no-console, no-eval, no-implied-eval, no-new-func), the resilience smoke test,
  `pnpm audit --prod --audit-level=high`, and a **CycloneDX SBOM** uploaded as a
  build artifact. `deploy.yml` now runs only on `workflow_run` of `Verify`
  succeeding (or `workflow_dispatch`), so a failing Verify blocks the rollout.
- **CodeQL static analysis** (`.github/workflows/codeql.yml`), JavaScript +
  TypeScript, on push, PR, and weekly schedule. Findings flow into GitHub Code
  Scanning.
- **Dependabot** (`.github/dependabot.yml`) for npm (daily, grouped prod/dev,
  minor + patch), GitHub Actions (weekly), and Docker base image (weekly).
- **Dependency-free Sentry-style error reporter** (`src/lib/errors.mjs`). Pino
  remains the primary log path; when `SENTRY_DSN` is set, `captureError` posts a
  minimal envelope to the Sentry store endpoint with `crypto.timingSafeEqual`-style
  safe defaults, a 4s `AbortController` timeout, and swallowed failures. Wired into
  `setErrorHandler` so every unhandled error is captured. No new runtime
  dependencies.
- **ESLint v9 flat config** (`eslint.config.mjs`). Locks down `no-console`,
  `no-eval`, `no-implied-eval`, `no-new-func` across `src/` and `scripts/`;
  `test/**` keeps `console.log` for test output.
- **`CF_EDGE_SECRET` activated as a plain Cloud Run env var** (no Secret Manager
  entry, keeps the secret count inside the free tier). The code reads it from
  `env.CF_EDGE_SECRET`; activation is one `gcloud run services update ... --update-env-vars`
  once the matching Cloudflare Transform Rule is in place.
- **Daily seed auto-sync** (`.github/workflows/sync-seed.yml`). A scheduled GitHub Action runs
  `sync-seed` once a day, nudges the live weekly self-update, and commits the refreshed
  `seed-curriculum.json` to `main` only when the live version has advanced. Keeps the repo in
  step with the self-evolving production curriculum, hands-off and keyless (uses the default
  `GITHUB_TOKEN`). Also runnable on demand via `workflow_dispatch`.
- **Seed-freshness pre-push guard.** `scripts/check-seed-freshness.mjs` compares the bundled
  `src/content/seed-curriculum.json` version against the live `/api/curriculum` version and
  blocks a push when the live curriculum is newer, so a cold start / DR restore can never
  reseed production with stale local content. Fails open when the server is unreachable;
  bypass with `SKIP_SEED_CHECK=1`. It runs via a generic dispatcher in the global
  `core.hooksPath` (no per-repo hooksPath override, leaves the global `pre-commit` intact).
- **`scripts/sync-seed.mjs`** (`pnpm sync-seed`) pulls the live curriculum into the seed,
  validates it against the schema, and refuses to downgrade. `PARALLELCS_URL` overrides the
  source (defaults to production).

### Changed

- Synced the bundled seed curriculum from the live service: **version 1 -> 3** (67 concepts).
  Keeps a cold start / DR restore at parity with the self-evolved production curriculum.
- README corrected: eight tracks (was "four"), weekly self-update (was "once per day"),
  Node 22+ (was 24+); documented the seed-sync workflow and the pre-push guard.
- **Reframed the whole site as a journey, with one coherent timeline, chosen from research.**
  The competing "30 days" / "4 weeks" / "12 weeks" copy is resolved by splitting the unit by
  audience, backed by the goal-gradient effect, the unit effect (Monga & Bagchi, JCR 2012),
  temporal discounting, and proximal sub-goal research (Bandura & Schunk, 1981):
  - **Learner-facing surfaces lead with the near, personal horizon**: "your first 30 days" and
    "start today", with the win ("ship a real, public product") up front. The journey then
    continues "week by week" as proximal milestones, never an intimidating total.
  - **The cohort on-ramp is now "The 30-Day Challenge"** everywhere (replacing the old
    "4-week kickstart" / "weeks 1-4" concept). The `/challenge` page presents it as 30 days
    structured as four weekly milestones, then "the rest is yours, week by week".
  - **The faculty (`/pitch-clo`) and investor (`/pitch`) decks keep "12-week, semester-aligned
    track"** for credibility, with the 30-Day Challenge framed explicitly as the on-ramp into
    the tracks, so the two never read as competing totals.
  - The shared journey bridge (`weekBridge()`) was relabeled "Your first 30 days · with a
    cohort" then "Then week by week · your pace". The home hero stat band changed from a
    catalog (tracks/concepts/projects/resources) to a journey (30 days to first ship, paths,
    one public product, 100% free), removing the "scary big numbers" the client flagged.
  - Route titles/descriptions in `server.mjs`, the home/start/tracks/track/graph/challenge
    views, `README.md` and `CONTRACT.md` were all aligned to this single narrative.

### Added

- `GET /learn/:conceptId` study-notes pages. Each concept gets a precise, readable
  deep dive written by the in-house ParallelCS model (the Quality 31B served as
  `llama-3.1-70b`, confirmed the best available chat model on the endpoint),
  alongside its curated free sources. A "Read the study notes" link sits on every
  concept card. Notes are cached in GCS (`deep/<id>.json`, keyed by a hash of the
  concept's title and summary) so each is generated at most once per content
  version, then served from cache.
- Expanded curated free resources across all tracks (courses 15 to 25, interactive
  4 to 8, videos 3 to 7). Every added URL was verified to resolve.

### Security

- The in-house model key is stored in Secret Manager (`zs-api-key`) and injected
  into Cloud Run at runtime; it is never in the repo, never logged, never returned,
  and never rendered. Verified zero key occurrences in served HTML.
- The `/learn` route accepts only a concept id from the curriculum's closed set, so
  it cannot be used as a general model proxy. Output is escaped before render. A
  per-IP token bucket rate limits the route (verified: a burst returns 429). If the
  key is absent or a call fails, the page falls back to curated sources.

### Changed

- **Navigation simplified 8 → 4 items** (Start · Tracks · Projects · Challenge). Home is the
  logo; Knowledge Graph, Status, Pitch, CLO and "Are you ready?" move to the footer. Reduces
  the "needs a PhD to navigate" feeling the client flagged.
- **Home page rebuilt as a guided flow** (Apple-style, one idea per section): hook → the deal
  (3 beats) → tracks → why it's different → how you start. Copy tightened throughout to short,
  meaningful lines; a single primary CTA ("Start free") per screen.
- **Challenge ↔ track coherence fixed, one unit everywhere: weeks.** The "30-day challenge"
  vs "12-week track" mismatch forced readers to mentally convert days↔weeks. Resolved by
  expressing everything in weeks: a track is 12 weeks; the **kickstart is weeks 1-4** (run
  with a cohort), then weeks 5-12 solo. The challenge page was rebuilt from a 30-day calendar
  into a 4-week plan, and all "30-day"/"month" copy across home, start, tracks, projects and
  page titles/descriptions was converted to weeks. Dead `.day-grid`/`.day-cell` CSS removed.
- **New `weekBridge()` visual**, a single 12-segment bar (weeks 1-4 = kickstart, 5-12 = solo)
  shown on `/start`, `/challenge` and the home "how you start" section, so the two timelines
  read as one.

### Added

- `GET /start`, the on-ramp/roadmap. One recommended first track (Agentic Systems), two clear
  ways to begin (with a cohort vs. solo), and a suggested-climb roadmap of all 8 tracks
  captioned "Start anywhere, each track stands alone." `startView()` export in
  `src/views/index.mjs`.
- **"What's next" suggestion** on every track page, recommends the next track along the
  roadmap climb (wraps around), with a link to the full roadmap.


- `GET /tracks`, a dedicated learning-portal entry page that lists every track with its
  concept and project counts, so students have a clear navigable home for the lessons
  instead of having to scroll the marketing page to find them. Wired into the primary
  nav (between "Start Here" and "Knowledge Graph") and the footer.
- `tracksView(curriculum)` export in `src/views/index.mjs`, rendering the new entry page.

### Fixed

- `trackView` breadcrumb said "Home › Tracks ›" but the "Tracks" link pointed to `/graph`
  (the knowledge-graph SVG, not a tracks index). It now points to the new `/tracks` page.

### Notes

- The home page "Why ParallelCS" three-block design (Day-one ready / Always frontier /
  Free, with proof) is intentionally preserved as-is per client preference.

- Curriculum content versioning is owned by the self-update job; see `meta/state.json`
  in the content bucket for the live version and last-update timestamp.

### Deployed - 2026-05-22

- Redeployed to Cloud Run (`parallelcs`, asia-east1, revision `parallelcs-00011-htm`,
  100% traffic) with the simplified navigation, the `/start` roadmap, the weeks-based
  kickstart, the humanized copy, and the WCAG 2.0 AAA palette. Verified live: all page
  routes 200, `/health/ready` 200, 4-item nav present, zero em dashes in the HTML.
- Triggered the weekly self-update on production to verify it end to end. Result:
  `updated`, version 1 to 2, 8 changes applied in ~94s via the auto-discovered
  `gemini-3.5-flash` (max thinking), incorporating real May 2026 developments. The
  result was non-destructive: schema valid, every floor respected (8 tracks, 67
  concepts, 16 projects), zero orphaned concepts or projects, zero broken
  prerequisites, every concept still has at least one resource. The live `/graph`,
  `/status`, track and project pages all render the evolved content with the layout
  intact. A pre-update backup of the curriculum is kept at
  `gs://dmjone-parallelcs-ae1/backups/curriculum.before-selfupdate.json`.

### Deployed - 2026-05-17

- ParallelCS is live on Cloud Run, current revision `parallelcs-00004-btf`, 100% traffic:
  - `https://parallelcs-107722137045.asia-south1.run.app`
  - `https://parallelcs-azjqpkmlpa-el.a.run.app` (stable alias)
- Verification on the current revision: `/health` 200, `/health/ready` 200, all 7 page
  routes 200, both invalid paths 404, `/api/curriculum` 200 (valid JSON: version 1,
  4 tracks, 29 concepts, 8 projects).
- Self-update verified end-to-end on the deployed service: stale lock + state were
  cleared, a page request drove one real grounded Vertex call under the runtime SA
  (`~72s`, within the 80s cap), the model reported NO_CHANGE, result `unchanged`,
  curriculum kept at version 1. No Vertex/IAM errors, `aiplatform.user` works.
- The earlier `parallelcs-00001-666` revision's self-update aborted at the then-50s
  cap; the update logic was subsequently revised to a single grounded call / 80s cap.

### Fixed - 2026-05-17

- Runtime SA granted `roles/storage.legacyBucketReader` (bucket-scoped) in addition to
  `roles/storage.objectAdmin`. `/health/ready` calls `bucket.exists()`, which needs
  `storage.buckets.get`, a permission `objectAdmin` does not include. Both roles
  together give exactly object CRUD plus bucket-existence read; least-privilege intact.

### Known limitations

- Cloud Run custom domain mappings are unsupported in `asia-south1` (API returns 501
  `UNIMPLEMENTED`). `parallelcs.dmj.one` is served via a Cloudflare proxied CNAME to
  the `*.run.app` host plus a Cloudflare Origin Rule that rewrites the Host header
  (Cloud Run 404s on an unrecognized Host). See the deploy report / README.

## [1.0.0] - 2026-05-17

### Added

- Initial ParallelCS release: a single self-updating Cloud Run service serving an
  AI-native, product-centric CS curriculum.
- Cloud infrastructure on GCP project `dmjone`, region `asia-south1`:
  - Dedicated least-privilege runtime service account `parallelcs-run@dmjone.iam.gserviceaccount.com`.
    Project roles: `aiplatform.user`, `logging.logWriter`, `monitoring.metricWriter`.
    Bucket-scoped role: `storage.objectAdmin` on `gs://dmjone-parallelcs-content` only.
  - Private GCS bucket `gs://dmjone-parallelcs-content` (uniform bucket-level access,
    public access prevention enforced) for curriculum content and self-update state.
  - Deployer (`user:divyamohan1993@gmail.com`) granted `iam.serviceAccountUser` on the
    runtime SA so `gcloud run deploy` can attach it.
- `deploy/` directory with future-scale infrastructure as code:
  - `docker-compose.yml` for local/single-host runs.
  - Kustomize manifests (`deploy/k8s/`) for a future Kubernetes tier.
  - Terraform module (`deploy/terraform/`) encoding the runtime SA, IAM bindings,
    content bucket, and Cloud Run service. Not applied now; reference for scale-up.
- `autoconfig.sh` / `autoconfig.bat`: idempotent one-shot deploy wrappers around
  `gcloud run deploy --source`. Re-runnable; no manual steps.

### Security

- No API keys anywhere. Vertex AI and GCS authenticate via ADC / the attached
  service account. No service account keys are created or downloaded.
- Runtime service account holds strictly least-privilege roles: no Editor, no Owner,
  no project-wide Storage Admin. Storage access is scoped to the single content bucket.
- Content bucket has public access prevention enforced and uniform bucket-level access.

### Infrastructure

- Cloud Run service configured for `$0` idle cost: `--min-instances=0` (scale to zero),
  `--max-instances=4`, `--cpu=1 --memory=512Mi`, `--concurrency=80`, `--timeout=120`.
  Default CPU throttling left on, so CPU is billed only during request handling.
