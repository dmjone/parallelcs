// ParallelCS, Foundations on-ramp views. Pure render functions, zero I/O.
//
// The Foundations path is a separate concept from the 8 elite tracks. It is the
// public on-ramp: 12 weeks, one curated primary resource per week, one shipped
// GitHub repo per week, a Socratic coach on weeks that allow it, coach-off
// micro-checkpoints, and a final ship gate. The audience is a third-semester
// CSE student at a Tier-2/3 Indian college.
//
// This module exports three render functions used by the page shell in
// `src/views/index.mjs`, plus a CSS string the shell injects under the per
// response CSP nonce. No styles or scripts are emitted by this module without
// the nonce that the shell threads through. No external assets, ever.
//
// Imports are kept minimal on purpose: only `esc` is exported by the shell, so
// `kicker` is reimplemented locally with the shared `.kicker` / `.tone-*`
// classes already defined in the shared stylesheet. That keeps Foundations
// self contained today and avoids touching files outside this owner's scope.

import { esc } from './index.mjs';

/* ------------------------------------------------------------------ */
/* Types (JSDoc), the contract this view consumes                     */
/* ------------------------------------------------------------------ */

/**
 * The shape this module renders, matching `src/lib/foundations.mjs` (Owner A).
 * Two fields are load-bearing: `weeks[].checkpointKind` decides whether the
 * chat panel is shown, and `weeks[].resources[0]` is the single curated
 * primary external link (the schema allows 1 to 3 resources per week; the view
 * surfaces the first as the "read one thing" card).
 *
 * @typedef {Object} FoundationsResource
 * @property {string} title
 * @property {string} author
 * @property {string} url
 * @property {('video'|'course'|'docs'|'book'|'interactive'|'reference')} kind
 *
 * @typedef {Object} FoundationsWeek
 * @property {number} week              one based, 1..12
 * @property {string} theme             short title
 * @property {string} objective         one or two sentences, what the learner can do by Sunday
 * @property {string} shippedArtifact   the artifact brief, plain prose (names the public repo and live URL)
 * @property {string} summary           60 to 120 words; used by the coach as grounded context
 * @property {FoundationsResource[]} resources   1 to 3 curated resources, [0] is the primary
 * @property {('normal'|'coach-off-micro-checkpoint'|'final-gate')} checkpointKind
 *
 * @typedef {Object} Foundations
 * @property {number} version
 * @property {string} generatedAt
 * @property {FoundationsWeek[]} weeks  exactly 12 entries, ordered week 1..12
 */

/* ------------------------------------------------------------------ */
/* Local helpers                                                       */
/* ------------------------------------------------------------------ */

/**
 * Small eyebrow / kicker label, mirrors the private `kicker()` in views/index.mjs.
 * Reuses the `.kicker` / `.tone-*` classes from the shared stylesheet so the
 * Foundations pages read as the same site, not a fork.
 * @param {string} label
 * @param {('indigo'|'emerald'|'amber'|'cyan'|'rose')} [tone]
 */
function kicker(label, tone = 'indigo') {
  return `<p class="kicker tone-${tone}"><span class="kicker-tick" aria-hidden="true"></span>${esc(label)}</p>`;
}

/**
 * Defensive accessor for the primary resource (resources[0] in the schema).
 * Returns an object with safe string fallbacks for the four fields the view
 * uses, so the renderer never NPEs on a malformed week.
 */
function primaryResource(week) {
  const r = (week && Array.isArray(week.resources) && week.resources[0]) || null;
  return {
    title: (r && r.title) || '',
    author: (r && r.author) || '',
    kind: (r && r.kind) || '',
    url: (r && r.url) || '',
  };
}

/* ------------------------------------------------------------------ */
/* Foundations stylesheet, injected by the shell under the CSP nonce   */
/* ------------------------------------------------------------------ */

