// Weekly-update resilience test. Exercises the REAL applyOps guardrail pipeline
// with a synthetic proposal that adds a brand-new category, modifies one, and
// removes one, then validates and renders EVERY view to prove the data-driven
// layout survives radical content change. No GCS/Vertex needed.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// The update/env modules validate config at import time. This test exercises
// only the pure functions (no GCS/Vertex), so provide harmless defaults first,
// then load the modules dynamically.
process.env.CONTENT_BUCKET ??= 'resilience-test';
process.env.GCP_PROJECT ??= 'resilience-test';
process.env.NODE_ENV ??= 'test';

const { applyOps } = await import('../src/lib/update.mjs');
const { CurriculumSchema } = await import('../src/lib/schema.mjs');
const V = await import('../src/views/index.mjs');
const { pitchPage } = await import('../src/views/pitch.mjs');
const { pitchCloPage } = await import('../src/views/pitch-clo.mjs');

const SEED = fileURLToPath(new URL('../src/content/seed-curriculum.json', import.meta.url));
const seed = CurriculumSchema.parse(JSON.parse(await readFile(SEED, 'utf8')));
const before = {
  tracks: seed.tracks.length,
  concepts: seed.concepts.length,
  projects: seed.projects.length,
};

// A proposal the way the weekly Vertex pass would emit one: a new category, a
// modified category, a removed category, plus concepts and a project.
const operations = [
  {
    op: 'addTrack',
    track: {
      id: 'quantum-ml',
      title: 'Quantum Machine Learning',
      tagline: 'Where quantum computing meets modern ML.',
      focus: 'Variational circuits, quantum kernels, and hybrid quantum-classical models you can actually run.',
    },
  },
  {
    op: 'addConcept',
    concept: {
      id: 'qml-variational-circuits',
      title: 'Variational Quantum Circuits',
      summary: 'Parameterized circuits trained like neural nets, the workhorse of near-term quantum ML.',
      trackId: 'quantum-ml',
      week: 1,
      prereqs: [],
      resources: [
        { title: 'PennyLane: Quantum Machine Learning', url: 'https://pennylane.ai/qml/', source: 'Xanadu', type: 'course', free: true },
      ],
      subjectLink: 'Linear Algebra',
    },
  },
  {
    op: 'addConcept',
    concept: {
      id: 'qml-quantum-kernels',
      title: 'Quantum Kernels and Feature Maps',
      summary: 'Encoding data into Hilbert space to compute kernels classically intractable to evaluate.',
      trackId: 'quantum-ml',
      week: 3,
      prereqs: ['qml-variational-circuits'],
      resources: [
        { title: 'IBM Quantum Learning', url: 'https://learning.quantum.ibm.com/', source: 'IBM', type: 'course', free: true },
      ],
      subjectLink: 'Machine Learning',
    },
  },
  {
    op: 'addProject',
    project: {
      id: 'qml-hybrid-classifier',
      title: 'Hybrid Quantum-Classical Image Classifier',
      trackId: 'quantum-ml',
      week: 8,
      brief: 'Ship a deployable demo that classifies images with a variational quantum circuit backend and a classical front end, hosted publicly with a clean UI.',
      deliverable: 'A live web app with a quantum-backed inference endpoint and a written accuracy report.',
      evalRubric: ['Runs on a real simulator backend', 'Honest accuracy vs a classical baseline', 'Public URL', 'Accessible UI'],
      syllabusTag: 'Machine Learning',
      stack: ['PennyLane', 'PyTorch', 'FastAPI'],
    },
  },
  {
    op: 'updateTrack',
    track: {
      id: 'frontier-systems',
      title: 'Frontier Systems',
      tagline: 'Build at the edge of what models can do today.',
      focus: 'Updated by the weekly pass: long-context, reasoning models, and test-time compute.',
    },
  },
  {
    op: 'removeTrack',
    trackId: 'multimodal-generative',
    reason: 'Simulated: merged into other tracks by the weekly update.',
  },
];

const { next, applied, skipped } = applyOps(seed, operations);

console.log('=== APPLIED OPS ===');
applied.forEach((a) => console.log('  +', a));
console.log('=== SKIPPED (guardrails) ===');
(skipped.length ? skipped : ['none']).forEach((s) => console.log('  -', s));

const parsed = CurriculumSchema.safeParse(next);
console.log('\n=== VALIDATION ===');
console.log('next curriculum valid against schema:', parsed.success);
if (!parsed.success) { console.log(parsed.error.issues.slice(0, 5)); process.exit(1); }

console.log('\n=== CONTENT DELTA ===');
console.log(`tracks   ${before.tracks} -> ${next.tracks.length}`);
console.log(`concepts ${before.concepts} -> ${next.concepts.length}`);
console.log(`projects ${before.projects} -> ${next.projects.length}`);
console.log('new category present (quantum-ml):', next.tracks.some((t) => t.id === 'quantum-ml'));
console.log('category removed (multimodal-generative gone):', !next.tracks.some((t) => t.id === 'multimodal-generative'));
console.log('category modified (frontier-systems tagline):', next.tracks.find((t) => t.id === 'frontier-systems')?.tagline);
console.log('orphaned concepts after removal:', next.concepts.filter((c) => !next.tracks.some((t) => t.id === c.trackId)).length);
console.log('broken prereqs:', next.concepts.filter((c) => (c.prereqs || []).some((p) => !next.concepts.some((x) => x.id === p))).length);

