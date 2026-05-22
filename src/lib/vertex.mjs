// Vertex AI (Gemini), the weekly agentic curriculum-evolution harness.
// Vertex mode: IAM auth via ADC from the attached service account, no API key.
//
// Three steps, run once per IST week with the most capable available model and
// maximum thinking: (1) research what changed in the AI-engineering landscape,
// (2) propose a typed diff of curriculum operations, (3) self-verify that diff.
// The caller (update.mjs) applies the diff under hard deterministic guardrails.
import { GoogleGenAI } from '@google/genai';
import { env } from './env.mjs';

const ai = new GoogleGenAI({
  vertexai: true,
  project: env.GCP_PROJECT,
  location: env.VERTEX_LOCATION,
});

// Literal sentinel meaning the curriculum needs no change this week.
export const NO_CHANGE = 'NO_CHANGE';

// Maximum (dynamic) thinking, the model reasons as deeply as the task needs.
const THINKING = { thinkingBudget: -1 };

/**
 * Score a Gemini model id so the strongest one can be picked automatically.
 * @param {string} rawId
 * @returns {number} higher = better; -Infinity if not a usable text model
 */
export function scoreModel(rawId) {
  const id = String(rawId || '').toLowerCase().split('/').pop() || '';
  if (!id.includes('gemini')) return -Infinity;
  if (/embedding|imagen|veo|aqa|tts|image-generation|vision/.test(id)) return -Infinity;
  const gen = id.match(/gemini-(\d+)(?:[.-](\d+))?/);
  if (!gen) return -Infinity;
  const generation = Number(gen[1]) + (gen[2] ? Number(gen[2]) / 10 : 0);
  let tier = 0;
  if (id.includes('flash-lite')) tier = 1;
  else if (id.includes('flash')) tier = 2;
  else if (id.includes('pro')) tier = 3;
  else if (id.includes('ultra')) tier = 4;
  const previewPenalty = /preview|exp|experimental/.test(id) ? 0.5 : 0;
  return generation * 100 + tier - previewPenalty;
}

/**
 * Auto-discover the most powerful Gemini model available to this project.
 * Falls back to env.GEMINI_MODEL if discovery is unavailable.
 * @param {AbortSignal} [signal]
 * @returns {Promise<string>}
 */
export async function pickBestModel(signal) {
  try {
    const pager = await ai.models.list({ config: { queryBase: true } });
    let best = null;
    let bestScore = -Infinity;
    for await (const m of pager) {
      if (signal?.aborted) break;
      const id = String(m?.name || '').split('/').pop();
      if (!id) continue;
      const actions = m?.supportedActions || m?.supportedGenerationMethods || [];
      if (Array.isArray(actions) && actions.length && !actions.includes('generateContent')) continue;
      const score = scoreModel(id);
      if (score > bestScore) {
        bestScore = score;
        best = id;
      }
    }
    if (best) return best;
  } catch {
    // Discovery unavailable, fall through to the configured default.
  }
  return env.GEMINI_MODEL;
}

/** Compact JSON view of the curriculum for prompts (drops long prose). */
function compact(c) {
  return JSON.stringify({
    tracks: (c.tracks ?? []).map((t) => ({
      id: t.id, title: t.title, tagline: t.tagline, focus: t.focus,
    })),
    concepts: (c.concepts ?? []).map((x) => ({
      id: x.id, title: x.title, trackId: x.trackId, week: x.week,
      subjectLink: x.subjectLink ?? '', prereqs: x.prereqs ?? [],
      resources: (x.resources ?? []).map((r) => ({
        title: r.title, url: r.url, source: r.source, type: r.type,
      })),
    })),
    projects: (c.projects ?? []).map((p) => ({
      id: p.id, title: p.title, trackId: p.trackId, week: p.week, syllabusTag: p.syllabusTag,
    })),
  });
}

/** Defensively parse JSON from model text (tolerates fences / surrounding prose). */
export function parseJsonLoose(text) {
  let body = String(text ?? '').trim();
  if (!body) return null;
  body = body.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  const first = body.indexOf('{');
  const last = body.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) body = body.slice(first, last + 1);
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

/**
 * STEP 1, research. Grounded, max-thinking call: what has materially changed
 * in the AI-engineering landscape since the last update.
 * @returns {Promise<string>} concise plain-text findings
 */
export async function researchTrends(model, curriculum, sinceNote, signal) {
  const trackList = (curriculum.tracks ?? []).map((t) => `${t.id}: ${t.title}`).join('; ');
  const prompt = [
    'You maintain an elite, AI-native computer-science curriculum. Using Google',
    'Search, research what has MATERIALLY changed in AI / AI-engineering and its',
    'free learning landscape recently. Search freely and widely.',
    '',
    `Context, ${sinceNote}. The curriculum currently has these tracks: ${trackList}.`,
    '',
    'Report concisely, as findings (not instructions):',
    '- New techniques, models, or practices that a frontier AI engineer must now know.',
    '- Topics that have become obsolete or clearly less important.',
    '- Genuinely new, high-quality, FREE learning resources from reputable sources',
    '  (MIT/Stanford/CMU, 3Blue1Brown, Karpathy, official docs, arXiv, etc.).',
    '- Whether any whole area is missing from the track list above.',
    'Be specific and cite sources. If little has changed, say so plainly.',
  ].join('\n');
  const res = await ai.models.generateContent({
    model,
    contents: prompt,
    config: { tools: [{ googleSearch: {} }], thinkingConfig: THINKING, abortSignal: signal },
  });
  return (res.text ?? '').trim();
}