/**
 * Foundations-specific CSS. The shell (`page()` in views/index.mjs) is the
 * only place that emits a `<style>` tag with the per-response nonce, so this
 * constant is exported for the shell to append into its style block (owner D
 * wires this in `server.mjs` when calling `page()`).
 *
 * Palette stays on the existing site tokens (indigo / emerald / amber); the
 * warm-not-elite feel comes from larger hero copy, more breathing room, and
 * an encouraging voice, not from new colors.
 */
export const FOUNDATIONS_CSS = `
/* ---- foundations: warm-but-honest on-ramp ---- */
.f-hero{
  position:relative;border-radius:var(--r-xl);overflow:hidden;
  padding:clamp(2.2rem,6vw,4.4rem);
  background:
    radial-gradient(680px 340px at 8% -10%,var(--amber-soft) 0%,transparent 60%),
    radial-gradient(620px 320px at 100% 0%,var(--indigo-tint) 0%,transparent 70%),
    linear-gradient(170deg,#ffffff 0%,#faf8f1 100%);
  border:1px solid var(--line);box-shadow:var(--shadow-2);
}
.f-hero h1{max-width:18ch;margin-bottom:1.1rem}
.f-hero h1 .grad{
  background:linear-gradient(110deg,var(--indigo),var(--emerald) 80%);
  -webkit-background-clip:text;background-clip:text;color:transparent;
}
.f-lede{font-size:clamp(1.1rem,2.2vw,1.35rem);color:var(--ink-soft);max-width:54ch;margin-bottom:1.8rem;text-align:justify}
.f-actions{display:flex;flex-wrap:wrap;gap:.8rem}
.f-meta{display:flex;flex-wrap:wrap;gap:.5rem 1.4rem;margin-top:1.7rem;font-size:.88rem;color:var(--ink-faint);font-weight:600}
.f-meta span{display:inline-flex;align-items:center;gap:.45rem}
.f-meta .chk{
  width:18px;height:18px;border-radius:50%;flex:none;display:grid;place-items:center;
  background:var(--emerald-soft);color:var(--emerald-deep);font-size:.7rem;font-weight:900;
}

/* ---- vertical 12-step roadmap on /foundations ---- */
.f-roadmap{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:.75rem;counter-reset:fw}
.f-step{position:relative}
.f-link{
  display:grid;grid-template-columns:auto 1fr auto;gap:1rem;align-items:center;
  text-decoration:none;color:var(--ink);
  background:var(--surface);border:1px solid var(--line);border-radius:var(--r);
  padding:1rem 1.2rem;box-shadow:var(--shadow-1);
  transition:transform .16s var(--ease),box-shadow .16s var(--ease),border-color .16s var(--ease);
  border-left:4px solid var(--indigo);
}
.f-link:hover{transform:translateX(4px);box-shadow:var(--shadow-2);border-color:var(--indigo-deep)}
.f-link .f-num{
  flex:none;width:38px;height:38px;border-radius:11px;display:grid;place-items:center;
  font-weight:800;font-size:.95rem;color:#fff;
  background:linear-gradient(150deg,var(--indigo),var(--indigo-deep));
  box-shadow:0 6px 14px -6px #3b35e0aa;
}
.f-link .f-body{min-width:0;display:flex;flex-direction:column;gap:.15rem}
.f-link .f-title{font-weight:800;letter-spacing:-.01em;display:flex;align-items:center;gap:.55rem;flex-wrap:wrap}
.f-link .f-tagline{color:var(--ink-soft);font-size:.94rem}
.f-link .f-meta-r{color:var(--ink-faint);font-size:.82rem;font-weight:600;white-space:nowrap}
.f-flag{
  font-size:.66rem;font-weight:800;text-transform:uppercase;letter-spacing:.04em;
  color:#1c1402;background:var(--amber);padding:.16rem .55rem;border-radius:999px;
}
.f-flag.is-checkpoint{color:#fff;background:#075539}
.f-flag.is-gate{color:#fff;background:#911140}
.f-step.is-checkpoint .f-link{border-left-color:var(--emerald)}
.f-step.is-checkpoint .f-link .f-num{background:linear-gradient(150deg,var(--emerald),var(--emerald-deep))}
.f-step.is-gate .f-link{border-left-color:var(--rose)}
.f-step.is-gate .f-link .f-num{background:linear-gradient(150deg,var(--rose),#6c0d2f)}
@media (max-width:620px){.f-link .f-meta-r{display:none}.f-link{gap:.7rem;padding:.85rem .95rem}}

/* ---- honest disclaimer + agentic on-ramp callout ---- */
.f-disclaimer{
  display:flex;gap:1rem;align-items:flex-start;
  padding:1.4rem 1.6rem;border-radius:var(--r);margin-top:1.6rem;
  background:linear-gradient(150deg,var(--amber-soft),var(--surface));
  border:1px solid #f6d99a;
}
.f-disclaimer .f-bar{width:5px;flex:none;align-self:stretch;border-radius:999px;background:var(--amber)}
.f-disclaimer p{margin:0;color:var(--ink-soft);text-align:justify}
.f-disclaimer strong{color:var(--ink)}
.f-onramp{
  margin-top:clamp(2rem,4vw,3rem);padding:clamp(1.6rem,4vw,2.4rem);
  border-radius:var(--r-lg);
  background:linear-gradient(160deg,#23204a,#181a2c);color:#fff;
  position:relative;overflow:hidden;box-shadow:var(--shadow-lift);
}
.f-onramp::after{
  content:"";position:absolute;right:-50px;top:-50px;width:180px;height:180px;
  background:radial-gradient(circle,var(--emerald) 0%,transparent 70%);opacity:.35;
}
.f-onramp h2{color:#fff;position:relative}
.f-onramp p{color:#c7c8e4;position:relative;max-width:60ch;text-align:justify}
.f-onramp .btn-trust{position:relative;margin-top:.6rem}

/* ---- per-week page ---- */
.f-week-hero{
  padding:clamp(1.8rem,5vw,3rem);
  background:linear-gradient(170deg,#ffffff,#f6f5ef);
  border:1px solid var(--line);border-radius:var(--r-xl);box-shadow:var(--shadow-2);
}
.f-week-hero h1{margin:0 0 .6rem}
.f-week-hero .f-objective{font-size:clamp(1.05rem,2vw,1.2rem);color:var(--ink-soft);max-width:56ch;margin:0;text-align:justify}
.f-resource-card{
  margin-top:1.2rem;padding:1.4rem 1.5rem;border-radius:var(--r);
  background:var(--surface);border:1px solid var(--line);box-shadow:var(--shadow-1);
  display:flex;gap:1rem;align-items:flex-start;flex-wrap:wrap;
  border-left:4px solid var(--indigo);
}
.f-resource-card .f-rc-body{flex:1;min-width:240px}
.f-resource-card .f-rc-eyebrow{
  font-size:.72rem;font-weight:700;letter-spacing:.13em;text-transform:uppercase;
  color:var(--indigo);margin:0 0 .4rem;
}
.f-resource-card h2{font-size:1.2rem;margin:0 0 .25rem}
.f-resource-card .f-rc-credit{color:var(--ink-soft);font-size:.95rem;margin:0}
.f-artifact{
  margin-top:1.4rem;padding:1.4rem 1.6rem;border-radius:var(--r);
  background:linear-gradient(150deg,var(--emerald-soft),var(--surface));
  border:1px solid #bfe9d6;border-left:4px solid var(--emerald);
  display:flex;gap:1rem;align-items:flex-start;
}
.f-artifact .f-art-body{min-width:0}
.f-artifact h3{margin:0 0 .35rem;font-size:1.05rem;color:var(--emerald-deep)}
.f-artifact .f-art-title{font-weight:700;color:var(--ink);margin:0 0 .4rem}
.f-artifact p{margin:0;color:var(--ink-soft);text-align:justify}
.f-callout-warn,.f-callout-strict{
  margin-top:1.4rem;padding:1.4rem 1.6rem;border-radius:var(--r);
  display:flex;gap:1rem;align-items:flex-start;
}
.f-callout-warn{background:linear-gradient(150deg,var(--amber-soft),var(--surface));border:1px solid #f6d99a;border-left:4px solid var(--amber)}
.f-callout-strict{background:linear-gradient(150deg,var(--rose-soft),var(--surface));border:1px solid #f4c2d3;border-left:4px solid var(--rose)}
.f-callout-warn h3,.f-callout-strict h3{margin:0 0 .35rem;font-size:1.05rem}
.f-callout-warn h3{color:var(--amber-deep)}
.f-callout-strict h3{color:var(--rose)}
.f-callout-warn p,.f-callout-strict p{margin:0;color:var(--ink-soft);text-align:justify}
.f-weeknav{
  display:flex;justify-content:space-between;gap:1rem;margin-top:1.6rem;flex-wrap:wrap;
}
.f-weeknav a{
  display:inline-flex;align-items:center;gap:.5rem;font-weight:700;text-decoration:none;
  color:var(--ink);background:var(--surface);border:1px solid var(--line-hard);
  border-radius:999px;padding:.55rem 1rem;font-size:.92rem;box-shadow:var(--shadow-1);
}
.f-weeknav a:hover{border-color:var(--indigo);color:var(--indigo)}
.f-weeknav .f-disabled{opacity:.45;pointer-events:none}

/* ---- coach chat panel ---- */
.f-coach{
  margin-top:1.8rem;background:var(--surface);border:1px solid var(--line);
  border-radius:var(--r);box-shadow:var(--shadow-1);padding:1.2rem 1.3rem;
}
.f-coach .f-coach-head{display:flex;flex-wrap:wrap;gap:.5rem 1rem;align-items:baseline;justify-content:space-between;margin-bottom:.6rem}
.f-coach h2{margin:0;font-size:1.1rem}
.f-coach .f-cap{font-size:.82rem;color:var(--ink-faint);font-weight:600}
.f-log{
  list-style:none;margin:0;padding:.6rem .2rem;
  background:var(--surface-2);border-radius:var(--r-sm);
  min-height:120px;max-height:380px;overflow-y:auto;
}
.f-log li{padding:.55rem .9rem;border-bottom:1px solid var(--line);font-size:.96rem;line-height:1.55}
.f-log li:last-child{border-bottom:none}
.f-log li.is-user{background:var(--indigo-tint);color:var(--ink)}
.f-log li.is-coach{background:transparent;color:var(--ink)}
.f-log li.is-error{background:var(--rose-soft);color:var(--rose)}
.f-log li .f-who{
  display:block;font-size:.7rem;letter-spacing:.07em;text-transform:uppercase;
  font-weight:700;color:var(--ink-faint);margin-bottom:.2rem;
}
.f-form{display:flex;flex-direction:column;gap:.6rem;margin-top:.8rem}
.f-form textarea{
  width:100%;min-height:80px;resize:vertical;padding:.7rem .85rem;
  font:inherit;font-size:.96rem;color:var(--ink);
  background:var(--surface);border:1px solid var(--line-hard);border-radius:var(--r-sm);
}
.f-form textarea:focus{outline:3px solid var(--indigo);outline-offset:1px;border-color:var(--indigo)}
.f-form .f-row{display:flex;justify-content:space-between;align-items:center;gap:.8rem;flex-wrap:wrap}
.f-form .f-count{font-size:.78rem;color:var(--ink-faint);font-weight:600}
.f-form button{
  font:inherit;font-weight:700;font-size:.92rem;cursor:pointer;
  padding:.62rem 1.2rem;border-radius:999px;border:1px solid var(--indigo-deep);
  color:#fff;background:linear-gradient(160deg,#5650f0,var(--indigo));
  box-shadow:0 6px 18px -6px #3b35e0aa,0 1px 0 #ffffff33 inset;
}
.f-form button:hover{transform:translateY(-1px)}
.f-form button[disabled]{opacity:.55;cursor:wait;transform:none;box-shadow:none}
.f-coach-note{
  margin:.7rem 0 0;font-size:.84rem;color:var(--ink-soft);text-align:justify;
}
.f-locked{
  margin-top:1.8rem;padding:1.2rem 1.3rem;border-radius:var(--r);
  background:var(--surface-2);border:1px dashed var(--line-hard);color:var(--ink-soft);
  font-size:.94rem;
}
`;

