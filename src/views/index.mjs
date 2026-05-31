// ParallelCS, view layer. Pure render functions, zero I/O.
// Every export returns a string. `page()` returns a full document; the
// rest return body HTML to be wrapped by `page()`. All CSS is inlined by
// `page()` in a single nonce'd <style> block, no external/CDN assets.
//
// Identity (2026 redesign): light, optimistic, enterprise-grade. A deep
// electric-indigo trust primary, an emerald growth accent, and an amber
// energy accent for calls to action. Structural spacing, confident
// typography, purposeful motion. The product sells one promise: it makes
// a learner enterprise-deployable from day one.

/**
 * HTML-escape a dynamic string. Use on EVERY interpolated value that did
 * not originate from this file. Coerces non-strings safely.
 * @param {unknown} value
 * @returns {string}
 */
export function esc(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const TRACK_COUNT = 12; // weeks per track

/** Stable decorative glyph per known track id; falls back gracefully. */
const TRACK_GLYPH = {
  'first-principles-dsa': '◆',
  'agentic-systems-engineering': '◈',
  'agent-engineering': '◈',
  'ai-infrastructure-inference': '▲',
  'ai-infrastructure': '▲',
  'system-design': '▰',
  'applied-ml-model-engineering': '✦',
  'applied-ml': '✦',
  'production-ai-products': '●',
  'ship-a-product': '●',
  'frontier-systems': '✺',
};

/** A small accent index per track lane, cycles the palette deterministically. */
const LANE_ACCENTS = ['indigo', 'emerald', 'amber', 'cyan', 'rose'];

/** Human label for a resource type. */
const TYPE_LABEL = {
  video: 'Video',
  article: 'Article',
  course: 'Course',
  guide: 'Guide',
  repo: 'Repository',
  paper: 'Paper',
  interactive: 'Interactive',
};

/* ------------------------------------------------------------------ */
/* Shared layout fragments                                            */
/* ------------------------------------------------------------------ */

/** Site navigation. `path` marks the current page for aria-current. */
function nav(path) {
  const links = [
    ['/start', 'Start'],
    ['/tracks', 'Tracks'],
    ['/projects', 'Projects'],
    ['/challenge', 'Challenge'],
  ];
  const items = links
    .map(([href, label]) => {
      const current = href === path || (href !== '/' && path.startsWith(href));
      return `<li><a class="navlink${current ? ' is-current' : ''}" href="${esc(href)}"${
        current ? ' aria-current="page"' : ''
      }>${esc(label)}</a></li>`;
    })
    .join('');
  return `<header class="site-head">
  <div class="head-inner">
    <a class="brand" href="/" aria-label="ParallelCS home">
      <span class="brand-mark" aria-hidden="true">//</span>
      <span class="brand-word">ParallelCS</span>
    </a>
    <button type="button" class="nav-toggle" aria-expanded="false" aria-controls="primary-nav-list" aria-label="Open menu">
      <span class="nav-toggle-icon" aria-hidden="true">☰</span>
    </button>
    <nav class="site-nav" aria-label="Primary">
      <ul class="nav-list" id="primary-nav-list">${items}</ul>
    </nav>
    <a class="btn btn-mini" href="/start">Start free</a>
  </div>
</header>`;
}

/** Site footer, attribution-forward, because this product curates. */
function footer() {
  return `<footer class="site-foot">
  <div class="foot-inner">
    <div class="foot-brand">
      <span class="brand-mark" aria-hidden="true">//</span>
      <span class="brand-word">ParallelCS</span>
      <p class="foot-credo">The curriculum that turns a learner into an enterprise-deployable builder. Free, forever.</p>
    </div>
    <nav class="foot-nav" aria-label="Footer">
      <p class="foot-col-title">Explore</p>
      <a href="/start">Start</a>
      <a href="/tracks">Tracks</a>
      <a href="/projects">Projects</a>
      <a href="/challenge">The 30-Day Challenge</a>
      <a href="/graph">Knowledge graph</a>
      <a href="/ready">Are you ready?</a>
      <a href="/status">Status</a>
      <a href="/pitch">Pitch deck</a>
      <a href="/pitch-clo">CLO briefing</a>
    </nav>
    <div class="foot-note">
      <p class="foot-col-title">How this is built</p>
      <p>ParallelCS is <strong>curation, not authorship</strong>. Every resource links to and credits its original creator. Open-source under the MIT license, course-aligned, and free for every learner, no paywall, ever.</p>
    </div>
  </div>
  <p class="foot-base">Self-updating with the frontier of AI · Made with <span class="foot-heart" aria-hidden="true">♥</span><span class="visually-hidden">love</span> for Shoolini by dmj.one</p>
</footer>`;
}

/** A section eyebrow / kicker label with a leading accent tick. */
function kicker(label, tone = 'indigo') {
  return `<p class="kicker tone-${tone}"><span class="kicker-tick" aria-hidden="true"></span>${esc(
    label,
  )}</p>`;
}

/**
 * The journey bridge, one shared visual for the whole arc: the first stretch
 * (your first 30 days) you build with a cohort, then you keep going week by
 * week until you ship. Used on /, /start and /challenge so the on-ramp and the
 * longer path always read as one continuous journey, never competing timelines.
 */
function weekBridge() {
  let segs = '';
  for (let w = 1; w <= TRACK_COUNT; w++) {
    const phase = w <= 4 ? 'wb-kick' : 'wb-solo';
    segs += `<span class="wb-seg ${phase}"><span class="wb-w">${w}</span></span>`;
  }
  return `<div class="week-bridge" role="img" aria-label="Your journey: build with a cohort for your first 30 days, then keep going week by week until you ship a public product.">
  <div class="wb-bar">${segs}</div>
  <div class="wb-legend">
    <span class="wb-tag wb-tag-kick">Your first 30 days · with a cohort</span>
    <span class="wb-tag wb-tag-solo">Then week by week · your pace</span>
  </div>
</div>`;
}

/* ------------------------------------------------------------------ */
/* page(), full document with all inlined CSS                        */
/* ------------------------------------------------------------------ */

/**
 * Wrap body HTML in the full document shell.
 * @param {{title:string,description:string,path:string,bodyHtml:string,nonce:string,extraStyles?:string}} opts
 * @returns {string}
 */
export function page({ title, description, path, bodyHtml, nonce, extraStyles }) {
  const n = esc(nonce ?? '');
  const fullTitle = title ? `${esc(title)} · ParallelCS` : 'ParallelCS';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="description" content="${esc(description ?? '')}">
<meta name="theme-color" content="#fbfaf7">
<title>${fullTitle}</title>
<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(faviconSvg())}">
<style nonce="${n}">${styles()}${extraStyles ?? ''}</style>
</head>
<body>
<a class="skip-link" href="#main">Skip to main content</a>
${nav(path ?? '/')}
<main id="main" class="site-main" tabindex="-1">
${bodyHtml ?? ''}
</main>
${footer()}
<script nonce="${n}">
(function(){
  var head=document.querySelector('.site-head');
  if(!head)return;
  /* auto-hide on scroll down, reveal on scroll up */
  var lastY=window.scrollY||0,ticking=false;
  function update(){
    var y=window.scrollY||0;
    if(!head.classList.contains('nav-open')){
      if(y<80)head.classList.remove('nav-hidden');
      else if(y>lastY+6)head.classList.add('nav-hidden');
      else if(y<lastY-6)head.classList.remove('nav-hidden');
    }
    lastY=y;ticking=false;
  }
  window.addEventListener('scroll',function(){
    if(!ticking){requestAnimationFrame(update);ticking=true;}
  },{passive:true});
  head.addEventListener('focusin',function(){head.classList.remove('nav-hidden');});
  /* mobile menu */
  var toggle=head.querySelector('.nav-toggle');
  var icon=head.querySelector('.nav-toggle-icon');
  function setMenu(open){
    head.classList.toggle('nav-open',open);
    if(open)head.classList.remove('nav-hidden');
    if(toggle){
      toggle.setAttribute('aria-expanded',open?'true':'false');
      toggle.setAttribute('aria-label',open?'Close menu':'Open menu');
    }
    if(icon)icon.textContent=open?'✕':'☰';
  }
  if(toggle){
    toggle.addEventListener('click',function(){
      setMenu(!head.classList.contains('nav-open'));
    });
  }
  head.addEventListener('click',function(e){
    if(e.target.closest('.navlink'))setMenu(false);
  });
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape'&&head.classList.contains('nav-open')){
      setMenu(false);
      if(toggle)toggle.focus();
    }
  });
  document.addEventListener('click',function(e){
    if(head.classList.contains('nav-open')&&!e.target.closest('.site-head'))setMenu(false);
  });
})();
</script>
</body>
</html>`;
}

/**
 * Tiny inline SVG favicon. Returns raw SVG markup with real `#` colors; the
 * caller wraps it in `encodeURIComponent` so the inner double quotes, `<`, `>`
 * and `#` are escaped and cannot terminate the `href` attribute early.
 */
function faviconSvg() {
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">' +
    '<rect width="32" height="32" rx="8" fill="#3b35e0"/>' +
    '<text x="16" y="23" font-size="17" font-weight="800" font-family="Verdana,sans-serif" fill="#ffffff" text-anchor="middle">//</text>' +
    '</svg>'
  );
}

/* ------------------------------------------------------------------ */
/* Styles, single inlined sheet. Light, energetic, accessible.       */
/* ------------------------------------------------------------------ */

