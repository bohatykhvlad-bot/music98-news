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

test("TikTok is lazy-loaded and hidden until the player reports ready",()=>{
  assert.match(page,/title="TikTok"[^>]*loading="lazy"/);
  assert.match(desk,/title="TikTok"[^>]*loading="lazy"/);
  assert.match(page,/\.yembed\.tk iframe\{opacity:0\}/);
  assert.match(page,/\.yembed\.tk\.is-ready iframe\{opacity:1\}/);
  assert.match(desk,/\.composer \.yembed\.tk iframe\{opacity:0\}/);
  assert.match(desk,/\.composer \.yembed\.tk\.is-ready iframe\{opacity:1\}/);
});

test("TikTok server and playback errors are replaced by a local fallback",()=>{
  for(const src of [page,desk]){
    assert.match(src,/msg\.type === "onPlayerError"/);
    assert.match(src,/TikTok is temporarily unavailable\./);
    assert.match(src,/>Retry<\/button>/);
    assert.match(src,/>Open on TikTok<\/a>/);
    assert.match(src,/setTimeout\(\(\)=>\{ if\(!box\.classList\.contains\("is-ready"\)\) tiktokSetFailed\(box\); \}, 12000\)/);
  }
});

test("TikTok player keeps a clean vertical 9:16 frame rather than the legacy measured card height",()=>{
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
