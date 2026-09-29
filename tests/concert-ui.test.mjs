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
  assert.match(app,/\.buy\.press::before\{transform:scale\(\.97\)\}/);
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

test("More button keeps its existing behavior with equal vertical spacing",()=>{
  assert.match(app,/\.tour-more\{width:fit-content;max-width:100%;[^}]*margin:5px auto 5px/);
});

test("Popular UI renders any strict confirmed cache immediately while targeting Top 30",()=>{
  assert.match(app,/Popular artists with confirmed upcoming Ticketmaster shows\./);
  assert.match(app,/music98:concert-popular:v6/);
  assert.match(app,/cached\?\.version==="popular-v4"/);
  assert.match(app,/ticketmaster_event_payload_gt_0/);
  assert.match(app,/cached\.artists\.length>0/);
  assert.match(app,/cached\.artists\.every\(a=>a\?\.eventConfirmed===true && Number\(a\?\.shows\|\|0\)>0\)/);
  assert.match(app,/mode:"popular",v:"popular-v6"/);
});

test("map loading status is hidden while real statuses remain available",()=>{
  assert.match(app,/\^loading concerts\?\(\?: data\)\?\/i/);
});


test("world overview is static and restores pinned markets after zooming out",()=>{
  assert.match(app,/const STATIC_GLOBAL_MARKETS=\[/);
  assert.match(app,/const STATIC_US_STATE_CAPITALS=\[/);
  assert.match(app,/\["Dubai","AE",25\.2048,55\.2708\]/);
  assert.match(app,/\["Washington","DC",38\.9072,-77\.0369\]/);
  assert.match(app,/state-capital-labels/);
  assert.match(app,/const overviewZoom=map\.getZoom\(\)<4\.7/);
  assert.match(app,/const showHubs=activeMode==="popular" \|\| overviewZoom/);
  assert.match(app,/map\.on\("load",\(\)=>\{\n  resizeMapStable\(\);\n  addTopographicRelief\(\);\n  addLayers\(\);/);\n  assert.doesNotMatch(app,/map\.on\("load",\(\)=>\{\n  resizeMapStable\(\);\n  addLayers\(\);\n  loadHotspots\(\);/);
});

test("map has one compact reset control and no Overview or Fit results controls",()=>{
  assert.match(app,/id=\"resetMapBtn\"[^>]*>−<\/button>/);
  assert.doesNotMatch(app,/id=\"overviewBtn\"/);
  assert.doesNotMatch(app,/id=\"fitBtn\"/);
  assert.match(app,/resetMapBtn\.addEventListener\("click"/);
  assert.match(app,/radiusEl\.value="100"/);
  assert.match(app,/map\.easeTo\(\{center:\[8,27\],zoom:1\.55/);
});

test("Buy Tickets uses the shared site press binder",()=>{
  assert.match(app,/typeof window\.music98PillPress==="function"/);
  assert.doesNotMatch(app,/a\.addEventListener\("pointerdown"/);
});
