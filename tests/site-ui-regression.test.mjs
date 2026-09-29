import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const page=readFileSync(new URL("../public/index.html",import.meta.url),"utf8");
const press=readFileSync(new URL("../public/ui-press.js",import.meta.url),"utf8");
const worker=readFileSync(new URL("../worker.js",import.meta.url),"utf8");
const appleWorkflow=readFileSync(new URL("../.github/workflows/apple-data.yml",import.meta.url),"utf8");
const covers=JSON.parse(readFileSync(new URL("../public/data/covers.json",import.meta.url),"utf8"));
const corrections=JSON.parse(readFileSync(new URL("../public/data/cover-corrections.json",import.meta.url),"utf8"));
const baked=JSON.parse(readFileSync(new URL("../public/data/top50.json",import.meta.url),"utf8"));

test("desktop top navigation uses equal-width pills like mobile",()=>{
  assert.match(page,/\.nav\{[^}]*width:430px;[^}]*justify-content:stretch/);
  assert.match(page,/\.nav-btn\{flex:1 1 0;min-width:0;/);
  assert.match(page,/@media \(max-width:640px\)[\s\S]*?\.nav-btn\{flex:1;/);
});

test("newsletter Subscribe uses the shared crisp pill press primitive",()=>{
  assert.match(page,/data-m98-press data-m98-press-mode="pill"><span class="m98-press-label">Subscribe<\/span>/);
  assert.match(page,/--m98-press-scale:\.92;--m98-press-font:14px;--m98-press-font-pressed:13px/);
  assert.match(page,/\/ui-press\.js\?v=20260929-1/);
  assert.match(press,/data-m98-press-mode="pill"/);
  assert.match(press,/\.m98-pressed::before/);
  assert.match(press,/font-size:var\(--m98-press-font-pressed/);
});

test("chart browser cache is busted and live fetch bypasses HTTP cache",()=>{
  assert.match(page,/music98news_daily_v29/);
  assert.match(page,/fetch\(u,\{cache:"no-store",headers:\{"Cache-Control":"no-cache"\}\}\)/);
});

test("known remix-art regressions are pinned to approved original artwork",()=>{
  assert.equal(covers["loser|tameimpala"],corrections["loser|tameimpala"].art);
  assert.equal(covers["getlucky~v:edit|daftpunk"],corrections["getlucky~v:edit|daftpunk"].art);
  assert.match(corrections["loser|tameimpala"].art,/196873662978\.jpg\/600x600bb\.jpg$/);
  assert.match(corrections["getlucky~v:edit|daftpunk"].reason,/never use remix artwork/i);
  const loser=(baked.tracks||[]).find(t=>String(t.title).toLowerCase()==="loser" && String(t.artist).toLowerCase().includes("tame impala"));
  assert.ok(loser);
  assert.equal(loser.art,corrections["loser|tameimpala"].art);
  assert.match(page,/CHART_COVER_FIXES=\[/);
});

test("Apple cover workflow is scheduled/manual only and accepts explicit corrections",()=>{
  assert.doesNotMatch(appleWorkflow,/\n  push:/);
  assert.match(appleWorkflow,/schedule:/);
  assert.match(appleWorkflow,/workflow_dispatch:/);
  assert.match(appleWorkflow,/cover-corrections\.json/);
  assert.match(appleWorkflow,/approved editorial cover correction/);
});

test("scheduled Worker no longer runs capital or global hotspot scans",()=>{
  const scheduled=worker.slice(worker.indexOf("async scheduled"));
  assert.match(scheduled,/refreshPopularSnapshot/);
  assert.match(scheduled,/refreshPopularTourSnapshots/);
  assert.doesNotMatch(scheduled,/refreshHotspotSnapshot/);
  assert.doesNotMatch(scheduled,/refreshCapitalEventSnapshots/);
});

test("concert bundle stays uncacheable and versioned",()=>{
  assert.match(worker,/path === "\/concerts-app\.js"[\s\S]*?Cache-Control", "no-store, max-age=0"/);
  assert.match(page,/\/concerts-app\.js\?v=20260929-29/);
});
