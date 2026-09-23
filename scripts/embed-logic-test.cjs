/* embed-logic-test.js - проверка логики единого поля вставки без браузера.
 *
 * Зачем: у деска нет сборки и тестов, а функции разбора ссылок - это то место, где ошибка
 * тихо ломает пост (маркер уедет в KV кривым и карточка не отрендерится). Скрипт загружает
 * настоящий <script> из public/admin-desk.html с заглушкой DOM, поэтому проверяется живой
 * код, а не его копия в тесте.
 *
 * Запуск:  node scripts/embed-logic-test.js
 */
const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(path.join(__dirname, "..", "public", "admin-desk.html"), "utf8");
const code = html.match(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/)[1];

const node = () => new Proxy({
  classList: { add() {}, remove() {}, contains() { return false; }, toggle() {} },
  addEventListener() {}, removeEventListener() {}, appendChild() {}, remove() {},
  querySelector() { return node(); }, querySelectorAll() { return []; },
  insertAdjacentHTML() {}, focus() {}, click() {}, setAttribute() {}, getAttribute() { return ""; },
  style: {}, dataset: {}, value: "", innerHTML: "", textContent: "", scrollTop: 0,
}, {
  get(t, k) { return k in t ? t[k] : undefined; },
  set(t, k, v) { t[k] = v; return true; },
});

global.document = {
  querySelector: () => node(), querySelectorAll: () => [], addEventListener() {},
  createElement: () => node(), body: node(), documentElement: node(),
  readyState: "complete",
};
global.window = { addEventListener() {}, getSelection: () => null, matchMedia: () => ({ matches: false, addEventListener() {} }), scrollTo() {} };
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
global.location = { href: "https://music98.news/admin-desk" };
global.fetch = () => Promise.resolve({ json: () => Promise.resolve({ results: [] }) });

try { eval(code); } catch (e) { console.log("top-level threw (ok, функции уже подняты):", String(e).slice(0, 80)); }

let pass = 0, fail = 0;
const t = (name, got, want) => {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w) { pass++; console.log("ok   ", name); }
  else { fail++; console.log("FAIL ", name, "\n      got:", g, "\n      want:", w); }
};

t("instagram reel", parseInstagram("https://www.instagram.com/reel/DdnKbPCiRcM/?igsh=xyz"),
  { kind: "reel", code: "DdnKbPCiRcM", handle: "" });
t("instagram reelS (мобильная ссылка)", parseInstagram("https://www.instagram.com/reels/DdnKbPCiRcM/"),
  { kind: "reel", code: "DdnKbPCiRcM", handle: "" });
t("instagram post", parseInstagram("https://instagram.com/p/DPNv0lEDHJM/"),
  { kind: "p", code: "DPNv0lEDHJM", handle: "" });
t("instagram tv", parseInstagram("https://www.instagram.com/tv/Bxxxxxxxxxx/"),
  { kind: "tv", code: "Bxxxxxxxxxx", handle: "" });
t("instagram: профиль не ссылка на пост", parseInstagram("https://www.instagram.com/californiapost/"), null);
t("instagram: сторис не встраиваются", parseInstagram("https://www.instagram.com/stories/californiapost/1234567890/"), null);
t("instagram: мусор", parseInstagram("https://example.com/reel/DdnKbPCiRcM/"), null);

t("единое поле: youtube", detectEmbed("https://youtu.be/iLF0ZNdhNM0?t=90"), { kind: "youtube", id: "iLF0ZNdhNM0", start: 90 });
t("единое поле: youtube watch", detectEmbed("https://www.youtube.com/watch?v=iLF0ZNdhNM0"), { kind: "youtube", id: "iLF0ZNdhNM0", start: 0 });
t("единое поле: tiktok + аккаунт", detectEmbed("https://www.tiktok.com/@marina.alvarez134/video/7688484162818444558"),
  { kind: "tiktok", id: "7688484162818444558", handle: "marina.alvarez134" });
t("единое поле: короткая tiktok-ссылка распознана как короткая", detectEmbed("https://vm.tiktok.com/ZMabc123/"), { kind: "tiktok", short: true });
t("единое поле: instagram", detectEmbed("https://www.instagram.com/reel/DdnKbPCiRcM/"),
  { kind: "instagram", igKind: "reel", code: "DdnKbPCiRcM", handle: "" });
t("единое поле: instagram-пост", detectEmbed("https://www.instagram.com/p/DPNv0lEDHJM/"),
  { kind: "instagram", igKind: "p", code: "DPNv0lEDHJM", handle: "" });
t("единое поле: мусор не проходит", detectEmbed("https://example.com/x"), null);
t("единое поле: apple НЕ перехватываем (свой диалог с токеном)", detectEmbed("https://music.apple.com/us/album/ruby/1234567890"), null);

const src = instagramSrc("reel", "DdnKbPCiRcM");
t("адрес эмбеда instagram", src, "https://www.instagram.com/reel/DdnKbPCiRcM/embed/");
t("адрес эмбеда instagram для фото", instagramSrc("p", "DPNv0lEDHJM"), "https://www.instagram.com/p/DPNv0lEDHJM/embed/");

const blk = instagramBlock("reel", "DdnKbPCiRcM", "californiapost");
t("блок: маркер с аккаунтом", /data-instagram="reel:DdnKbPCiRcM:californiapost"/.test(blk), true);
t("блок: наш кредит назван", /Video: <a href="https:\/\/www\.instagram\.com\/reel\/DdnKbPCiRcM\/"[^>]*>@californiapost<\/a> via Instagram/.test(blk), true);
t("блок: класс карточки", /class="blk yembed ig"/.test(blk), true);
const blkNoAcc = instagramBlock("p", "DPNv0lEDHJM", "");
t("блок без аккаунта: маркер без хвоста", /data-instagram="p:DPNv0lEDHJM"/.test(blkNoAcc), true);
t("блок без аккаунта: подписи нет", /tkcred/.test(blkNoAcc), false);

const ytBlk = youtubeBlock("iLF0ZNdhNM0", 0);
t("youtube-блок не тронут", /data-youtube="iLF0ZNdhNM0"/.test(ytBlk), true);
const ttBlk = tiktokBlock("7688484162818444558", "marina.alvarez134");
t("tiktok-блок с кредитом цел", /data-tiktok="7688484162818444558:marina.alvarez134"/.test(ttBlk), true);
t("apple с партнёрским токеном объявлен", typeof appleSrc === "function", true);

console.log("\n" + pass + " ok, " + fail + " fail");
process.exit(fail ? 1 : 0);
