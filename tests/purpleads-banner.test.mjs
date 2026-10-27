import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

// The owner removed the PurpleAds integration on 16.10.2026 (commit 523414a6):
// the agent script, the verification meta tag, the News banner and its styles
// are gone from the served pages, and the published ads.txt was deleted
// (commit fdef6174). This file guards that removal instead of the old setup.
//
// The site must not grow the ad code back silently, and it must not serve a
// seller file that no longer exists.

const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const worker = readFileSync(new URL("../worker.js", import.meta.url), "utf8");
const legacyConcerts = existsSync(new URL("../public/concerts.html", import.meta.url))
  ? readFileSync(new URL("../public/concerts.html", import.meta.url), "utf8")
  : "";
const adsTxtPath = new URL("../public/ads.txt", import.meta.url);
const hasPublishedAdsTxt = existsSync(adsTxtPath);
const adsTxt = hasPublishedAdsTxt ? readFileSync(adsTxtPath, "utf8") : "";

test("the served pages carry no PurpleAds agent script, verification tag or banner", () => {
  assert.doesNotMatch(html, /cdn\.prplads\.com\/agent\.js/);
  assert.doesNotMatch(html, /name="purpleads-verification"/);
  assert.doesNotMatch(html, /data-pa-tag/);
  assert.doesNotMatch(html, /m98-home-banner/);
  assert.doesNotMatch(html, /purpleDisplay/);
  assert.doesNotMatch(legacyConcerts, /cdn\.prplads\.com|purpleDisplay|data-pa-tag/);
});

test("the retired ad loader and alternate publisher ID are absent from served pages", () => {
  for (const name of ["display-ads.js", "display-ads.css"]) {
    assert.equal(existsSync(new URL("../public/" + name, import.meta.url)), false, name);
  }
  assert.doesNotMatch(html, /m98DisplayAd|src="\/display-ads\.js|href="\/display-ads\.css/);
  assert.match(worker, /path === "\/concerts\.html"[\s\S]*?Response\.redirect\(new URL\("\/concerts", request\.url\), 301\)/);
});

test("a published ads.txt still names PurpleAds as a direct seller", { skip: !adsTxt && "no public/ads.txt is published" }, () => {
  assert.match(adsTxt, /^purpleads\.io,\s*[^\n]+,\s*DIRECT/m);
});
