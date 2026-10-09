import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=name=>readFileSync(new URL("../public/"+name,import.meta.url),"utf8");
const home=read("index.html");
const legal=read("legal-header.css");
const standalone=read("concerts.html");
const concertsScript=read("concerts-app.js");
const match=concertsScript.match(/const CONCERTS_CSS=("(?:[^"\\]|\\.)*");/);
assert.ok(match,"Concerts must declare embedded stylesheet");
const embedded=JSON.parse(match[1]);

test("desktop nav uses five equal centered cells with matching pill insets",()=>{
  assert.match(home,/\.topbar-in\{[^}]*grid-template-columns:1fr auto 1fr;align-items:center/);
  assert.match(home,/\.nav\{justify-self:center;width:480px;max-width:100%;display:grid;grid-template-columns:repeat\(5,minmax\(0,1fr\)\);align-items:center;height:40px;gap:4px;[^}]*padding:3px/);
  assert.match(home,/\.nav-btn\{width:100%;text-indent:var\(--ink-x,0px\);[^}]*height:32px;display:inline-flex;align-items:center;justify-content:center/);
  assert.match(home,/\.nav-btn\{position:relative;top:0\}/);
  // Border-box: 40 - 2*1 border - 2*3 inset == 32px segment.
  assert.equal(40-2-2*3,32);
});

test("mobile nav, logo row and safe header space are symmetrical",()=>{
  assert.match(home,/\.topbar-in\{gap:8px;display:flex;flex-wrap:wrap;height:auto;padding:9px 16px;/);
  assert.match(home,/\.nav\{order:3;width:100%;height:48px;gap:4px;padding:4px;/);
  assert.match(home,/\.nav-btn\{flex:1;height:38px;padding:0 3px;font-size:12px;justify-content:center;top:0\}/);
  assert.match(home,/body\{padding-top:var\(--header-h, 110px\)\}/);
  assert.doesNotMatch(home,/padding-top:calc\(var\(--header-h,[^;]*\+\s*8px/);
  assert.ok(legal.includes("padding:9px 16px"),"legal headers must match the main site");
  // Border-box: 48 - 2*1 border - 2*4 inset == 38px segment.
  assert.equal(48-2-2*4,38);
});

test("News, Releases and Chart headings share one desktop/mobile section rhythm",()=>{
  assert.match(home,/--section-heading-top:8px;/);
  assert.match(home,/--section-heading-gap:14px;/);
  assert.match(home,/\.tab\{display:none;padding:var\(--section-heading-top\) 0 0\}/);
  assert.match(home,/\.tab \.hd\{margin:0 0 var\(--section-heading-gap\)\}/);
  assert.match(home,/\.rail-wrap\{position:relative;margin-top:0\}/);
  assert.match(home,/\.hd\{margin-bottom:var\(--section-heading-gap\)\}/);
  assert.doesNotMatch(home,/\.tab\{padding-top:14px\}/);
  assert.doesNotMatch(home,/\.hd\{margin-bottom:18px\}/);
});

test("embedded Concerts matches page-heading rhythm and has no fractional pill shift",()=>{
  assert.ok(embedded.includes(".hero{margin:0 0 var(--section-heading-gap,14px);align-items:center}"));
  assert.ok(embedded.includes("text-align:left;margin-bottom:var(--section-heading-gap,14px)"));
  assert.ok(embedded.includes("height:40px;gap:4px;background:rgba(255,255,255,.55);border:1px solid rgba(15,60,64,.14);padding:3px;"));
  assert.ok(embedded.includes("top:0}"));
  assert.ok(!embedded.includes("top:.5px"));
  assert.match(home,/concerts-app\.js\?v=20261008-03/);
});

test("standalone Concerts fallback uses the same full desktop and mobile navigation geometry",()=>{
  assert.match(standalone,/\.topbar-in\{[^}]*height:55px;[^}]*grid-template-columns:1fr auto 1fr/);
  assert.match(standalone,/\.nav\{[^}]*grid-template-columns:repeat\(4,minmax\(0,1fr\)\);[^}]*height:40px;[^}]*padding:3px/);
  assert.match(standalone,/\.nav-btn\{width:100%;[^}]*height:32px;[^}]*top:0\}/);
  assert.match(standalone,/\.topbar-in\{height:auto;padding:9px 16px;display:flex;flex-wrap:wrap;gap:8px\}/);
  assert.match(standalone,/\.nav-btn\{flex:1;height:38px;padding:0 8px;font-size:13px;justify-content:center;top:0\}/);
  assert.match(standalone,/\.wrap\{padding:8px 16px 36px\}/);
});
