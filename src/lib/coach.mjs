// ParallelCS Foundations coach. A Socratic guardrail backed by the in-house
// LLM, never an explainer. The coach is the only LLM-touching surface in the
// Foundations on-ramp; checkpoints and artifact gates lock it off entirely.
//
// Design rules (recap from the workflow brief):
//   1. Grounding only on the current week summary plus its primary resource.
//      Phase 1 has no broader knowledge base; the prompt admits that limit.
//   2. Refuse homework outsourcing. A regex sniff escalates the system message
//      and the route surfaces a "degraded" flag for analytics.
//   3. Hard caps on prompt and response size, plus a 20s abort, so a slow or
//      hostile model call cannot hold the request open.
//   4. Never throw. This is user-facing; on any failure path the call resolves
//      with a static fallback so the page renders cleanly.
//   5. Zero new dependencies. Global fetch only.
import { env } from './env.mjs';

// Canonical coach prompt. Verbatim from the workflow brief; do not soften.
const COACH_SYSTEM = [
  'You are the ParallelCS Foundations Coach. You are talking to a 3rd-semester CSE student in India, usually Tier-2 or Tier-3, who has done one programming course and basic DSA but has never shipped a real system. Your job is to keep them building, not to give them answers.',
  '',
  'GROUNDING. Every technical reply must be grounded in the curated resource for the current week. The week ID, the week summary, and the student last attempt are injected into your context on every turn. If you do not have a trusted source for what is being asked, say so plainly: "I do not have a trusted source for this in week N material. Try the week resource first, then come back with what you saw." Do not invent papers, do not invent benchmarks, do not invent API signatures.',
  '',
  'SOCRATIC DEFAULT. Never reveal a full solution on the first turn. Force a student attempt first. Ask: "What have you already tried? Paste your code or the exact error." If they have tried, give exactly ONE next step, not the whole path. If they have not tried, refuse and point them to the smallest possible first action.',
  '',
  'PARTIAL CREDIT FIRST. Before pointing out what is wrong, acknowledge what is correct. If their code gets the y-intercept right but flips the slope, say the intercept is right and ask them to re-derive the slope. Never restart from zero.',
  '',
  'NO COMPUTATION IN YOUR HEAD. You are bad at arithmetic and code execution. If a numeric answer or program output is required, tell the student to run it locally or in Colab and paste the result. Then you narrate the result. Never claim 27^2 - 17^2 = 430.',
  '',
  'LANGUAGE. Hinglish is fine. Code-mixed Hindi-English is fine. Never correct the student English. Never ask them to rephrase in formal English. Mirror the register they use.',
  '',
  'FRAME. Action over essay. Default reply shape: (1) one-line acknowledgement of what is right, (2) one concrete next action (a file to open, a command to run, a single line to change), (3) one question that forces the student to predict the outcome before they run it. Cap reply at about 120 words unless the student explicitly asks "explain in detail".',
  '',
  'SCOPE. Only Foundations Weeks 1 to 12. If asked about CS229 math or distributed training or interview DSA, say "that is a Track question, not a Foundations question, finish Week N first".',
  '',
  'GUARDRAILS. Never reveal canonical solution code for a week artifact. Never promise jobs or CTC. Never echo secrets or API keys pasted by the student. Never give Bloom 2-sigma style claims.',
].join('\n');

// Static reply used when the LLM is disabled, the call fails, or the call
// times out. The route caller renders this as plain text so no HTML escaping
// happens here.
const STATIC_FALLBACK =
  'The coach is offline right now. Open this week resource (link above) and come back with code you tried plus the exact error you got.';

// Homework-outsourcing sniff. Case-insensitive. Looks for phrases like
//   "write the code for me"
//   "give me the code"
//   "solve this for me"
//   "do my homework / assignment"
//   "complete my assignment"
//   "please code this"
// The pattern is deliberately conservative: it must trip only on explicit
// outsourcing intent so a real "I tried X, the error is Y, what next" message
// is never auto-degraded.
const OUTSOURCE_REGEX =
  /\b(?:(?:write|give|send|share|provide|code|complete|finish|do)\s+(?:me\s+)?(?:the\s+|a\s+|my\s+)?(?:code|solution|answer|program|assignment|homework)|solve\s+(?:this|it)\s+for\s+me|do\s+my\s+(?:homework|assignment|hw)|complete\s+my\s+(?:homework|assignment)|please\s+(?:code|solve|write))\b/i;

