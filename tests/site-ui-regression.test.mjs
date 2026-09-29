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
  assert.match(page,/Math\.round\(\(advance\/2-inkCenter\)\*2\)\/2/);
  assert.match(page,/@media \(max-width:640px\)[\s\S]*?\.nav\{order:3;width:100%/);
});

test("Subscribe scales only its background so text is never raster-scaled",()=>{
  assert.match(page,/window\.music98PillPress = window\.music98PillPress/);
  assert.match(page,/data-pill-press type="submit"><span class="press-pill-label">Subscribe<\/span><\/button>/);
  assert.match(page,/\.press-pill\{[^}]*transform:none!important/);
  assert.match(page,/\.press-pill::before\{[^}]*transform:scale\(1\);[^}]*will-change:transform/);
  assert.match(page,/\.press-pill\.press::before\{transform:scale\(\.985\)\}/);
  assert.match(page,/\.press-pill-label\{[^}]*transform:none;translate:none;transition:none/);
  assert.doesNotMatch(page,/\.press-pill\.press\{[^}]*scale\(/);
});

test("chart artwork is server-audited and has no browser point-fix table",()=>{
  assert.doesNotMatch(page,/CHART_ART_FIXES|fixedChartArt/);
  assert.match(page,/art: t\.art\|\|""/);
  assert.match(page,/artwork is server-audited; browser search must not replace it/);
});

test("concert bundle version is bumped after the static-map UI change",()=>{
  assert.match(page,/concerts-app\.js\?v=20260930-5/);
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


test("verified server artwork is enforced at final row render",()=>{
  assert.match(page,/const verifiedArt = String\(r\.art\|\|""\)/);
  assert.match(page,/const art = verifiedArt \? esc\(verifiedArt\) : presetCover/);
  assert.match(page,/\$\{verifiedArt \? "" : " data-need=/);
});

test("clean Chart and Concerts routes are no-store",()=>{
  assert.match(worker,/\^\\\/\(\?:releases\|chart\|charts\|concerts\)/);
  assert.match(worker,/headers\.set\("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0"\)/);
  assert.match(worker,/Cloudflare-CDN-Cache-Control/);
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


test("Load More scales only its background so its text stays sharp",()=>{
  assert.match(page,/\.loadmore-btn::before\{[^}]*transform:scale\(1\);[^}]*will-change:transform/);
  assert.match(page,/\.loadmore-btn:active::before\{transform:scale\(\.98\)\}/);
  assert.doesNotMatch(page,/\.loadmore-btn:active\{transform:scale/);
});
