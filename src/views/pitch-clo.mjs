// ParallelCS, Chief Learning Officer briefing deck.
// A pitch pathway tuned for an academic decision-maker (curriculum alignment,
// student outcomes, faculty workload, cost, governance) rather than investors.
// Self-contained: one function returns a full <!doctype html> document with all
// CSS and the one navigation script inlined. Zero external assets.

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
 * Render the full CLO briefing deck.
 * @param {string} [nonce] CSP nonce for the inlined <style> and <script>.
 * @returns {string} a complete HTML document.
 */
export function pitchCloPage(nonce, curriculum) {
  const n = esc(nonce ?? '');
  // Counts derived from the live curriculum so the deck never goes stale.
  const nTracks = ((curriculum && curriculum.tracks) || []).length;
  const nConcepts = ((curriculum && curriculum.concepts) || []).length;
  const nProjects = ((curriculum && curriculum.projects) || []).length;

  // Each slide: { kicker, tone, title, body }. body is trusted markup built here.
  const slides = [
    {
      kicker: 'A briefing for the Chief Learning Officer',
      tone: 'indigo',
      title: 'Make Shoolini CS students enterprise-deployable from day one.',
      body: `<p class="big-lede">ParallelCS is an AI-native curriculum that routes Shoolini CSE students through the best free learning on Earth and ends every track with a live, public, production-grade product.</p>
<p class="sig">Prepared for Dr. Ashoo Khosla, Chief Learning Officer, Shoolini University.</p>`,
    },
    {
      kicker: '1, The gap',
      tone: 'rose',
      title: 'University CS lags the AI stack by three to five years.',
      body: `<p>The tools industry now hires for, agents, inference, applied ML, production AI, move faster than any syllabus revision cycle. Students who want to genuinely <em>build</em> are left without a structured path.</p>
<ul class="point-list">
  <li>The best learning material already exists, free, scattered across a hundred channels with no route through it.</li>
  <li>Coursework and real-world building feel like a forced choice for the ambitious student.</li>
  <li>Placement outcomes increasingly turn on a portfolio of shipped products, not a transcript.</li>
</ul>`,
    },
    {
      kicker: '2, What ParallelCS is',
      tone: 'emerald',
      title: 'A curriculum knowledge graph, and a complement to faculty, never a replacement.',
      body: `<p>Each concept is a node; each project is a milestone. ParallelCS does not re-record lectures and does not replace teaching. It <strong>routes</strong> students through curated, attributed free sources and adds original structure on top.</p>
<ul class="point-list">
  <li>Best-in-class free sources: MIT OCW, Stanford, CMU, 3Blue1Brown, Karpathy, Anthropic and other official docs.</li>
  <li>Original glue: a living curriculum knowledge graph, frontier project briefs, and demanding evaluation rubrics.</li>
  <li>It runs alongside the degree, the student keeps every class, lab and credit.</li>
</ul>`,
    },
    {
      kicker: '3, Mapped to the Shoolini CSE syllabus',
      tone: 'amber',
      title: 'Every advanced topic bridges back to a classic CS subject.',
      body: `<p>This is the design decision that matters most for the institution. Each concept and project explicitly names the classical subject it bridges to, Operating Systems, Distributed Systems, Databases, Computer Architecture, Networks, Machine Learning.</p>
<ul class="point-list">
  <li>A student uses ParallelCS <em>inside</em> the semester, for mini-projects, lab work and electives.</li>
  <li>Faculty can see exactly how a frontier project reinforces a syllabus topic.</li>
  <li>The advanced work deepens the fundamentals; it never bypasses them.</li>
</ul>`,
    },
    {
      kicker: '4, Student outcomes',
      tone: 'indigo',
      title: 'Graduates with a portfolio of live products, not just a transcript.',
      body: `<p>Every 12-week track ends with a publicly hosted, production-grade product an employer can open and judge.</p>
<ul class="point-list">
  <li>Students build the exact systems hiring teams now screen for, agentic systems, inference infrastructure, applied ML, production AI products.</li>
  <li>The work aims students at strong AI-builder roles; the ₹1-crore-tier package is the honest ceiling, the level the best reach, never a blanket promise.</li>
  <li>Public, shipped proof is the strongest placement signal a Shoolini student can carry.</li>
</ul>`,
    },
    {
      kicker: '5, Zero burden on faculty',
      tone: 'cyan',
      title: 'It asks nothing of teaching staff.',
      body: `<ul class="point-list">
  <li><strong>No teaching load</strong>, the curriculum routes students to existing free material.</li>
  <li><strong>No grading load</strong>, demanding rubrics let students self-assess, and they bring their own AI (Claude or any frontier model) as tutor and code reviewer for feedback before submission.</li>
  <li><strong>No tooling to maintain</strong>, it is a single self-running service; the institution operates nothing.</li>
</ul>
<p>Faculty gain a structured, syllabus-aligned way for motivated students to go deeper, with full visibility and zero added workload.</p>`,
    },
    {
      kicker: '6, Already built and live',
      tone: 'emerald',
      title: 'This is not a proposal on paper. It is running today.',
      body: `<ul class="point-list">
  <li><strong>${nTracks} elite tracks, ${nConcepts} concepts, ${nProjects} production-grade projects</strong>, each project a real, market-validated product brief.</li>
  <li>It <strong>self-updates every week</strong>: an agentic engine, running the most capable available AI with maximum thinking, researches what has changed in AI engineering and evolves the curriculum, adding, updating and retiring tracks, concepts, projects and resources under automated safeguards, so it cannot go stale.</li>
  <li>Every learning resource is real, free and credited to its original creator.</li>
</ul>
<p>The platform you are reviewing is the live product, not a mock-up.</p>`,
    },
    {
      kicker: '7, Integrity and governance',
      tone: 'rose',
      title: 'Designed to be safe for the university to stand behind.',
      body: `<ul class="point-list">
  <li><strong>Curation, not authorship</strong>, every source is linked and credited; open-source under the MIT license.</li>
  <li><strong>Transparent</strong>, a public status page reports every self-update run.</li>
  <li><strong>Accessible</strong>, built to WCAG 2.2 AA so every learner can use it.</li>
  <li><strong>Secure and frugal by design</strong>, hardened, and it scales to zero when idle.</li>
</ul>`,
    },
    {
      kicker: '8, What it costs',
      tone: 'amber',
      title: 'Zero rupees to the university. Zero rupees to students.',
      body: `<p>ParallelCS is free for every learner, forever. There is no licence fee, no per-student charge, no platform cost to Shoolini.</p>
<ul class="point-list">
  <li>The creator, dmj.one, takes <strong>zero rupees</strong>, no fee, no salary, no revenue from this.</li>
  <li>It runs on free-tier cloud infrastructure and scales to zero when no one is using it.</li>
  <li><strong>The only real cost is the cloud server bill</strong>, and the platform is engineered so that bill stays minimal.</li>
</ul>`,
    },
    {
      kicker: '9, The ask',
      tone: 'indigo',
      title: 'The aegis of Shoolini University, and the server cost.',
      body: `<p>The request to the office of the Chief Learning Officer is deliberately small.</p>
<ul class="point-list">
  <li>The <strong>formal aegis of Shoolini University</strong>, so the platform can serve Shoolini CSE students officially.</li>
  <li>A <strong>pilot with one CSE cohort for one semester</strong>, a 4-week kickstart, one shipped product per student.</li>
  <li>Coverage of the <strong>only out-of-pocket cost: the modest cloud server bill</strong>. Nothing else is asked for.</li>
</ul>`,
    },
    {
      kicker: '10, The vision',
      tone: 'emerald',
      title: 'Shoolini, known for students who ship.',
      body: `<p class="big-lede">A Shoolini CS graduate should leave with a portfolio of live, public, enterprise-grade AI products, and an offer to match. ParallelCS turns the gap between syllabus and stack into a path any motivated student can walk, for free.</p>
<p class="sig">Made with care for Shoolini by dmj.one.</p>`,
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
<meta name="description" content="ParallelCS, a briefing for the Chief Learning Officer, Shoolini University. An AI-native, syllabus-aligned CS curriculum, free for every learner.">
<meta name="theme-color" content="#fbfaf7">
<title>CLO Briefing · ParallelCS</title>
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
.deck-tag{
  font-size:.7rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;
  color:var(--indigo);background:var(--indigo-soft);
  border:1px solid #c9c7f7;border-radius:999px;padding:.3rem .7rem;
}
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
.dots{display:flex;gap:.5rem;align-items:center;flex-wrap:wrap;justify-content:center}
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
  .deck-tag{background:#33345a;border-color:#4a4b78;color:#c7c4ff}
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
  <span class="deck-tag">CLO Briefing · Shoolini University</span>
  <a class="deck-back" href="/">← Back to site</a>
</header>

<main id="deck-main" class="stage" aria-label="ParallelCS CLO briefing, ${total} slides">
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