/* ------------------------------------------------------------------ */
/* foundationsHomeView, the /foundations landing page                  */
/* ------------------------------------------------------------------ */

/**
 * Render the Foundations on-ramp landing page.
 * @param {Foundations} foundations
 * @returns {string} bodyHtml
 */
export function foundationsHomeView(foundations) {
  const weeks = (foundations && Array.isArray(foundations.weeks)) ? foundations.weeks : [];

  const steps = weeks
    .map((w, i) => {
      const week = Number(w && w.week) || (i + 1);
      const theme = (w && w.theme) || '';
      const objective = (w && w.objective) || '';
      const kind = w && w.checkpointKind;
      let flagHtml = '';
      let stepCls = '';
      if (kind === 'coach-off-micro-checkpoint') {
        flagHtml = '<span class="f-flag is-checkpoint">Coach-off checkpoint</span>';
        stepCls = ' is-checkpoint';
      } else if (kind === 'final-gate') {
        flagHtml = '<span class="f-flag is-gate">Final ship gate</span>';
        stepCls = ' is-gate';
      } else if (week === 1) {
        flagHtml = '<span class="f-flag">Start here</span>';
      }
      const delay = `d${Math.min(i + 1, 6)}`;
      return `<li class="f-step${stepCls} rise ${delay}">
  <a class="f-link" href="/foundations/week/${esc(week)}">
    <span class="f-num" aria-hidden="true">${esc(week)}</span>
    <span class="f-body">
      <span class="f-title">Week ${esc(week)}: ${esc(theme)} ${flagHtml}</span>
      <span class="f-tagline">${esc(objective)}</span>
    </span>
    <span class="f-meta-r">Ship a repo <span class="arrow" aria-hidden="true">&rarr;</span></span>
  </a>
</li>`;
    })
    .join('');

  const firstWeek = weeks.length ? (Number(weeks[0] && weeks[0].week) || 1) : 1;

  return `<section class="f-hero" aria-labelledby="f-hero-h">
  ${kicker('The on-ramp · 12 weeks · free', 'amber')}
  <h1 id="f-hero-h" class="rise d1">From third semester to <span class="grad">AI builder</span>. One focused term.</h1>
  <p class="f-lede rise d2">A free 12 week path. Curated by the best people on the internet. One shipped GitHub repo per week. No videos to passively watch, no buffet of options, no roadmap to hop. Hinglish bilkul welcome hai.</p>
  <div class="f-actions rise d3">
    <a class="btn btn-primary" href="/foundations/week/${esc(firstWeek)}">Start Week 1 <span class="arrow" aria-hidden="true">&rarr;</span></a>
    <a class="btn btn-ghost" href="/ready">Am I ready for the elite tracks?</a>
  </div>
  <p class="f-meta rise d4">
    <span><span class="chk" aria-hidden="true">&#10003;</span> 100 percent free, always</span>
    <span><span class="chk" aria-hidden="true">&#10003;</span> Free tier cloud, rupees zero</span>
    <span><span class="chk" aria-hidden="true">&#10003;</span> One public repo every week</span>
  </p>
</section>

<section class="section" aria-labelledby="f-not-dsa-h">
  <div class="section-head">
    ${kicker('Honest framing', 'emerald')}
    <h2 id="f-not-dsa-h">DSA prep is for the interview. Foundations is for the job.</h2>
    <p class="lead">Striver and Apna get you past the screening round. Foundations is what you wish you knew the moment you joined a real AI team and someone asked you to ship something by Friday. It bolts on; it does not compete.</p>
  </div>
</section>

<section class="section" aria-labelledby="f-road-h">
  <div class="section-head">
    ${kicker('The path', 'indigo')}
    <h2 id="f-road-h">Twelve weeks. One repo each. Two checkpoints. One final gate.</h2>
    <p class="lead">Read the one curated resource for the week, build the artifact, ship the repo. Week 4 is a coach-off micro-checkpoint where you reproduce the prior week from a blank file. Week 12 is the final ship gate: AI off, 3 hour window, deploy something real.</p>
  </div>
  <ol class="f-roadmap">${steps || '<li class="f-step"><p class="lead">The 12 week plan is being curated.</p></li>'}</ol>
</section>

<section class="section" aria-labelledby="f-honest-h">
  <div class="section-head">
    ${kicker('No promises we will not keep', 'amber')}
    <h2 id="f-honest-h">What this is, what it is not.</h2>
  </div>
  <div class="f-disclaimer">
    <span class="f-bar" aria-hidden="true"></span>
    <p><strong>We measure shipped artifacts, not lessons completed.</strong> The CS50 baseline says 89 percent of engaged learners never even submit pset0. Our promise is a real portfolio and a real on-ramp into the Agentic Systems Track, not a placement guarantee. We will publish our actual registered to shipped numbers after the first 200 learners finish Week 1, raw, no curation.</p>
  </div>
</section>

<section class="section" aria-labelledby="f-onramp-h">
  <div class="f-onramp">
    <h2 id="f-onramp-h">Where this leads.</h2>
    <p>Foundations is the on-ramp into the <strong>Agentic Systems Track</strong>. Finish the twelve weeks with a public repo for each one, and you walk into that track with the muscle memory of someone who ships every Sunday. Skip Foundations and you can still take the elite tracks; you will just feel the gap. That is your choice to make, honestly.</p>
    <a class="btn btn-trust" href="/tracks">See the 8 elite tracks <span class="arrow" aria-hidden="true">&rarr;</span></a>
  </div>
</section>`;
}