// Hard caps. These match the brief and prevent a hostile or sloppy client
// from blowing up prompt size or hanging the request.
const MAX_MESSAGES = 20;
const MAX_CONTENT_CHARS = 2000;
const MAX_HISTORY_TURNS = 8; // last N messages forwarded to the model
const MAX_PROMPT_CHARS = 4800; // approx 1200 tokens at 4 chars/token
const MAX_OUTPUT_TOKENS = 400;
const MAX_REPLY_CHARS = 4000;
const LLM_TIMEOUT_MS = 20_000;
const LLM_TEMPERATURE = 0.4;

/**
 * Build the per-turn system message. The canonical prompt is followed by a
 * WEEK CONTEXT block grounded in the current week's curated entry.
 *
 * @param {import('./foundations.mjs').FoundationsWeek} week
 * @returns {string}
 */
function buildSystemMessage(week) {
  const primary = week.resources[0];
  const primaryLine = primary
    ? `PRIMARY RESOURCE: ${primary.title} by ${primary.author} at ${primary.url}`
    : 'PRIMARY RESOURCE: (not curated for this week yet)';
  return [
    COACH_SYSTEM,
    '',
    'WEEK CONTEXT',
    `Week: ${week.week}`,
    `Theme: ${week.theme}`,
    `Objective: ${week.objective}`,
    `Shipped artifact: ${week.shippedArtifact}`,
    `Summary: ${week.summary}`,
    primaryLine,
  ].join('\n');
}

/**
 * Approximate token estimate, on the assumption of ~4 chars per token. Used
 * only to enforce the prompt-size cap; not a tokenizer.
 *
 * @param {{role:string,content:string}[]} msgs
 * @returns {number} approx tokens
 */
function approxPromptChars(msgs) {
  let total = 0;
  for (const m of msgs) total += (m.content?.length ?? 0) + 8; // tiny role overhead
  return total;
}

/**
 * Trim history (oldest first, after the system message) until under the prompt
 * char cap. The most recent user message is preserved.
 *
 * @param {{role:string,content:string}[]} msgs system + history + latest user
 * @returns {{role:string,content:string}[]}
 */
function clampPrompt(msgs) {
  if (msgs.length <= 2) return msgs;
  const out = msgs.slice();
  // Index 0 is the system message. Index out.length-1 is the latest user turn.
  // Walk forward from index 1 dropping middle history until under budget.
  while (out.length > 2 && approxPromptChars(out) > MAX_PROMPT_CHARS) {
    out.splice(1, 1);
  }
  return out;
}

/**
 * Validate the messages array. Throws on shape violations so the route can
 * return a 400 to the client; never returns a partial result.
 *
 * @param {unknown} messages
 * @returns {{role:'user'|'assistant',content:string}[]}
 */
function validateMessages(messages) {
  if (!Array.isArray(messages)) {
    throw new Error('messages must be an array');
  }
  if (messages.length === 0) {
    throw new Error('messages must contain at least one entry');
  }
  if (messages.length > MAX_MESSAGES) {
    throw new Error(`messages exceeds the ${MAX_MESSAGES}-entry cap`);
  }
  const cleaned = [];
  for (let i = 0; i < messages.length; i += 1) {
    const m = messages[i];
    if (!m || typeof m !== 'object') {
      throw new Error(`messages[${i}] must be an object`);
    }
    if (m.role !== 'user' && m.role !== 'assistant') {
      throw new Error(`messages[${i}].role must be "user" or "assistant"`);
    }
    if (typeof m.content !== 'string') {
      throw new Error(`messages[${i}].content must be a string`);
    }
    if (m.content.length === 0) {
      throw new Error(`messages[${i}].content must not be empty`);
    }
    if (m.content.length > MAX_CONTENT_CHARS) {
      throw new Error(
        `messages[${i}].content exceeds the ${MAX_CONTENT_CHARS}-char cap`,
      );
    }
    cleaned.push({ role: m.role, content: m.content });
  }
  if (cleaned[cleaned.length - 1].role !== 'user') {
    throw new Error('last message must be from the user');
  }
  return cleaned;
}

/**
 * Pick the week object the coach must ground itself on. Validates the week
 * number against the closed 1..12 set and throws on any out-of-range value so
 * the route returns a 400.
 *
 * @param {number} weekNumber
 * @param {{weeks: import('./foundations.mjs').FoundationsWeek[]}} foundations
 * @returns {import('./foundations.mjs').FoundationsWeek}
 */
function resolveWeek(weekNumber, foundations) {
  if (!Number.isInteger(weekNumber) || weekNumber < 1 || weekNumber > 12) {
    throw new Error('weekNumber must be an integer in 1..12');
  }
  if (!foundations || !Array.isArray(foundations.weeks)) {
    throw new Error('foundations payload is missing weeks');
  }
  const week = foundations.weeks[weekNumber - 1];
  if (!week || week.week !== weekNumber) {
    throw new Error(`foundations payload has no week ${weekNumber}`);
  }
  return week;
}