console.log('\n=== RENDER EVERY VIEW WITH MUTATED CURRICULUM ===');
const nonce = 'testnonce';
let renderFails = 0;
const tryRender = (name, fn) => {
  try { const h = fn(); if (typeof h !== 'string' || h.length < 50) throw new Error('empty'); console.log(`  ok   ${name} (${h.length} bytes)`); }
  catch (e) { renderFails++; console.log(`  FAIL ${name}: ${e.message}`); }
};
tryRender('homeView', () => V.page({ title: 't', description: 'd', path: '/', bodyHtml: V.homeView(next), nonce }));
tryRender('startView', () => V.page({ title: 't', description: 'd', path: '/start', bodyHtml: V.startView(next), nonce }));
tryRender('tracksView', () => V.page({ title: 't', description: 'd', path: '/tracks', bodyHtml: V.tracksView(next), nonce }));
for (const t of next.tracks) tryRender(`trackView:${t.id}`, () => V.page({ title: t.title, description: t.tagline, path: '/track/' + t.id, bodyHtml: V.trackView(next, t), nonce }));
tryRender('graphView', () => V.page({ title: 't', description: 'd', path: '/graph', bodyHtml: V.graphView(next), nonce }));
tryRender('projectsView', () => V.page({ title: 't', description: 'd', path: '/projects', bodyHtml: V.projectsView(next), nonce }));
tryRender('challengeView', () => V.page({ title: 't', description: 'd', path: '/challenge', bodyHtml: V.challengeView(next), nonce }));
tryRender('readyView', () => V.page({ title: 't', description: 'd', path: '/ready', bodyHtml: V.readyView(), nonce }));
tryRender('statusView', () => V.page({ title: 't', description: 'd', path: '/status', bodyHtml: V.statusView({ lastUpdateDate: '2026-W21', lastVersion: 2, lastRunAt: new Date().toISOString(), lastResult: 'updated', note: 'simulated' }, next), nonce }));
tryRender('pitchPage', () => pitchPage(nonce, next));
tryRender('pitchCloPage', () => pitchCloPage(nonce, next));

// ---- Foundations on-ramp: render every Foundations view against the real
// data, then mutate the data slightly and re-render to prove the layout
// survives small content shifts. The lib loads, validates and freezes the
// payload at import time, so we deep-clone before mutating.
console.log('\n=== FOUNDATIONS VIEWS ===');
const Fv = await import('../src/views/foundations.mjs');
const Fl = await import('../src/lib/foundations.mjs');
const foundations = Fl.getFoundations();

tryRender('foundationsHomeView', () => V.page({
  title: 'Foundations', description: 'On-ramp', path: '/foundations',
  bodyHtml: Fv.foundationsHomeView(foundations), nonce,
}));
for (let n = 1; n <= 12; n += 1) {
  const week = Fl.getWeek(n);
  tryRender(`foundationsWeekView:${n}`, () => V.page({
    title: `Week ${n}`, description: 'Foundations week', path: `/foundations/week/${n}`,
    bodyHtml: Fv.foundationsWeekView(week, foundations, nonce), nonce,
  }));
}

// Mutate the foundations payload (deep clone first; the loaded object is
// frozen). Truncate one resource title to '' and re-render. The schema
// rejects an empty resource title, so re-validation against the schema is a
// good failure; what the layout test actually needs to prove is that the
// render functions do not throw on slightly shifted data.
const mutated = JSON.parse(JSON.stringify(foundations));
if (mutated.weeks && mutated.weeks[5] && Array.isArray(mutated.weeks[5].resources) && mutated.weeks[5].resources[0]) {
  mutated.weeks[5].resources[0].title = '';
}
const reparsed = Fl.FoundationsSchema.safeParse(mutated);
console.log('mutated foundations valid against schema:', reparsed.success, '(empty title is a good failure)');

tryRender('foundationsHomeView (mutated)', () => V.page({
  title: 'Foundations', description: 'On-ramp', path: '/foundations',
  bodyHtml: Fv.foundationsHomeView(mutated), nonce,
}));
for (let n = 1; n <= 12; n += 1) {
  const week = mutated.weeks[n - 1];
  tryRender(`foundationsWeekView:${n} (mutated)`, () => V.page({
    title: `Week ${n}`, description: 'Foundations week', path: `/foundations/week/${n}`,
    bodyHtml: Fv.foundationsWeekView(week, mutated, nonce), nonce,
  }));
}

console.log(`\n=== RESULT: ${renderFails === 0 ? 'ALL VIEWS RENDERED, layout intact' : renderFails + ' RENDER FAILURES'} ===`);
process.exit(renderFails === 0 ? 0 : 1);
