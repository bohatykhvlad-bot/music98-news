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
  assert.match(page,/\.nav-btn\{position:relative;top:\.5px\}/);
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

test("concert bundle version is bumped after the static-map UI change",()=>{
  assert.match(page,/concerts-app\.js\?v=20260930-25/);
});


test("Subscribe press cannot resize the email row",()=>{
  assert.match(page,/\.sub-in input\{flex:1 1 0;min-width:0;width:0/);
  assert.match(page,/\.sub-in \.btn\{flex:0 0 126px;width:126px;min-width:126px/);
  assert.match(page,/@media \(max-width:640px\)[\s\S]*?\.sub-in \.btn\{flex:0 0 126px;width:126px;min-width:126px/);
});

test("footer social icons stay in one row",()=>{
  assert.match(page,/\.social \.icons\{display:grid;grid-template-columns:repeat\(4,42px\);gap:10px;width:198px/);
  assert.match(page,/grid-template-columns:minmax\(320px,1fr\) 150px 180px 198px/);
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


test("same-day chart cache is an instant paint and always revalidates",()=>{
  assert.match(page,/const DAILYKEY = "music98news_daily_v38"/);
  assert.match(page,/const hasFreshCache=!!\(cached/);
  assert.match(page,/fetch\(u,\{cache:"no-store",headers:\{"Cache-Control":"no-cache"\}\}\)/);
  assert.match(page,/rev=38/);
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

