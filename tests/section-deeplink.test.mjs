import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const site = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");

function segment(start, end) {
  const i = site.indexOf(start);
  assert.ok(i >= 0, "Missing routing fragment " + start);
  const j = site.indexOf(end, i);
  assert.ok(j > i, "Missing routing fragment ending " + end);
  return site.slice(i, j + (end === "</script>" ? 0 : end.length));
}
const head = new Function("location", "document", segment("/* A direct section URL", "</script>"));
const startup = new Function("location", "document", "route", "loadPublishedDesk",
  segment("/* Route every top-level section", "loadPublishedDesk();"));

function simulate(pathname, hash = "") {
  let routes = 0, desk = 0;
  const root = { dataset: {}, removeAttribute(name) {
    if (name === "data-m98-initial-tab") delete this.dataset.m98InitialTab;
  }};
  const document = { documentElement: root };
  const location = { pathname, hash };
  head(location, document);
  const pendingSection = root.dataset.m98InitialTab;
  startup(location, document, () => { routes++; }, () => { desk++; });
  return { routes, desk, pendingSection, after: root.dataset.m98InitialTab };
}

test("F5 deep links activate a section before the asynchronous editorial desk", () => {
  for (const [path, section] of [
    ["/releases", "releases"], ["/chart", "charts"],
    ["/charts", "charts"], ["/discover", "discover"],
    ["/concerts", "concerts"], ["/releases/", "releases"],
    ["/discover/", "discover"]
  ]) {
    const x = simulate(path);
    assert.equal(x.routes, 1, path);
    assert.equal(x.pendingSection, section, path);
    assert.equal(x.after, undefined, path);
    assert.equal(x.desk, 1, path);
  }
});

test("legacy tab hashes still route without waiting for /api/desk", () => {
  for (const t of ["releases", "charts", "discover", "concerts"]) {
    const x = simulate("/", "#" + t);
    assert.equal(x.routes, 1, t);
    assert.equal(x.pendingSection, t);
  }
});

test("home and article routes are left to the existing article/desk router", () => {
  for (const path of ["/", "/releases/example-album", "/some-news-article"]) {
    const x = simulate(path);
    assert.equal(x.routes, 0, path);
    assert.equal(x.desk, 1, path);
    assert.equal(x.pendingSection, undefined, path);
  }
});

test("preflight styling prevents the default News tab from flashing", () => {
  assert.match(site, /html\[data-m98-initial-tab\] #tab-news\{display:none!important\}/);
  assert.match(site, /html\[data-m98-initial-tab="releases"\] #tab-releases/);
  assert.match(site, /html\[data-m98-initial-tab="charts"\] #tab-charts/);
  assert.match(site, /html\[data-m98-initial-tab="discover"\] #tab-discover/);
});
