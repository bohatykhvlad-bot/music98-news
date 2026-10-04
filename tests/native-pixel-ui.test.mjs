import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const page=read("public/index.html");
const legal=read("public/legal-header.css");
const standalone=read("public/concerts.html");
const legacyMap=read("public/concerts-tab.css");
const app=read("public/concerts-app.js");
const match=app.match(/const CONCERTS_CSS=("(?:[^"\\]|\\.)*");/);
assert.ok(match,"concert CSS missing");
const css=JSON.parse(match[1]);

test("all entry points render text and Mapbox at native CSS pixel scale",()=>{
  assert.doesNotMatch(page,/html\s*\{\s*zoom:/);
  assert.doesNotMatch(legal,/zoom:/);
  assert.doesNotMatch(standalone,/html\.embedded\{zoom:|html\.embedded body\{width:96%/);
  assert.doesNotMatch(legacyMap,/104\.166667%|1\s*\/\s*\.96|html\{zoom:/);
  assert.doesNotMatch(css,/zoom:calc\(1\s*\/\s*\.96\)/);
  assert.match(page,/\.wrap\{max-width:1132px/);
  assert.match(page,/\.topbar-in\{[^}]*max-width:1132px/);
  assert.match(legal,/\.topbar-in\{[^}]*max-width:1132px/);
  assert.match(css,/\.topbar-in\{[^}]*max-width:1132px/);
});

test("top and concert pills use identical border-box vertical geometry",()=>{
  // Desktop 40px - 2*1px borders - 2*3px padding = 32px active segment.
  assert.match(page,/\.nav\{[^}]*height:40px;gap:4px;[^}]*padding:3px/);
  assert.match(page,/\.nav-btn\{[^}]*height:32px/);
  assert.match(css,/\.side-tabs\{[\s\S]*?height:40px;padding:3px;/);
  assert.match(css,/\.side-tab\{[\s\S]*?height:32px/);
  assert.equal(40-2-2*3,32);
  // Mobile 48px / 38px nav and 44px / 36px concerts use 1px+4px
  // and 1px+3px per side, respectively.
  assert.match(page,/\.nav\{order:3;width:100%;height:48px;gap:4px;padding:4px/);
  assert.match(page,/\.nav-btn\{flex:1;height:38px/);
  assert.match(css,/\.side-tabs\{height:44px\}/);
  assert.match(css,/\.side-tab\{height:36px\}/);
  assert.equal(48-2-2*4,38);
  assert.equal(44-2-2*3,36);
});

test("popular and main nav text never scale, translate or animate geometry",()=>{
  assert.match(css,/\.side-tab\{[\s\S]*?transition:background-color \.18s ease,color \.18s ease;/);
  assert.doesNotMatch(css,/\.side-tab\{[^}]*transform:/);
  assert.doesNotMatch(css,/\.side-tab\{[^}]*backdrop-filter:/);
  assert.match(page,/\.nav-btn\{[^}]*transition:background-color \.18s ease,color \.18s ease/);
  assert.match(page,/\.tab\.rise\{animation:none\}/);
});