/* ------------------------------------------------------------------ */
/* foundationsWeekView, /foundations/week/:n                           */
/* ------------------------------------------------------------------ */

/**
 * Render a single Foundations week page.
 * @param {FoundationsWeek} week
 * @param {Foundations} foundations
 * @param {string} nonce
 * @returns {string} bodyHtml
 */
export function foundationsWeekView(week, foundations, nonce) {
  const weeks = (foundations && Array.isArray(foundations.weeks)) ? foundations.weeks : [];
  const total = weeks.length || 12;
  const w = Number(week && week.week) || 1;
  const theme = (week && week.theme) || '';
  const objective = (week && week.objective) || '';
  const kind = week && week.checkpointKind;
  const r = primaryResource(week);
  const rTitle = r.title;
  const rUrl = r.url;
  const rCredit = r.author;
  const shippedArtifact = (week && week.shippedArtifact) || '';

  const prevW = w > 1 ? w - 1 : null;
  const nextW = w < total ? w + 1 : null;
  const prevHref = prevW ? `/foundations/week/${prevW}` : '#';
  const nextHref = nextW ? `/foundations/week/${nextW}` : '#';
  const prevCls = prevW ? '' : ' f-disabled';
  const nextCls = nextW ? '' : ' f-disabled';

  const resourceBlock = rUrl
    ? `<aside class="f-resource-card" aria-labelledby="f-rc-h">
  <div class="f-rc-body">
    <p class="f-rc-eyebrow">This week, read one thing</p>
    <h2 id="f-rc-h">${esc(rTitle)}</h2>
    ${rCredit ? `<p class="f-rc-credit">${esc(rCredit)}</p>` : ''}
  </div>
  <a class="btn btn-primary" href="${esc(rUrl)}" target="_blank" rel="noopener noreferrer">Open the resource <span class="arrow" aria-hidden="true">&rarr;</span><span class="visually-hidden"> (opens in a new tab)</span></a>
</aside>`
    : '<aside class="f-resource-card"><div class="f-rc-body"><p class="f-rc-eyebrow">This week, read one thing</p><p>The primary resource for this week is being curated.</p></div></aside>';

  const artifactBlock = `<section class="f-artifact" aria-labelledby="f-art-h">
  <div class="f-art-body">
    <h3 id="f-art-h">What you ship by Sunday</h3>
    <p>${esc(shippedArtifact)}</p>
  </div>
</section>`;

  let checkpointBlock = '';
  let coachBlock = '';
  if (kind === 'coach-off-micro-checkpoint') {
    checkpointBlock = `<section class="f-callout-warn" aria-labelledby="f-cp-h">
  <div>
    <h3 id="f-cp-h">This week is a coach-off micro-checkpoint.</h3>
    <p>Reproduce the prior week artifact from a blank file. No copy-pasting, no AI assist, no opening last week's repo. The coach is unavailable on this page. The point is to prove the muscle memory is in your hands, not in the chat window.</p>
  </div>
</section>`;
  } else if (kind === 'final-gate') {
    checkpointBlock = `<section class="f-callout-strict" aria-labelledby="f-gate-h">
  <div>
    <h3 id="f-gate-h">Coach locked. AI-off, 3-hour ship window.</h3>
    <p>Read the brief, build, deploy, submit. No coach, no model, no help. You either ship it or you do not. This is the gate: clear it and you move into the Agentic Systems Track with a portfolio that proves you can do this without scaffolding.</p>
  </div>
</section>`;
  } else {
    coachBlock = foundationsCoachWidgetHtml(week, nonce);
  }

  return `<p class="crumbs"><a href="/">Home</a> &rsaquo; <a href="/foundations">Foundations</a> &rsaquo; <span>Week ${esc(w)}</span></p>
<section class="f-week-hero" aria-labelledby="f-week-h">
  ${kicker(`Week ${esc(w)} of ${esc(total)}`, 'indigo')}
  <h1 id="f-week-h">${esc(theme)}</h1>
  <p class="f-objective">${esc(objective)}</p>
</section>

${resourceBlock}

${artifactBlock}

<nav class="f-weeknav" aria-label="Foundations week navigation">
  <a class="${prevCls.trim()}" href="${esc(prevHref)}" ${prevW ? '' : 'aria-disabled="true" tabindex="-1"'}>
    <span aria-hidden="true">&larr;</span> ${prevW ? `Week ${esc(prevW)}` : 'Start of path'}
  </a>
  <a class="${nextCls.trim()}" href="${esc(nextHref)}" ${nextW ? '' : 'aria-disabled="true" tabindex="-1"'}>
    ${nextW ? `Week ${esc(nextW)}` : 'End of path'} <span aria-hidden="true">&rarr;</span>
  </a>
</nav>

${checkpointBlock}

${coachBlock}`;
}