function styles() {
  return `
:root{
  /* surfaces, warm light paper, no heavy black */
  --paper:#fbfaf7;--paper-2:#f3f1ea;--surface:#ffffff;--surface-2:#f7f6f1;
  /* ink, all text tones meet WCAG 2.0 AAA (>=7:1) on paper and surfaces */
  --ink:#181a2c;--ink-soft:#4a4f63;--ink-faint:#4d5263;
  /* trust primary, deep electric indigo */
  --indigo:#3b35e0;--indigo-deep:#2a25b8;--indigo-soft:#e9e8fd;--indigo-tint:#f1f0fe;
  /* growth accent, emerald. -deep is AAA text on light + white on -deep */
  --emerald:#0e9f6e;--emerald-deep:#055236;--emerald-soft:#d8f3e8;
  /* energy accent, amber. bright amber is decorative/dark-bg only; -deep for text on light */
  --amber:#f5a31a;--amber-deep:#6b4400;--amber-soft:#fdedcf;
  /* extra lane hues, darkened to AAA text contrast on light */
  --cyan:#084a5c;--cyan-soft:#d4eef5;
  --rose:#911140;--rose-soft:#fbdee8;
  /* lines */
  --line:#e7e4da;--line-hard:#d8d4c6;
  --r-sm:9px;--r:16px;--r-lg:26px;--r-xl:34px;
  --shadow-1:0 1px 2px #1a1a3408,0 6px 16px -8px #1a1a3422;
  --shadow-2:0 2px 4px #1a1a340a,0 18px 40px -16px #1a1a3433;
  --shadow-lift:0 4px 8px #1a1a340f,0 30px 60px -22px #1a1a3440;
  --ease:cubic-bezier(.2,.7,.2,1);
  --maxw:1140px;
}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{
  margin:0;
  font-family:"Segoe UI Variable Text","Segoe UI",-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;
  color:var(--ink);background:var(--paper);line-height:1.65;font-size:17px;
  background-image:
    radial-gradient(820px 480px at 90% -8%,#e9e8fd 0%,transparent 62%),
    radial-gradient(680px 420px at -6% 4%,#d8f3e8 0%,transparent 58%);
  background-attachment:fixed;
  -webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;
}
code,kbd,samp,.mono{font-family:"Cascadia Code","Cascadia Mono",ui-monospace,Consolas,"SF Mono",Menlo,monospace}
h1,h2,h3,h4{
  font-family:"Segoe UI Variable Display","Segoe UI Semibold","Segoe UI",-apple-system,Arial,sans-serif;
  line-height:1.1;margin:0 0 .45em;font-weight:800;letter-spacing:-.022em;color:var(--ink);
}
h1{font-size:clamp(2.3rem,5.6vw,4rem)}
h2{font-size:clamp(1.7rem,3.6vw,2.5rem)}
h3{font-size:1.24rem;letter-spacing:-.014em}
p{margin:0 0 1rem}
a{color:var(--indigo);text-underline-offset:3px;text-decoration-thickness:1.4px}
a:hover{color:var(--indigo-deep)}
strong{color:var(--ink);font-weight:700}
ul{padding-left:1.15rem}
img{max-width:100%;height:auto}

/* ---- accessibility: focus + skip link ---- */
.visually-hidden{
  position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;
  overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;
}
:focus-visible{outline:3px solid var(--indigo);outline-offset:3px;border-radius:5px}
.skip-link{
  position:fixed;top:-120px;left:16px;z-index:200;background:var(--indigo);color:#fff;
  padding:.7rem 1.15rem;border-radius:0 0 var(--r-sm) var(--r-sm);font-weight:700;
  text-decoration:none;transition:top .18s var(--ease);
}
.skip-link:focus{top:0}

/* ---- header / nav ---- */
.site-head{
  position:sticky;top:0;z-index:50;
  background:#fbfaf7ee;backdrop-filter:saturate(1.5) blur(10px);
  border-bottom:1px solid var(--line);
  transition:transform .3s cubic-bezier(.2,.7,.2,1),opacity .3s ease;
  will-change:transform;
}
/* auto-hide on scroll down, reveal on scroll up, full screen for content */
.site-head.nav-hidden{transform:translateY(-100%);opacity:0;pointer-events:none}
.head-inner{
  max-width:var(--maxw);margin:0 auto;
  display:flex;align-items:center;gap:1rem;flex-wrap:wrap;
  padding:.7rem clamp(1rem,4vw,2rem);
}
.brand{display:flex;align-items:center;gap:.45rem;text-decoration:none;color:var(--ink)}
.brand-mark{
  font-family:"Cascadia Code",ui-monospace,monospace;font-weight:800;font-size:1.05rem;
  color:#fff;background:linear-gradient(150deg,var(--indigo),var(--indigo-deep));
  width:32px;height:32px;border-radius:9px;display:grid;place-items:center;
  box-shadow:0 4px 10px -4px #3b35e088;
}
.brand-word{font-size:1.2rem;font-weight:800;letter-spacing:-.03em}
.site-nav{flex:1;display:flex;justify-content:center}
.nav-list{display:flex;flex-wrap:wrap;gap:.15rem;list-style:none;margin:0;padding:0}
.navlink{
  display:inline-block;padding:.45rem .8rem;border-radius:999px;text-decoration:none;
  color:var(--ink-soft);font-size:.88rem;font-weight:600;letter-spacing:-.01em;
  border:1px solid transparent;transition:color .15s var(--ease),background .15s var(--ease);
}
.navlink:hover{color:var(--ink);background:var(--surface-2)}
.navlink.is-current{color:var(--indigo);background:var(--indigo-tint)}
.btn-mini{padding:.5rem .95rem;font-size:.84rem}
/* mobile menu toggle, hidden on desktop, shown under 620px */
.nav-toggle{
  display:none;align-items:center;justify-content:center;
  width:42px;height:42px;padding:0;cursor:pointer;
  background:var(--surface);border:1px solid var(--line-hard);
  border-radius:11px;color:var(--ink);
}
.nav-toggle:hover{border-color:var(--indigo);color:var(--indigo)}
.nav-toggle-icon{font-size:1.3rem;line-height:1}

/* ---- main shell ---- */
.site-main{
  max-width:var(--maxw);margin:0 auto;
  padding:clamp(1.6rem,5vw,3.4rem) clamp(1rem,4vw,2rem) 4.5rem;
}
.site-main:focus{outline:none}

/* ---- buttons ---- */
.btn{
  display:inline-flex;align-items:center;gap:.5rem;
  font-size:.94rem;font-weight:700;letter-spacing:-.01em;text-decoration:none;cursor:pointer;
  padding:.82rem 1.45rem;border-radius:999px;border:1px solid transparent;
  transition:transform .14s var(--ease),box-shadow .14s var(--ease),background .16s var(--ease);
}
.btn-primary{
  color:#1c1402;background:linear-gradient(160deg,#ffc04d,var(--amber));
  border-color:#e8950c;box-shadow:0 6px 18px -6px #f5a31a99,0 1px 0 #ffffff80 inset;
}
.btn-primary:hover{transform:translateY(-2px);box-shadow:0 12px 26px -8px #f5a31aaa,0 1px 0 #ffffff80 inset;color:#1c1402}
.btn-primary:active{transform:translateY(0)}
.btn-trust{
  color:#fff;background:linear-gradient(160deg,#5650f0,var(--indigo));
  border-color:var(--indigo-deep);box-shadow:0 6px 18px -6px #3b35e0aa,0 1px 0 #ffffff33 inset;
}
.btn-trust:hover{transform:translateY(-2px);box-shadow:0 12px 26px -8px #3b35e0bb;color:#fff}
.btn-trust:active{transform:translateY(0)}
.btn-ghost{
  color:var(--ink);background:var(--surface);border:1px solid var(--line-hard);
  box-shadow:var(--shadow-1);
}
.btn-ghost:hover{transform:translateY(-2px);border-color:var(--indigo);color:var(--indigo)}
.btn-ghost:active{transform:translateY(0)}
.btn .arrow{transition:transform .16s var(--ease)}
.btn:hover .arrow{transform:translateX(3px)}

/* ---- kicker / eyebrow ---- */
.kicker{
  display:inline-flex;align-items:center;gap:.5rem;margin:0 0 1rem;
  font-size:.76rem;font-weight:700;letter-spacing:.13em;text-transform:uppercase;
  color:var(--ink);background:var(--indigo-tint);
  border:1px solid var(--indigo-soft);border-radius:999px;padding:.4rem .85rem;
}
.kicker-tick{width:7px;height:7px;border-radius:2px;background:var(--indigo);transform:rotate(45deg)}
.kicker.tone-emerald{background:var(--emerald-soft);border-color:#bfe9d6}
.kicker.tone-emerald .kicker-tick{background:var(--emerald)}
.kicker.tone-amber{background:var(--amber-soft);border-color:#f6d99a}
.kicker.tone-amber .kicker-tick{background:var(--amber)}
.kicker.tone-cyan{background:var(--cyan-soft);border-color:#b6e2ec}
.kicker.tone-cyan .kicker-tick{background:var(--cyan)}
.kicker.tone-rose{background:var(--rose-soft);border-color:#f4c2d3}
.kicker.tone-rose .kicker-tick{background:var(--rose)}

/* ---- fixed per-track accent classes (no inline styles, CSP-safe) ---- */
/* --accent = vivid hue for decoration; --accent-text = AAA-safe variant for text */
.acc-0{--accent:var(--indigo);--accent-text:var(--indigo)}
.acc-1{--accent:var(--emerald);--accent-text:var(--emerald-deep)}
.acc-2{--accent:var(--amber);--accent-text:var(--amber-deep)}
.acc-3{--accent:var(--cyan);--accent-text:var(--cyan)}
.acc-4{--accent:var(--rose);--accent-text:var(--rose)}

/* ---- small layout utilities ---- */
.u-center{justify-content:center}
.track-tagline-lede{font-weight:700;color:var(--accent-text,var(--indigo));font-size:1.2rem}

/* ---- section heading block ---- */
.section{margin-top:clamp(3rem,7vw,5rem)}
.section-head{max-width:62ch;margin-bottom:1.8rem}
.section-head .lead{font-size:1.1rem;color:var(--ink-soft);margin:0}
.section-foot{margin:1.6rem 0 0;text-align:center}
.textlink{display:inline-flex;align-items:center;gap:.4rem;font-weight:700;text-decoration:none;color:var(--indigo)}
.textlink:hover{color:var(--indigo-deep)}
.textlink:hover .arrow{transform:translateX(3px)}
.deepen{margin:.9rem 0 0}
.notes-body{max-width:72ch}
.notes-body .notes-h{font-size:1.15rem;margin:1.4rem 0 .5rem}
.notes-body p{color:var(--ink-soft);margin:0 0 .9rem}
.notes-body strong{color:var(--ink)}
.notes-list{margin:0 0 1rem;padding-left:1.2rem}
.notes-list li{color:var(--ink-soft);margin:0 0 .45rem}
.notes-meta{margin:1.1rem 0 0;font-size:.86rem;color:var(--ink-faint)}

/* ---- staggered entrance: one orchestrated page load ---- */
.rise{animation:rise .62s var(--ease) both}
.d1{animation-delay:.05s}.d2{animation-delay:.12s}.d3{animation-delay:.19s}
.d4{animation-delay:.26s}.d5{animation-delay:.33s}.d6{animation-delay:.4s}
@keyframes rise{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:none}}

/* ---- HERO ---- */
.hero{
  position:relative;border-radius:var(--r-xl);overflow:hidden;
  padding:clamp(2rem,5.5vw,4rem);
  background:
    radial-gradient(640px 320px at 100% 0%,#e9e8fd 0%,transparent 70%),
    linear-gradient(165deg,#ffffff 0%,#f6f5ef 100%);
  border:1px solid var(--line);box-shadow:var(--shadow-2);
}
.hero::before{
  /* energetic diagonal accent ribbon */
  content:"";position:absolute;right:-90px;top:-90px;width:340px;height:340px;
  background:conic-gradient(from 200deg,var(--indigo),var(--cyan),var(--emerald),var(--indigo));
  filter:blur(6px);opacity:.16;border-radius:46% 54% 60% 40%;
  animation:drift 22s linear infinite;
}
@keyframes drift{to{transform:rotate(360deg)}}
.hero-grid{display:grid;gap:2rem;grid-template-columns:1.35fr .9fr;align-items:center;position:relative}
.hero-title{max-width:16ch;margin-bottom:1.1rem}
.hero-title .grad{
  background:linear-gradient(110deg,var(--indigo),var(--emerald) 80%);
  -webkit-background-clip:text;background-clip:text;color:transparent;
}
.hero-lede{font-size:clamp(1.05rem,2.2vw,1.3rem);color:var(--ink-soft);max-width:52ch;margin-bottom:1.7rem}
.hero-actions{display:flex;flex-wrap:wrap;gap:.8rem}
.hero-proof{
  display:flex;flex-wrap:wrap;gap:.5rem 1.4rem;margin-top:1.7rem;
  font-size:.86rem;color:var(--ink-faint);font-weight:600;
}
.hero-proof span{display:inline-flex;align-items:center;gap:.45rem}
.hero-proof .chk{
  width:18px;height:18px;border-radius:50%;flex:none;display:grid;place-items:center;
  background:var(--emerald-soft);color:var(--emerald-deep);font-size:.7rem;font-weight:900;
}
/* hero side: aspirational outcome card */
.outcome-card{
  background:linear-gradient(165deg,#23204a,#181a2c);color:#fff;
  border-radius:var(--r-lg);padding:1.6rem 1.5rem;position:relative;overflow:hidden;
  box-shadow:var(--shadow-lift);
}
.outcome-card::after{
  content:"";position:absolute;left:-40px;bottom:-40px;width:160px;height:160px;
  background:radial-gradient(circle,var(--amber) 0%,transparent 70%);opacity:.4;
}
.outcome-card .oc-kicker{
  font-size:.72rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;
  color:var(--amber);margin:0 0 .8rem;
}
.outcome-card .oc-big{
  font-size:clamp(1.9rem,4vw,2.5rem);font-weight:800;line-height:1.05;margin:0 0 .3rem;
  letter-spacing:-.02em;color:#fff;
}
.outcome-card .oc-sub{font-size:.92rem;color:#c7c8e4;margin:0 0 1.1rem}
.oc-list{list-style:none;margin:0;padding:0;display:grid;gap:.6rem}
.oc-list li{
  display:flex;gap:.6rem;font-size:.9rem;color:#e7e7f4;align-items:flex-start;
}
.oc-list li::before{
  content:"";margin-top:.42em;width:8px;height:8px;flex:none;border-radius:2px;
  background:var(--amber);transform:rotate(45deg);
}

/* ---- STAT BAND ---- */
.stat-band{
  display:grid;gap:1px;grid-template-columns:repeat(4,1fr);
  background:var(--line);border:1px solid var(--line);border-radius:var(--r);
  overflow:hidden;margin-top:1.4rem;box-shadow:var(--shadow-1);
}
.stat{
  background:var(--surface);padding:1.4rem 1.3rem;text-align:left;
  transition:background .18s var(--ease);
}
.stat:hover{background:var(--indigo-tint)}
.stat-num{
  font-size:clamp(2rem,4vw,2.7rem);font-weight:800;line-height:1;letter-spacing:-.03em;
  display:block;color:var(--indigo);
}
.stat-num .plus{color:var(--amber-deep)}
.stat-label{
  font-size:.8rem;color:var(--ink-faint);font-weight:600;margin-top:.4rem;display:block;
  letter-spacing:.01em;
}

/* ---- generic grids ---- */
.grid{display:grid;gap:1.2rem}
.grid-2{grid-template-columns:repeat(auto-fit,minmax(min(100%,330px),1fr))}
.grid-3{grid-template-columns:repeat(auto-fit,minmax(min(100%,250px),1fr))}

/* ---- card primitive ---- */
.card{
  background:var(--surface);border:1px solid var(--line);border-radius:var(--r);
  box-shadow:var(--shadow-1);position:relative;
}

/* ---- track cards ---- */
.track-card{
  padding:1.5rem;display:flex;flex-direction:column;gap:.7rem;text-decoration:none;
  color:inherit;border-top:4px solid var(--accent,var(--indigo));
  transition:transform .16s var(--ease),box-shadow .16s var(--ease),border-color .16s;
}
.track-card:hover{transform:translateY(-4px);box-shadow:var(--shadow-lift)}
.track-glyph{
  font-size:1.35rem;width:48px;height:48px;display:grid;place-items:center;
  border-radius:13px;color:#fff;
  background:linear-gradient(150deg,var(--accent,var(--indigo)),color-mix(in srgb,var(--accent,var(--indigo)) 60%,#000));
  box-shadow:0 6px 14px -6px var(--accent,var(--indigo));
}
.track-card h3{margin:.3rem 0 0}
.track-tagline{color:var(--accent-text,var(--indigo));font-weight:700;margin:0;font-size:.96rem}
.track-focus{color:var(--ink-soft);font-size:.96rem;margin:0;flex:1}
.track-cta{
  font-size:.82rem;font-weight:700;color:var(--ink-faint);
  display:flex;justify-content:space-between;align-items:center;
  border-top:1px solid var(--line);padding-top:.8rem;margin-top:.2rem;
}
.track-card:hover .track-cta .arrow{transform:translateX(4px);color:var(--accent-text,var(--indigo))}
.arrow{transition:transform .16s var(--ease),color .16s}

/* ---- how-it-works steps ---- */
.steps{counter-reset:step;display:grid;gap:1.1rem;list-style:none;padding:0;margin:0}
.step{
  display:flex;gap:1.2rem;align-items:flex-start;padding:1.4rem 1.5rem;
}
.step-num{
  counter-increment:step;flex:none;width:44px;height:44px;border-radius:13px;
  display:grid;place-items:center;font-weight:800;font-size:1.1rem;
  color:#fff;background:linear-gradient(150deg,var(--indigo),var(--indigo-deep));
  box-shadow:0 6px 14px -6px #3b35e0aa;
}
.step-num::before{content:counter(step)}
.step h3{margin:.2rem 0 .3rem}
.step p{margin:0;color:var(--ink-soft);font-size:.98rem}

/* ---- value / promise cards ---- */
.promise{padding:1.5rem;display:flex;flex-direction:column;gap:.6rem}
.promise-icon{
  width:46px;height:46px;border-radius:13px;display:grid;place-items:center;
  font-size:1.2rem;font-weight:900;
  background:var(--indigo-tint);color:var(--indigo);
}
.promise.tone-emerald .promise-icon{background:var(--emerald-soft);color:var(--emerald-deep)}
.promise.tone-amber .promise-icon{background:var(--amber-soft);color:var(--amber-deep)}
.promise h3{margin:.2rem 0 0}
.promise p{margin:0;color:var(--ink-soft);font-size:.97rem}

/* ---- roadmap (start view), a gentle numbered climb ---- */
.roadmap{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:.7rem}
.road-step{position:relative}
.road-link{
  display:flex;align-items:center;gap:1rem;text-decoration:none;color:var(--ink);
  background:var(--surface);border:1px solid var(--line);border-radius:var(--r);
  padding:1rem 1.2rem;box-shadow:var(--shadow-1);
  transition:transform .16s var(--ease),box-shadow .16s var(--ease),border-color .16s var(--ease);
  border-left:4px solid var(--accent,var(--indigo));
}
.road-link:hover{transform:translateX(4px);box-shadow:var(--shadow-2);border-color:var(--accent-text,var(--indigo))}
.road-num{
  flex:none;width:34px;height:34px;border-radius:999px;display:grid;place-items:center;
  font-weight:800;font-size:.95rem;color:var(--accent-text,var(--indigo));
  background:color-mix(in srgb,var(--accent,var(--indigo)) 14%,transparent);
}
.road-glyph{flex:none;font-size:1.2rem;color:var(--accent-text,var(--indigo))}
.road-body{flex:1;min-width:0;display:flex;flex-direction:column;gap:.1rem}
.road-title{font-weight:800;letter-spacing:-.01em;display:flex;align-items:center;gap:.5rem;flex-wrap:wrap}
.road-tagline{color:var(--ink-soft);font-size:.92rem}
.road-meta{flex:none;color:var(--ink-faint);font-size:.82rem;font-weight:600;white-space:nowrap}
.road-flag{
  font-size:.66rem;font-weight:800;text-transform:uppercase;letter-spacing:.04em;
  color:#fff;background:#075539;padding:.12rem .5rem;border-radius:999px;
}
.road-flag.is-capstone{background:var(--amber);color:#1c1402}
@media (max-width:620px){
  .road-meta{display:none}
  .road-link{gap:.7rem;padding:.85rem .9rem}
}

/* ---- journey bridge: the first 30 days, then week by week to the ship ---- */
.week-bridge-wrap{max-width:660px;margin:1.4rem 0 0}
.week-bridge{margin:1.6rem 0 0}
.wb-bar{display:flex;gap:4px;border-radius:999px;overflow:hidden}
.wb-seg{
  flex:1;min-width:0;height:30px;display:grid;place-items:center;
  font-size:.74rem;font-weight:800;color:#fff;
}
.wb-seg .wb-w{opacity:.92}
.wb-kick{background:linear-gradient(180deg,var(--amber),var(--amber-deep));color:#1c1402}
.wb-solo{background:color-mix(in srgb,var(--indigo) 22%,transparent);color:var(--indigo-deep)}
.wb-legend{display:flex;flex-wrap:wrap;gap:.5rem 1.1rem;margin-top:.7rem}
.wb-tag{font-size:.82rem;font-weight:700;color:var(--ink-soft);display:inline-flex;align-items:center;gap:.4rem}
.wb-tag::before{content:"";width:12px;height:12px;border-radius:3px}
.wb-tag-kick::before{background:var(--amber)}
.wb-tag-solo::before{background:color-mix(in srgb,var(--indigo) 40%,transparent)}

/* ---- callout ---- */
.callout{
  display:flex;gap:1rem;align-items:flex-start;
  padding:1.4rem 1.6rem;border-radius:var(--r);margin:1.8rem 0 0;
  background:linear-gradient(150deg,var(--indigo-tint),var(--emerald-soft));
  border:1px solid var(--indigo-soft);
}
.callout-bar{width:5px;flex:none;align-self:stretch;border-radius:999px;background:var(--indigo)}
.callout p{margin:0;color:var(--ink-soft)}
.callout strong{color:var(--ink)}

/* ---- breadcrumb ---- */
.crumbs{font-size:.84rem;color:var(--ink-faint);margin-bottom:1rem;font-weight:600}
.crumbs a{color:var(--ink-faint);text-decoration:none}
.crumbs a:hover{color:var(--indigo)}

/* ---- timeline (track view) ---- */
.timeline{position:relative;margin:1.4rem 0 0;padding-left:2.6rem}
.timeline::before{
  content:"";position:absolute;left:15px;top:8px;bottom:8px;width:3px;border-radius:3px;
  background:linear-gradient(180deg,var(--indigo),var(--emerald));
}
.week-block{position:relative;margin-bottom:1.8rem}
.week-node{
  position:absolute;left:-2.6rem;top:0;width:33px;height:33px;border-radius:50%;
  display:grid;place-items:center;font-size:.74rem;font-weight:800;color:#fff;
  background:linear-gradient(150deg,var(--indigo),var(--indigo-deep));
  box-shadow:0 0 0 5px var(--paper),0 6px 12px -6px #3b35e0aa;
}
.week-tag{
  font-size:.74rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;
  color:var(--ink-faint);margin:.35rem 0 .7rem;
}
.concept-card{padding:1.4rem;display:flex;flex-direction:column;gap:.7rem}
.concept-card h3{margin:0}
.concept-summary{color:var(--ink-soft);margin:0;font-size:.98rem}
.bridge{
  display:inline-flex;align-items:center;gap:.5rem;align-self:flex-start;
  font-size:.8rem;font-weight:600;color:var(--cyan);
  background:var(--cyan-soft);border:1px solid #b6e2ec;border-radius:999px;padding:.32rem .75rem;
}
.bridge .b-key{color:var(--ink-faint);font-weight:700}
.prereq-row{
  display:flex;flex-wrap:wrap;gap:.4rem;align-items:center;
  font-size:.8rem;color:var(--ink-faint);font-weight:600;
}
.prereq-chip{
  background:var(--surface-2);border:1px solid var(--line-hard);border-radius:999px;
  padding:.22rem .65rem;color:var(--ink-soft);font-weight:600;
}

/* ---- resource list ---- */
.res-list{list-style:none;padding:0;margin:.2rem 0 0;display:grid;gap:.55rem}
.res{
  display:flex;gap:.8rem;align-items:center;padding:.7rem .85rem;border-radius:var(--r-sm);
  background:var(--surface-2);border:1px solid var(--line);text-decoration:none;color:var(--ink);
  transition:border-color .15s var(--ease),background .15s var(--ease),transform .12s var(--ease);
}
.res:hover{border-color:var(--indigo);background:var(--indigo-tint);transform:translateX(3px)}
.res-type{
  flex:none;font-size:.66rem;font-weight:700;letter-spacing:.05em;text-transform:uppercase;
  padding:.28rem .55rem;border-radius:6px;background:var(--indigo-soft);color:var(--indigo-deep);
  min-width:84px;text-align:center;
}
.res-body{flex:1;min-width:0}
.res-title{display:block;font-weight:700;font-size:.95rem;line-height:1.3}
.res-src{font-size:.78rem;color:var(--ink-faint);font-weight:600}
.res-free{
  flex:none;font-size:.68rem;font-weight:700;color:var(--emerald-deep);
  background:var(--emerald-soft);border-radius:6px;padding:.24rem .48rem;
}
.res-ext{color:var(--ink-faint);flex:none;font-weight:700}

/* ---- knowledge graph ---- */
.graph-wrap{
  overflow-x:auto;padding:1.2rem;border-radius:var(--r);background:var(--surface);
  border:1px solid var(--line);box-shadow:var(--shadow-1);
}
.graph-svg{display:block;margin:0 auto;min-width:700px}
.graph-legend{display:flex;flex-wrap:wrap;gap:.7rem 1.2rem;margin-top:1rem}
.legend-item{display:flex;align-items:center;gap:.5rem;font-size:.86rem;color:var(--ink-soft);font-weight:600}
.legend-swatch{width:15px;height:15px;border-radius:5px;background:var(--accent,var(--indigo))}
table{border-collapse:collapse;width:100%}
.data-table{
  background:var(--surface);border:1px solid var(--line);border-radius:var(--r);
  overflow:hidden;box-shadow:var(--shadow-1);
}
.data-table caption{
  text-align:left;color:var(--ink-faint);font-size:.82rem;font-weight:600;
  padding:1rem 1.1rem .4rem;caption-side:top;
}
.data-table th,.data-table td{
  text-align:left;padding:.7rem 1.1rem;border-bottom:1px solid var(--line);
  font-size:.92rem;vertical-align:top;
}
.data-table tbody tr:last-child td{border-bottom:none}
.data-table tbody tr:hover{background:var(--surface-2)}
.data-table th{
  color:var(--ink-faint);font-size:.74rem;letter-spacing:.06em;text-transform:uppercase;
  font-weight:700;background:var(--surface-2);
}

/* ---- projects ---- */
.project-card{padding:1.6rem;display:flex;flex-direction:column;gap:.8rem;border-left:4px solid var(--amber)}
.project-head{display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;flex-wrap:wrap}
.project-week{
  font-size:.74rem;font-weight:700;color:var(--amber-deep);
  background:var(--amber-soft);border-radius:999px;padding:.3rem .7rem;white-space:nowrap;
}
.brief{color:var(--ink-soft);margin:0;font-size:.98rem}
.industry-note{
  margin:0;font-size:.92rem;color:var(--ink-soft);
  background:var(--surface-2);border-radius:var(--r-sm);padding:.85rem 1rem;
  border-left:3px solid var(--emerald);
}
.industry-note strong{color:var(--emerald-deep)}
.field-label{
  font-size:.73rem;font-weight:700;letter-spacing:.09em;text-transform:uppercase;
  color:var(--ink-faint);margin:.4rem 0 .35rem;display:block;
}
.deliverable{margin:0;font-size:.95rem}
.rubric{margin:.2rem 0 0;padding-left:0;font-size:.93rem;color:var(--ink-soft);list-style:none;display:grid;gap:.4rem}
.rubric li{position:relative;padding-left:1.5rem}
.rubric li::before{
  content:"";position:absolute;left:0;top:.5em;width:8px;height:8px;border-radius:2px;
  background:var(--indigo);transform:rotate(45deg);
}
.stack-row{display:flex;flex-wrap:wrap;gap:.4rem}
.stack-chip{
  font-size:.76rem;font-weight:600;color:var(--ink-soft);
  background:var(--surface-2);border:1px solid var(--line-hard);
  border-radius:7px;padding:.26rem .6rem;
}
/* ---- feature list: what the product ships, scannable, auto two-column ---- */
.feature-list{
  margin:.2rem 0 0;padding:0;list-style:none;font-size:.92rem;color:var(--ink-soft);
  display:grid;gap:.4rem .9rem;grid-template-columns:repeat(auto-fill,minmax(min(100%,220px),1fr));
}
.feature-list li{position:relative;padding-left:1.6rem;line-height:1.45}
.feature-list li::before{
  content:"";position:absolute;left:0;top:.2em;width:15px;height:15px;border-radius:5px;
  background:var(--emerald-soft);
}
.feature-list li::after{
  content:"";position:absolute;left:4px;top:.42em;width:5px;height:8px;
  border:solid var(--emerald-deep);border-width:0 2px 2px 0;transform:rotate(45deg);
}
/* ---- market signal: researched product validation ---- */
.market-note{
  margin:0;font-size:.92rem;color:var(--ink-soft);
  background:linear-gradient(150deg,var(--amber-soft),var(--surface));
  border:1px solid #f6d99a;border-left:4px solid var(--amber);
  border-radius:var(--r-sm);padding:.95rem 1.1rem;
}
.market-label{
  display:block;font-size:.72rem;font-weight:700;letter-spacing:.09em;text-transform:uppercase;
  color:var(--amber-deep);margin-bottom:.35rem;
}
.syllabus-tag{
  display:inline-flex;align-items:center;gap:.5rem;align-self:flex-start;
  font-size:.8rem;font-weight:600;color:var(--cyan);
  background:var(--cyan-soft);border:1px solid #b6e2ec;border-radius:999px;padding:.34rem .8rem;
}
.syllabus-tag .tag-key{color:var(--ink-faint);font-weight:700}

/* ---- the 30-day challenge ---- */
.phase-list{display:grid;gap:1rem;margin-top:1.3rem;list-style:none;padding:0}
.phase{padding:1.4rem 1.5rem;display:flex;gap:1.2rem;align-items:flex-start;border-left:4px solid var(--indigo)}
.phase-range{
  flex:none;font-weight:800;color:#fff;
  background:linear-gradient(150deg,var(--indigo),var(--indigo-deep));border-radius:11px;
  padding:.6rem .8rem;min-width:96px;text-align:center;font-size:.82rem;
}
.phase h3{margin:.1rem 0 .3rem;font-size:1.1rem}
.phase p{margin:0;color:var(--ink-soft);font-size:.96rem}

/* ---- status ---- */
.status-banner{
  display:flex;align-items:center;gap:1.1rem;padding:1.4rem 1.6rem;border-radius:var(--r);
  border:1px solid var(--line);box-shadow:var(--shadow-1);margin-top:1.2rem;
}
.status-banner.ok{background:var(--emerald-soft);border-color:#bfe9d6}
.status-banner.warn{background:var(--amber-soft);border-color:#f6d99a}
.status-banner.neutral{background:var(--surface-2)}
.status-led{
  width:18px;height:18px;border-radius:50%;flex:none;
  box-shadow:0 0 0 5px currentColor;opacity:1;
}
.led-ok{color:#bfe9d6;background:var(--emerald)}
.led-warn{color:#f6d99a;background:var(--amber)}
.led-neutral{color:var(--line-hard);background:var(--ink-faint)}
.status-result{font-weight:800;font-size:1.15rem;text-transform:capitalize;letter-spacing:-.01em}
.status-sub{color:var(--ink-soft);font-size:.94rem;margin:.2rem 0 0}
.kv-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,230px),1fr));gap:1px;
  background:var(--line);border:1px solid var(--line);border-radius:var(--r);overflow:hidden;margin-top:1.3rem}
.kv{padding:1.1rem 1.2rem;background:var(--surface)}
.kv dt{font-size:.73rem;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--ink-faint)}
.kv dd{margin:.3rem 0 0;font-size:1rem;color:var(--ink);word-break:break-word;font-weight:600}

/* ---- 404 ---- */
.notfound{text-align:center;padding:clamp(2rem,8vw,5rem) 1rem}
.notfound .big{
  font-size:clamp(4.5rem,17vw,10rem);font-weight:900;letter-spacing:-.04em;margin:0;line-height:1;
  background:linear-gradient(120deg,var(--indigo),var(--emerald));
  -webkit-background-clip:text;background-clip:text;color:transparent;
}
.notfound .lede{font-size:1.1rem;color:var(--ink-soft);max-width:50ch;margin:.6rem auto 1.8rem}

/* ---- readiness page ---- */
.ready-verdict{
  display:grid;gap:1.2rem;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));
  margin-top:1.4rem;
}
.verdict-card{padding:1.5rem;display:flex;flex-direction:column;gap:.55rem;border-top:4px solid var(--accent,var(--indigo))}
.verdict-card .v-icon{
  width:46px;height:46px;border-radius:13px;display:grid;place-items:center;
  font-size:1.25rem;font-weight:900;
  background:color-mix(in srgb,var(--accent,var(--indigo)) 14%,#fff);
  color:var(--accent-text,var(--indigo));
}
.verdict-card h3{margin:.25rem 0 0}
.verdict-card p{margin:0;color:var(--ink-soft);font-size:.96rem}
.verdict-card.is-go{--accent:var(--emerald)}
.verdict-card.is-wait{--accent:var(--amber)}

.honest-banner{
  display:flex;gap:1rem;align-items:flex-start;
  padding:1.4rem 1.6rem;border-radius:var(--r);margin-top:1.4rem;
  background:linear-gradient(150deg,var(--amber-soft),var(--surface));
  border:1px solid #f6d99a;
}
.honest-banner .hb-bar{width:5px;flex:none;align-self:stretch;border-radius:999px;background:var(--amber)}
.honest-banner p{margin:0;color:var(--ink-soft)}
.honest-banner strong{color:var(--ink)}

/* prerequisite checklist, each row a real self-assessment item */
.prereq-list{list-style:none;margin:1.4rem 0 0;padding:0;display:grid;gap:1rem}
.prereq-item{
  padding:1.4rem 1.5rem;display:grid;gap:.7rem;
  grid-template-columns:auto 1fr;align-items:start;
  border-left:4px solid var(--accent,var(--indigo));
}
.prereq-num{
  grid-row:1 / span 3;flex:none;width:42px;height:42px;border-radius:12px;
  display:grid;place-items:center;font-weight:800;font-size:1.05rem;color:#fff;
  background:linear-gradient(150deg,var(--accent,var(--indigo)),color-mix(in srgb,var(--accent,var(--indigo)) 62%,#000));
  box-shadow:0 6px 14px -6px var(--accent,var(--indigo));
}
.prereq-item h3{margin:.1rem 0 0;font-size:1.12rem}
.prereq-need{margin:0;color:var(--ink-soft);font-size:.96rem}
.prereq-check{
  margin:0;font-size:.92rem;color:var(--ink-soft);
  background:var(--surface-2);border-radius:var(--r-sm);padding:.7rem .95rem;
  border-left:3px solid var(--cyan);
}
.prereq-check strong{color:var(--cyan)}
.prereq-gap{
  font-size:.73rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;
  color:var(--ink-faint);margin:.5rem 0 .15rem;display:block;
}
.gap-links{list-style:none;margin:0;padding:0;display:grid;gap:.5rem}

/* honest "this is not for you yet" off-ramp */
.offramp{
  margin-top:clamp(2.4rem,5vw,3.6rem);padding:clamp(1.6rem,4vw,2.4rem);
  border-radius:var(--r-lg);
  background:linear-gradient(160deg,#23204a,#181a2c);color:#fff;
  position:relative;overflow:hidden;box-shadow:var(--shadow-lift);
}
.offramp::after{
  content:"";position:absolute;right:-50px;top:-50px;width:180px;height:180px;
  background:radial-gradient(circle,var(--emerald) 0%,transparent 70%);opacity:.35;
}
.offramp h2{color:#fff;position:relative}
.offramp p{color:#c7c8e4;position:relative;max-width:60ch}
.offramp .off-list{
  list-style:none;margin:1.1rem 0 0;padding:0;display:grid;gap:.55rem;position:relative;
}
.offramp .off-list li{display:flex;gap:.6rem;align-items:flex-start;font-size:.94rem;color:#e7e7f4}
.offramp .off-list li::before{
  content:"";margin-top:.42em;width:8px;height:8px;flex:none;border-radius:2px;
  background:var(--emerald);transform:rotate(45deg);
}

/* ---- footer ---- */
.site-foot{
  background:linear-gradient(180deg,#181a2c,#13142a);color:#c7c8e4;
  margin-top:clamp(3rem,8vw,6rem);
}
.foot-inner{
  max-width:var(--maxw);margin:0 auto;
  padding:clamp(2.2rem,5vw,3.4rem) clamp(1rem,4vw,2rem) 1.4rem;
  display:grid;gap:2rem;grid-template-columns:1.4fr 1fr 1.6fr;
}
.site-foot .brand-mark{box-shadow:none}
.foot-brand{display:flex;flex-direction:column;gap:.6rem}
.foot-brand .brand-word{color:#fff}
.foot-credo{font-size:.92rem;color:#a7a8c8;margin:.3rem 0 0;max-width:34ch}
.foot-nav{display:flex;flex-direction:column;gap:.5rem}
.foot-nav a{color:#c7c8e4;text-decoration:none;font-size:.92rem;font-weight:600}
.foot-nav a:hover{color:var(--amber)}
.foot-col-title{
  font-size:.74rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;
  color:var(--amber);margin:0 0 .3rem;
}
.foot-note p:not(.foot-col-title){font-size:.9rem;color:#a7a8c8;margin:0}
.foot-note strong{color:#fff}
.foot-base{
  max-width:var(--maxw);margin:0 auto;
  padding:1rem clamp(1rem,4vw,2rem) 2rem;border-top:1px solid #2a2c48;
  font-size:.82rem;color:#7e7fa3;font-weight:600;
}
.foot-heart{color:#ff6f9c;font-weight:700}

/* ---- responsive ---- */
@media (max-width:880px){
  .hero-grid{grid-template-columns:1fr}
  .foot-inner{grid-template-columns:1fr 1fr}
}
@media (max-width:620px){
  body{font-size:16px}
  .nav-toggle{display:inline-flex}
  .btn-mini{display:none}
  .site-nav{order:3;flex:0 0 100%}
  .nav-list{display:none;flex-direction:column;gap:.2rem;padding:.4rem 0 .2rem;width:100%}
  .site-head.nav-open .nav-list{display:flex}
  .navlink{display:block;width:100%;padding:.7rem .9rem;font-size:.95rem}
  .head-inner{justify-content:space-between}
  .stat-band{grid-template-columns:repeat(2,1fr)}
  .step{flex-direction:column;gap:.7rem}
  .foot-inner{grid-template-columns:1fr}
}

/* ---- reduced motion: honor the user ---- */
@media (prefers-reduced-motion:reduce){
  *,*::before,*::after{
    animation-duration:.001ms!important;animation-iteration-count:1!important;
    transition-duration:.001ms!important;scroll-behavior:auto!important;
  }
  .rise{opacity:1;transform:none}
}

/* ---- dark variant: a tasteful dim, never heavy black ---- */
@media (prefers-color-scheme:dark){
  :root{
    --paper:#1a1c2e;--paper-2:#21233a;--surface:#23253c;--surface-2:#2a2c44;
    --ink:#f1f1f8;--ink-soft:#c0c2d6;--ink-faint:#a6a8c2;
    --indigo:#a9a5ff;--indigo-deep:#c2bfff;--indigo-soft:#33345a;--indigo-tint:#2a2b4a;
    /* -deep tokens read as TEXT on dark chips, so they brighten in dark mode */
    --emerald-deep:#7fe9c0;--amber-deep:#ffd07a;
    --emerald:#3fd9a0;--emerald-deep:#5fe3b3;--emerald-soft:#1f3b35;
    --amber:#ffc04d;--amber-deep:#ffd27a;--amber-soft:#3d3216;
    --cyan:#4fc4e0;--cyan-soft:#1f3a44;
    --rose:#ff9bbb;--rose-soft:#3d2230;
    --line:#34365a;--line-hard:#41446b;
    --shadow-1:0 1px 2px #00000040,0 6px 16px -8px #00000066;
    --shadow-2:0 2px 4px #00000050,0 18px 40px -16px #00000080;
    --shadow-lift:0 4px 8px #00000055,0 30px 60px -22px #00000099;
  }
  body{
    background-image:
      radial-gradient(820px 480px at 90% -8%,#2a2b4a 0%,transparent 62%),
      radial-gradient(680px 420px at -6% 4%,#1f3b35 0%,transparent 58%);
  }
  .site-head{background:#1a1c2eee}
  .hero{background:radial-gradient(640px 320px at 100% 0%,#2a2b4a 0%,transparent 70%),linear-gradient(165deg,#23253c,#1f213a)}
  .btn-primary{color:#1c1402}
  .data-table th{background:var(--surface-2)}
}
`;
}

