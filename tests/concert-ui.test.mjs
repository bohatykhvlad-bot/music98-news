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

test("Buy Tickets only fills cyan on hover and has no press animation",()=>{
  assert.match(app,/\.buy:hover::before\{background:var\(--accent\);border-color:var\(--accent\)\}/);
  assert.match(app,/\.buy:active,\.buy\.press\{transform:none\}/);
  assert.doesNotMatch(app,/\.buy\.press\{transform:scale/);
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
  assert.match(app,/music98:concert-popular:v9/);
  assert.match(app,/cached\?\.version==="popular-v4"/);
  assert.match(app,/ticketmaster_event_payload_gt_0/);
  assert.match(app,/cached\.artists\.length>=30/);
  assert.match(app,/mode:"popular",v:"popular-v9"/);
  assert.match(app,/sideSub\.textContent="";/);
  assert.doesNotMatch(app,/Popular artists with confirmed upcoming Ticketmaster shows\./);
});

test("map uses only the daily verified market snapshot",()=>{
  assert.doesNotMatch(app,/STATIC_GLOBAL_MARKETS/);
  assert.doesNotMatch(app,/STATIC_US_STATE_CAPITALS/);
  assert.match(app,/const MARKET_CACHE_KEY="music98:concert-markets:v7"/);
  assert.match(app,/mode:"markets",v:"concert-markets-v7"/);
  assert.match(app,/loadMarkets\(\);/);
  assert.match(app,/overview:\(h\.verified\|\|h\.pinned/);
});

test("map has no custom minus or floating map status and native zoom-out resets filters",()=>{
  assert.equal(app.includes("resetMapBtn"),false);
  assert.equal(app.includes("map-status"),false);
  assert.match(app,/function setStatus\(message\)\{ sideStatus\.textContent=/);
  assert.match(app,/\.mapboxgl-ctrl-zoom-out/);
  assert.match(app,/btn\.addEventListener\("click",resetMapFilters\)/);
  assert.equal(app.includes("radiusEl"),false);
});
test("map shell has no gray shadow gap and canvas fills it",()=>{
  assert.match(app,/\.map-shell\{[^}]*background:#fff;box-shadow:none/);
  assert.match(app,/#map \.mapboxgl-canvas\{[^}]*width:100%!important;height:100%!important/);
});

test("More button is optically centered inside the expanded event block",()=>{
  assert.match(app,/\.tour-card\.open \.tour-events\{[^}]*padding:2px 9px 10px/);
  assert.match(app,/\.event-link\{[^}]*margin:4px 0/);
  assert.match(app,/\.tour-more\{[^}]*margin:8px auto 2px/);
});

test("Buy Tickets uses the shared site press binder",()=>{
  assert.match(app,/typeof window\.music98PillPress==="function"/);
  assert.doesNotMatch(app,/a\.addEventListener\("pointerdown"/);
});


test("concert snapshot requests bypass browser cache and Popular never renders a partial list",()=>{
  assert.match(app,/cache:"no-store"/);
  assert.match(app,/signal:controller\.signal/);
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
  assert.match(app,/\.side-tab\{[\s\S]*?display:inline-flex;align-items:center;justify-content:center;text-align:center;text-indent:var\(--ink-x,0px\);line-height:1;text-box:trim-both cap alphabetic/);
  assert.match(app,/function pillInkShift\(el\)/);
  assert.match(app,/Math\.round\(raw\)/);
  assert.match(app,/\.search-area-btn:active,\.side-tab:active,\.map-mode-btn:active\{transform:none\}/);
  assert.match(app,/\.map-tool-btn:active\{transform:none!important\}/);
  assert.doesNotMatch(app,/\.side-tab:active[^}]*scale\(/);
  assert.doesNotMatch(app,/\.map-mode-btn:active[^}]*scale\(/);
  assert.doesNotMatch(app,/\.search-area-btn\{[^}]*translate:-50%/);
  assert.match(app,/getImageData\(/);
  assert.match(app,/\.tour-more\{[^}]*display:grid;place-items:center;text-align:center/);
  assert.match(app,/\.map-mode-btn\{[^}]*display:grid;place-items:center;text-align:center/);
  assert.match(app,/\.side-tabs\{[\s\S]*?margin:0 0 10px/);
  assert.match(app,/\.map-mode-switch\{[^}]*display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(app,/\.map-mode-btn\{width:100%;[^}]*transition:background \.18s ease,border-color \.18s ease,color \.18s ease/);
  assert.match(app,/@media\(hover:hover\) and \(pointer:fine\)\{\.nav-btn:hover:not\(\.active\)\{background:var\(--bg2\);color:var\(--text\)\}\}/);
  assert.doesNotMatch(app,/\.nav-btn:active\{[^}]*transform:/);
  assert.match(app,/\.nav-btn\{width:100%;[^}]*transition:\.18s;[^}]*top:\.5px/);
  assert.match(app,/@media\(max-width:700px\)\{[\s\S]*?\.nav-btn\{flex:1;height:38px;padding:0 8px;font-size:13px;justify-content:center;top:0\}/);
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
  assert.match(app,/\["artist-points","artist-hit"\]\.forEach\(id=>setLayerVisible\(id,artist\)\)/);
  assert.match(app,/\["clusters","cluster-hit","event-points","event-hit","event-labels"\]\.forEach\(id=>setLayerVisible\(id,showArea\)\)/);
  assert.match(app,/const overviewZoom=map\.getZoom\(\)<4\.7/);
  assert.match(app,/const showHubs=activeMode==="popular" \|\| \(area && overviewZoom\)/);
  assert.match(app,/const showArea=area && !overviewZoom/);
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


test("More only fills cyan on hover and has no press animation", async () => {
  const fs = await import("node:fs");
  const app = fs.readFileSync(new URL("../public/concerts-app.js", import.meta.url), "utf8");
  assert.match(app,/\.tour-more:hover\{background:var\(--accent\);border-color:var\(--accent\);color:#03282b\}/);
  assert.match(app,/\.tour-more:active\{transform:none\}/);
  assert.doesNotMatch(app,/\.tour-more:active\{transform:scale/);
});


test("Popular warming state polls only the precomputed KV snapshot",()=>{
  assert.match(app,/function schedulePopularWarmRetry\(\)/);
  assert.match(app,/loadPopular\(true\)/);
  assert.match(app,/if\(data\?\.warming\) schedulePopularWarmRetry\(\)/);
});


test("map mode toggle has no duplicate outer capsule and no resting compositor transform",()=>{
  assert.match(app,/\.map-mode-switch\{[^}]*border:0;[^}]*background:transparent;box-shadow:none/);
  assert.match(app,/\.map-mode-btn\{[^}]*border:1px solid var\(--line\);[^}]*background-color:transparent/);
  assert.match(app,/\.map-mode-btn\.active\{background-color:var\(--accent\);border-color:var\(--accent\);color:#03282b\}/);
  assert.match(app,/\.map-mode-btn:active\{transform:none\}/);
  assert.doesNotMatch(app,/\.radius-trigger,\.radius-option,\.search-area-btn,\.side-tab,\.map-mode-btn\{/);
});


test("map interface pills stay on the normal text raster in their resting state",()=>{
  assert.equal(app.includes(".action{"),false);
  assert.equal(app.includes(".radius-trigger{"),false);
  assert.equal(app.includes(".radius-option{"),false);
  assert.doesNotMatch(app,/\.search-area-btn,\.side-tab\{[^}]*will-change:transform/);
  assert.doesNotMatch(app,/\.search-area-btn,\.side-tab\{[^}]*backface-visibility:hidden/);
  assert.doesNotMatch(app,/\.search-area-btn,\.side-tab\{[^}]*transform:translateZ/);
  assert.doesNotMatch(app,/\.map-mode-btn\{[^}]*will-change:transform/);
});

test("inactive map toggles use the shared gray hover highlight",()=>{
  assert.match(app,/\.side-tab:hover:not\(\.active\)\{background:var\(--bg2\);color:var\(--text\)\}/);
  assert.match(app,/\.map-mode-btn\{[^}]*background-color:transparent/);
  assert.match(app,/\.map-mode-btn:hover:not\(\.active\)\{background-color:var\(--bg2\);color:var\(--text\)\}/);
  assert.match(app,/\.side-tab\.active\{background:var\(--accent\);color:#03282b\}/);
  assert.match(app,/\.map-mode-btn\.active\{background-color:var\(--accent\);border-color:var\(--accent\);color:#03282b\}/);
});


test("mobile Search this area stays at the top right and clears artist mode tabs",()=>{
  assert.match(app,/@media\(max-width:700px\)\{[\s\S]*?\.search-area-btn\{left:auto;right:10px;top:10px;bottom:auto;margin-inline:0;height:40px\}/);
  assert.match(app,/\.map-shell\.artist-context \.search-area-btn\{top:60px\}/);
  assert.doesNotMatch(app,/@media\(max-width:700px\)\{[\s\S]*?\.search-area-btn\{bottom:60px/);
});


test("direct /concerts is worker-first, no-store and rewrites index metadata without deleting legacy asset", async()=>{
  const fs=await import("node:fs");
  const worker=fs.readFileSync(new URL("../worker.js",import.meta.url),"utf8");
  const wrangler=fs.readFileSync(new URL("../wrangler.toml",import.meta.url),"utf8");
  const headers=fs.readFileSync(new URL("../public/_headers",import.meta.url),"utf8");
  const legacy=fs.readFileSync(new URL("../public/concerts.html",import.meta.url),"utf8");
  assert.match(wrangler,/run_worker_first = \[[^\]]*"\/concerts"[^\]]*"\/concerts-app\.js"/);
  assert.match(worker,/path === "\/concerts"[\s\S]*serveConcertsShell\(request, env\)/);
  assert.match(worker,/X-M98-Concerts-Shell","index"/);
  assert.match(worker,/Concerts Near You - music98\.news/);
  assert.match(worker,/https:\/\/music98\.news\/concerts/);
  assert.match(headers,/\/concerts\n  Cache-Control: no-store/);
  assert.ok(legacy.includes("Concerts Near You - music98.news"));
});


test("mobile initial map opens at world overview while desktop camera stays unchanged",()=>{
  assert.match(app,/const compactWorldView=window\.matchMedia\("\(max-width:700px\)"\)\.matches/);
  assert.match(app,/center:compactWorldView \? \[5,18\] : \[8,27\]/);
  assert.match(app,/zoom:compactWorldView \? 0 : 1\.55/);
});
test("Belfast is not mapped to the dead ND pseudo-country",()=>{
  assert.doesNotMatch(app,/ND:\["belfast"\]/);
});
test("popup uses event image and exposes merged alternate ticket links",()=>{
  assert.match(app,/if\(e\.image\)\{[\s\S]*img\.className="pop-img"; img\.src=e\.image/);
  assert.doesNotMatch(app,/const popupImage=String\(e\.artistImage/);
  assert.match(app,/Array\.isArray\(e\.ticketOptions\)/);
  assert.match(app,/alt\.className="ticket-alt"/);
});

test("concert controls keep only search and Popular/Near me",()=>{
  assert.equal(app.includes("locateBtn"),false);
  assert.equal(app.includes("radiusMenu"),false);
  const popularAt=app.indexOf("popularTab");
  const nearAt=app.indexOf("nearTab");
  assert.ok(popularAt>=0 && nearAt>popularAt);
  assert.match(app,/\.side-tabs\{[\s\S]*pointer-events:auto/);
  assert.match(app,/\.side-tab\{[\s\S]*display:inline-flex;align-items:center;justify-content:center[\s\S]*text-box:trim-both cap alphabetic/);
});

test("Near me uses resilient current-position fallbacks",()=>{
  assert.match(app,/nearTab\.addEventListener\("click",requestLocation\)/);
  assert.match(app,/window\.isSecureContext/);
  assert.match(app,/enableHighAccuracy:false,timeout:12000,maximumAge:120000/);
  assert.match(app,/enableHighAccuracy:true,timeout:18000,maximumAge:0/);
  assert.match(app,/navigator\.geolocation\.watchPosition/);
  assert.match(app,/DEFAULT_RADIUS_KM=100/);
  assert.doesNotMatch(app,/navigator\.permissions/);
});

test("verified market clicks reuse geographic verification scope",()=>{
  assert.match(app,/radiusKm:Number\(h\.radiusKm\|\|0\)/);
  assert.match(app,/Number\(f\.properties\?\.tier\)===2\?45:60/);
  assert.doesNotMatch(app,/await getPayload\(\{city:opts\.city/);
  assert.match(app,/stateCode:opts\.stateCode\|\|\"\"/);
});

test("venue popup groups strict venue identity, never coordinate proximity",()=>{
  assert.match(app,/if\(tid && eid\) return eid===tid/);
  assert.doesNotMatch(app,/sameCoords=.*0\.0008/);
});

test("visible event markers zoom before popup and stale click timers cannot reopen old context",()=>{
  assert.match(app,/function focusEventGroupOnMap\(events\)/);
  assert.match(app,/POPUP_CITY_MIN_ZOOM\+\.1/);
  assert.match(app,/activeMode!==modeAtClick \|\| areaRequestSeq!==contextAtClick/);
  assert.match(app,/focusEventGroupOnMap\(group\)/);
});

test("artist dates have TTL, partial-result feedback and stale-response guard",()=>{
  assert.match(app,/ARTIST_EVENT_CACHE_MS=5\*60\*1000/);
  assert.match(app,/Date\.now\(\)-cached\.at<ARTIST_EVENT_CACHE_MS/);
  assert.match(app,/partial:!!payload\?\.partial/);
  assert.match(app,/requestId!==areaRequestSeq \|\| expandedKey!==key \|\| activeMode!==\"artist\"/);
  assert.match(app,/Showing \"\+events\.length\+\" loaded dates of \"\+result\.total/);
});

test("concert feedback and keyboard focus stay in the results panel",()=>{
  assert.ok(app.includes("sideStatus"));
  assert.ok(app.includes("aria-live"));
  assert.match(app,/function setStatus\(message\)\{ sideStatus\.textContent=/);
  assert.match(app,/:focus-visible/);
  assert.match(app,/row\.setAttribute\("aria-expanded","false"\)/);
});
test("local search suggestions render before remote requests finish",()=>{
  assert.match(app,/if\(localArtists\.length \|\| localHubs\.length\) renderSuggestions\(\[\],localArtists,localHubs\)/);
  assert.match(app,/setTimeout\(\(\)=>controller\.abort\(\),8000\)/);
  assert.match(app,/setTimeout\(\(\)=>controller\.abort\(\),15000\)/);
});

test("map failure cannot block Popular/data boot",()=>{
  assert.match(app,/function createMapFallback\(container\)/);
  assert.match(app,/function bootConcertData\(\)/);
  assert.match(app,/bootConcertData\(\);/);
  assert.ok(app.includes("mapFallback"));
  assert.doesNotMatch(app,/querySelector\("#status"\)/);
});
test("partial area loads are labeled instead of looking complete",()=>{
  assert.match(app,/data\.partial && total>events\.length/);
  assert.match(app,/loaded concerts of/);
});

test("map failure offers an explicit retry without replacing fallback controls",()=>{
  assert.ok(app.includes("Retry map"));
  assert.match(app,/querySelector\("#mapRetry"\)\?\.addEventListener\("click",\(\)=>location\.reload\(\)\)/);
  assert.ok(app.includes("mapFallbackText"));
});

test("new search input aborts obsolete geocoding while keeping local matches immediate",()=>{
  assert.match(app,/let suggestGeocodeAbort=null/);
  assert.match(app,/suggestGeocodeAbort\?\.abort\(\)/);
  assert.match(app,/geocode\(q,true,geocodeAbort\.signal\)/);
  assert.match(app,/externalSignal\.addEventListener\("abort",abort/);
});

test("coordinate-less real concerts stay off the map but keep a Ticketmaster click target",()=>{
  assert.match(app,/function toGeoJSON\(events\)[\s\S]*Number\.isFinite\(lat\)&&Number\.isFinite\(lng\)/);
  assert.match(app,/if\(validMapEvents\(\[e\]\)\.length\)/);
  assert.match(app,/window\.open\(e\.url,\"_blank\",\"noopener\"\)/);
  assert.match(app,/return !mappable \|\| distanceKm/);
});

