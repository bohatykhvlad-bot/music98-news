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

test("Buy Tickets press shrinks from center like the chart play button",()=>{
  assert.match(app,/\.buy\{[^}]*transform-origin:center;scale:1;[^}]*scale \.09s ease/);
  assert.match(app,/\.buy\.press\{scale:\.92\}/);
  assert.doesNotMatch(app,/\.buy\.press::before\{[^}]*inset/);
  assert.doesNotMatch(app,/\.buy-label::before,\.buy-label::after/);
});

test("concert popup closes while zooming out below detail zoom in every mode",()=>{
  assert.match(app,/map\.on\("zoom",\(\)=>\{\n  if\(!popup\) return;\n  if\(map\.getZoom\(\)<4\.8\)\{ closePopup\(\); return; \}/);
  assert.match(app,/map\.on\("zoomend",\(\)=>\{\n  if\(!popup\) return;\n  if\(map\.getZoom\(\)<4\.8\)\{ closePopup\(\); return; \}/);
});

test("More button is centered and uses the admin press animation",()=>{
  assert.match(app,/\.tour-more\{width:fit-content;max-width:100%;[^}]*margin:8px auto 2px/);
  assert.match(app,/\.tour-more:active\{transform:scale\(\.96\);background:#fff;border-color:#8a979c;box-shadow:inset 0 2px 4px rgba\(15,30,34,\.08\)\}/);
});

test("Popular UI requires a complete Top 30 before browser caching",()=>{
  assert.match(app,/Top 30 popular artists with upcoming Ticketmaster shows\./);
  assert.match(app,/music98:concert-popular:v4/);
  assert.match(app,/cached\.artists\.length>=30/);
  assert.match(app,/data\.artists\.length<30/);
  assert.match(app,/mode:"popular",v:"popular-v4"/);
});