/**
 * STEP 2, propose. Max-thinking call: turn findings into a typed diff.
 * @returns {Promise<{noChange:true}|{noChange:false,summary:string,operations:object[]}>}
 */
export async function proposeCurriculumDiff(model, curriculum, findings, signal) {
  const prompt = [
    'You evolve an elite AI-native CS curriculum. Given the CURRENT curriculum and',
    'fresh RESEARCH FINDINGS, propose a careful, conservative set of changes.',
    '',
    'Output JSON ONLY, of the form:',
    `  {"summary":"<one sentence>","operations":[ ... ]}, or exactly  ${NO_CHANGE}`,
    '',
    'Operation types (use the EXACT entity shapes):',
    '- {"op":"updateConcept","concept":{...}}, replaces a concept by its id',
    '- {"op":"addConcept","concept":{...}}',
    '- {"op":"removeConcept","conceptId":"<id>","reason":"<why>"}',
    '- {"op":"addProject","project":{...}} / {"op":"updateProject","project":{...}}',
    '- {"op":"removeProject","projectId":"<id>","reason":"<why>"}',
    '- {"op":"addTrack","track":{...}} / {"op":"updateTrack","track":{...}}',
    '- {"op":"removeTrack","trackId":"<id>","reason":"<why>"}',
    '',
    'Entity shapes:',
    'Track: {id:kebab-case, title, tagline, focus}',
    'Concept: {id:kebab-case, title, summary, trackId, week:1-12, prereqs:[conceptId],',
    '  resources:[{title,url:https,source,type:video|article|course|guide|repo|paper|interactive,free:true}], subjectLink?}',
    'Project: {id:kebab-case, title, trackId, week:1-12, brief, deliverable,',
    '  evalRubric:[string], syllabusTag, stack?:[string], industryContext?, features?:[string], marketSignal?}',
    '',
    'Rules: be conservative, most weeks need few or no changes. Prefer refreshing',
    'resources and tightening concepts over adding/removing. Only add a track for a',
    'genuinely new major area; only remove what is truly obsolete and say why.',
    'Preserve existing ids. New ids must be unique kebab-case. Every URL must be a',
    'real, working https link to a real free resource, never invent URLs. trackId',
    'on a concept/project must reference an existing track (or one you add this run).',
    '',
    '--- CURRENT CURRICULUM ---',
    compact(curriculum),
    '',
    '--- RESEARCH FINDINGS ---',
    findings,
  ].join('\n');
  const res = await ai.models.generateContent({
    model,
    contents: prompt,
    config: { responseMimeType: 'application/json', thinkingConfig: THINKING, abortSignal: signal },
  });
  const txt = (res.text ?? '').trim();
  if (/^["'`]*NO_CHANGE["'`]*$/i.test(txt)) return { noChange: true };
  const parsed = parseJsonLoose(txt);
  if (!parsed || !Array.isArray(parsed.operations) || parsed.operations.length === 0) {
    return { noChange: true };
  }
  return { noChange: false, summary: String(parsed.summary || 'Curriculum revision.'), operations: parsed.operations };
}

/**
 * STEP 3, self-verify. Strict-reviewer max-thinking call on the proposed result.
 * @returns {Promise<{approved:boolean,reason:string}>}
 */
export async function verifyRevision(model, before, after, summary, signal) {
  const prompt = [
    'You are a STRICT curriculum reviewer. A proposed weekly revision is below.',
    'Approve it ONLY if ALL hold:',
    '- It is coherent and at least as good as the current curriculum.',
    '- Any removed track/concept/project is genuinely obsolete (not still valuable).',
    '- Concept prerequisite chains and track references are intact.',
    '- Resource URLs are plausible real links to reputable free sources, not invented.',
    '- Nothing important was lost; the curriculum is not degraded or incoherent.',
    '',
    `Proposed change summary: ${summary}`,
    '',
    'Reply JSON only: {"approved":true|false,"reason":"<concise>"}.',
    '',
    '--- CURRENT ---',
    compact(before),
    '',
    '--- PROPOSED ---',
    compact(after),
  ].join('\n');
  const res = await ai.models.generateContent({
    model,
    contents: prompt,
    config: { responseMimeType: 'application/json', thinkingConfig: THINKING, abortSignal: signal },
  });
  const parsed = parseJsonLoose((res.text ?? '').trim());
  if (!parsed || typeof parsed.approved !== 'boolean') {
    return { approved: false, reason: 'Verifier returned no clear verdict.' };
  }
  return { approved: parsed.approved, reason: String(parsed.reason || '') };
}
