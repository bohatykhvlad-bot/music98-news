import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";

const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const worker = readFileSync(new URL("../worker.js", import.meta.url), "utf8");
const adsTxt = readFileSync(new URL("../public/ads.txt", import.meta.url), "utf8");
const head = html.slice(0, html.indexOf("</head>"));
const news = html.slice(html.indexOf('<section class="tab active" id="tab-news">'), html.indexOf('<section class="tab" id="tab-releases">'));
const purpleTag = /<script src="(https:\/\/cdn\.prplads\.com\/agent\.js\?publisherId=([0-9a-f]+:[0-9a-f]+))" data-pa-tag async><\/script>/g;

test("one persistent sticky bootstrap plus one visible News banner use the same PurpleAds account", () => {
  const tags = [...html.matchAll(purpleTag)];
  assert.equal(tags.length, 2);
  assert.equal(tags[0][1], tags[1][1], "sticky and banner must share exactly the same publisher ID");
  assert.equal((head.match(/data-pa-tag\b/g) || []).length, 1, "site-wide loader must be in head");
  assert.equal((news.match(/data-pa-tag\b/g) || []).length, 1, "only one in-content banner");
  assert.equal((html.match(/data-ad-position=/g) || []).length, 1, "no duplicate layout banners");
  assert.match(head, /PurpleAds automatic sticky placements/);
  assert.equal(tags[0].index < html.indexOf("</head>"), true);
  assert.equal(tags[1].index > html.indexOf('<section class="tab active" id="tab-news">'), true);
  assert.ok(head.indexOf(tagWithPublisherId(tags[0][2])) < head.length);
});
function tagWithPublisherId(publisherId) { return "publisherId=" + publisherId; }

test("News banner layout and sizes are unchanged", () => {
  const row = news.indexOf('<div class="news-heading-row">');
  const heading = news.indexOf('<h1 class="hd-t">Latest stories</h1>');
  const placement = news.indexOf('<aside class="m98-home-banner"');
  const hero = news.indexOf('<div id="heroSlot">');
  assert.ok(row !== -1 && row < heading && heading < placement && placement < hero);
  assert.match(html, /\.m98-home-banner-slot\{width:728px;height:90px;/);
  assert.match(html, /\.m98-home-banner-slot\{width:468px;height:60px\}/);
  assert.match(html, /\.m98-home-banner-slot\{width:320px;max-width:100%;height:100px\}/);
  assert.match(html, /\.m98-home-banner-slot\{width:250px;height:250px\}/);
  assert.match(html, /#tab-news \.news-heading-row\{display:flex;align-items:center;justify-content:space-between;/);
});

test("sticky initialization survives client-side navigation and direct SSR article URLs", () => {
  assert.match(html, /\.tab\{display:none;/);
  assert.match(html, /body\.articlepage main \.tab\{display:none!important\}/);
  assert.ok(head.includes("data-pa-tag async"), "sticky code must remain outside the hidden News section");
  assert.match(html, /function setTab\(t\)/);
  assert.match(html, /function showArticle\(p\)/);
  assert.match(worker, /return serveConcertsShell\(request, env\)/);
});

test("onUnfilled collapses only the News banner, never a sticky placement", () => {
  const callback = head.match(/<script>\s*window\.purpleDisplay = window\.purpleDisplay \|\| \{\};[\s\S]*?<\/script>/);
  assert.ok(callback, "onUnfilled must be defined before the inline banner tag");
  const newsBanner = { classList: { added: [], add(c) { this.added.push(c); } } };
  const win = {};
  runInNewContext(callback[0].replace(/^<script>/, "").replace(/<\/script>$/, ""), { window: win });
  win.purpleDisplay.onUnfilled({ element: { closest: selector => selector === ".m98-home-banner" ? newsBanner : null }, reason: "no-demand" });
  assert.deepEqual(newsBanner.classList.added, ["m98-ad-unfilled"]);
  win.purpleDisplay.onUnfilled({ element: { closest: () => null }, reason: "no-demand" });
  assert.deepEqual(newsBanner.classList.added, ["m98-ad-unfilled"]);
  assert.match(html, /#tab-news \.m98-home-banner\.m98-ad-unfilled\{display:none\}/);
});

test("retired ad loader and alternate publisher ID are absent from served pages", () => {
  for (const name of ["display-ads.js", "display-ads.css"]) {
    assert.equal(existsSync(new URL("../public/" + name, import.meta.url)), false, name);
  }
  const legacyConcerts = readFileSync(new URL("../public/concerts.html", import.meta.url), "utf8");
  assert.doesNotMatch(html, /m98DisplayAd|src="\/display-ads\.js|href="\/display-ads\.css/);
  assert.doesNotMatch(legacyConcerts, /m98DisplayAd|display-ads\.js|display-ads\.css|cdn\.prplads\.com/);
  assert.match(worker, /path === "\/concerts\.html"[\s\S]*?Response\.redirect\(new URL\("\/concerts", request\.url\), 301\)/);
});

test("PurpleAds verification and ads.txt are intact", () => {
  assert.match(html, /name="purpleads-verification"/);
  assert.match(adsTxt, /^purpleads\.io,\s*[^\n]+,\s*DIRECT/m);
});
