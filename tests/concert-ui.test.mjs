import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app=readFileSync(new URL("../public/concerts-app.js",import.meta.url),"utf8");

test("map popup and right-side event rows render at identical physical typography",()=>{
  // The page is 96% on desktop while the map shell is compensated back to 100%.
  // Popup variables are therefore 96% of the right-side CSS values so the
  // physical on-screen sizes are identical after the two zoom factors combine.
  const base={
    date:11.5,main:12.5,sub:11,art:42,dateCol:54,gap:8,padY:9,padX:10,radius:14
  };
  const popup={
    date:11.04,main:12,sub:10.56,art:40.32,dateCol:51.84,gap:7.68,padY:8.64,padX:9.6,radius:13.44
  };
  for(const key of Object.keys(base)) assert.equal(Number((base[key]*.96).toFixed(2)),popup[key]);

  assert.match(app,/--event-date-size:11\.5px/);
  assert.match(app,/--event-main-size:12\.5px/);
  assert.match(app,/--event-sub-size:11px/);
  assert.match(app,/\.mapboxgl-popup\{--event-date-size:11\.04px;--event-main-size:12px;--event-sub-size:10\.56px/);
  assert.match(app,/\.event-date\{font-size:var\(--event-date-size\)/);
  assert.match(app,/\.venue-event-date\{font-size:var\(--event-date-size\)/);
  assert.match(app,/\.event-city\{display:block;font-size:var\(--event-main-size\)/);
  assert.match(app,/\.venue-event-name\{display:block;font-size:var\(--event-main-size\)/);
});

test("Buy Tickets press enlarges from center without transform or opacity interpolation",()=>{
  assert.match(app,/\.buy\.press::before\{inset:-1px -1px\}/);
  assert.match(app,/\.buy-label::before,\.buy-label::after\{[^}]*transition:none/);
  assert.match(app,/\.buy-label::before\{font-size:13px/);
  assert.match(app,/\.buy-label::after\{font-size:14px/);
  assert.doesNotMatch(app,/\.buy\.press\{[^}]*(?:transform|scale|translate)/);
});

test("Popular UI is configured for Top 30",()=>{
  assert.match(app,/Top 30 popular artists with upcoming Ticketmaster shows\./);
  assert.match(app,/music98:concert-popular:v3/);
});
