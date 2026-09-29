import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const page=readFileSync(new URL("../public/index.html",import.meta.url),"utf8");
const worker=readFileSync(new URL("../worker.js",import.meta.url),"utf8");

test("desktop navigation uses four equal-width pill segments",()=>{
  assert.match(page,/\.nav\{[^}]*width:410px;[^}]*grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(page,/\.nav-btn\{width:100%;/);
  assert.match(page,/@media \(max-width:640px\)[\s\S]*?\.nav\{order:3;width:100%/);
});

test("Subscribe scales its label with the pill without axis translation",()=>{
  assert.match(page,/window\.music98PillPress = window\.music98PillPress/);
  assert.match(page,/data-pill-press type="submit">Subscribe<\/button>/);
  assert.match(page,/\.press-pill\.press::before\{transform:scale\(\.98\)\}/);
  assert.match(page,/\.press-pill\.press\{font-size:13\.72px;line-height:1\}/);
  assert.doesNotMatch(page,/\.press-pill\.press\{[^}]*transform:/);
});

test("verified chart artwork overrides apply even to same-day browser cache",()=>{
  assert.match(page,/CHART_ART_FIXES/);
  assert.match(page,/196873662978\.jpg\/600x600bb\.jpg/);
  assert.match(page,/886443919266\.jpg\/600x600bb\.jpg/);
  assert.match(page,/art: fixedChartArt\(t\)/);
});

test("concert bundle version is bumped after the static-map UI change",()=>{
  assert.match(page,/concerts-app\.js\?v=20260929-32/);
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


test("corrected chart art is enforced at final row render",()=>{
  assert.match(page,/const fixedArt = fixedChartArt\(r\)/);
  assert.match(page,/const art = fixedArt \? esc\(fixedArt\) : presetCover/);
  assert.match(page,/\$\{fixedArt \? "" : " data-need=/);
  assert.match(page,/title\.startsWith\("loser"\) && artist\.includes\("tame impala"\)/);
});

test("clean Chart and Concerts routes are no-store",()=>{
  assert.match(worker,/\^\\\/\(\?:releases\|chart\|charts\|concerts\)/);
  assert.match(worker,/headers\.set\("Cache-Control", "no-store, max-age=0"\)/);
});


test("same-day chart cache is an instant paint and always revalidates",()=>{
  assert.match(page,/const DAILYKEY = "music98news_daily_v31"/);
  assert.match(page,/const hasFreshCache=!!\(cached/);
  assert.match(page,/fetch\(u,\{cache:"no-store",headers:\{"Cache-Control":"no-cache"\}\}\)/);
  assert.match(page,/rev=31/);
});
