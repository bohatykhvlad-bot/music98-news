import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const news = html.slice(
  html.indexOf('<section class="tab active" id="tab-news">'),
  html.indexOf('<section class="tab" id="tab-releases">')
);

test("Adsterra test banner appears exactly once between News hero and card rail", () => {
  const hero = news.indexOf('<div id="heroSlot"></div>');
  const ad = news.indexOf('<aside class="m98-adsterra-test"');
  const rail = news.indexOf('<div class="rail-wrap">');
  assert.ok(hero >= 0 && hero < ad && ad < rail);
  assert.equal((html.match(/class="m98-adsterra-test"/g) || []).length, 1);
  assert.equal((html.match(/bauval\.org\/22\//g) || []).length, 1);
  assert.match(news, /'key': '1b2bdaf2af56b266a4126700feac4cf2'/);
  assert.match(news, /'format': 'iframe'/);
  assert.match(news, /'height': 90/);
  assert.match(news, /'width': 728/);
});

test("fixed-size desktop ad is never requested on phone screens or article routes", () => {
  assert.match(news, /window\.matchMedia\("\(min-width: 768px\)"\)\.matches/);
  assert.match(news, /location\.pathname === "\/"/);
  assert.match(news, /location\.pathname === "\/news"/);
  assert.match(html, /@media \(max-width:767px\)\{#tab-news \.m98-adsterra-test\{display:none\}\}/);
  assert.match(news, /document\.write\('<scr' \+ 'ipt src=/);
});

test("existing PurpleAds inventory remains unchanged", () => {
  assert.equal((html.match(/data-pa-tag async/g) || []).length, 2);
  assert.equal((html.match(/data-ad-position=/g) || []).length, 1);
  assert.match(news, /<aside class="m98-home-banner"/);
});
