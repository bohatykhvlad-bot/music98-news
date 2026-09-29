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