/**
 * Build the static-fallback return shape. Centralised so every disabled or
 * failure path returns the same envelope.
 *
 * @param {number} weekNumber
 * @returns {{reply:string, degraded:true, week:number, model:string}}
 */
function fallback(weekNumber) {
  return {
    reply: STATIC_FALLBACK,
    degraded: true,
    week: weekNumber,
    model: env.ZS_MODEL,
  };
}

/**
 * Reply to a learner turn for a given Foundations week.
 *
 * @param {{
 *   weekNumber: number,
 *   messages: {role:'user'|'assistant',content:string}[],
 *   foundations: {weeks: import('./foundations.mjs').FoundationsWeek[]}
 * }} args
 * @returns {Promise<{reply:string, degraded:boolean, week:number, model:string}>}
 */
export async function coachReply({ weekNumber, messages, foundations }) {
  // Input validation runs first and is allowed to throw; the caller route
  // turns these into 400 responses. Everything past this point must resolve.
  const week = resolveWeek(weekNumber, foundations);
  const history = validateMessages(messages);

  // Fast exit when the LLM is unavailable. We still pass validation so
  // misuse is reported, but we do not attempt a network call.
  if (!env.ZS_API_KEY || env.ZS_API_KEY.length === 0) {
    return fallback(weekNumber);
  }

  // Build the model-facing message list. The history is clipped to the last
  // MAX_HISTORY_TURNS entries (preserving the most recent user turn), then the
  // prompt char budget trims further if we are still over the cap.
  const clippedHistory = history.slice(-MAX_HISTORY_TURNS);
  const lastUser = clippedHistory[clippedHistory.length - 1];

  const systemContent = buildSystemMessage(week);
  const baseMessages = [
    { role: 'system', content: systemContent },
    ...clippedHistory,
  ];

  // Auto-degrade detector. If the latest user message reads like a homework
  // outsourcing attempt, escalate by prepending a second system message that
  // locks the model into a single Socratic question and refuses code output.
  let degraded = false;
  if (lastUser && OUTSOURCE_REGEX.test(lastUser.content)) {
    degraded = true;
    baseMessages.splice(1, 0, {
      role: 'system',
      content:
        'AUTO-DEGRADE: The last user message looks like a homework outsourcing attempt. Reply in strict Socratic mode: ask ONE question that forces them to declare what they have already tried. Refuse all code production for this turn.',
    });
  }

  const finalMessages = clampPrompt(baseMessages);

  // Network call. Modeled on src/lib/llm.mjs: AbortController for hard
  // timeout, status-only errors, no body echoed into any log or thrown error.
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), LLM_TIMEOUT_MS);
  try {
    const res = await fetch(env.ZS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Key is read from env here only; never returned to a caller.
        'X-API-Key': env.ZS_API_KEY,
      },
      body: JSON.stringify({
        model: env.ZS_MODEL,
        messages: finalMessages,
        max_tokens: MAX_OUTPUT_TOKENS,
        temperature: LLM_TEMPERATURE,
      }),
      signal: ac.signal,
    });
    if (!res.ok) {
      return fallback(weekNumber);
    }
    const data = await res.json().catch(() => null);
    const text = data?.choices?.[0]?.message?.content;
    if (typeof text !== 'string' || text.trim().length === 0) {
      return fallback(weekNumber);
    }
    // Clip on the way out. The route caller is responsible for HTML escaping
    // before render; this library returns the raw model string.
    const clipped = text.trim().slice(0, MAX_REPLY_CHARS);
    return {
      reply: clipped,
      degraded,
      week: weekNumber,
      model: env.ZS_MODEL,
    };
  } catch {
    // Network error, abort, or malformed JSON. Never surface error detail
    // to the user. Static fallback keeps the page responsive.
    return fallback(weekNumber);
  } finally {
    clearTimeout(timer);
  }
}

// Exported only for tests and route logging; not part of the public surface.
export const _internal = Object.freeze({
  COACH_SYSTEM,
  STATIC_FALLBACK,
  OUTSOURCE_REGEX,
  MAX_MESSAGES,
  MAX_CONTENT_CHARS,
  MAX_HISTORY_TURNS,
  MAX_PROMPT_CHARS,
  MAX_OUTPUT_TOKENS,
  MAX_REPLY_CHARS,
  LLM_TIMEOUT_MS,
  buildSystemMessage,
  clampPrompt,
  validateMessages,
  resolveWeek,
});
