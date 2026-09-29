import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app=readFileSync(new URL("../public/concerts-app.js",import.meta.url),"utf8");

test("map popup and right-side event rows use the same typography tokens",()=>{
  // The map no longer uses a compensating CSS zoom. Both lists inherit the
  // exact same custom properties, which removes geometry drift and rounding.
  assert.match(app,/--event-date-size:11\.5px/);
  assert.match(app,/--event-main-size:12\.5px/);
  assert.match(app,/--event-sub-size:11px/);
  assert.doesNotMatch(app,/zoom:calc\(1 \/ \.96\)/);
  assert.doesNotMatch(app,/--event-date-size:11\.04px/);
  assert.match(app,/\.event-date\{font-size:var\(--event-date-size\)/);
  assert.match(app,/\.venue-event-date\{font-size:var\(--event-date-size\)/);
  assert.match(app,/\.event-city\{display:block;font-size:var\(--event-main-size\)/);
  assert.match(app,/\.venue-event-name\{display:block;font-size:var\(--event-main-size\)/);
});

test("Buy Tickets pill scales while text uses a crisp native pressed size",()=>{
  assert.match(app,/\.buy::before\{[^}]*transform:scale\(1\);transform-origin:50% 50%;[^}]*transform \.09s/);
  assert.match(app,/\.buy-label\{[^}]*font-size:13px;[^}]*transform:none;translate:none;transition:none/);
  assert.match(app,/\.buy\.press::before\{transform:scale\(\.98\)\}/);
  assert.match(app,/\.buy\.press \.buy-label\{font-size:12\.75px\}/);
  assert.doesNotMatch(app,/\.buy\.press \.buy-label\{[^}]*transform/);
});

test("concert popup keeps fixed geometry and disappears below city zoom",()=>{
  assert.match(app,/const POPUP_CITY_MIN_ZOOM=6\.2/);
  assert.doesNotMatch(app,/function popupLerp/);
  assert.doesNotMatch(app,/const t=Math\.max\(0,Math\.min\(1,\(z-2\.3\)/);
  assert.match(app,/popup\.setMaxWidth\("286px"\)/);
  assert.match(app,/map\.on\("zoom",\(\)=>\{\n  applyMapMode\(\);\n  if\(!popup\) return;\n  if\(map\.getZoom\(\)<POPUP_CITY_MIN_ZOOM\)\{ closePopup\(\); return; \}/);
  assert.match(app,/function showPopup\(e\)\{\n  if\(map\.getZoom\(\)<POPUP_CITY_MIN_ZOOM\) return;/);
  assert.match(app,/function showVenuePopup\(events\)\{\n  if\(!events\?\.length \|\| map\.getZoom\(\)<POPUP_CITY_MIN_ZOOM\) return;/);
});

test("Popular UI renders strict confirmed cache immediately without an explanatory banner",()=>{
  assert.match(app,/music98:concert-popular:v8/);
  assert.match(app,/cached\?\.version==="popular-v4"/);
  assert.match(app,/ticketmaster_event_payload_gt_0/);
  assert.match(app,/cached\.artists\.length>=30/);
  assert.match(app,/mode:"popular",v:"popular-v8"/);
  assert.match(app,/sideSub\.textContent="";/);
  assert.doesNotMatch(app,/Popular artists with confirmed upcoming Ticketmaster shows\./);
});

test("map uses only the daily verified market snapshot",()=>{
  assert.doesNotMatch(app,/STATIC_GLOBAL_MARKETS/);
  assert.doesNotMatch(app,/STATIC_US_STATE_CAPITALS/);
  assert.match(app,/const MARKET_CACHE_KEY="music98:concert-markets:v3"/);
  assert.match(app,/mode:"markets",v:"concert-markets-v3"/);
  assert.match(app,/loadMarkets\(\);/);
  assert.match(app,/overview:\(h\.verified\|\|h\.pinned/);
});

test("map has no custom minus or floating status and native zoom-out resets filters",()=>{
  assert.doesNotMatch(app,/id=\\"resetMapBtn\\"/);
  assert.doesNotMatch(app,/id=\\"status\\"/);
  assert.match(app,/function setStatus\(\)\{ \/\* no floating map status UI \*\/ \}/);
  assert.match(app,/\.mapboxgl-ctrl-zoom-out/);
  assert.match(app,/btn\.addEventListener\("click",resetMapFilters\)/);
  assert.match(app,/radiusEl\.value="100"/);
});

test("map shell has no gray shadow gap and canvas fills it",()=>{
  assert.match(app,/\.map-shell\{[^}]*background:#fff;box-shadow:none/);
  assert.match(app,/#map \.mapboxgl-canvas\{[^}]*width:100%!important;height:100%!important/);
});

test("More button sits slightly lower than the previous equal-margin position",()=>{
  assert.match(app,/\.tour-more\{[^}]*margin:7px auto 3px/);
});

test("Buy Tickets uses the shared site press binder",()=>{
  assert.match(app,/typeof window\.music98PillPress==="function"/);
  assert.doesNotMatch(app,/a\.addEventListener\("pointerdown"/);
});


test("concert snapshot requests bypass browser cache and Popular never renders a partial list",()=>{
  assert.match(app,/fetch\(u,\{cache:"no-store",headers:\{"Accept":"application\/json","Cache-Control":"no-cache"\}\}\)/);
  assert.match(app,/cached\.artists\.length>=30/);
  assert.match(app,/Array\.isArray\(data\.artists\) && data\.artists\.length>=30/);
  assert.match(app,/popularArtists=data\.artists\.slice\(0,30\)/);
  assert.match(app,/if\(popularArtists\.length>=30\)/);
  assert.match(app,/sideEmpty\.textContent=data\?\.warming \? "Updating popular artists\.\.\."/);
});


test("concert pills match top-nav timing and use equal-width segments",()=>{
  assert.match(app,/\.side-tabs\{\\n  width:244px;max-width:100%;display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(app,/\.side-tab\{\\n  width:100%;min-width:0;max-width:none/);
  assert.match(app,/\.side-tab\{[\s\S]*?transition:\.18s;/);
  assert.match(app,/\.side-tabs\{[\s\S]*?margin:4px 0 6px/);
  assert.match(app,/\.map-mode-switch\{[^}]*display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(app,/\.map-mode-btn\{width:100%;[^}]*transition:\.18s/);
});

test("artist subtitle shares the exact left edge with artist name",()=>{
  assert.match(app,/\.tour-copy\{[^}]*width:100%;padding:0;margin:0;display:grid/);
  assert.match(app,/\.tour-name\{[^}]*width:100%;margin:0;padding:0;text-indent:0;text-align:left/);
  assert.match(app,/\.tour-meta\{[^}]*width:100%;margin:3px 0 0;padding:0;text-indent:0;text-align:left/);
});

test("warming verified market pins merge with the last complete map",()=>{
  assert.match(app,/data\.complete===false[\s\S]*mergeHotspots\(\[\.\.\.\(hotspots\|\|\[\]\),\.\.\.data\.markets\]\)/);
  assert.match(app,/if\(data\.complete!==false\) writeMarketCache\(data\)/);
});


test("artist mode hides global markets and keeps only artist markers at every zoom",()=>{
  assert.match(app,/const showHubs=activeMode==="popular";/);
  assert.match(app,/\["artist-points","artist-hit"\]\.forEach\(id=>setLayerVisible\(id,artist\)\)/);
  assert.match(app,/\["clusters","cluster-hit","event-points","event-hit","event-labels"\]\.forEach\(id=>setLayerVisible\(id,area\)\)/);
  assert.doesNotMatch(app,/showHubs=activeMode==="popular" \|\| overviewZoom/);
  assert.doesNotMatch(app,/artist && !overviewZoom/);
});

test("verified market marker layer is zoom-stable for Rome and every other country",()=>{
  assert.match(app,/id:"capital-points",type:"symbol",source:"hubs",minzoom:0,maxzoom:18/);
  assert.doesNotMatch(app,/id:"capital-points"[^\n]*filter:/);
  assert.match(app,/id:"city-major-points"[\s\S]*?layout:\{"visibility":"none"/);
  assert.match(app,/id:"city-mid-points"[\s\S]*?layout:\{"visibility":"none"/);
  assert.match(app,/id:"city-all-points"[\s\S]*?layout:\{"visibility":"none"/);
  assert.match(app,/\["city-major-points","city-mid-points","city-all-points"\]\.forEach\(id=>setLayerVisible\(id,false\)\)/);
});
