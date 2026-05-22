// ParallelCS, investor/stakeholder pitch deck.
// Self-contained: one function returns a full <!doctype html> document with
// all CSS and the one navigation script inlined. Zero external assets.
// Guy Kawasaki 10-slide format, in the 2026 light/energetic identity.

/** Escape a dynamic string for safe HTML interpolation. */
function esc(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Render the full pitch deck document.
 * @param {string} [nonce] CSP nonce for the inlined <style> and <script>.
 * @returns {string} a complete HTML document.
 */
export function pitchPage(nonce, curriculum) {
  const n = esc(nonce ?? '');
  // Counts are derived from the live curriculum so the deck never goes stale.
  const tracks = (curriculum && curriculum.tracks) || [];
  const nTracks = tracks.length;
  const nConcepts = ((curriculum && curriculum.concepts) || []).length;
  const nProjects = ((curriculum && curriculum.projects) || []).length;

  // Each slide: { kicker, tone, title, body }. body is trusted markup built here.
  const slides = [
    {
      kicker: 'ParallelCS',
      tone: 'indigo',
      title: 'Become enterprise-deployable from day one.',
      body: `<p class="big-lede">A knowledge-graph-routed path through the best free learning on Earth, with frontier project briefs and brutal eval rubrics on top. You orchestrate the AI. You ship the product. You get hired.</p>
<p class="sig">An AI-native, product-centric CS curriculum, free, forever.</p>`,
    },
    {
      kicker: 'Slide 1, The Problem',
      tone: 'rose',
      title: 'University CS lags the AI stack by 3 to 5 years.',
      body: `<p>Faculty teach pre-LLM computer science. Syllabi are frozen years behind the tools the industry now hires for. Students who actually want to <em>build</em> are starved of structured, product-oriented learning.</p>
<ul class="point-list">
  <li>Learners get attendance marks, not shippable skills.</li>
  <li>The best free content exists, scattered across a hundred channels with no path through it.</li>
  <li>Coursework and real-world building feel like a forced choice.</li>
</ul>`,
    },
    {
      kicker: 'Slide 2, The Solution',
      tone: 'emerald',
      title: 'A curriculum knowledge graph, not another video platform.',
      body: `<p>ParallelCS is an opinionated, AI-native curriculum delivered as 12-week elite tracks. Each concept is a node; each project is a milestone. We do not re-record lectures, we <strong>route</strong>.</p>
<ul class="point-list">
  <li>Best-in-class free sources: 3Blue1Brown, MIT OCW, Karpathy's Zero-to-Hero, Stanford, Anthropic's Building Effective Agents.</li>
  <li>Original glue: a living curriculum knowledge graph, frontier project briefs, and demanding evaluation rubrics.</li>
  <li>The student brings their own AI, Claude or any frontier model is their tutor and code reviewer. No human hand-holding, and none is needed.</li>
  <li>Every track ends with a publicly hosted, production-grade product.</li>
</ul>`,
    },
    {
      kicker: 'Slide 3, Why Now',
      tone: 'amber',
      title: 'AI-native education is the moment, not the trend.',
      body: `<p>Gartner reported a <strong>1,445% surge</strong> in enterprise inquiries about multi-agent education patterns between Q1 2024 and Q2 2025. The pattern is proven at enterprise scale; ParallelCS applies it to learners first.</p>
<p>The free content finally exists. The models to route and grade it finally exist. The gap between syllabus and stack has never been wider. The window is open <em>now</em>.</p>`,
    },
    {
      kicker: 'Slide 4, Product',
      tone: 'indigo',
      title: `${nTracks} elite tracks. One graph. A product at the end of each.`,
      body: `<ul class="point-list">
${tracks.map((t) => `  <li><strong>${esc(t.title)}</strong>, ${esc(t.tagline)}</li>`).join('\n')}
</ul>
<p>${nConcepts} concepts, ${nProjects} production-grade projects. Each project bridges to a classic CS subject, so it doubles as coursework, no choice between the degree and the build.</p>`,
    },
    {
      kicker: 'Slide 5, Business Model',
      tone: 'emerald',
      title: 'The brand never charges money. That is the model.',
      body: `<p>ParallelCS is free and open-source under the MIT license. Charging is not a missing feature, it is a deliberate strategic choice.</p>
<ul class="point-list">
  <li>Free and course-aligned means a learner uses it <em>during</em> their semester, not after graduation.</li>
  <li>"Curation, not authorship", every source attributed, reduces legal exposure to near zero.</li>
  <li>Infrastructure runs serverless and scales to zero: a real $0 idle cost.</li>
</ul>`,
    },
    {
      kicker: 'Slide 6, Go to Market',
      tone: 'amber',
      title: 'A free 30-Day Challenge each semester.',
      body: `<p>At the start of every semester, a free cohort runs on Discord. Your first 30 days, one shipped product per learner. The 30-Day Challenge is the on-ramp into the 12-week tracks.</p>
<ul class="point-list">
  <li>The first cohort's deployed products become the marketing for the next.</li>
  <li>Growth compounds: every launch is public proof the path works.</li>
  <li>Zero ad spend, the product markets itself through its graduates.</li>
</ul>`,
    },
    {
      kicker: 'Slide 7, Competition',
      tone: 'rose',
      title: 'External platforms filled the vacuum. None were course-aligned.',
      body: `<p>Stoa School, Pesto, Masai, Newton School, all filled a real vacuum, all as external paid platforms, none with institutional alignment.</p>
<p class="contrast"><strong>ParallelCS is different on two axes:</strong> it never charges money, and every project bridges to the official syllabus. A learner does not leave their degree to use it, they use it inside their degree, building toward strong AI-builder roles, with the ₹1-crore tier as the honest ceiling the very best reach.</p>`,
    },
    {
      kicker: 'Slide 8, Traction & Risk',
      tone: 'cyan',
      title: 'Honest about the risks, designed around them.',
      body: `<ul class="point-list">
  <li><strong>Plagiarism complaints?</strong> Mitigated by design: we link, never copy. Every resource credits its creator.</li>
  <li><strong>Faculty backlash?</strong> Mitigated by openly bridging every project brief to official syllabus topics.</li>
  <li><strong>Cost runaway?</strong> Mitigated by a serverless, scale-to-zero architecture capped at one instance, with the agentic curriculum engine hard-limited to one run per week.</li>
</ul>
<p>Every week an agentic engine, the most capable available AI, run with maximum thinking, researches what has changed in AI engineering and evolves the whole curriculum, adding, updating and retiring tracks, concepts and projects under automated safeguards. The curriculum cannot go stale.</p>`,
    },
    {
      kicker: 'Slide 9, The Team & The Ask',
      tone: 'indigo',
      title: 'Built by builders. Run as a public good.',
      body: `<p>ParallelCS ships as an open-source project under the MIT license, a remix, credited to its sources, owned by the learners who use it.</p>
<p>The ask is not money. It is <strong>adoption</strong>: one cohort, one semester, one wave of publicly shipped products. Give us 30 days and a Discord server.</p>`,
    },
    {
      kicker: 'Slide 10, The Vision',
      tone: 'emerald',
      title: 'Make "I built this" the default outcome of a CS degree.',
      body: `<p class="big-lede">A learner should graduate with a portfolio of live, public, enterprise-grade products, not just a transcript. ParallelCS turns the gap between syllabus and stack into a path anyone can walk, for free.</p>
<p class="sig">Start at the graph. Ship in 30 days. Get hired.</p>`,
    },
  ];

  const total = slides.length;
  const slidesHtml = slides
    .map(
      (s, i) => `<section class="slide" id="slide-${i}" role="group"
  aria-roledescription="slide" aria-label="${esc(s.kicker)}: ${esc(s.title)}"
  aria-hidden="${i === 0 ? 'false' : 'true'}"${i === 0 ? '' : ' hidden'}>
  <div class="slide-inner tone-${esc(s.tone)}">
    <p class="kicker"><span class="kicker-tick" aria-hidden="true"></span>${esc(s.kicker)}</p>
    <h2 class="slide-title">${esc(s.title)}</h2>
    <div class="slide-body">${s.body}</div>
    <p class="slide-count" aria-hidden="true">${String(i + 1).padStart(2, '0')} / ${String(
        total,
      ).padStart(2, '0')}</p>
  </div>
</section>`,
    )
    .join('\n');

  const dots = slides
    .map(
      (s, i) =>
        `<button type="button" class="dot${
          i === 0 ? ' is-active' : ''
        }" data-go="${i}" aria-label="Go to slide ${i + 1}: ${esc(
          s.title,
        )}"${i === 0 ? ' aria-current="true"' : ''}></button>`,
    )
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="description" content="ParallelCS pitch deck, an AI-native, product-centric CS curriculum. Become enterprise-deployable from day one.">
<meta name="theme-color" content="#fbfaf7">
<title>Pitch · ParallelCS</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2032%2032'%3E%3Crect%20width='32'%20height='32'%20rx='8'%20fill='%233b35e0'/%3E%3Ctext%20x='16'%20y='23'%20font-size='17'%20font-weight='800'%20font-family='Verdana,sans-serif'%20fill='%23ffffff'%20text-anchor='middle'%3E//%3C/text%3E%3C/svg%3E">
<style nonce="${n}">
:root{
  --paper:#fbfaf7;--surface:#ffffff;
  --ink:#181a2c;--ink-soft:#4a4f63;--ink-faint:#71768a;
  --indigo:#3b35e0;--indigo-deep:#2a25b8;--indigo-soft:#e9e8fd;--indigo-tint:#f1f0fe;
  --emerald:#0e9f6e;--emerald-deep:#0a7c56;--emerald-soft:#d8f3e8;
  --amber:#f5a31a;--amber-deep:#d98604;--amber-soft:#fdedcf;
  --cyan:#0c8fb3;--cyan-soft:#d4eef5;
  --rose:#e3457a;--rose-soft:#fbdee8;
  --line:#e7e4da;--line-hard:#d8d4c6;
  --ease:cubic-bezier(.2,.7,.2,1);
  --shadow:0 2px 4px #1a1a340a,0 26px 56px -22px #1a1a3440;
}
*{box-sizing:border-box}
html,body{height:100%}
body{
  margin:0;color:var(--ink);background:var(--paper);
  font-family:"Segoe UI Variable Text","Segoe UI",-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;
  background-image:
    radial-gradient(820px 480px at 88% -8%,#e9e8fd 0%,transparent 62%),
    radial-gradient(700px 440px at 6% 108%,#d8f3e8 0%,transparent 58%);
  -webkit-font-smoothing:antialiased;overflow-x:hidden;
}
h2{
  font-family:"Segoe UI Variable Display","Segoe UI Semibold","Segoe UI",-apple-system,Arial,sans-serif;
  font-weight:800;letter-spacing:-.022em;
}
.mono{font-family:"Cascadia Code","Cascadia Mono",ui-monospace,Consolas,monospace}
a{color:var(--indigo)}

.visually-hidden{
  position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;
  overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;
}
.skip-link{
  position:fixed;top:-100px;left:14px;z-index:60;background:var(--indigo);color:#fff;
  padding:.6rem 1rem;border-radius:0 0 9px 9px;font-weight:700;text-decoration:none;
  transition:top .18s var(--ease);
}
.skip-link:focus{top:0}
:focus-visible{outline:3px solid var(--indigo);outline-offset:3px;border-radius:6px}

.deck-head{
  display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;
  padding:.75rem clamp(1rem,4vw,2.2rem);border-bottom:1px solid var(--line);
  background:#fbfaf7ee;backdrop-filter:saturate(1.5) blur(10px);
  position:sticky;top:0;z-index:40;
}
.deck-brand{display:flex;align-items:center;gap:.45rem;text-decoration:none;color:var(--ink)}
.deck-brand .mark{
  font-family:"Cascadia Code",ui-monospace,monospace;font-weight:800;font-size:1.05rem;color:#fff;
  background:linear-gradient(150deg,var(--indigo),var(--indigo-deep));
  width:32px;height:32px;border-radius:9px;display:grid;place-items:center;
  box-shadow:0 4px 10px -4px #3b35e088;
}
.deck-brand .word{font-weight:800;font-size:1.18rem;letter-spacing:-.03em}
.deck-back{
  font-size:.85rem;font-weight:600;color:var(--ink-soft);text-decoration:none;
  padding:.45rem .9rem;border:1px solid var(--line-hard);border-radius:999px;background:var(--surface);
}
.deck-back:hover{color:var(--indigo);border-color:var(--indigo)}

.stage{
  min-height:calc(100vh - 66px);display:flex;align-items:center;justify-content:center;
  padding:clamp(1.4rem,5vw,3.4rem) clamp(1rem,5vw,3rem) 7.5rem;position:relative;
}
.slide{width:100%;max-width:920px;animation:rise .5s var(--ease) both}
.slide[hidden]{display:none}
@keyframes rise{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:none}}
.slide-inner{
  background:var(--surface);border:1px solid var(--line);
  border-top:6px solid var(--accent,var(--indigo));border-radius:26px;
  padding:clamp(1.8rem,5vw,3.4rem) clamp(1.8rem,5vw,3.6rem) clamp(2.6rem,5vw,3.8rem);
  position:relative;overflow:hidden;box-shadow:var(--shadow);
}
.slide-inner::before{
  /* energetic corner accent */
  content:"";position:absolute;right:-70px;top:-70px;width:240px;height:240px;
  background:radial-gradient(circle,var(--accent,var(--indigo)) 0%,transparent 70%);
  opacity:.12;border-radius:50%;
}
.tone-indigo{--accent:var(--indigo)}
.tone-emerald{--accent:var(--emerald)}
.tone-amber{--accent:var(--amber)}
.tone-cyan{--accent:var(--cyan)}
.tone-rose{--accent:var(--rose)}
.kicker{
  display:inline-flex;align-items:center;gap:.5rem;margin:0 0 1.1rem;
  font-size:.76rem;font-weight:700;letter-spacing:.13em;text-transform:uppercase;
  color:var(--accent,var(--indigo));
  background:color-mix(in srgb,var(--accent,var(--indigo)) 12%,#fff);
  border:1px solid color-mix(in srgb,var(--accent,var(--indigo)) 28%,#fff);
  border-radius:999px;padding:.42rem .9rem;
}
.kicker-tick{width:7px;height:7px;border-radius:2px;background:currentColor;transform:rotate(45deg)}
.slide-title{
  font-size:clamp(1.8rem,4.6vw,3.1rem);line-height:1.08;margin:0 0 1.2rem;
  font-weight:800;letter-spacing:-.025em;color:var(--ink);
}
.slide-body{font-size:clamp(1rem,2vw,1.18rem);color:var(--ink-soft);line-height:1.62}
.slide-body p{margin:0 0 1rem}
.slide-body strong{color:var(--ink);font-weight:700}
.slide-body em{color:var(--accent,var(--indigo));font-style:normal;font-weight:700}
.big-lede{font-size:clamp(1.15rem,2.6vw,1.5rem)!important;color:var(--ink)!important;font-weight:500}
.sig{
  font-weight:700;font-size:.92rem;color:var(--accent,var(--indigo));margin-top:1.5rem!important;
}
.contrast{
  padding:1.1rem 1.3rem;border-left:4px solid var(--accent,var(--indigo));
  background:color-mix(in srgb,var(--accent,var(--indigo)) 8%,#fff);
  border-radius:0 12px 12px 0;
}
.point-list{margin:0 0 1rem;padding-left:0;list-style:none}
.point-list li{position:relative;padding-left:1.8rem;margin-bottom:.75rem}
.point-list li::before{
  content:"";position:absolute;left:0;top:.5em;width:10px;height:10px;
  background:var(--accent,var(--indigo));border-radius:3px;transform:rotate(45deg);
}
.slide-count{
  position:absolute;right:clamp(1.8rem,5vw,3.6rem);bottom:1.3rem;margin:0;
  font-weight:800;font-size:.82rem;color:var(--ink-faint);letter-spacing:.04em;
}

.deck-controls{
  position:fixed;left:0;right:0;bottom:0;z-index:40;
  display:flex;align-items:center;justify-content:center;gap:1rem;flex-wrap:wrap;
  padding:.95rem 1rem;
  background:linear-gradient(0deg,#fbfaf7 30%,#fbfaf700);
}
.nav-btn{
  font-size:.86rem;font-weight:700;cursor:pointer;
  color:#fff;background:linear-gradient(150deg,#5650f0,var(--indigo));
  border:1px solid var(--indigo-deep);border-radius:999px;padding:.62rem 1.2rem;
  box-shadow:0 6px 16px -7px #3b35e0aa;transition:transform .12s var(--ease);
}
.nav-btn:hover{transform:translateY(-2px)}
.nav-btn:active{transform:translateY(0)}
.nav-btn[disabled]{
  opacity:.45;cursor:not-allowed;background:#e7e4da;color:var(--ink-faint);
  border-color:var(--line-hard);box-shadow:none;transform:none;
}
.dots{display:flex;gap:.5rem;align-items:center}
.dot{
  width:11px;height:11px;border-radius:50%;cursor:pointer;padding:0;
  background:#ffffff;border:1.5px solid var(--line-hard);transition:all .15s var(--ease);
}
.dot:hover{border-color:var(--indigo)}
.dot.is-active{
  background:var(--indigo);border-color:var(--indigo-deep);transform:scale(1.3);
  box-shadow:0 0 0 4px var(--indigo-soft);
}
.hint{
  font-weight:600;font-size:.74rem;color:var(--ink-faint);
  width:100%;text-align:center;margin:.25rem 0 0;
}

@media (max-width:560px){
  .hint{display:none}
  .deck-controls{gap:.7rem}
}
@media (prefers-reduced-motion:reduce){
  *,*::before,*::after{
    animation-duration:.001ms!important;animation-iteration-count:1!important;
    transition-duration:.001ms!important;
  }
}
@media (prefers-color-scheme:dark){
  :root{
    --paper:#1a1c2e;--surface:#23253c;
    --ink:#f1f1f8;--ink-soft:#c0c2d6;--ink-faint:#9092ac;
    --indigo:#8b86ff;--indigo-deep:#a39ffd;--indigo-soft:#33345a;--indigo-tint:#2a2b4a;
    --emerald:#3fd9a0;--emerald-deep:#5fe3b3;--emerald-soft:#1f3b35;
    --amber:#ffc04d;--amber-deep:#ffd27a;--amber-soft:#3d3216;
    --cyan:#4fc4e0;--cyan-soft:#1f3a44;
    --rose:#f57aa3;--rose-soft:#3d2230;
    --line:#34365a;--line-hard:#41446b;
    --shadow:0 2px 4px #00000050,0 26px 56px -22px #00000099;
  }
  body{
    background-image:
      radial-gradient(820px 480px at 88% -8%,#2a2b4a 0%,transparent 62%),
      radial-gradient(700px 440px at 6% 108%,#1f3b35 0%,transparent 58%);
  }
  .deck-head{background:#1a1c2eee}
  .nav-btn{color:#fff}
}
</style>
</head>
<body>
<a class="skip-link" href="#deck-main">Skip to deck</a>
<header class="deck-head">
  <a class="deck-brand" href="/" aria-label="ParallelCS home">
    <span class="mark" aria-hidden="true">//</span><span class="word">ParallelCS</span>
  </a>
  <a class="deck-back" href="/">← Back to site</a>
</header>

<main id="deck-main" class="stage" aria-label="ParallelCS pitch deck, ${total} slides">
${slidesHtml}
</main>

<nav class="deck-controls" aria-label="Slide navigation">
  <button type="button" class="nav-btn" id="prev" aria-label="Previous slide">← Prev</button>
  <div class="dots" role="group" aria-label="Jump to slide">${dots}</div>
  <button type="button" class="nav-btn" id="next" aria-label="Next slide">Next →</button>
  <p class="hint" aria-hidden="true">Use the arrow keys, or Home and End, to navigate</p>
</nav>

<div id="live" class="visually-hidden" aria-live="polite"></div>

<script nonce="${n}">
(function(){
  "use strict";
  var slides = Array.prototype.slice.call(document.querySelectorAll(".slide"));
  var dots = Array.prototype.slice.call(document.querySelectorAll(".dot"));
  var prev = document.getElementById("prev");
  var next = document.getElementById("next");
  var live = document.getElementById("live");
  var total = slides.length;
  var idx = 0;

  function render(){
    slides.forEach(function(s,i){
      var on = i === idx;
      s.hidden = !on;
      s.setAttribute("aria-hidden", on ? "false" : "true");
    });
    dots.forEach(function(d,i){
      var on = i === idx;
      d.classList.toggle("is-active", on);
      if(on){ d.setAttribute("aria-current","true"); }
      else { d.removeAttribute("aria-current"); }
    });
    prev.disabled = idx === 0;
    next.disabled = idx === total - 1;
    live.textContent = "Slide " + (idx + 1) + " of " + total;
  }
  function go(to){
    var clamped = Math.max(0, Math.min(total - 1, to));
    if(clamped === idx) return;
    idx = clamped;
    render();
  }

  prev.addEventListener("click", function(){ go(idx - 1); });
  next.addEventListener("click", function(){ go(idx + 1); });
  dots.forEach(function(d){
    d.addEventListener("click", function(){ go(parseInt(d.getAttribute("data-go"),10)); });
  });
  document.addEventListener("keydown", function(e){
    if(e.key === "ArrowRight" || e.key === "PageDown"){ go(idx + 1); e.preventDefault(); }
    else if(e.key === "ArrowLeft" || e.key === "PageUp"){ go(idx - 1); e.preventDefault(); }
    else if(e.key === "Home"){ go(0); e.preventDefault(); }
    else if(e.key === "End"){ go(total - 1); e.preventDefault(); }
  });
  render();
})();
</script>
</body>
</html>`;
}
