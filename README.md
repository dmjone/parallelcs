# ParallelCS

**Become enterprise-deployable from day one.**

University computer science lags the modern AI stack by three to five years. Faculty teach pre-LLM CS. Learners who want to *build* are left to assemble a path from a hundred scattered channels on their own, and graduate with a transcript, not a portfolio.

ParallelCS is the path. It is a knowledge-graph-routed route through the best free learning on Earth, 3Blue1Brown, MIT OpenCourseWare, Andrej Karpathy's *Neural Networks: Zero to Hero*, Stanford, Anthropic's *Building Effective Agents*, with frontier project briefs and demanding evaluation rubrics layered on top.

You orchestrate the AI. You ship the product. You aim at a ₹1-crore-tier AI-era career, not a certificate.

It is free. It is course-aligned. It exists to get you hired.

---

## What it is

Eight elite tracks, one knowledge graph (the set evolves with the frontier). A few of them:

- **Agentic Systems Engineering**, multi-agent orchestration, evals, autonomous delivery.
- **AI Infrastructure & Inference**, serving, batching, quantization at production scale.
- **Applied ML & Model Engineering**, from transformers to fine-tuning and distillation.
- **Production AI Products**, turn a repo into a live, public, enterprise-grade product.

Every concept is a node. Every edge is a prerequisite. Every advanced topic explicitly **bridges back to a classic CS subject**, Operating Systems, Distributed Systems, Databases, Compilers, so a learner sees how the frontier connects to the fundamentals. Every track ends with a production-grade project brief, an unforgiving rubric, and a publicly hosted product that doubles as your coursework. No choice between the degree and the build.

## Curation, not authorship

ParallelCS does not re-record a single lecture. It **routes**. Every resource links to and credits its original creator. The original work here is the routing, the briefs, and the rubrics, the glue that turns scattered brilliance into a path you can walk. The brand never charges money.

## How it stays current

ParallelCS is a single self-updating service. Once a week it researches the latest free CS and AI learning resources and merges what it finds into the live curriculum. The curriculum cannot go stale, it moves with the frontier. The `/status` page reports the most recent run with full transparency.

## The 30-Day Challenge

Each semester a free cohort runs on Discord: 30 days, one shipped product per learner. You take the mandate, learn just enough, build in the open, and ship publicly. The first cohort's deployed products become the marketing for the next, public proof, compounding.

---

## Run it locally

Requires Node 22+ and [pnpm](https://pnpm.io/).

```bash
pnpm install
pnpm start        # serves on http://localhost:8080
```

Configuration is environment-driven and validated at startup, see `.env.example`. The service seeds itself from `src/content/seed-curriculum.json` on first run.

## Foundations

`/foundations` is the public on-ramp for a third-semester Tier-2/3 CSE student who wants to build AI systems. It is a single 12-week linear path, not a buffet. Each week routes to one curated free resource from people like 3Blue1Brown, Karpathy, MIT, fast.ai, and Anthropic, and ends with a public GitHub repo plus a live URL. Weeks 4 and 8 are coach-off micro-checkpoints; Week 12 is the final AI-off readiness gate into the Agentic Systems Track. A Socratic coach is available on the other weeks: one hint per turn, no full solutions, Hinglish welcome. See [/foundations](/foundations).

## Keeping the seed fresh

The live service evolves its curriculum weekly and stores it in GCS. The bundled `src/content/seed-curriculum.json` is only used to seed a **cold** bucket (first run or disaster recovery), so it must never fall behind the live version, or a cold start would regress production to stale content.

Pull the live curriculum into the seed before it drifts (this never downgrades a newer seed):

```bash
pnpm sync-seed                                   # from production
PARALLELCS_URL=http://localhost:8099 pnpm sync-seed   # from a local instance
```

A **pre-push guard** enforces the invariant: it blocks a push when the live `/api/curriculum` version is newer than your seed, and tells you to run `pnpm sync-seed` first. It fails open when the server is unreachable, and is bypassable with `SKIP_SEED_CHECK=1 git push` (or `git push --no-verify`).

The check itself ships in the repo (`scripts/check-seed-freshness.mjs`). It runs through a generic pre-push dispatcher in your global `core.hooksPath`, so it does not disturb other repos or your global `pre-commit`. To install the dispatcher on a fresh machine, drop this into `$(git config --global core.hooksPath)/pre-push` and `chmod +x` it:

```sh
#!/bin/sh
root="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0
check="$root/scripts/check-seed-freshness.mjs"
[ -f "$check" ] || exit 0
exec node "$check"
```

## Routes

| Path              | Page                                            |
| ----------------- | ----------------------------------------------- |
| `/`               | Home                                            |
| `/track/:id`      | A single 12-week track                          |
| `/graph`          | The knowledge graph                             |
| `/projects`       | All project briefs and rubrics                  |
| `/challenge`      | The 30-Day Challenge                            |
| `/status`         | Last self-update result                         |
| `/pitch`          | Ten-slide pitch deck                            |
| `/api/curriculum` | The full curriculum as JSON                     |
| `/health`         | Shallow liveness check                          |
| `/health/ready`   | Deep readiness check                            |

## Project layout

```
src/
  server.mjs              HTTP service and routing
  lib/                    schema, env, storage, self-update
  content/
    seed-curriculum.json  the seed knowledge graph
  views/
    index.mjs             page layout + every view (pure render functions)
    pitch.mjs             self-contained pitch deck
```

## Design and accessibility

The interface is light, optimistic, and enterprise-grade, a deep electric-indigo trust primary, an emerald growth accent, and an amber energy accent for calls to action, on warm-white paper. It is built to feel confident and trustworthy, and to meet **WCAG 2.2 AA**: semantic HTML, ARIA landmarks, full keyboard navigation, a visible skip link, logical focus order, visible focus styling, no meaning carried by colour alone, and `prefers-reduced-motion` honoured. A tasteful dark variant follows the system preference. All styling is inlined under a per-request CSP nonce; there are zero external or CDN assets.

## License

MIT. Use it, fork it, remix it, and credit the sources, as we do.
