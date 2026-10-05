import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read = name => readFileSync(new URL("../public/" + name,import.meta.url),"utf8");
const home=read("index.html"),standalone=read("concerts.html");
const script=read("concerts-app.js");
const encoded=script.match(/const CONCERTS_CSS=("(?:[^"\\]|\\.)*");/);
assert.ok(encoded,"Concerts shadow stylesheet missing");
const embedded=JSON.parse(encoded[1]);

test("main navigation text has no filters, transforms, moving hover transitions or overpainted glass",()=>{
  const root=home.match(/\.topbar\{([^}]*)\}/)?.[1]||"";
  const glass=home.match(/\.topbar-glass\{([\s\S]*?)\n\}/)?.[1]||"";
  const content=home.match(/\.topbar-in\{([^}]*)\}/)?.[1]||"";
  const pill=home.match(/\.nav-btn\{([^}]*)\}/)?.[1]||"";
  assert.match(root,/backdrop-filter:none;-webkit-backdrop-filter:none/);
  assert.match(glass,/z-index:0/);
  assert.match(glass,/pointer-events:none/);
  assert.match(content,/z-index:1/);
  assert.doesNotMatch(content,/backdrop-filter:blur|filter:blur|transform:/);
  assert.match(pill,/transition:background-color \.18s ease,color \.18s ease/);
  assert.doesNotMatch(pill,/(?:backdrop-)?filter:|transform:|translate:|will-change:/);
  assert.match(home,/\.nav-btn\{position:relative;top:0\}/);
});

test("switching news/releases/chart keeps the short entrance rise without fading text",()=>{
  assert.match(home,/\.tab\.rise\{animation:rise \.28s ease both\}/);
  assert.match(home,/@keyframes rise\{from\{transform:translateY\(10px\)\}to\{transform:none\}\}/);
  assert.doesNotMatch(home,/@keyframes rise\{[^}]*opacity:/);
  assert.match(home,/s\.classList\.toggle\("rise", on\)/);
});

test("standalone and embedded concert glass stays behind the actual text layer",()=>{
  for(const sheet of [standalone,embedded]){
    assert.match(sheet,/\.topbar\{[^}]*background:transparent;border:0;backdrop-filter:none;-webkit-backdrop-filter:none\}/);
    assert.match(sheet,/\.topbar::before\{[^}]*position:absolute;inset:0;z-index:0;pointer-events:none;[^}]*backdrop-filter:blur/);
    assert.match(sheet,/\.topbar-in\{position:relative;z-index:1;/);
    assert.match(sheet,/\.nav-btn\{[^}]*transition:background-color \.18s ease,color \.18s ease;[^}]*top:0\}/);
  }
});
