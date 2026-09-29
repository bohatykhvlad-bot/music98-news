import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const page=readFileSync(new URL("../public/index.html",import.meta.url),"utf8");

test("desktop navigation uses four equal-width pill segments",()=>{
  assert.match(page,/\.nav\{[^}]*width:410px;[^}]*grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(page,/\.nav-btn\{width:100%;/);
  assert.match(page,/@media \(max-width:640px\)[\s\S]*?\.nav\{order:3;width:100%/);
});

test("Subscribe uses the same crisp press-state binder as concert tickets",()=>{
  assert.match(page,/window\.music98PillPress = window\.music98PillPress/);
  assert.match(page,/data-pill-press type="submit">Subscribe<\/button>/);
  assert.match(page,/\.press-pill\.press::before\{transform:scale\(\.92\)\}/);
  assert.match(page,/\.press-pill\.press\{font-size:13px\}/);
  assert.doesNotMatch(page,/\.press-pill\.press\{[^}]*transform:/);
});

test("verified chart artwork overrides apply even to same-day browser cache",()=>{
  assert.match(page,/CHART_ART_FIXES/);
  assert.match(page,/196873662978\.jpg\/600x600bb\.jpg/);
  assert.match(page,/886443919266\.jpg\/600x600bb\.jpg/);
  assert.match(page,/art: fixedChartArt\(t\)/);
});

test("concert bundle version is bumped after the static-map UI change",()=>{
  assert.match(page,/concerts-app\.js\?v=20260929-29/);
});