/* ------------------------------------------------------------------ */
/* foundationsCoachWidgetHtml, the chat panel                          */
/* ------------------------------------------------------------------ */

/**
 * Render the Socratic coach chat widget. Inline script uses the per-request
 * nonce and is ESLint-clean: no console.*, no eval, no inline handlers, no
 * innerHTML for untrusted data (all coach / user / error text is inserted via
 * textContent).
 * @param {FoundationsWeek} week
 * @param {string} nonce
 * @returns {string} HTML fragment
 */
export function foundationsCoachWidgetHtml(week, nonce) {
  const w = Number(week && week.week) || 1;
  const n = esc(nonce || '');
  return `<section class="f-coach" aria-labelledby="f-coach-h">
  <div class="f-coach-head">
    <h2 id="f-coach-h">The coach (Socratic, one hint per turn)</h2>
    <span class="f-cap">30 messages / day</span>
  </div>
  <p class="f-coach-note">The coach gives you one hint per turn. Never the answer. Hinglish bilkul welcome hai. It cannot do arithmetic; run code yourself and paste the result.</p>
  <ul id="foundations-chat" class="f-log" role="log" aria-live="polite" aria-label="Coach conversation"></ul>
  <form id="foundations-coach-form" class="f-form" aria-label="Ask the coach">
    <label class="visually-hidden" for="foundations-coach-input">Your message to the coach</label>
    <textarea id="foundations-coach-input" name="message" maxlength="2000" placeholder="Stuck on a step? Paste the smallest piece of code or error that captures it. The coach will ask one question back."></textarea>
    <div class="f-row">
      <span class="f-count" id="foundations-coach-count">0 / 2000</span>
      <button type="submit" id="foundations-coach-send">Send</button>
    </div>
  </form>
  <script nonce="${n}">
  (function(){
    var WEEK = ${Number(w)};
    var MAX = 2000;
    var form = document.getElementById('foundations-coach-form');
    var input = document.getElementById('foundations-coach-input');
    var send = document.getElementById('foundations-coach-send');
    var log = document.getElementById('foundations-chat');
    var count = document.getElementById('foundations-coach-count');
    if (!form || !input || !send || !log || !count) return;
    var history = [];

    function append(role, text) {
      var li = document.createElement('li');
      li.className = role === 'user' ? 'is-user' : (role === 'error' ? 'is-error' : 'is-coach');
      var who = document.createElement('span');
      who.className = 'f-who';
      who.textContent = role === 'user' ? 'You' : (role === 'error' ? 'Coach error' : 'Coach');
      var body = document.createElement('span');
      body.textContent = text;
      li.appendChild(who);
      li.appendChild(body);
      log.appendChild(li);
      log.scrollTop = log.scrollHeight;
    }

    function setBusy(b) {
      send.disabled = b;
      input.readOnly = b;
      send.textContent = b ? 'Thinking ...' : 'Send';
    }

    input.addEventListener('input', function () {
      var n = input.value.length;
      if (n > MAX) { input.value = input.value.slice(0, MAX); }
      count.textContent = input.value.length + ' / ' + MAX;
    });

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var text = (input.value || '').trim();
      if (!text) return;
      append('user', text);
      history.push({ role: 'user', content: text });
      input.value = '';
      count.textContent = '0 / ' + MAX;
      setBusy(true);
      fetch('/foundations/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ week: WEEK, messages: history }),
        credentials: 'same-origin',
      }).then(function (res) {
        return res.json().then(function (data) { return { ok: res.ok, status: res.status, data: data }; })
          .catch(function () { return { ok: res.ok, status: res.status, data: null }; });
      }).then(function (r) {
        if (!r.ok) {
          var msg = (r.data && (r.data.error || r.data.message)) || ('Coach unavailable (HTTP ' + r.status + ').');
          append('error', String(msg));
          return;
        }
        var reply = r.data && (r.data.reply || r.data.message || r.data.content);
        if (!reply) {
          append('error', 'The coach returned no message. Try again, or open the week resource and read first.');
          return;
        }
        append('coach', String(reply));
        history.push({ role: 'assistant', content: String(reply) });
      }).catch(function () {
        append('error', 'Network error. Check your connection and try again.');
      }).then(function () {
        setBusy(false);
        input.focus();
      });
    });
  })();
  </script>
</section>`;
}
