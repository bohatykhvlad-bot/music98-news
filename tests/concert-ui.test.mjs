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
  assert.match(app,/\.buy\.press \.buy-label\{font-size:12\.5px\}/);
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
  assert.match(app,/music98:concert-popular:v6/);
  assert.match(app,/cached\?\.version==="popular-v4"/);
  assert.match(app,/ticketmaster_event_payload_gt_0/);
  assert.match(app,/cached\.artists\.length>0/);
  assert.match(app,/mode:"popular",v:"popular-v6"/);
  assert.match(app,/sideSub\.textContent="";/);
  assert.doesNotMatch(app,/Popular artists with confirmed upcoming Ticketmaster shows\./);
});

test("map uses only the daily verified market snapshot",()=>{
  assert.doesNotMatch(app,/STATIC_GLOBAL_MARKETS/);
  assert.doesNotMatch(app,/STATIC_US_STATE_CAPITALS/);
  assert.match(app,/const MARKET_CACHE_KEY="music98:concert-markets:v1"/);
  assert.match(app,/mode:"markets",v:"concert-markets-v1"/);
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
