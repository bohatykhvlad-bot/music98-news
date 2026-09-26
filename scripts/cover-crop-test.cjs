/* cover-crop-test.cjs - the desk previews and the live page must draw the SAME
 * crop of a cover.
 *
 * The desk (public/admin-desk.html) mirrors the public page's cover math
 * (index.html: fitCover / coverFocus / cardFocus) in four places: the Main
 * stage, the Card stage, the small preview next to it and the 40px story-list
 * thumb. Those copies have drifted twice - the card pane (and the list thumbs)
 * kept drawing the raw cardZoom (1.89 for Tinashe) while the live fitCover
 * clamps every cover to the site's zoom cap, so one editor showed two
 * different pictures and the owner could not tell which one the visitor gets.
 *
 * This test loads BOTH scripts in node (no browser), pushes the same post and
 * the same box through both, and compares the resulting geometry pixel by
 * pixel - including zooms above the cap, which is where they drifted.
 *
 * Запуск:  node scripts/cover-crop-test.cjs
 */
const fs = require("fs");
const path = require("path");

process.on("unhandledRejection", () => {});

/* ---------- minimal DOM/browser stand-in (same shape as render-logic-test) ---------- */
const node = () => new Proxy({
  classList: { add() {}, remove() {}, contains() { return false; }, toggle() {} },
  addEventListener() {}, removeEventListener() {}, appendChild() {}, append() {}, remove() {},
  querySelector() { return node(); }, querySelectorAll() { return []; },
  insertAdjacentHTML() {}, focus() {}, closest() { return null; },
  getBoundingClientRect: () => ({ top: 0, left: 0, width: 0, height: 0 }),
  setAttribute() {}, getAttribute() { return ""; }, style: {}, dataset: {}, value: "",
  innerHTML: "", textContent: "", hidden: false, scrollTop: 0, play() {}, pause() {},
}, { get: (t, k) => (k in t ? t[k] : undefined), set: (t, k, v) => (t[k] = v, true) });

global.document = {
  querySelector: () => node(), querySelectorAll: () => [], addEventListener() {},
  createElement: () => node(), body: node(), documentElement: node(), readyState: "complete",
  cookie: "", fonts: { ready: Promise.resolve() }, execCommand() { return true; },
  caretPositionFromPoint: () => null, elementFromPoint: () => null, currentScript: null,
};
global.window = {
  addEventListener() {}, removeEventListener() {}, getSelection: () => null, scrollTo() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  devicePixelRatio: 1, innerWidth: 1200, innerHeight: 800, location: { href: "https://music98.news/" },
};
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
global.location = { href: "https://music98.news/", search: "", hash: "", pathname: "/" };
global.navigator = { userAgent: "node", clipboard: null, languages: ["en"] };
global.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
global.requestAnimationFrame = f => setTimeout(() => f(Date.now()), 0);
global.cancelAnimationFrame = () => {};
global.fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
global.addEventListener = () => {};
global.sessionStorage = { getItem: () => null, setItem() {}, removeItem() {} };
global.Audio = class { constructor() { this.currentTime = 0; this.volume = 1; } play() { return Promise.resolve(); } pause() {} addEventListener() {} removeEventListener() {} load() {} };
global.Image = class { addEventListener() {} };
global.CustomEvent = class { constructor(t, o) { this.type = t; this.detail = (o || {}).detail; } };
global.Notification = class { static requestPermission() { return Promise.resolve("denied"); } };
global.URL = global.URL || class {};
global.history = { replaceState() {}, pushState() {} };
global.FileReader = class { readAsDataURL() {} };

/* ---------- run an inline <script> and hand back what it declared ----------
 * Function declarations of a non-strict direct eval land in the caller's
 * scope; const/let (crop, siteZoom, ...) stay in the eval's own scope, so the
 * probe below - appended INSIDE the eval - is the only way to read them. */
function loadScript(file, picks) {
  const html = fs.readFileSync(file, "utf8");
  const m = html.match(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/);
  if (!m) throw new Error("no inline script in " + file);
  /* the probe goes FIRST: the page's boot code may throw on the last line
     (no browser here) and would then never reach a trailing probe */
  const probe = `
;globalThis.__probe = (() => {
  const get = f => { try { return f(); } catch (e) { return null; } };
  return {
    get crop(){ return get(() => crop); },
    get cropMode(){ return get(() => cropMode); },
    get siteZoom(){ return get(() => siteZoom); },
    get cap(){ return get(() => SITE_ZOOM_CAP); },
  };
})();`;
  const code = probe + m[1].replace(/"use strict";/, "");
  // eslint-disable-next-line no-new-func
  const run = new Function("picks", "code", `
    try { eval(code); } catch (e) { /* top-level boot code needs a real browser */ }
    const out = {};
    for (const name of picks) {
      let v; try { v = eval(name); } catch (e) { v = undefined; }
      out[name] = typeof v === "function" ? v : undefined;
    }
    out.__probe = globalThis.__probe; delete globalThis.__probe;
    return out;
  `);
  return run(picks, code);
}

