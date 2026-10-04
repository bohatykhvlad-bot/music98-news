import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const page=readFileSync(new URL("../public/index.html",import.meta.url),"utf8");
const worker=readFileSync(new URL("../worker.js",import.meta.url),"utf8");

test("desktop navigation uses four equal-width pill segments",()=>{
  assert.match(page,/\.nav\{[^}]*width:410px;[^}]*grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(page,/\.nav-btn\{width:100%;text-indent:var\(--ink-x,0px\);/);
  assert.match(page,/window\.music98InkShift/);
  assert.match(page,/getImageData\(/);
  assert.match(page,/Math\.round\(advance\/2-inkCenter\)/);
  assert.match(page,/@media \(hover:hover\) and \(pointer:fine\)\{[\s\S]*?\.nav-btn:hover:not\(\.active\)\{background:var\(--bg2\);color:var\(--text\)\}/);
  assert.doesNotMatch(page,/\.nav-btn:active\{[^}]*transform:/);
  assert.match(page,/\.nav\{[^}]*height:40px;[^}]*padding:3px/);
  assert.match(page,/\.nav-btn\{position:relative;top:0\}/);
  assert.match(page,/@media \(max-width:640px\)[\s\S]*?\.nav\{order:3;width:100%/);
  assert.match(page,/@media \(max-width:640px\)[\s\S]*?\.nav-btn\{flex:1;height:38px;padding:0 8px;font-size:13px;justify-content:center;top:0\}/);
});

test("Subscribe only fills cyan on hover and has no press animation",()=>{
  assert.match(page,/window\.music98PillPress = window\.music98PillPress/);
  assert.match(page,/data-pill-press type="submit"><span class="press-pill-label">Subscribe<\/span><\/button>/);
  assert.match(page,/\.subscribe \.btn\.primary\.press-pill\{--pill-press-bg:transparent;--pill-press-border:var\(--line\);color:var\(--text\)\}/);
  assert.match(page,/\.subscribe \.btn\.primary\.press-pill:hover::before\{background:var\(--accent\);border-color:var\(--accent\)\}/);
  assert.match(page,/\.press-pill:active,\.press-pill\.press\{transform:none\}/);
  assert.doesNotMatch(page,/\.press-pill\.press\{transform:scale/);
});

test("chart artwork is server-audited and has no browser point-fix table",()=>{
  assert.doesNotMatch(page,/CHART_ART_FIXES|fixedChartArt/);
  assert.match(page,/art: t\.art\|\|""/);
  assert.match(page,/artwork is server-audited; browser search must not replace it/);
});

test("concert bundle serves complete mobile and desktop map concert popups",()=>{
  assert.ok(page.includes("concerts-app.js?v=20261004-35"));
});


test("Subscribe press cannot resize the email row",()=>{
  assert.match(page,/\.sub-in input\{flex:1 1 0;min-width:0;width:0/);
  assert.match(page,/\.sub-in \.btn\{flex:0 0 126px;width:126px;min-width:126px/);
  assert.match(page,/@media \(max-width:640px\)[\s\S]*?\.sub-in \.btn\{flex:0 0 126px;width:126px;min-width:126px/);
});

test("footer social icons stay in one row and desktop columns stay balanced",()=>{
  assert.match(page,/\.social \.icons\{display:grid;grid-template-columns:repeat\(4,42px\);gap:10px;width:198px/);
  assert.match(page,/@media \(min-width:901px\)[\s\S]*?grid-template-columns:minmax\(280px,340px\) minmax\(48px,1fr\) 140px 36px 160px minmax\(48px,1fr\) 198px/);
});

test("mobile footer uses the free second column and social glyphs are optically centered",()=>{
  assert.match(page,/@media \(max-width:640px\)[\s\S]*?\.foot-in\{grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\);column-gap:28px;row-gap:30px;padding:32px 16px 36px\}/);
  assert.match(page,/\.foot-in>\.foot-col:first-child\{grid-column:1\/-1\}/);
  assert.match(page,/\.foot-in>\.social\{grid-column:1\/-1\}/);
  assert.match(page,/\.social a\[title="TikTok"\] svg\{transform:translate\(1px,-1px\)\}/);
});

test("footer social pills fill cyan only on hover",()=>{
  assert.match(page,/\.social a\{[^}]*background:var\(--card\);[^}]*transform:none;[^}]*transition:background \.16s ease,border-color \.16s ease,color \.16s ease/);
  assert.match(page,/\.social a:hover\{background:var\(--accent\);border-color:var\(--accent\);color:#03282b\}/);
  assert.match(page,/\.social a:active\{transform:none\}/);
  assert.doesNotMatch(page,/\.social a:active\{border-color:var\(--accent\)\}/);
});


test("verified server artwork is enforced at final row render",()=>{
  assert.match(page,/const verifiedArt = String\(r\.art\|\|""\)/);
  assert.match(page,/const art = verifiedArt \? esc\(verifiedArt\) : presetCover/);
  assert.match(page,/\$\{verifiedArt \? "" : " data-need=/);
});

test("clean Chart and Concerts routes are no-store",()=>{
  assert.match(worker,/path === "\/concerts"[\s\S]*serveConcertsShell\(request, env\)/);
  assert.match(worker,/\^\\\/\(\?:releases\|chart\|charts\)/);
  assert.match(worker,/no-store, no-cache, must-revalidate, max-age=0/);
  assert.match(worker,/Cloudflare-CDN-Cache-Control/);
  assert.match(worker,/X-M98-Concerts-Shell/);
});


test("daily chart checks server freshness before painting browser cache",()=>{
 assert.match(page,/const DAILYKEY = "music98news_daily_v45"/);
 assert.match(page,/const hasFreshCache=!!\(cached/);
 assert.match(page,/sourceDates\?\.S && cached.spotifyFingerprint/);
 assert.doesNotMatch(page,/if\(hasFreshCache\) applyDaily\(cached.tracks, "cache"\)/);
 assert.match(page,/fetch\("\/api\/top50\?d=" \+ todayUTC\(\) \+ "&rev=45"/);
 assert.match(page,/cache:"no-store"/);
});

test("chart preview uses measured attenuation-only loudness normalization",()=>{
  assert.match(page,/const CHART_FALLBACK_GAIN_DB = -8/);
  assert.match(page,/let chartTrackGain = gainFromDb\(CHART_FALLBACK_GAIN_DB\)/);
  assert.match(page,/data-gain-db=/);
  assert.match(page,/gainSet\(v \* chartTrackGain\)/);
  assert.doesNotMatch(page,/createDynamicsCompressor\s*\(|createConvolver\s*\(/);
});


test("browser iTunes fallback rejects derivative releases and never falls back to title-only artist matching",()=>{
  assert.match(page,/const PREVCACHE = "music98news_prevcache_v7"/);
  assert.match(page,/add\("dub",\/\\bdub\\b\//);
  assert.match(page,/add\("rework",\/\\b\(\?:rework\|reworked\|bootleg\|mashup\)\\b\//);
  assert.match(page,/add\("session",\/\\b\(\?:session\|unplugged\|rehearsal\|performance\|concert\)\\b\//);
  assert.match(page,/if\(!wantV && collectionVersion\) continue;/);
  assert.match(page,/if\(wantV && collectionVersion && collectionVersion!==wantV\) continue;/);
  assert.match(page,/const lead=itunesLeadArtistName\(artist\)/);
  assert.doesNotMatch(page,/itunesLookup\(title, "", r2=>/);
});


test("valid empty Desk feed does not resurrect bundled News/Releases",()=>{
  assert.match(page,/if\(!j \|\| !Array\.isArray\(j\.posts\)\) throw new Error\("invalid desk payload"\)/);
  assert.match(page,/const live = j\.posts\.filter\(isLivePost\);[\s\S]*paint\(live\);/);
  assert.doesNotMatch(page,/paint\(live\.length \? live :/);
});


test("Load More only fills cyan on hover and has no press animation",()=>{
  assert.match(page,/\.loadmore-btn:hover::before\{background:var\(--accent\);border-color:var\(--accent\)\}/);
  assert.match(page,/\.loadmore-btn:active\{transform:none\}/);
  assert.doesNotMatch(page,/\.loadmore-btn:active\{transform:scale/);
});

test("SPA /concerts uses concerts-specific document metadata",()=>{
  assert.match(page,/const CONCERTS_PAGE_META=\{[\s\S]*title:"Concerts Near You - music98\.news"[\s\S]*canonical:"https:\/\/music98\.news\/concerts"/);
  assert.match(page,/activeTab = t;\n  syncSectionMeta\(t\);/);
});


test("original main news hero receives shadow directly without an extra frame",()=>{
  assert.match(page,/\.hero\{[^}]*margin-bottom:18px;box-shadow:var\(--shadow\)/);
  assert.match(page,/<a class="hero" href="\$\{postPath\(hero\)\}">/);
  assert.doesNotMatch(page,/class="hero-card"|\.hero-card\{/);
  assert.match(page,/\.hero:active,\.hero:focus,\.hero:focus-visible\{[^}]*box-shadow:var\(--shadow\)/);
  assert.match(page,/@media \(hover:hover\) and \(pointer:fine\)\{[\s\S]*?\.hero:hover\{border-color:var\(--accent-dim\)\}/);
  assert.match(page,/\.hero:hover\{transform:none;border-color:var\(--line\);box-shadow:var\(--shadow\)/);
});
test("search mode removes the empty hero spacer and Facebook glyph is optically centered",()=>{
  assert.match(page,/body\.searching #heroSlot:empty\{min-height:0\}/);
  assert.match(page,/\.social a\[title="Facebook"\] svg\{transform:translateY\(-1px\)\}/);
  assert.match(page,/#heroSlot:empty\{min-height:300px\}/);
});

test("mobile cards keep desktop title-teaser spacing and equalize only whole-card height",()=>{
  assert.match(page,/\.card \.body\{padding:16px;display:flex;flex-direction:column;gap:8px;flex:1\}/);
  assert.match(page,/\.meta\{margin-top:auto;/);
  assert.match(page,/c\.style\.minHeight=maxCard\+"px"/);
  assert.doesNotMatch(page,/h\.style\.minHeight\s*=\s*maxH/);
  assert.doesNotMatch(page,/p\.style\.minHeight\s*=\s*maxP/);
});

test("direct Concerts route is applied before editorial desk fetch finishes",()=>{
  const routeAt=page.lastIndexOf('if(initialCleanPath==="/concerts" || location.hash==="#concerts") route();');
  const deskAt=page.lastIndexOf("loadPublishedDesk();");
  assert.ok(routeAt>=0);
  assert.ok(deskAt>routeAt);
});



test("site text stays off persistent compositor transforms and whole-button filters",()=>{
  assert.doesNotMatch(page,/nav\.style\.transform/);
  assert.doesNotMatch(page,/translateX\(" \+ snapCur/);
  assert.match(page,/nav\.style\.left=/);
  assert.match(page,/Math\.round\(x\*dpr\)\/dpr-x/);
  assert.doesNotMatch(page,/\.btn\.primary:hover\{filter:/);
});


test("daily chart caches only complete, source-stamped rows with artwork",()=>{
 assert.match(page,/cached.tracks.every\(t=>String\(t.art\|\|""\).trim\(\)\)/);
 assert.match(page,/if\(fresh && tracks.every\(t=>String\(t.art\|\|""\).trim\(\)\)\)/);
 assert.match(page,/spotifyFingerprint:j.spotifyFingerprint/);
 assert.match(page,/sourceDates:j.sourceDates/);
});

test("chart fallback never flashes the launch day and mobile hides the status caption",()=>{
  assert.match(page,/data\.chart\s*=\s*\[\];\s*renderCharts\(\);\s*setChartStatus\(\{\},\s*"loading"\)/);
  assert.match(page,/#tab-charts #chartStatus\{display:none!important\}/);
  assert.doesNotMatch(page,/else applyDaily\(TOP50, "snap"\)/);
});


test("article ticket carrier keeps executable line breaks",()=>{
  assert.equal(page.includes('$/i);\\n    if(tickets)'), false);
  assert.equal(page.includes('const tickets = t.match('), true);
  assert.equal(page.includes('if(tickets) return'), true);
});


test("Buy Tickets only changes on hover and has no press animation",()=>{
  assert.match(page,/\.article-ticket a:hover::before\{background:var\(--accent\);border-color:var\(--accent\)\}/);
  assert.equal(page.includes('rel="sponsored noopener noreferrer" data-pill-press><span>Buy Tickets</span>'), false);
  assert.doesNotMatch(page,/\.article-ticket a\.press::before/);
  assert.doesNotMatch(page,/\.article-ticket a:active::before/);
});


test("mobile chart reclaims arrow space without shrinking artwork or playback",()=>{
  const start=page.lastIndexOf("  .chart-row{",page.indexOf("--pw:auto;"));
  assert.ok(start>0,"mobile chart rule missing");
  const mobile=page.slice(start,page.indexOf("  .crow .weeks-in",start));
  for(const value of [
    "grid-template-columns:56px 44px minmax(0,1fr) 36px;",
    "gap:6px 8px;",
    "padding:12px 17px 12px 12px;",
    ".delta.reentry{height:auto;width:max-content;max-width:none;min-width:0;padding:0;letter-spacing:0;",
    ".artwrap{grid-area:art;width:44px;height:44px;",
    ".rplay{grid-area:play;justify-self:end;align-self:center;width:36px;height:36px}"
  ])assert.ok(mobile.includes(value),value);
  assert.ok(page.includes(".delta{font-size:12.5px;font-weight:700;text-align:center}"));
  assert.ok(page.includes(".delta.new{font-size:12.5px;letter-spacing:0}"));
  assert.ok(page.includes(".delta.reentry{font-size:12.5px;letter-spacing:0}"));
  assert.ok(mobile.includes(".chart-row .delta{grid-area:delta;display:flex;align-items:center;justify-content:center;align-self:center;font-size:11px;"));
  assert.ok(!mobile.includes(".delta.new{height:auto;min-width:0;padding:0;font-size:"));
  assert.ok(!mobile.includes(".delta.reentry{height:auto;width:max-content;max-width:none;min-width:0;padding:0;font-size:"));
  assert.ok(mobile.includes(".delta.reentry{height:auto;width:max-content;max-width:none;min-width:0;padding:0;letter-spacing:0;"));
  assert.ok(page.includes(".delta.new,.delta.reentry{color:var(--text);background:transparent;border:0;border-radius:0"));
  assert.ok(!page.includes(".delta.new,.delta.reentry{background:var(--text);color:#fff"));
  assert.ok(mobile.includes(".delta.new{height:auto;min-width:0;padding:0;letter-spacing:0;"));
  assert.ok(!mobile.includes(".delta.new,.delta.reentry{background:var(--text);color:#fff"));
  assert.ok(page.includes(".chart-row{--pw:40px;--pexp:0px;display:grid;grid-template-columns:82px 56px"));
  /* Week text starts exactly at the visible image's padded inset. */
  assert.ok(mobile.includes(".weeks{grid-area:week;text-align:left;justify-self:start;"));
  assert.ok(mobile.includes("padding-top:0;padding-left:2px;margin:0;"));
  assert.ok(mobile.includes("font-variant-numeric:tabular-nums"));
});


test("the UI requires five full sources and verified Spotify metadata without technical diagnostics",()=>{
 assert.match(page,/j.complete === true/);
 assert.match(page,/Number\(j.sources\?\.\[k\]\)===50/);
 assert.match(page,/!!j.sourceDates\?\.S && !!j.spotifyFingerprint/);
 assert.doesNotMatch(page,/Last complete chart:/);
 assert.match(page,/else if\(tag === "backup"\) txt = ""/);
 assert.match(page,/j\.updated === todayUTC\(\) && !j\.fallback && j\.complete === true/);
});

test("chart ticker scrolls only clipped text of the currently playing row",()=>{
 const start=page.indexOf("function chartMarqueeMetrics(");
 const end=page.indexOf("const chartMarqueeReduce=",start);
 assert.ok(start>0&&end>start);
 const measure=new Function(page.slice(start,end)+";return chartMarqueeMetrics;")();
 assert.equal(measure(90,112),null);
 assert.equal(measure(113,112),null);
 assert.equal(measure(115,112).distance,147);
 assert.equal(measure(400,112).seconds>8,true);
 assert.match(page,/document\.querySelector\("#chartList \.chart-row\.playing"\)/);
 assert.match(page,/clearChartMarqueeRow\(chartMarqueeRow\)/);
 assert.match(page,/line\.replaceChildren\(belt\)/);
 assert.match(page,/duplicate\.setAttribute\("aria-hidden","true"\)/);
 assert.match(page,/line\.clientWidth/);
 assert.match(page,/scheduleChartMarquee\(\);\s*}\s*function stopPreview/);
 assert.match(page,/new ResizeObserver\(scheduleChartMarquee\)/);
 assert.match(page,/chartMarqueeReduce\.addEventListener\("change",scheduleChartMarquee\)/);
 assert.match(page,/#chartList \.chart-marquee-belt\{[^}]*animation:chart-marquee-travel/);
 assert.match(page,/@media \(prefers-reduced-motion:reduce\)\{/);
 assert.doesNotMatch(page,/\.chart-row\.playing \.cartist\{[^}]*transform:/);
});


test("subscribe card has solid white background and preserves original geometry and shadow",()=>{
  const match=page.match(/\.subscribe::before\{([\s\S]*?)\n\}/);
  assert.ok(match,"subscribe white card must keep its existing pseudo-element");
  const css=match[1];
  assert.match(css,/border-radius:22px/);
  assert.match(css,/background:#fff/);
  assert.match(css,/box-shadow:var\(--shadow\)/);
  assert.doesNotMatch(css,/backdrop-filter|background:rgba/);
});


test("scrolling glass header keeps its existing fade with full-width straight geometry",()=>{
  const full=page.match(/\.topbar-glass-full\{([^}]*)\}/);
  const isle=page.match(/\.topbar-glass-isle\{([^}]*)\}/);
  assert.ok(full && isle,"both original scroll layers must remain");
  assert.match(page,/\.topbar-glass\{[^}]*border:0;\s*border-bottom:1px solid rgba\(255,255,255,\.8\)/);

  assert.ok(page.includes(".topbar{--hp:0;height:auto;background:transparent;padding:0;box-shadow:none;"));
  assert.ok(page.includes(".topbar-glass{display:block}"));
  assert.ok(page.includes(".topbar-glass-full,.topbar-glass-isle{top:0;bottom:0;height:auto}"));
  assert.doesNotMatch(page,/if\(mqPhone\.matches\)\{/);
  const geometry=s=>s.match(/top:0;\s*height:55px;\s*left:0;\s*right:var\(--sbw,0px\);\s*border-radius:0/);
  assert.ok(geometry(full[1]),"full header must have no top/side gaps or rounded edges");
  assert.ok(geometry(isle[1]),"scroll header must use the same edge-to-edge geometry");
  assert.match(page,/\.topbar\.is-away \.topbar-glass-full\{opacity:0\}/);
  assert.match(page,/\.topbar\.is-away \.topbar-glass-isle\{opacity:1\}/);
  assert.match(page,/\.topbar\.is-melting \.topbar-glass\{transition:opacity \.48s ease\}/);
  assert.match(page,/function setHeaderAway\(away\)\{/);
  assert.match(page,/\.topbar-in\{[^}]*grid-template-columns:1fr auto 1fr/);
});

test("chart and concerts pages never display technical source or partial-fetch diagnostics",()=>{
  const concerts=readFileSync(new URL("../public/concerts-app.js",import.meta.url),"utf8");
  assert.doesNotMatch(page,/chartSourceNotice|Waiting for all five ranking sources|Showing the latest verified chart while today/);
  assert.doesNotMatch(concerts,/loaded dates of|Ticketmaster results ·/);
  assert.match(concerts,/Showing the nearest upcoming concerts ·/);
});


test("major card surfaces share one centered shadow across sections",()=>{
  const centered="--shadow:0 0 22px rgba(15,45,55,.14)";
  const concerts=readFileSync(new URL("../public/concerts-app.js",import.meta.url),"utf8");
  const concertsStandalone=readFileSync(new URL("../public/concerts.html",import.meta.url),"utf8");
  assert.ok(page.includes(centered),"News, Releases, chart and subscription share the site token");
  assert.ok(concerts.includes(centered),"Concerts artist cards share the site token");
  assert.ok(concertsStandalone.includes(centered),"Standalone Concerts shares the same token");
  assert.match(page,/--story-shadow:var\(--shadow\)/);
  assert.match(page,/\.hero\{[^}]*box-shadow:var\(--shadow\)/);
  assert.doesNotMatch(page,/\.hero\{[^}]*--shadow:/,"Hero must not secretly override the shared shadow");
  assert.match(page,/\.chart\{[^}]*box-shadow:var\(--shadow\)/);
  assert.match(page,/\.card:hover\{[^}]*box-shadow:var\(--story-shadow\)/);
  assert.match(page,/\.rcard:hover\{[^}]*box-shadow:var\(--shadow\)/);
  assert.match(page,/\.subscribe::before\{[^}]*box-shadow:var\(--shadow\)/);
  assert.match(concerts,/\.tour-card\.open\{[^}]*box-shadow:var\(--shadow\)/);
  const rail=page.match(/#tab-news #newsGrid,#tab-releases #relGrid\{padding:(\d+)px 44px (\d+)px (\d+)px;margin:-(\d+)px 0 -(\d+)px -(\d+)px\}/);
  assert.ok(rail,"News and Releases must have identical carousel shadow clearance");
  const [padTop,padBottom,padLeft,marginTop,marginBottom,marginLeft]=rail.slice(1).map(Number);
  assert.equal(padTop,padBottom,"equal top and bottom clearance");
  assert.equal(padTop,marginTop,"larger top clearance cannot shift cards down");
  assert.equal(padBottom,marginBottom,"larger bottom clearance cannot alter layout height");
  assert.equal(padLeft,marginLeft,"larger left clearance cannot shift card alignment");
  assert.ok(padTop-4>=22,"shadow must fit above cards lifted 4px");
  assert.ok(padBottom>=22&&padLeft>=22,"bottom and left shadows must not be clipped");
});


test("subscribe email focus does not retain a cyan mouse-focus halo",()=>{
  assert.match(page,/\.sub-in input\{[^}]*background:#fff;box-shadow:none;outline:none;transition:none/);
  assert.match(page,/\.sub-in input:focus\{border-color:var\(--line\);box-shadow:none;outline:none\}/);
  assert.match(page,/\.sub-in input:focus-visible\{outline:2px solid var\(--accent\);outline-offset:2px\}/);
  assert.doesNotMatch(page,/\.sub-in input:focus,\.sub-in input:focus-visible\{[^}]*box-shadow/);
});


test("all four main tabs use the same compact heading-to-content gap",()=>{
  const concerts=readFileSync(new URL("../public/concerts-app.js",import.meta.url),"utf8");
  assert.match(page,/--section-heading-gap:14px/);
  assert.match(page,/\.tab \.hd\{margin:0 0 var\(--section-heading-gap\)\}/);
  assert.doesNotMatch(page,/#tab-(?:news|releases|charts) \.hd\{margin:/,
    "tab-specific heading gaps must not silently diverge");
  assert.match(page,/#tab-releases \.rail-wrap\{margin-top:0\}/,
    "release rail must not add an extra top gap");
  assert.match(concerts,/\.hero\{margin:0 0 var\(--section-heading-gap,14px\);align-items:center\}/);
  assert.match(page,/#tab-news #newsGrid,#tab-releases #relGrid\{padding:32px 44px 32px 32px;margin:-32px 0 -32px -32px\}/,
    "carousel shadow clearance must not change the visible card position");
});


test("mobile News has a uniform newest-first feed and does not reserve an empty hero",()=>{
  assert.match(page,/function byFresh\(a,b\)\{[\s\S]*?return postTime\(b\)-postTime\(a\)/);
  const news=page.slice(page.indexOf("function renderNews(){"),page.indexOf("function renderReleases(){"));
  assert.match(news,/const narrow = window\.matchMedia\("\(max-width: 640px\)"\)/);
  assert.match(news,/const hero = \(query \|\| narrow\.matches\) \? null : \(posts\.find\(p=>p\.pinned\) \|\| posts\[0\]\)/);
  assert.match(news,/const rest = posts\.filter\(p=>p!==hero\)/);
  assert.match(news,/const shown = narrow\.matches \? rest\.slice/);
  assert.match(page,/@media \(max-width:640px\)\{#tab-news #heroSlot:empty\{display:none;min-height:0\}\}/);
  assert.match(news,/newsMobileLayout\.addEventListener\("change", renderNews\)/);
});

test("Concerts mobile heading remains left-aligned after final CSS overrides and matches site typography",()=>{
  const concerts=readFileSync(new URL("../public/concerts-app.js",import.meta.url),"utf8");
  const match=concerts.match(/^const CONCERTS_CSS=("(?:\\.|[^"\\])*");/m);
  assert.ok(match,"Concerts CSS must be the real shadow-root stylesheet");
  const css=JSON.parse(match[1]);
  const base=css.lastIndexOf(".hero{margin:0 0 var(--section-heading-gap,14px);align-items:center}");
  const mobile=css.lastIndexOf("@media(max-width:700px){\n  .hero{align-items:flex-start;justify-content:flex-start;text-align:left;margin-bottom:var(--section-heading-gap,14px)}");
  assert.ok(base>=0 && mobile>base,"mobile alignment must override later centered desktop declaration");
  assert.match(css,/@media\(max-width:640px\)\{\n  \.hero h1\{font-size:clamp\(22px,7vw,26px\);line-height:1\.15\}/);
  assert.match(page,/@media \(max-width:640px\)\{[\s\S]*?\.wrap\{padding:0 16px\}/);
  assert.match(css,/\.wrap\{padding:0 0 18px;max-width:none\}/,
    "embedded Concerts inherits the main site's shared horizontal page padding");
});
