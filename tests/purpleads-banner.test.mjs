import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const adsTxt = readFileSync(new URL("../public/ads.txt", import.meta.url), "utf8");

test("PurpleAds has exactly one responsive ad unit", () => {
  assert.equal((html.match(/cdn\.prplads\.com\/agent\.js\?/g) || []).length, 1);
  assert.equal((html.match(/data-pa-tag\b/g) || []).length, 1);
  assert.equal((html.match(/data-ad-position=/g) || []).length, 1);
  assert.match(html, /<script src="https:\/\/cdn\.prplads\.com\/agent\.js\?publisherId=[0-9a-f]+:[0-9a-f]+" data-pa-tag async><\/script>/);
});

test("the single banner sits above the News hero and nowhere else", () => {
  const newsStart = html.indexOf('<section class="tab active" id="tab-news">');
  const placement = html.indexOf('<aside class="m98-home-banner"');
  const hero = html.indexOf('<div id="heroSlot">');
  const newsEnd = html.indexOf('<section class="tab" id="tab-releases">');
  const row = html.indexOf('<div class="news-heading-row">');
  const heading = html.indexOf('<h1 class="hd-t">Latest stories</h1>');
  assert.ok(newsStart !== -1 && newsStart < row && row < heading && heading < placement && placement < hero && hero < newsEnd);
  assert.doesNotMatch(html, /m98-ad-placement|m98DisplayAd|data-ad-position="news-between"|data-ad-position="news-bottom"/);
});

test("banner CSS provides documented desktop and mobile ad dimensions", () => {
  assert.match(html, /\.m98-home-banner-slot\{width:970px;height:250px;/);
  assert.match(html, /#tab-news \.news-heading-row\{display:flex;flex-direction:column;align-items:stretch;/);
  assert.match(html, /@media \(min-width:768px\) and \(max-width:1009px\)\{/);
  assert.match(html, /\.m98-home-banner-slot\{width:728px;height:90px\}/);
  assert.match(html, /\.m98-home-banner-slot\{width:300px;height:250px\}/);
  assert.match(html, /\.m98-home-banner-slot\{width:250px;height:250px\}/);
  assert.match(html, /\.tab\{display:none;/);
  assert.match(html, /body\.articlepage main \.tab\{display:none!important\}/);
});

test("only the live banner handles no-fill; stale multi-placement scripts never load", () => {
  assert.doesNotMatch(html, /<script[^>]+src="\/display-ads\.js/);
  assert.doesNotMatch(html, /<link[^>]+href="\/display-ads\.css/);
  assert.match(html, /window\.purpleDisplay\.onUnfilled = function \(placement\)/);
  assert.match(html, /banner\.classList\.add\("m98-ad-unfilled"\)/);
  assert.match(html, /banner\.dataset\.adResult = reason/);
  assert.match(html, /new URLSearchParams\(location\.search\)\.has\("ads-debug"\)/);
  assert.match(html, /class="m98-ad-test-status" hidden aria-live="polite"/);
  assert.match(html, /#tab-news \.m98-home-banner\.m98-ad-unfilled\{display:none\}/);
  assert.equal((html.match(/data-pa-tag\b/g) || []).length, 1);
});

test("PurpleAds verification and ads.txt declarations remain intact", () => {
  assert.match(html, /name="purpleads-verification"/);
  assert.match(adsTxt, /^purpleads\.io,\s*[^\n]+,\s*DIRECT/m);
});
