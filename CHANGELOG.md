# Changelog

All notable changes to ParallelCS are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
this project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed

- **Front page reverted off the 12-week timeline framing**, back to a curriculum-at-a-glance
  view (tracks, concepts, projects, curated free resources) on both the home hero stat band
  and the `/tracks` hero proof. The 12-week journey strip (`weekJourney()`) and its CSS are
  removed. The semester cohort is framed as a **30-day AI-builder challenge** again in the
  pitch decks (`/pitch`, `/pitch-clo`). Reverts the home/pitch wording from the two prior
  commits per client direction.

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
