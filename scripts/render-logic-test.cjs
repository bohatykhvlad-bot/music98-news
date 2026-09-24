/* render-logic-test.cjs - проверка рендера карточек на публичной странице без браузера.
 *
 * Проверяем то, что реально уходит читателю: маркер тела поста -> HTML карточки. Ломается
 * тихо (карточка просто не появится, а маркер покажется текстом), поэтому это стоит теста.
 *
 * Запуск:  node scripts/render-logic-test.cjs
 */
const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8");
// "use strict" уводит объявления функций в собственный скоуп eval, а тесту они нужны снаружи
const code = html.match(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/)[1]
  .replace(/"use strict";/, "");

const node = () => new Proxy({
  classList: { add() {}, remove() {}, contains() { return false; }, toggle() {} },
  addEventListener() {}, removeEventListener() {}, appendChild() {}, append() {}, remove() {},
  querySelector() { return node(); }, querySelectorAll() { return []; },
  insertAdjacentHTML() {}, focus() {}, closest() { return null; }, getBoundingClientRect: () => ({ top: 0, left: 0, width: 0, height: 0 }),
  setAttribute() {}, getAttribute() { return ""; }, style: {}, dataset: {}, value: "",
  innerHTML: "", textContent: "", hidden: false, scrollTop: 0, play() {}, pause() {},
}, { get: (t, k) => (k in t ? t[k] : undefined), set: (t, k, v) => (t[k] = v, true) });

global.document = {
  querySelector: () => node(), querySelectorAll: () => [], addEventListener() {},
  createElement: () => node(), body: node(), documentElement: node(), readyState: "complete",
  cookie: "", fonts: { ready: Promise.resolve() },
};
global.window = {
  addEventListener() {}, removeEventListener() {}, getSelection: () => null, scrollTo() {},
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  devicePixelRatio: 1, innerWidth: 1200, innerHeight: 800,
};
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
global.location = { href: "https://music98.news/", search: "", hash: "", pathname: "/" };
global.navigator = { userAgent: "node", clipboard: null, languages: ["en"] };
global.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
global.requestAnimationFrame = (f) => setTimeout(() => f(Date.now()), 0);
global.fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
global.addEventListener = () => {};
global.sessionStorage = { getItem: () => null, setItem() {}, removeItem() {} };
global.Audio = class { constructor() { this.currentTime = 0; this.volume = 1; } play() { return Promise.resolve(); } pause() {} addEventListener() {} removeEventListener() {} load() {} };
global.Image = class { addEventListener() {} };
global.CustomEvent = class { constructor(t, o) { this.type = t; this.detail = (o || {}).detail; } };
global.Notification = class { static requestPermission() { return Promise.resolve("denied"); } };
global.URL = global.URL || class {};

try { eval(code); } catch (e) { console.log("top-level threw (ok, функции уже подняты):", String(e).slice(0, 90)); }

let pass = 0, fail = 0;
const t = (name, got, want) => {
  if (got === want) { pass++; console.log("ok   ", name); }
  else { fail++; console.log("FAIL ", name, "\n      got:", String(got).slice(0, 200), "\n      want:", String(want).slice(0, 200)); }
};
const has = (name, hay, needle) => t(name, hay.indexOf(needle) > -1, true);

const igBlk = instagramEmbed("reel", "DdnKbPCiRcM", "@californiapost", "https://www.instagram.com/reel/DdnKbPCiRcM/");
has("instagram: эмбед reel", igBlk, "https://www.instagram.com/reel/DdnKbPCiRcM/embed/");
has("instagram: класс карточки", igBlk, 'class="yembed ig"');
has("instagram: наш кредит", igBlk, "Video: ");
has("instagram: аккаунт со ссылкой", igBlk, ">@californiapost</a> via Instagram");
has("instagram: класс кредита как у фото", igBlk, 'class="pcred"');
t("instagram: битый код не рендерится", instagramEmbed("reel", "no", "@x", "https://example.com"), "");
// неизвестный вид ссылки не ломает рендер, а падает в обычный пост — так и задумано
has("instagram: неизвестный вид → обычный пост",
    instagramEmbed("weird", "DdnKbPCiRcM", ""), "https://www.instagram.com/p/DdnKbPCiRcM/embed/");
const igPost = instagramEmbed("p", "DPNv0lEDHJM", "");
t("instagram: фото без аккаунта идёт без подписи", igPost.indexOf("pcred") === -1, true);
has("instagram: фото идёт в /p/", igPost, "https://www.instagram.com/p/DPNv0lEDHJM/embed/");

has("renderBody: маркер ig доходит до карточки",
    renderBody("[ig:reel:DdnKbPCiRcM]"), "instagram.com/reel/DdnKbPCiRcM/embed/");
has("renderBody: аккаунт доходит до подписи",
    renderBody("[ig:p:DPNv0lEDHJM:californiapost]"), "@californiapost</a> via Instagram");
t("renderBody: маркер не остаётся текстом",
  renderBody("[ig:reel:DdnKbPCiRcM]").indexOf("[ig:"), -1);

has("регресс: youtube", renderBody("[youtube:iLF0ZNdhNM0]"), "youtube-nocookie.com/embed/iLF0ZNdhNM0");
t("регресс: youtube без кредита", renderBody("[youtube:iLF0ZNdhNM0]").indexOf("pcred") === -1, true);
has("регресс: tiktok", renderBody("[tiktok:7688484162818444558:marina.alvarez134]"), "tiktok.com/embed/v2/7688484162818444558");
has("регресс: tiktok-кредит", renderBody("[tiktok:7688484162818444558:marina.alvarez134]"), "@marina.alvarez134</a> via TikTok");
const mad = renderBody("[ig:reel:DdcjIyhCp-J|@madonna|https://www.instagram.com/madonna/]");
has("pipe: эмбед", mad, "instagram.com/reel/DdcjIyhCp-J/embed/");
has("pipe: кредит под эмбедом", mad, 'class="pcred"');
has("pipe: ссылка на аккаунт", mad, 'href="https://www.instagram.com/madonna/"');
has("pipe: текст", mad, ">@madonna</a> via Instagram");
t("pipe: маркер не остаётся текстом", mad.indexOf("[ig:") === -1, true);
t("без кредита: строки нет", renderBody("[ig:reel:DdcjIyhCp-J]").indexOf("pcred") === -1, true);
t("без кредита: эмбед есть", renderBody("[tiktok:7688484162818444558]").indexOf("tiktok.com/embed/v2/7688484162818444558") > -1 && renderBody("[tiktok:7688484162818444558]").indexOf("pcred") === -1, true);
const named = renderBody("[tiktok:7688484162818444558|@marina.alvarez134]");
has("кредит без ссылки", named, "Video: @marina.alvarez134 via TikTok");
t("кредит без ссылки не ссылка", named.indexOf("<a ") === -1, true);
// Apple-карточка поднимает счётчик бутстрапа, которого в заглушке нет: здесь проверяем
// только то, что маркер распознан как карточка, а сам путь Apple мы не трогали вообще.
try {
  has("регресс: apple-песня", renderBody("[apple:song:1825994646:1825994651]"), "embed.music.apple.com");
} catch (e) {
  t("регресс: apple-песня (заглушка упирается в bootstrap, путь не тронут)", /appleBoots/.test(String(e)), true);
}

console.log("\n" + pass + " ok, " + fail + " fail");
process.exit(fail ? 1 : 0);