/* ------------------------------------------------------------------ */
/* Reusable content fragments                                         */
/* ------------------------------------------------------------------ */

/** Render one resource as a list item linking out to the source. */
function resourceItem(res) {
  const type = TYPE_LABEL[res.type] || esc(res.type);
  return `<li><a class="res" href="${esc(res.url)}" target="_blank" rel="noopener noreferrer">
  <span class="res-type">${esc(type)}</span>
  <span class="res-body">
    <span class="res-title">${esc(res.title)}</span>
    <span class="res-src">${esc(res.source)}</span>
  </span>
  ${res.free ? '<span class="res-free">Free</span>' : ''}
  <span class="res-ext" aria-hidden="true">↗</span>
  <span class="visually-hidden"> (opens in a new tab)</span>
</a></li>`;
}

/**
 * Render model-generated notes as safe HTML. The text is UNTRUSTED, so it is
 * escaped first; only then is a tiny, fixed set of formatting applied (bold
 * lead-ins, bullet lists, paragraphs). No raw HTML from the model survives.
 * @param {string} text
 * @returns {string}
 */
function renderNotes(text) {
  // Normalise the model output to the house style: no em or en dashes.
  const clean = String(text)
    .replace(/\r/g, '')
    .replace(/(\d)\s*[–—]\s*(\d)/g, '$1-$2')
    .replace(/\s*[–—]\s*/g, ', ');
  const lines = clean.split('\n');
  const out = [];
  let list = null;
  const inline = (s) => esc(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  const closeList = () => {
    if (list) {
      out.push(`<ul class="notes-list">${list.join('')}</ul>`);
      list = null;
    }
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      closeList();
      continue;
    }
    const heading = line.match(/^#{1,6}\s+(.*?):?\s*$/);
    const bullet = line.match(/^(?:[-*•]|\d+\.)\s+(.*)$/);
    if (heading) {
      closeList();
      out.push(`<h3 class="notes-h">${inline(heading[1])}</h3>`);
    } else if (bullet) {
      (list ||= []).push(`<li>${inline(bullet[1])}</li>`);
    } else {
      closeList();
      out.push(`<p>${inline(line)}</p>`);
    }
  }
  closeList();
  return out.join('');
}

/** Map a concept id to its title for prereq chips. */
function conceptTitleMap(curriculum) {
  const m = new Map();
  for (const c of curriculum.concepts) m.set(c.id, c.title);
  return m;
}

/** Deterministic accent name for a track, by its index in the tracks array. */
function laneAccentName(curriculum, trackId) {
  const idx = curriculum.tracks.findIndex((t) => t.id === trackId);
  return LANE_ACCENTS[(idx < 0 ? 0 : idx) % LANE_ACCENTS.length];
}

/* ------------------------------------------------------------------ */
/* homeView                                                           */
/* ------------------------------------------------------------------ */

/** @param {import('../lib/schema.mjs').Curriculum} curriculum */
export function homeView(curriculum) {
  const trackCards = curriculum.tracks
    .map((t, i) => {
      const conceptN = curriculum.concepts.filter((c) => c.trackId === t.id).length;
      const projectN = curriculum.projects.filter((p) => p.trackId === t.id).length;
      const glyph = TRACK_GLYPH[t.id] || '◆';
      const accClass = `acc-${i % LANE_ACCENTS.length}`;
      const delay = `d${Math.min(i + 1, 6)}`;
      return `<a class="card track-card rise ${delay} ${accClass}" href="/track/${esc(
        t.id,
      )}">
  <span class="track-glyph" aria-hidden="true">${glyph}</span>
  <h3>${esc(t.title)}</h3>
  <p class="track-tagline">${esc(t.tagline)}</p>
  <p class="track-focus">${esc(t.focus)}</p>
  <span class="track-cta">
    <span>${conceptN} concepts · ${projectN} projects</span>
    <span class="arrow" aria-hidden="true">→</span>
  </span>
</a>`;
    })
    .join('');

  // The deal, three short beats. One idea each.
  const steps = [
    ['Pick a track.', 'Choose the one that excites you most.'],
    ['Learn from the best, free.', '3Blue1Brown, MIT, Karpathy, Anthropic. All linked, all free.'],
    ['Ship a real product.', 'Deploy it publicly. That live URL is your proof.'],
  ]
    .map(
      ([h, p], i) =>
        `<li class="card step rise d${i + 1}"><span class="step-num" aria-hidden="true"></span><div><h3>${esc(
          h,
        )}</h3><p>${esc(p)}</p></div></li>`,
    )
    .join('');

  // Why it's different, three tight proof points.
  const promises = [
    ['indigo', 'Day-one ready', 'Deployable', 'You finish able to ship, not just pass.'],
    ['emerald', 'Always current', 'Current', 'A frontier AI refreshes the whole curriculum weekly.'],
    ['amber', 'Proof, not promises', 'Public', 'A live product, mapped to a real CS subject.'],
  ]
    .map(
      ([tone, icon, badge, body], i) =>
        `<article class="card promise tone-${tone} rise d${i + 1}">
  <span class="promise-icon" aria-hidden="true">${esc(badge.charAt(0))}</span>
  <h3>${esc(icon)}</h3>
  <p>${esc(body)}</p>
</article>`,
    )
    .join('');

  return `<section class="hero" aria-labelledby="hero-h">
  <div class="hero-grid">
    <div>
      ${kicker(`AI-native CS · version ${esc(curriculum.version)}`)}
      <h1 class="hero-title rise d1" id="hero-h">Become the <span class="grad">obvious hire</span>.</h1>
      <p class="hero-lede rise d2">A free, AI-native CS path. Pick a track, ship your first real product in your first 30 days, then keep building until you are the obvious hire.</p>
      <div class="hero-actions rise d3">
        <a class="btn btn-primary" href="/start">Start free <span class="arrow" aria-hidden="true">→</span></a>
        <a class="btn btn-ghost" href="/tracks">See the tracks</a>
      </div>
      <p class="hero-proof rise d4">
        <span><span class="chk" aria-hidden="true">✓</span> 100% free</span>
        <span><span class="chk" aria-hidden="true">✓</span> Course-aligned</span>
        <span><span class="chk" aria-hidden="true">✓</span> Updated weekly</span>
      </p>
    </div>
    <aside class="outcome-card rise d3" aria-label="The outcome">
      <p class="oc-kicker">The outcome</p>
      <p class="oc-big">A portfolio, not a certificate.</p>
      <p class="oc-sub">Finish a track with something live an employer can open and judge.</p>
      <ul class="oc-list">
        <li>Frontier work: agents, inference, applied ML.</li>
        <li>Every topic bridged to a classic CS subject.</li>
        <li>A public product, not a transcript.</li>
      </ul>
    </aside>
  </div>
  <div class="stat-band rise d5" role="list" aria-label="Your journey at a glance">
    <div class="stat" role="listitem" aria-label="30 days to your first ship"><span class="stat-num" aria-hidden="true">30</span><span class="stat-label" aria-hidden="true">days to your first ship</span></div>
    <div class="stat" role="listitem" aria-label="${esc(
      curriculum.tracks.length,
    )} paths, you pick one"><span class="stat-num" aria-hidden="true">${esc(
      curriculum.tracks.length,
    )}</span><span class="stat-label" aria-hidden="true">paths, you pick one</span></div>
    <div class="stat" role="listitem" aria-label="1 public product, yours"><span class="stat-num" aria-hidden="true">1</span><span class="stat-label" aria-hidden="true">public product, yours</span></div>
    <div class="stat" role="listitem" aria-label="100% free, forever"><span class="stat-num" aria-hidden="true">100%</span><span class="stat-label" aria-hidden="true">free, forever</span></div>
  </div>
</section>

<section class="section" aria-labelledby="deal-h">
  <div class="section-head">
    ${kicker('The deal')}
    <h2 id="deal-h">Three steps. That's it.</h2>
    <p class="lead">No fluff, no warm-up. The whole path is built around one outcome.</p>
  </div>
  <ol class="steps">${steps}</ol>
</section>

<section class="section" aria-labelledby="tracks-h">
  <div class="section-head">
    ${kicker('Choose your path', 'emerald')}
    <h2 id="tracks-h">${esc(curriculum.tracks.length)} tracks. Pick one.</h2>
    <p class="lead">Start anywhere, each track stands alone and ends in a product you can show.</p>
  </div>
  <div class="grid grid-2">${trackCards}</div>
  <p class="section-foot"><a class="textlink" href="/start">Not sure where to start? See your roadmap <span class="arrow" aria-hidden="true">→</span></a></p>
</section>

<section class="section" aria-labelledby="why-h">
  <div class="section-head">
    ${kicker("Why it's different", 'amber')}
    <h2 id="why-h">Built to get you hired.</h2>
    <p class="lead">Not a video library. A path engineered around one outcome.</p>
  </div>
  <div class="grid grid-3">${promises}</div>
</section>

<section class="section" aria-labelledby="how-h">
  <div class="section-head">
    ${kicker('How you start')}
    <h2 id="how-h">New here? Start your first 30 days with a cohort.</h2>
    <p class="lead">Your first 30 days, you build alongside a cohort, so you start strong and ship something real fast. Then you keep going, week by week, at your own pace. Prefer solo from day one? Pick any track and go.</p>
  </div>
  <div class="week-bridge-wrap">${weekBridge()}</div>
  <div class="hero-actions">
    <a class="btn btn-primary" href="/start">See your roadmap <span class="arrow" aria-hidden="true">→</span></a>
    <a class="btn btn-ghost" href="/challenge">Start the 30-Day Challenge</a>
  </div>
  <div class="callout">
    <span class="callout-bar" aria-hidden="true"></span>
    <p><strong>Curation, not authorship.</strong> We never charge, and never claim someone else's lecture as our own. The original work is the routing, the briefs, and the rubrics, the glue that turns scattered brilliance into a path you can walk.</p>
  </div>
</section>`;
}

/* ------------------------------------------------------------------ */
/* startView, the on-ramp. One recommended track + a gentle roadmap.  */
/* ------------------------------------------------------------------ */

/** Suggested climb: foundations → advanced → capstone. Falls back to file order. */
const ROADMAP_ORDER = [
  'agentic-systems',
  'ai-infra-inference',
  'applied-ml-modeling',
  'multimodal-generative',
  'production-ai-products',
  'frontier-systems',
  'ai-safety-alignment',
  'land-elite-role',
];

/** @param {import('../lib/schema.mjs').Curriculum} curriculum */
export function startView(curriculum) {
  // Order tracks by the suggested climb; anything unlisted trails in file order.
  const ordered = [...curriculum.tracks].sort((a, b) => {
    const ia = ROADMAP_ORDER.indexOf(a.id);
    const ib = ROADMAP_ORDER.indexOf(b.id);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  const first = ordered[0];
  const last = ordered[ordered.length - 1];

  const steps = ordered
    .map((t, i) => {
      const conceptN = curriculum.concepts.filter((c) => c.trackId === t.id).length;
      const glyph = TRACK_GLYPH[t.id] || '◆';
      const accClass = `acc-${i % LANE_ACCENTS.length}`;
      const tag =
        t.id === first.id
          ? '<span class="road-flag">Start here</span>'
          : t.id === last.id
            ? '<span class="road-flag is-capstone">Capstone</span>'
            : '';
      return `<li class="road-step ${accClass} rise d${Math.min(i + 1, 6)}">
  <a class="road-link" href="/track/${esc(t.id)}">
    <span class="road-num" aria-hidden="true">${i + 1}</span>
    <span class="road-glyph" aria-hidden="true">${glyph}</span>
    <span class="road-body">
      <span class="road-title">${esc(t.title)} ${tag}</span>
      <span class="road-tagline">${esc(t.tagline)}</span>
    </span>
    <span class="road-meta">${conceptN} concepts · week by week</span>
    <span class="arrow" aria-hidden="true">→</span>
  </a>
</li>`;
    })
    .join('');

  return `<section class="hero" aria-labelledby="start-h">
  ${kicker('Start here', 'emerald')}
  <h1 id="start-h" class="rise d1">Pick one track. Ship one product.</h1>
  <p class="hero-lede rise d2">Every track stands alone. Start your first 30 days with a cohort, then keep building until you deploy a real product. Begin with our pick, join a cohort, or choose any path below. There's no wrong door.</p>
  <div class="hero-actions rise d3">
    <a class="btn btn-primary" href="/track/${esc(first.id)}">Begin with ${esc(
      first.title,
    )} <span class="arrow" aria-hidden="true">→</span></a>
    <a class="btn btn-ghost" href="/tracks">Browse all tracks</a>
  </div>
</section>

<section class="section" aria-labelledby="paths-h">
  <div class="section-head">
    ${kicker('Two ways to begin')}
    <h2 id="paths-h">Together, or solo.</h2>
    <p class="lead">Same track either way. The only question is whether you start your first 30 days with a cohort, or go solo from day one.</p>
  </div>
  <div class="week-bridge-wrap">${weekBridge()}</div>
  <div class="grid grid-2">
    <a class="card promise tone-amber" href="/challenge">
      <span class="promise-icon" aria-hidden="true">C</span>
      <h3>With a cohort</h3>
      <p>The 30-Day Challenge: your first 30 days alongside others, so you start strong and ship fast. Then you keep building, week by week, solo.</p>
    </a>
    <a class="card promise tone-indigo" href="/tracks">
      <span class="promise-icon" aria-hidden="true">S</span>
      <h3>Solo, your pace</h3>
      <p>Pick any track and go. Every week is mapped; every lesson is free and linked.</p>
    </a>
  </div>
</section>

<section class="section" aria-labelledby="road-h">
  <div class="section-head">
    ${kicker('The roadmap', 'indigo')}
    <h2 id="road-h">A suggested climb.</h2>
    <p class="lead">Start anywhere, each track stands alone. This is simply the gentlest order: foundations first, capstone last.</p>
  </div>
  <ol class="roadmap">${steps}</ol>
  <p class="section-foot"><a class="textlink" href="/graph">See how every concept connects <span class="arrow" aria-hidden="true">→</span></a></p>
</section>`;
}

/* ------------------------------------------------------------------ */
/* tracksView, the entry point students hit to find the lessons       */
/* ------------------------------------------------------------------ */

/** @param {import('../lib/schema.mjs').Curriculum} curriculum */
export function tracksView(curriculum) {
  const totalResources = curriculum.concepts.reduce(
    (n, c) => n + c.resources.length,
    0,
  );

  const cards = curriculum.tracks
    .map((t, i) => {
      const conceptN = curriculum.concepts.filter((c) => c.trackId === t.id).length;
      const projectN = curriculum.projects.filter((p) => p.trackId === t.id).length;
      const glyph = TRACK_GLYPH[t.id] || '◆';
      const accClass = `acc-${i % LANE_ACCENTS.length}`;
      const delay = `d${Math.min(i + 1, 6)}`;
      return `<a class="card track-card rise ${delay} ${accClass}" href="/track/${esc(
        t.id,
      )}">
  <span class="track-glyph" aria-hidden="true">${glyph}</span>
  <h3>${esc(t.title)}</h3>
  <p class="track-tagline">${esc(t.tagline)}</p>
  <p class="track-focus">${esc(t.focus)}</p>
  <span class="track-cta">
    <span>${conceptN} concepts · ${projectN} projects</span>
    <span class="arrow" aria-hidden="true">→</span>
  </span>
</a>`;
    })
    .join('');

  return `<section class="hero" aria-labelledby="tracks-page-h">
  ${kicker('The learning portal · ' + curriculum.tracks.length + ' tracks')}
  <h1 id="tracks-page-h" class="rise d1">Pick a track. Start learning today.</h1>
  <p class="hero-lede rise d2">Every track routes you through the best free learning on Earth (3Blue1Brown, MIT OCW, Karpathy, Anthropic, Stanford), with original project briefs and brutal eval rubrics on top. Open any track to see the plan, walked week by week, and the resource links that are your lessons.</p>
  <div class="hero-actions rise d3">
    <a class="btn btn-primary" href="/ready">First time? See if you're ready <span class="arrow" aria-hidden="true">→</span></a>
    <a class="btn btn-ghost" href="/graph">See the full knowledge graph</a>
  </div>
  <p class="hero-proof rise d4">
    <span><span class="chk" aria-hidden="true">✓</span> ${esc(
      curriculum.concepts.length,
    )} concepts</span>
    <span><span class="chk" aria-hidden="true">✓</span> ${esc(
      curriculum.projects.length,
    )} projects</span>
    <span><span class="chk" aria-hidden="true">✓</span> ${esc(
      totalResources,
    )}+ curated free resources</span>
  </p>
</section>

<section class="section" aria-labelledby="tracks-list-h">
  <div class="section-head">
    ${kicker('Choose your mandate', 'emerald')}
    <h2 id="tracks-list-h">${esc(
      curriculum.tracks.length,
    )} tracks. One graph. A product at the end of each.</h2>
    <p class="lead">Start anywhere. Each track opens to a plan you walk week by week, with concept cards (your lessons, linked to free world-class material) interleaved with production-grade projects you actually deploy.</p>
  </div>
  <div class="grid grid-2">${cards}</div>
</section>`;
}

/* ------------------------------------------------------------------ */
/* trackView                                                          */
/* ------------------------------------------------------------------ */

/**
 * @param {import('../lib/schema.mjs').Curriculum} curriculum
 * @param {{id:string,title:string,tagline:string,focus:string}} track
 */
export function trackView(curriculum, track) {
  const titles = conceptTitleMap(curriculum);
  const trackIdx = curriculum.tracks.findIndex((t) => t.id === track.id);
  const accClass = `acc-${(trackIdx < 0 ? 0 : trackIdx) % LANE_ACCENTS.length}`;
  const concepts = curriculum.concepts
    .filter((c) => c.trackId === track.id)
    .sort((a, b) => a.week - b.week);
  const projects = curriculum.projects
    .filter((p) => p.trackId === track.id)
    .sort((a, b) => a.week - b.week);

  // Build a week -> items map so projects interleave with concepts.
  const byWeek = new Map();
  for (let w = 1; w <= TRACK_COUNT; w++) byWeek.set(w, { concepts: [], projects: [] });
  for (const c of concepts) byWeek.get(c.week).concepts.push(c);
  for (const p of projects) byWeek.get(p.week).projects.push(p);

  const blocks = [];
  for (let w = 1; w <= TRACK_COUNT; w++) {
    const slot = byWeek.get(w);
    if (slot.concepts.length === 0 && slot.projects.length === 0) continue;

    const conceptCards = slot.concepts
      .map((c) => {
        const prereqs = c.prereqs.length
          ? `<p class="prereq-row"><span>Builds on:</span> ${c.prereqs
              .map(
                (id) => `<span class="prereq-chip">${esc(titles.get(id) || id)}</span>`,
              )
              .join(' ')}</p>`
          : '<p class="prereq-row"><span>Builds on:</span> <span class="prereq-chip">nothing, start here</span></p>';
        const bridge = c.subjectLink
          ? `<span class="bridge"><span class="b-key">Bridges to</span> ${esc(
              c.subjectLink,
            )}</span>`
          : '';
        return `<article class="card concept-card">
  <h3>${esc(c.title)}</h3>
  <p class="concept-summary">${esc(c.summary)}</p>
  ${bridge}
  ${prereqs}
  <ul class="res-list" aria-label="Free resources for ${esc(c.title)}">${c.resources
          .map(resourceItem)
          .join('')}</ul>
  <p class="deepen"><a class="textlink" href="/learn/${esc(
    c.id,
  )}">Read the study notes <span class="arrow" aria-hidden="true">&rarr;</span></a></p>
</article>`;
      })
      .join('');

    const projectCards = slot.projects.map((p) => projectCard(p)).join('');

    blocks.push(`<div class="week-block">
  <span class="week-node" aria-hidden="true">W${w}</span>
  <p class="week-tag">Week ${w}</p>
  ${conceptCards}
  ${projectCards}
</div>`);
  }

  // Suggest the next track along the roadmap climb (wraps back to the first).
  const orderIdx = ROADMAP_ORDER.indexOf(track.id);
  let nextTrack = null;
  if (orderIdx >= 0) {
    for (let k = 1; k <= ROADMAP_ORDER.length; k++) {
      const cand = curriculum.tracks.find(
        (t) => t.id === ROADMAP_ORDER[(orderIdx + k) % ROADMAP_ORDER.length],
      );
      if (cand && cand.id !== track.id) { nextTrack = cand; break; }
    }
  }
  const nextHtml = nextTrack
    ? `<section class="section" aria-labelledby="next-h">
  <div class="section-head">
    ${kicker("What's next", 'cyan')}
    <h2 id="next-h">Finished here? Keep climbing.</h2>
    <p class="lead">Each track stands alone, so there's no wrong order. If you want a suggestion, this one pairs well next.</p>
  </div>
  <ol class="roadmap"><li class="road-step acc-0">
    <a class="road-link" href="/track/${esc(nextTrack.id)}">
      <span class="road-glyph" aria-hidden="true">${TRACK_GLYPH[nextTrack.id] || '◆'}</span>
      <span class="road-body">
        <span class="road-title">${esc(nextTrack.title)} <span class="road-flag">Suggested next</span></span>
        <span class="road-tagline">${esc(nextTrack.tagline)}</span>
      </span>
      <span class="arrow" aria-hidden="true">→</span>
    </a>
  </li></ol>
  <p class="section-foot"><a class="textlink" href="/start">See the full roadmap <span class="arrow" aria-hidden="true">→</span></a></p>
</section>`
    : '';

  return `<p class="crumbs"><a href="/">Home</a> › <a href="/tracks">Tracks</a> › <span>${esc(
    track.title,
  )}</span></p>
<section class="hero ${accClass}" aria-labelledby="track-h">
  ${kicker('Elite track', 'emerald')}
  <h1 id="track-h" class="rise d1">${esc(track.title)}</h1>
  <p class="hero-lede track-tagline-lede rise d2">${esc(
    track.tagline,
  )}</p>
  <p class="hero-lede rise d2">${esc(track.focus)}</p>
  <div class="hero-actions rise d3">
    <a class="btn btn-primary" href="/challenge">Start the 30-Day Challenge <span class="arrow" aria-hidden="true">→</span></a>
    <a class="btn btn-ghost" href="/graph">See it on the graph</a>
  </div>
</section>

<section class="section" aria-labelledby="plan-h">
  <div class="section-head">
    ${kicker('Week by week')}
    <h2 id="plan-h">Mapped week by week.</h2>
    <p class="lead">Every week unlocks the next. Concepts route you to free, world-class material; projects turn that knowledge into something deployed.</p>
  </div>
  <div class="timeline">${blocks.join('') || '<p class="lead">Concepts for this track are being curated.</p>'}</div>
</section>
${nextHtml}`;
}

/* ------------------------------------------------------------------ */
/* graphView                                                          */
/* ------------------------------------------------------------------ */

/** @param {import('../lib/schema.mjs').Curriculum} curriculum */
export function graphView(curriculum) {
  const titles = conceptTitleMap(curriculum);
  const tracks = curriculum.tracks;

  // Resolve a concrete hex color per track lane from the accent palette.
  const ACCENT_HEX = {
    indigo: '#3b35e0',
    emerald: '#0e9f6e',
    amber: '#f5a31a',
    cyan: '#0c8fb3',
    rose: '#e3457a',
  };
  const fallback = '#71768a';
  const colorOf = (trackId) =>
    ACCENT_HEX[laneAccentName(curriculum, trackId)] || fallback;

  // Layout: x = week, y = track lane. Deterministic SVG.
  const laneH = 120;
  const padX = 110;
  const colW = 92;
  const topPad = 56;
  const width = padX + colW * TRACK_COUNT + 44;
  const height = topPad + laneH * tracks.length + 32;

  const pos = new Map();
  const stackCount = new Map();
  for (const c of curriculum.concepts) {
    const laneIdx = tracks.findIndex((t) => t.id === c.trackId);
    if (laneIdx < 0) continue;
    const key = `${c.trackId}:${c.week}`;
    const k = stackCount.get(key) || 0;
    stackCount.set(key, k + 1);
    const x = padX + (c.week - 0.5) * colW;
    const y =
      topPad + laneIdx * laneH + laneH / 2 + (k === 0 ? 0 : k % 2 === 1 ? -24 : 24);
    pos.set(c.id, { x, y, color: colorOf(c.trackId), title: c.title });
  }

  // week gridlines + labels
  let grid = '';
  for (let w = 1; w <= TRACK_COUNT; w++) {
    const x = padX + (w - 1) * colW;
    grid += `<line x1="${x}" y1="${topPad - 16}" x2="${x}" y2="${
      height - 22
    }" stroke="#e0ddd2" stroke-width="1"/>`;
    grid += `<text x="${x + colW / 2}" y="${
      topPad - 24
    }" fill="#9092ac" font-size="11" font-weight="700" font-family="Verdana,sans-serif" text-anchor="middle">W${w}</text>`;
  }

  // lane backgrounds + labels
  let lanes = '';
  tracks.forEach((t, i) => {
    const y = topPad + i * laneH;
    lanes += `<rect x="${padX - 6}" y="${y}" width="${
      colW * TRACK_COUNT + 12
    }" height="${laneH}" fill="${i % 2 ? '#f3f1ea' : '#ffffff'}" rx="6"/>`;
    lanes += `<text x="10" y="${y + laneH / 2}" fill="${colorOf(
      t.id,
    )}" font-size="11" font-weight="800" font-family="Verdana,sans-serif" dominant-baseline="middle">${esc(
      t.title,
    )}</text>`;
  });

  // prerequisite edges
  let edges = '';
  for (const c of curriculum.concepts) {
    const to = pos.get(c.id);
    if (!to) continue;
    for (const pre of c.prereqs) {
      const from = pos.get(pre);
      if (!from) continue;
      const midX = (from.x + to.x) / 2;
      edges += `<path d="M${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}" fill="none" stroke="${to.color}" stroke-width="1.6" stroke-opacity="0.45"/>`;
    }
  }

  // nodes
  let nodes = '';
  for (const c of curriculum.concepts) {
    const p = pos.get(c.id);
    if (!p) continue;
    nodes += `<g><title>${esc(c.title)}, Week ${esc(c.week)}</title>
<circle cx="${p.x}" cy="${p.y}" r="10" fill="#ffffff" stroke="${p.color}" stroke-width="2.6"/>
<circle cx="${p.x}" cy="${p.y}" r="4" fill="${p.color}"/></g>`;
  }

  const svg = `<svg class="graph-svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="Knowledge graph: ${esc(
    curriculum.concepts.length,
  )} concepts across ${esc(
    tracks.length,
  )} tracks, laid out week by week, with prerequisite edges connecting them.">
<rect width="${width}" height="${height}" fill="transparent"/>
${grid}
${lanes}
${edges}
${nodes}
</svg>`;

  const legend = tracks
    .map(
      (t, i) =>
        `<span class="legend-item acc-${i % LANE_ACCENTS.length}"><span class="legend-swatch" aria-hidden="true"></span>${esc(
          t.title,
        )}</span>`,
    )
    .join('');

  // Accessible text equivalent of the graph: a sortable concept table.
  const rows = [...curriculum.concepts]
    .sort((a, b) => a.week - b.week || a.trackId.localeCompare(b.trackId))
    .map((c) => {
      const track = tracks.find((t) => t.id === c.trackId);
      const prereqs = c.prereqs.length
        ? c.prereqs.map((id) => esc(titles.get(id) || id)).join(', ')
        : 'None';
      return `<tr>
  <td>${esc(c.week)}</td>
  <td>${esc(track ? track.title : c.trackId)}</td>
  <td>${esc(c.title)}</td>
  <td>${esc(c.subjectLink || ', ')}</td>
  <td>${prereqs}</td>
</tr>`;
    })
    .join('');

  return `<section class="hero" aria-labelledby="graph-h">
  ${kicker('The map', 'cyan')}
  <h1 id="graph-h" class="rise d1">One graph. Every concept. A clear path.</h1>
  <p class="hero-lede rise d2">Every concept is a node. Every edge is a prerequisite. Tracks run left to right, week by week, follow an edge backward and you find exactly what to master first. No guessing what to learn next.</p>
</section>

<section class="section" aria-labelledby="map-h">
  <div class="section-head">
    ${kicker('Concept map', 'cyan')}
    <h2 id="map-h">Mapped end to end.</h2>
    <p class="lead">Curved lines connect a concept to its prerequisites. The visual is decorative; the full, screen-reader-friendly version follows as a table.</p>
  </div>
  <div class="graph-wrap">${svg}</div>
  <div class="graph-legend" aria-label="Track colour key">${legend}</div>
</section>

<section class="section" aria-labelledby="tbl-h">
  <div class="section-head">
    ${kicker('Every concept, in order')}
    <h2 id="tbl-h">The graph as a table.</h2>
    <p class="lead">A complete, accessible listing of every node, the classic CS subject it bridges to, and its prerequisite edges.</p>
  </div>
  <table class="data-table">
    <caption>${esc(
      curriculum.concepts.length,
    )} concepts with their week, track, subject bridge and prerequisites</caption>
    <thead><tr><th scope="col">Week</th><th scope="col">Track</th><th scope="col">Concept</th><th scope="col">Bridges to</th><th scope="col">Prerequisites</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</section>`;
}

/* ------------------------------------------------------------------ */
/* projectsView                                                       */
/* ------------------------------------------------------------------ */

/** Render a single project brief card, a real product spec sheet. */
function projectCard(p) {
  const rubric = p.evalRubric.map((r) => `<li>${esc(r)}</li>`).join('');

  const stack =
    Array.isArray(p.stack) && p.stack.length
      ? `<div>
    <span class="field-label">Stack you orchestrate</span>
    <div class="stack-row">${p.stack
      .map((s) => `<span class="stack-chip">${esc(s)}</span>`)
      .join('')}</div>
  </div>`
      : '';

  const industry = p.industryContext
    ? `<p class="industry-note"><strong>Why it matters:</strong> ${esc(
        p.industryContext,
      )}</p>`
    : '';

  // What the shipped product actually does, a scannable, check-bulleted list.
  // Two-column layout kicks in via CSS when the list is long enough.
  const features =
    Array.isArray(p.features) && p.features.length
      ? `<div>
    <span class="field-label">What it ships</span>
    <ul class="feature-list" aria-label="Features of ${esc(p.title)}">${p.features
      .map((f) => `<li>${esc(f)}</li>`)
      .join('')}</ul>
  </div>`
      : '';

  // Researched market demand, framed as real product validation.
  const market = p.marketSignal
    ? `<p class="market-note"><span class="market-label">Market signal, who wants this</span>${esc(
        p.marketSignal,
      )}</p>`
    : '';

  return `<article class="card project-card" aria-labelledby="proj-${esc(p.id)}">
  <div class="project-head">
    <h3 id="proj-${esc(p.id)}">${esc(p.title)}</h3>
    <span class="project-week">Week ${esc(p.week)} milestone</span>
  </div>
  <p class="brief">${esc(p.brief)}</p>
  ${industry}
  <div>
    <span class="field-label">The deliverable</span>
    <p class="deliverable">${esc(p.deliverable)}</p>
  </div>
  ${features}
  ${stack}
  ${market}
  <div>
    <span class="field-label">How it is graded</span>
    <ul class="rubric">${rubric}</ul>
  </div>
  <span class="syllabus-tag"><span class="tag-key">Bridges to</span> ${esc(
    p.syllabusTag,
  )}</span>
</article>`;
}

/** @param {import('../lib/schema.mjs').Curriculum} curriculum */
export function projectsView(curriculum) {
  // Group projects under their track for a scannable page.
  const groups = curriculum.tracks
    .map((t, i) => {
      const items = curriculum.projects
        .filter((p) => p.trackId === t.id)
        .sort((a, b) => a.week - b.week);
      if (items.length === 0) return '';
      const tone = LANE_ACCENTS[i % LANE_ACCENTS.length];
      return `<section class="section" aria-labelledby="pg-${esc(t.id)}">
  <div class="section-head">
    ${kicker(esc(t.title), tone)}
    <h2 id="pg-${esc(t.id)}">${esc(t.tagline)}</h2>
    <p class="lead">${esc(t.focus)}</p>
  </div>
  <div class="grid grid-2">${items.map(projectCard).join('')}</div>
</section>`;
    })
    .filter(Boolean)
    .join('');

  return `<section class="hero" aria-labelledby="proj-h">
  ${kicker(`${esc(curriculum.projects.length)} production-grade briefs`, 'amber')}
  <h1 id="proj-h" class="rise d1">Projects an employer can <span class="grad">open and judge</span>.</h1>
  <p class="hero-lede rise d2">No toy exercises. Each brief is written as a corporate mandate, produces a publicly hosted product, ships with the exact rubric it is graded against, and bridges to a classic CS subject, so it doubles as your coursework. You orchestrate the AI; you own the result.</p>
  <div class="hero-actions rise d3">
    <a class="btn btn-primary" href="/challenge">Pick a brief, ship your first build <span class="arrow" aria-hidden="true">→</span></a>
    <a class="btn btn-ghost" href="/graph">Plan the learning path</a>
  </div>
</section>

${groups}

<div class="callout">
  <span class="callout-bar" aria-hidden="true"></span>
  <p><strong>Why the subject bridge matters.</strong> Every project is mapped to a real classic CS subject, Operating Systems, Distributed Systems, Databases, Compilers. You are not choosing between your degree and shipping real software. You can tell a faculty member, truthfully, "I built this for my Distributed Systems mini-project", and tell a hiring panel it is production-grade.</p>
</div>`;
}

/* ------------------------------------------------------------------ */
/* challengeView                                                      */
/* ------------------------------------------------------------------ */

/** @param {import('../lib/schema.mjs').Curriculum} curriculum */
export function challengeView(curriculum) {
  // The 30-Day Challenge: your first month, structured as four weekly milestones.
  const weeks = [
    [
      'Week 1',
      'Scope it',
      'Pick your track and your first project. Name the user and the problem out loud. End the week with a repo, a README, and a one-line pitch.',
    ],
    [
      'Week 2',
      'Learn what you need',
      'Walk only the concepts your build needs, each links to free, world-class material. End the week with a running skeleton.',
    ],
    [
      'Week 3',
      'Build in the open',
      'Commit daily and share progress with the cohort. Point your own AI at the project rubric and fix issues early, not after launch.',
    ],
    [
      'Week 4',
      'Ship it',
      'Deploy to a public URL, run the accessibility and security checklist, and present. Your live product is the proof, and it carries you into the rest of your track.',
    ],
  ]
    .map(
      ([range, h, p], i) =>
        `<li class="card phase rise d${i + 1}"><span class="phase-range">${esc(
          range,
        )}</span><div><h3>${esc(h)}</h3><p>${esc(p)}</p></div></li>`,
    )
    .join('');

  return `<section class="hero" aria-labelledby="ch-h">
  ${kicker('Your first 30 days', 'amber')}
  <h1 id="ch-h" class="rise d1">30 days. One cohort. <span class="grad">A real start.</span></h1>
  <p class="hero-lede rise d2">The 30-Day Challenge is your <strong>first 30 days on any track</strong>, built alongside a cohort, so you gain momentum and ship a real product instead of stalling. Then you keep going, week by week, at your own pace.</p>
  <div class="week-bridge-wrap rise d3">${weekBridge()}</div>
  <div class="hero-actions rise d4">
    <a class="btn btn-primary" href="/start">Pick your track <span class="arrow" aria-hidden="true">→</span></a>
    <a class="btn btn-ghost" href="/tracks">Browse all tracks</a>
  </div>
</section>

<section class="section" aria-labelledby="wk-h">
  <div class="section-head">
    ${kicker('Your 30 days, week by week')}
    <h2 id="wk-h">Four weeks. One shipped product.</h2>
    <p class="lead">The same path as the solo track, just your opening 30 days, run together with a shared deadline.</p>
  </div>
  <ol class="phase-list">${weeks}</ol>
  <div class="callout">
    <span class="callout-bar" aria-hidden="true"></span>
    <p><strong>Then the rest is yours.</strong> The cohort gets you moving; you finish your track solo, week by week, at your own pace. With ${esc(
      curriculum.projects.length,
    )} projects across ${esc(
    curriculum.tracks.length,
  )} tracks, every member ships something different, public proof that the path works.</p>
  </div>
</section>`;
}

/* ------------------------------------------------------------------ */
/* statusView                                                         */
/* ------------------------------------------------------------------ */

/**
 * Surface the result of the most recent self-update.
 * @param {import('../lib/schema.mjs').State|null|undefined} state
 * @param {import('../lib/schema.mjs').Curriculum} curriculum
 */
export function statusView(state, curriculum) {
  const toneByResult = {
    updated: 'ok',
    seeded: 'ok',
    unchanged: 'ok',
    skipped: 'neutral',
    failed: 'warn',
  };
  const ledByTone = { ok: 'led-ok', warn: 'led-warn', neutral: 'led-neutral' };
  const blurbByResult = {
    updated:
      'The weekly agentic run researched the AI-engineering frontier and evolved the curriculum, tracks, concepts, projects or resources were added, updated or retired.',
    seeded: 'The curriculum was seeded from the bundled baseline on first run.',
    unchanged:
      'The weekly agentic run completed its research; the AI-engineering frontier moved nothing material this week.',
    skipped: 'No run was needed this week, the curriculum already reflected the latest frontier.',
    failed:
      'The most recent agentic run did not complete. The previous good curriculum is still being served.',
  };

  const hasState = state && typeof state === 'object' && state.lastResult;
  const result = hasState ? state.lastResult : 'pending';
  const tone = toneByResult[result] || 'neutral';
  const led = ledByTone[tone];
  const blurb = hasState
    ? blurbByResult[result] || 'Self-update status recorded.'
    : 'No self-update has run yet in this environment. The curriculum below is the bundled baseline.';

  const kv = (term, value) =>
    `<div class="kv"><dt>${esc(term)}</dt><dd>${esc(value)}</dd></div>`;

  const details = hasState
    ? `<dl class="kv-grid">
  ${kv('Last result', state.lastResult)}
  ${kv('Last update date (IST)', state.lastUpdateDate || 'n/a')}
  ${kv('Last run at', state.lastRunAt || 'n/a')}
  ${kv('Curriculum version', state.lastVersion ?? curriculum.version)}
  ${state.note ? kv('Note', state.note) : ''}
</dl>`
    : `<dl class="kv-grid">
  ${kv('Self-update', 'Not yet run')}
  ${kv('Serving', 'Bundled seed curriculum')}
  ${kv('Curriculum version', curriculum.version)}
</dl>`;

  const recent = (curriculum.changelog || [])
    .slice(0, 8)
    .map(
      (e) =>
        `<tr><td>${esc(e.date)}</td><td>v${esc(e.version)}</td><td>${esc(
          e.summary,
        )}</td></tr>`,
    )
    .join('');

  return `<section class="hero" aria-labelledby="st-h">
  ${kicker('Self-updating service', 'emerald')}
  <h1 id="st-h" class="rise d1">A curriculum that <span class="grad">never goes stale</span>.</h1>
  <p class="hero-lede rise d2">Once per week, a frontier AI agent, running with maximum thinking, researches what has changed, trended or become obsolete in AI engineering, then evolves this curriculum: adding, updating and retiring tracks, concepts, projects and resources under automated safeguards. This page reports the most recent run, full transparency, real data.</p>
</section>

<section class="section" aria-labelledby="run-h">
  <div class="section-head">
    ${kicker('Latest run')}
    <h2 id="run-h">Most recent self-update.</h2>
  </div>
  <div class="status-banner ${tone}" role="status" aria-live="polite">
    <span class="status-led ${led}" aria-hidden="true"></span>
    <span>
      <span class="status-result">${esc(result)}</span>
      <p class="status-sub">${esc(blurb)}</p>
    </span>
  </div>
  ${details}
</section>

<section class="section" aria-labelledby="cl-h">
  <div class="section-head">
    ${kicker('Changelog', 'amber')}
    <h2 id="cl-h">Recent curriculum changes.</h2>
    <p class="lead">Every weekly run is logged. The curriculum evolves with the frontier, and you can see exactly when.</p>
  </div>
  <table class="data-table">
    <caption>Most recent changelog entries, newest first</caption>
    <thead><tr><th scope="col">Date</th><th scope="col">Version</th><th scope="col">Summary</th></tr></thead>
    <tbody>${
      recent || '<tr><td colspan="3">No changelog entries yet.</td></tr>'
    }</tbody>
  </table>
</section>`;
}

/* ------------------------------------------------------------------ */
/* learnView, per-concept study notes (in-house model + curated links) */
/* ------------------------------------------------------------------ */

/**
 * @param {object} args
 * @param {import('../lib/schema.mjs').Curriculum} args.curriculum
 * @param {object} args.concept
 * @param {object} args.track
 * @param {{text:string,generatedAt:string,model:string}|null} args.deep
 */
export function learnView({ curriculum, concept, track, deep }) {
  const titles = conceptTitleMap(curriculum);
  const trackIdx = curriculum.tracks.findIndex((t) => t.id === track.id);
  const accClass = `acc-${(trackIdx < 0 ? 0 : trackIdx) % LANE_ACCENTS.length}`;
  const prereqs = (concept.prereqs || []).length
    ? `<p class="prereq-row"><span>Builds on:</span> ${concept.prereqs
        .map((id) => `<span class="prereq-chip">${esc(titles.get(id) || id)}</span>`)
        .join(' ')}</p>`
    : '';
  const bridge = concept.subjectLink
    ? `<span class="bridge"><span class="b-key">Bridges to</span> ${esc(
        concept.subjectLink,
      )}</span>`
    : '';

  const notes = deep
    ? `<section class="section notes" aria-labelledby="notes-h">
  <div class="section-head">
    ${kicker('Study notes')}
    <h2 id="notes-h">Master this concept.</h2>
  </div>
  <div class="notes-body">${renderNotes(deep.text)}</div>
  <p class="notes-meta">Notes written for this concept by the ParallelCS in-house model. Always cross-check against the linked sources below.</p>
</section>`
    : `<section class="section" aria-labelledby="notes-h">
  <div class="section-head">
    ${kicker('Study notes')}
    <h2 id="notes-h">Start with the sources.</h2>
    <p class="lead">Use the curated, free materials below to master this concept. Each one is hand-picked for this exact topic.</p>
  </div>
</section>`;

  return `<p class="crumbs"><a href="/">Home</a> &rsaquo; <a href="/tracks">Tracks</a> &rsaquo; <a href="/track/${esc(
    track.id,
  )}">${esc(track.title)}</a> &rsaquo; <span>${esc(concept.title)}</span></p>
<section class="hero ${accClass}" aria-labelledby="learn-h">
  ${kicker('Week ' + esc(concept.week) + ' concept', 'emerald')}
  <h1 id="learn-h" class="rise d1">${esc(concept.title)}</h1>
  <p class="hero-lede rise d2">${esc(concept.summary)}</p>
  ${bridge}
  ${prereqs}
</section>

${notes}

<section class="section" aria-labelledby="src-h">
  <div class="section-head">
    ${kicker('Go to the source', 'amber')}
    <h2 id="src-h">Read, watch, and practice.</h2>
    <p class="lead">Free, world-class material chosen for this concept.</p>
  </div>
  <ul class="res-list" aria-label="Free resources for ${esc(concept.title)}">${concept.resources
    .map(resourceItem)
    .join('')}</ul>
  <p class="section-foot"><a class="textlink" href="/track/${esc(
    track.id,
  )}">Back to the ${esc(track.title)} plan <span class="arrow" aria-hidden="true">&rarr;</span></a></p>
</section>`;
}

/* ------------------------------------------------------------------ */
/* notFoundView                                                       */
/* ------------------------------------------------------------------ */

export function notFoundView() {
  return `<section class="notfound" aria-labelledby="nf-h">
  <p class="big" aria-hidden="true">404</p>
  <h1 id="nf-h">This node is not on the graph.</h1>
  <p class="lede">The page you asked for does not exist. Every real path in ParallelCS starts from the knowledge graph, head back and pick a node.</p>
  <div class="hero-actions u-center">
    <a class="btn btn-primary" href="/">Back to home</a>
    <a class="btn btn-ghost" href="/graph">Open the knowledge graph</a>
  </div>
</section>`;
}

/* ------------------------------------------------------------------ */
/* readyView, an honest prerequisites gate                           */
/* ------------------------------------------------------------------ */

/**
 * The readiness / self-assessment page. ParallelCS is a deep, elite
 * AI-builder path, not a beginner course. This page states plainly who it
 * is for, lists the real prerequisites, and links a free resource to close
 * each gap. The right people self-select in; the unprepared go build
 * foundations first, and leave with a concrete plan to do exactly that.
 * @returns {string} bodyHtml
 */
export function readyView() {
  // Each prerequisite: a real bar to clear, what "ready" looks like, and a
  // free, canonical resource to close the gap before starting.
  const prereqs = [
    {
      acc: 0,
      title: 'Programming you can actually build with',
      need: 'Fluent in Python, plus one systems-level language (C, C++, Rust or Go). You can structure a multi-file project, debug it, and read an unfamiliar codebase without hand-holding.',
      check: 'Ready when: you have written a non-trivial program from scratch, not just followed a tutorial.',
      gaps: [
        {
          title: 'CS50x, Harvard\'s introduction to computer science',
          source: 'Harvard / edX',
          type: 'course',
          url: 'https://cs50.harvard.edu/x/',
        },
        {
          title: 'The Rust Programming Language ("the book")',
          source: 'Rust Project',
          type: 'guide',
          url: 'https://doc.rust-lang.org/book/',
        },
      ],
    },
    {
      acc: 1,
      title: 'Data structures and algorithms',
      need: 'You know arrays, hash maps, trees, graphs, heaps; you can reason about time and space complexity; you can pick the right structure for a problem and justify it.',
      check: 'Ready when: Big-O analysis is second nature and graph traversal does not intimidate you.',
      gaps: [
        {
          title: 'Algorithms, Part I',
          source: 'Princeton / Coursera',
          type: 'course',
          url: 'https://www.coursera.org/learn/algorithms-part1',
        },
        {
          title: 'MIT 6.006, Introduction to Algorithms',
          source: 'MIT OpenCourseWare',
          type: 'course',
          url: 'https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/',
        },
      ],
    },
    {
      acc: 2,
      title: 'The core mathematics',
      need: 'Linear algebra (vectors, matrices, eigenvalues), calculus (derivatives, gradients, the chain rule), and probability and statistics (distributions, expectation, Bayes). This is the language every model is written in.',
      check: 'Ready when: a gradient, a matrix multiply and a probability distribution all feel familiar, not foreign.',
      gaps: [
        {
          title: 'Essence of Linear Algebra',
          source: '3Blue1Brown',
          type: 'video',
          url: 'https://www.3blue1brown.com/topics/linear-algebra',
        },
        {
          title: 'Essence of Calculus',
          source: '3Blue1Brown',
          type: 'video',
          url: 'https://www.3blue1brown.com/topics/calculus',
        },
        {
          title: 'Seeing Theory, a visual introduction to probability and statistics',
          source: 'Brown University',
          type: 'interactive',
          url: 'https://seeing-theory.brown.edu/',
        },
      ],
    },
    {
      acc: 3,
      title: 'Computer science fundamentals',
      need: 'Operating systems (processes, threads, memory, scheduling), computer networks (TCP/IP, HTTP, the request lifecycle), and databases (relational modelling, indexes, transactions). The systems you will build run on these.',
      check: 'Ready when: you can explain what happens between typing a URL and seeing a page.',
      gaps: [
        {
          title: 'Operating Systems: Three Easy Pieces',
          source: 'Remzi & Andrea Arpaci-Dusseau, Wisconsin',
          type: 'guide',
          url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/',
        },
        {
          title: 'Computer Networking: A Top-Down Approach, companion site',
          source: 'Kurose & Ross',
          type: 'guide',
          url: 'https://gaia.cs.umass.edu/kurose_ross/index.php',
        },
        {
          title: 'CS186, Introduction to Database Systems',
          source: 'UC Berkeley',
          type: 'course',
          url: 'https://cs186berkeley.net/',
        },
      ],
    },
    {
      acc: 4,
      title: 'Basic machine-learning literacy',
      need: 'You know what a model, a loss function, training and inference are. You have seen a neural network train at least once. You do not need to be an ML researcher, you need to not be starting from zero.',
      check: 'Ready when: "weights", "gradient descent" and "overfitting" are words you can use correctly.',
      gaps: [
        {
          title: 'Neural Networks: Zero to Hero',
          source: 'Andrej Karpathy',
          type: 'video',
          url: 'https://karpathy.ai/zero-to-hero.html',
        },
        {
          title: 'Machine Learning Crash Course',
          source: 'Google',
          type: 'course',
          url: 'https://developers.google.com/machine-learning/crash-course',
        },
      ],
    },
    {
      acc: 0,
      title: 'Git and the command line',
      need: 'You commit, branch and merge without fear; you live comfortably in a terminal; you can run, inspect and recover a project from the shell. Every project here ships from a repo.',
      check: 'Ready when: a merge conflict is an annoyance, not a crisis.',
      gaps: [
        {
          title: 'Pro Git, the complete book, free online',
          source: 'Scott Chacon & Ben Straub',
          type: 'guide',
          url: 'https://git-scm.com/book/en/v2',
        },
        {
          title: 'MIT, The Missing Semester of Your CS Education',
          source: 'MIT',
          type: 'course',
          url: 'https://missing.csail.mit.edu/',
        },
      ],
    },
    {
      acc: 1,
      title: 'Reading documentation and papers',
      need: 'You can sit with official docs, a reference spec or a research paper and extract what you need, without a video walking you through every line. The frontier moves faster than any tutorial.',
      check: 'Ready when: a docs page is your first stop, not your last resort.',
      gaps: [
        {
          title: 'How to Read a Paper, a practical three-pass method',
          source: 'S. Keshav, University of Waterloo',
          type: 'paper',
          url: 'https://web.stanford.edu/class/ee384m/Handouts/HowtoReadPaper.pdf',
        },
        {
          title: 'arXiv, read real papers in cs.AI and cs.LG',
          source: 'arXiv',
          type: 'article',
          url: 'https://arxiv.org/list/cs.AI/recent',
        },
      ],
    },
  ];

  const prereqItems = prereqs
    .map((p, i) => {
      const gapLinks = p.gaps
        .map((g) => resourceItem({ ...g, free: true }))
        .join('');
      return `<li class="card prereq-item acc-${p.acc % LANE_ACCENTS.length}">
  <span class="prereq-num" aria-hidden="true">${i + 1}</span>
  <h3>${esc(p.title)}</h3>
  <p class="prereq-need">${esc(p.need)}</p>
  <div>
    <p class="prereq-check"><strong>Self-check.</strong> ${esc(p.check)}</p>
    <span class="prereq-gap">Not there yet? Close the gap, free</span>
    <ul class="gap-links res-list" aria-label="Free resources to prepare for ${esc(
      p.title,
    )}">${gapLinks}</ul>
  </div>
</li>`;
    })
    .join('');

  const verdicts = [
    {
      cls: 'is-go',
      icon: '✓',
      title: 'You clear most of these',
      body: 'You are who ParallelCS is built for. Open the knowledge graph, pick a track, and start building. The work will still stretch you, that is the point.',
    },
    {
      cls: 'is-wait',
      icon: '!',
      title: 'A few gaps remain',
      body: 'Close them first with the free resources above. Come back when the self-checks read true. A month of foundations now saves a wasted track later.',
    },
    {
      cls: '',
      icon: '?',
      title: 'Most of this is new',
      body: 'That is honest, useful information, not a failure. Build the foundations properly first. ParallelCS will still be here, and it works far better on solid ground.',
    },
  ]
    .map(
      (v) => `<article class="card verdict-card ${v.cls}">
  <span class="v-icon" aria-hidden="true">${esc(v.icon)}</span>
  <h3>${esc(v.title)}</h3>
  <p>${esc(v.body)}</p>
</article>`,
    )
    .join('');

  return `<section class="hero" aria-labelledby="ready-h">
  ${kicker('Start here · an honest self-assessment')}
  <h1 id="ready-h" class="rise d1">Are you <span class="grad">ready</span> for this?</h1>
  <p class="hero-lede rise d2">ParallelCS is a deep, elite AI-builder path, not a beginner course and not a general CS survey. It assumes a working foundation and builds frontier skill on top of it. This page is the gate: read it honestly before you start.</p>
  <div class="honest-banner rise d3">
    <span class="hb-bar" aria-hidden="true"></span>
    <p><strong>This will not teach you to program.</strong> If the prerequisites below are new to you, that is genuinely fine, but starting here first would waste your time. Build the foundations, then come back. The platform rewards preparation and punishes shortcuts.</p>
  </div>
</section>

<section class="section" aria-labelledby="who-h">
  <div class="section-head">
    ${kicker('Who it is for', 'emerald')}
    <h2 id="who-h">A CSE student or graduate with a real foundation.</h2>
    <p class="lead">If you are partway through a computer science degree, or already hold one, and you can already do the things below, ParallelCS is built precisely for you. It takes that base and aims it at the AI-native stack the industry hires for today.</p>
  </div>
  <div class="ready-verdict">${verdicts}</div>
</section>

<section class="section" aria-labelledby="prereq-h">
  <div class="section-head">
    ${kicker('The prerequisites', 'amber')}
    <h2 id="prereq-h">Seven things you should already have.</h2>
    <p class="lead">Be honest with each one. For every prerequisite there is a real, free, canonical resource to close the gap, links open in a new tab. The right move is to clear the gaps first, not to push through unprepared.</p>
  </div>
  <ol class="prereq-list">${prereqItems}</ol>
</section>

<section class="section" aria-labelledby="off-h">
  <div class="offramp">
    <h2 id="off-h">Not ready yet? That is the right answer to have.</h2>
    <p>Self-selecting out today is a smart decision, not a setback. The learners who thrive here are the ones who arrived prepared. Here is the honest plan if the prerequisites are still ahead of you:</p>
    <ul class="off-list">
      <li>Pick the gaps above and work through the linked free resources, they are world-class and cost nothing.</li>
      <li>Build two or three small projects of your own to make the fundamentals stick.</li>
      <li>Return to this page. When the self-checks read true, you are ready to begin.</li>
    </ul>
    <div class="callout">
      <span class="callout-bar" aria-hidden="true"></span>
      <p><strong>Third-semester CSE student?</strong> There is a structured 12-week on-ramp built exactly for you at <a class="textlink" href="/foundations">/foundations</a>. One curated free resource per week from 3Blue1Brown, Karpathy, MIT Missing Semester, fast.ai and Anthropic. One public GitHub repo plus a live Cloud Run URL shipped each week. A Socratic coach available on most weeks (Hinglish welcome, one hint per turn, never the answer). Week 12 is an AI-off ship gate that lands you in the Agentic Systems Track with a portfolio that proves you can build.</p>
    </div>
    <div class="hero-actions rise d4">
      <a class="btn btn-primary" href="/graph">I am ready, open the knowledge graph <span class="arrow" aria-hidden="true">→</span></a>
      <a class="btn btn-ghost" href="/foundations">Start Foundations instead <span class="arrow" aria-hidden="true">→</span></a>
      <a class="btn btn-ghost" href="/projects">See what you will build</a>
    </div>
  </div>
</section>`;
}
