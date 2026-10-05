import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const page=readFileSync(new URL("../public/index.html",import.meta.url),"utf8");
const desk=readFileSync(new URL("../public/admin-desk.html",import.meta.url),"utf8");

test("TikTok embeds use the official player/v1 endpoint everywhere",()=>{
  assert.match(page,/https:\/\/www\.tiktok\.com\/player\/v1\//);
  assert.match(desk,/https:\/\/www\.tiktok\.com\/player\/v1\//);
  assert.doesNotMatch(page,/tiktok\.com\/embed\/v2\//);
  assert.doesNotMatch(desk,/tiktok\.com\/embed\/v2\//);
});

test("TikTok iframe is visible immediately and lazy-loaded without a ready gate",()=>{
  assert.match(page,/title="TikTok"[^>]*loading="lazy"/);
  assert.match(desk,/title="TikTok"[^>]*loading="lazy"/);
  assert.doesNotMatch(page,/\.yembed\.tk iframe\{opacity:0\}/);
  assert.doesNotMatch(desk,/\.composer \.yembed\.tk iframe\{opacity:0\}/);
  assert.doesNotMatch(page,/_tkTimer|12000/);
  assert.doesNotMatch(desk,/_tkTimer|12000/);
});

test("TikTok fallback only replaces the iframe after a real player error",()=>{
  for(const src of [page,desk]){
    assert.match(src,/msg\.type === "onPlayerError"/);
    assert.match(src,/TikTok couldn't be loaded\./);
    assert.match(src,/>Retry<\/button>/);
    assert.match(src,/>Open on TikTok<\/a>/);
    assert.match(src,/classList\.add\("is-failed"\)/);
    assert.match(src,/classList\.remove\("is-failed"\)/);
  }
  assert.match(page,/\.yembed\.tk\.is-failed iframe\{display:none\}/);
  assert.match(desk,/\.composer \.yembed\.tk\.is-failed iframe\{display:none\}/);
});

test("TikTok fallback controls use the site's cyan hover fill and no press transform",()=>{
  assert.match(page,/\.tk-retry:hover,\.tk-open:hover\{background:var\(--accent\);border-color:var\(--accent\);color:#03282b\}/);
  assert.match(page,/\.tk-retry:active,\.tk-open:active\{transform:none\}/);
  assert.match(desk,/\.composer \.tk-retry:hover,\.composer \.tk-open:hover\{background:var\(--accent\);border-color:var\(--accent\);color:#03282b\}/);
  assert.match(desk,/\.composer \.tk-retry:active,\.composer \.tk-open:active\{transform:none\}/);
});

test("TikTok uses the same visual footprint as YouTube/photo embeds, rotated vertically",()=>{
  assert.match(page,/\.yembed\{[^}]*max-width:660px/);
  assert.match(page,/\.yembed\.tk\{max-width:292px\}/);
  assert.match(desk,/\.composer \.yembed\{max-width:520px/);
  assert.match(desk,/\.composer \.yembed\.tk\{max-width:230px\}/);
});

test("TikTok player keeps a clean vertical 9:16 frame",()=>{
  assert.match(page,/\.yembed\.tk \.ytbox\{aspect-ratio:9\/16;height:auto;padding-bottom:0/);
  assert.match(desk,/\.composer \.yembed\.tk \.ytbox\{aspect-ratio:9\/16;height:auto;padding-bottom:0/);
  assert.doesNotMatch(page,/padding-bottom:calc\(160% \+ 75px\)/);
  assert.doesNotMatch(desk,/padding-bottom:calc\(160% \+ 75px\)/);
});

test("public article and editor both bind TikTok player messages after rendering",()=>{
  assert.match(page,/bindTikTokPlayers\(page\)/);
  assert.match(desk,/bindTikTokPlayers\(\$\("#composer"\)\)/);
  assert.match(desk,/node\.matches\("\.yembed\.tk"\)\) bindTikTokPlayer\(node\)/);
  assert.match(page,/event\.origin !== "https:\/\/www\.tiktok\.com"/);
  assert.match(desk,/event\.origin !== "https:\/\/www\.tiktok\.com"/);
});
