# ParallelCS

**Become enterprise-deployable from day one.**

University computer science lags the modern AI stack by three to five years. Faculty teach pre-LLM CS. Learners who want to *build* are left to assemble a path from a hundred scattered channels on their own, and graduate with a transcript, not a portfolio.

ParallelCS is the path. It is a knowledge-graph-routed route through the best free learning on Earth, 3Blue1Brown, MIT OpenCourseWare, Andrej Karpathy's *Neural Networks: Zero to Hero*, Stanford, Anthropic's *Building Effective Agents*, with frontier project briefs and demanding evaluation rubrics layered on top.

You orchestrate the AI. You ship the product. You aim at a ₹1-crore-tier AI-era career, not a certificate.

It is free. It is course-aligned. It exists to get you hired.

---

## What it is

Four twelve-week elite tracks, one knowledge graph:

- **Agentic Systems Engineering**, multi-agent orchestration, evals, autonomous delivery.
- **AI Infrastructure & Inference**, serving, batching, quantization at production scale.
- **Applied ML & Model Engineering**, from transformers to fine-tuning and distillation.
- **Production AI Products**, turn a repo into a live, public, enterprise-grade product.

Every concept is a node. Every edge is a prerequisite. Every advanced topic explicitly **bridges back to a classic CS subject**, Operating Systems, Distributed Systems, Databases, Compilers, so a learner sees how the frontier connects to the fundamentals. Every track ends with a production-grade project brief, an unforgiving rubric, and a publicly hosted product that doubles as your coursework. No choice between the degree and the build.

## Curation, not authorship

ParallelCS does not re-record a single lecture. It **routes**. Every resource links to and credits its original creator. The original work here is the routing, the briefs, and the rubrics, the glue that turns scattered brilliance into a path you can walk. The brand never charges money.

## How it stays current

ParallelCS is a single self-updating service. Once per day it researches the latest free CS and AI learning resources and merges what it finds into the live curriculum. The curriculum cannot go stale, it moves with the frontier. The `/status` page reports the most recent run with full transparency.

## The 30-day challenge

Each semester a free cohort runs on Discord: thirty days, one shipped product per learner. You take the mandate, learn just enough, build in the open, and ship publicly. The first cohort's deployed products become the marketing for the next, public proof, compounding.

---

## Run it locally

Requires Node 24+ and [pnpm](https://pnpm.io/).

```bash
pnpm install
pnpm start        # serves on http://localhost:8080
```

Configuration is environment-driven and validated at startup, see `.env.example`. The service seeds itself from `src/content/seed-curriculum.json` on first run.

## Routes

| Path              | Page                                            |
| ----------------- | ----------------------------------------------- |
| `/`               | Home                                            |
| `/track/:id`      | A single 12-week track                          |
| `/graph`          | The knowledge graph                             |
| `/projects`       | All project briefs and rubrics                  |
| `/challenge`      | The 30-day AI-builder challenge                 |
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