const site = loadScript(path.join(__dirname, "..", "public", "index.html"),
  ["fitCover", "coverFocus", "coverZoom", "cardFocus", "cardZoom"]);
const desk = loadScript(path.join(__dirname, "..", "public", "admin-desk.html"),
  ["fitCover", "cardFx", "lockFx", "setCover", "setCropMode"]);

let pass = 0, fail = 0;
const t = (name, got, want) => {
  if (got === want) { pass++; }
  else { fail++; console.log("FAIL ", name, "\n      got:", String(got).slice(0, 220), "\n      want:", String(want).slice(0, 220)); }
};
const near = (a, b) => Math.abs(Number(a) - Number(b)) < 1e-6;

for (const [name, mod, fn] of [["site", site, "fitCover"], ["desk", desk, "fitCover"]]) {
  if (typeof mod[fn] !== "function") { console.log("FAIL  " + name + " script did not load (" + fn + " missing)"); fail++; }
}
if (fail) { console.log("\n" + fail + " FAILED"); process.exit(1); }

/* ---------- geometry helpers ---------- */
function geometry(style) {
  const tr = /translate3?d?\(\s*(-?[\d.]+)px,\s*(-?[\d.]+)px/.exec(style.transform || "");
  return [style.width, style.height, tr ? tr[1] : "?", tr ? tr[2] : "?"].join(" ");
}
/* the live page: fitCover(img) reads the img's own data-fx/fy/zoom */
function siteGeom(iw, ih, bw, bh, fx, fy, zoom) {
  const img = { naturalWidth: iw, naturalHeight: ih, parentElement: { clientWidth: bw, clientHeight: bh },
    dataset: { fx: String(fx), fy: String(fy), zoom: String(zoom) }, style: {} };
  site.fitCover(img);
  return geometry(img.style);
}
/* the desk: fitCover(img, fx, fy, zoom) takes the crop explicitly */
function deskGeom(iw, ih, bw, bh, fx, fy, zoom) {
  const img = { naturalWidth: iw, naturalHeight: ih, parentElement: { clientWidth: bw, clientHeight: bh }, style: {} };
  desk.fitCover(img, fx, fy, zoom);
  return geometry(img.style);
}

/* ---------- 1. the two copies of the math must agree, guard included ---------- */
const boxes = [[543, 543, "card 1:1"], [960, 540, "main 16:9"], [40, 40, "40px thumb"]];
const sources = [[2933, 4400, "portrait 2:3"], [4000, 2250, "landscape 16:9"], [1200, 1200, "square"]];
const focuses = [[0.5, 0.5], [0.46, 0.59], [0.5, 0.06], [0, 1], [1, 0], [0.1, 0.9]];
const zooms = [1, 1.2, 1.6, 1.61, 1.73, 1.86, 1.89, 2.63, 6, 9];
let checked = 0, bad = 0;
for (const [iw, ih, sname] of sources) {
  for (const [bw, bh, bname] of boxes) {
    for (const [fx, fy] of focuses) {
      for (const z of zooms) {
        checked++;
        const a = siteGeom(iw, ih, bw, bh, fx, fy, z), b = deskGeom(iw, ih, bw, bh, fx, fy, z);
        if (a !== b) {
          bad++;
          if (bad <= 3) console.log("     differs:", sname, bname, "focus", fx, fy, "zoom", z, "\n       site:", a, "\n       desk:", b);
        }
      }
    }
  }
}
t("cover math: site fitCover == desk fitCover (" + checked + " combinations, zoom to 9)", bad, 0);

/* a tight card must survive the trip: the owner's rule is "the head fills
   55-65% of the window", so zoom 2.63 has to arrive as 2.63 */
t("tight card: zoom 2.63 is drawn at 2.63",
  siteGeom(2933, 4400, 543, 543, 0.5, 0.34, 2.63),
  deskGeom(2933, 4400, 543, 543, 0.5, 0.34, 2.63));
t("tight card: not silently widened",
  siteGeom(2933, 4400, 543, 543, 0.5, 0.34, 2.63) !== siteGeom(2933, 4400, 543, 543, 0.5, 0.34, 1.6), true);

/* the desk's guard must equal the guard the live page applies */
t("zoom guard: desk siteZoom(99) is the live guard", near(desk.__probe.siteZoom(99), 8), true);
t("zoom guard: cap constant matches the helper", desk.__probe.cap, desk.__probe.siteZoom(99));
t("zoom guard: live fitCover stops growing there",
  siteGeom(2933, 4400, 960, 540, 0.5, 0.5, 99),
  siteGeom(2933, 4400, 960, 540, 0.5, 0.5, desk.__probe.siteZoom(99)));

/* the card's x is the main crop's x unless the pill unlocked it: a stored
   lockX is an old copy and must not move either surface any more */
const locked = { cover: { kind: "img", pos: "40% 30%", zoom: 1, cardY: 0.5, cardZoom: 1, lockX: 0.9 } };
t("card x: a stale lockX is ignored (live)", site.cardFocus(locked).x, 0.4);
t("card x: a stale lockX is ignored (desk)", (() => {
  desk.setCover("/photos/u-r1.jpg", locked.cover.pos, 1, 0.5, 1, undefined);
  return desk.cardFx();
})(), 0.4);
t("card x: cardX still wins over the main x", site.cardFocus(Object.assign({}, locked, { cover: Object.assign({}, locked.cover, { cardX: 0.74 }) })).x, 0.74);
/* missing / null card fields fall back the same way on both sides */
const bare = { cover: { kind: "img", pos: "30% 70%", zoom: 1.4, cardY: null, cardZoom: null, cardX: "" } };
t("fallbacks: the page takes the main crop", [
  site.cardFocus(bare).x, site.cardFocus(bare).y, site.cardZoom(bare)
].join(","), "0.3,0.7,1.4");
t("fallbacks: the desk takes the same", (() => {
  desk.setCover("/photos/u-r1.jpg", bare.cover.pos, bare.cover.zoom, bare.cover.cardY, bare.cover.cardZoom, bare.cover.cardX);
  const c = desk.__probe.crop;
  return [c.x, c.cardY, c.cardZoom, desk.cardFx()].join(",");
})(), "0.3,0.7,1.4,0.3");
/* lockX stays in the payload as a mirror of pos.x for browsers on the old page */
t("save: lockX is written as the main x",
  /lockX:\s*Math\.round\(crop\.x\*100\)\/100/.test(fs.readFileSync(path.join(__dirname, "..", "public", "admin-desk.html"), "utf8")), true);

/* ---------- 2. every saved post: what the desk draws == what the visitor gets ---------- */
const data = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "public", "data", "desk.json"), "utf8"));
const posts = (data.posts || data).filter(p => p.cover && p.cover.kind === "img");
posts.forEach((p, i) => {
  const c = p.cover;
  // load the post into the desk exactly like fillForm() does
  desk.setCover("/" + c.src, c.pos, c.zoom, c.cardY, c.cardZoom, c.cardX);
  const crop = desk.__probe.crop;
  const [iw, ih] = i % 2 ? [4000, 2250] : [2933, 4400];

  /* Card: the desk's card pane (card mode, vertical-only) vs the live card */
  desk.setCropMode("card");
  const cf = site.cardFocus(p), cz = site.cardZoom(p);
  t("post " + p.id + ": card focus x", desk.cardFx(), Math.min(1, Math.max(0, cf.x)));
  t("post " + p.id + ": card y", crop.cardY, Math.min(1, Math.max(0, cf.y)));
  t("post " + p.id + ": card crop pixels",
    deskGeom(iw, ih, 543, 543, desk.cardFx(), crop.cardY, crop.cardZoom),
    siteGeom(iw, ih, 543, 543, cf.x, cf.y, cz));

  /* the mini next to the stage mirrors that pane: same pixels */
  t("post " + p.id + ": mini card == card pane",
    deskGeom(iw, ih, 543, 543, desk.cardFx(), crop.cardY, desk.__probe.siteZoom(crop.cardZoom)),
    deskGeom(iw, ih, 543, 543, desk.cardFx(), crop.cardY, crop.cardZoom));

  /* Main: the desk's main stage vs the live hero / article cover */
  const mf = site.coverFocus(p), mz = site.coverZoom(p);
  t("post " + p.id + ": main crop pixels",
    deskGeom(iw, ih, 960, 540, crop.x, crop.y, crop.zoom),
    siteGeom(iw, ih, 960, 540, mf.x, mf.y, mz));
});

console.log("posts checked:", posts.length);
console.log(fail ? "\n" + fail + " FAILED, " + pass + " ok" : "\nall " + pass + " checks ok");
process.exit(fail ? 1 : 0);
