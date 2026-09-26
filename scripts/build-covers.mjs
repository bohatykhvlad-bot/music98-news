/* Собирает public/data/covers.json — обложки Apple для текущего чарта.
 *
 * Зачем: iTunes API из Cloudflare отвечает через раз (Apple блокирует egress воркера),
 * а обложка нужна всегда и ровно того релиза, на который ведёт ссылка "Listen on
 * Apple Music". Поэтому файл собирается здесь и обновляется сам:
 * .github/workflows/covers.yml гоняет этот скрипт по расписанию и коммитит результат.
 *
 * Правило подбора: сначала точный релиз по Apple-ID из ссылки (?i=...), и только если
 * ссылки нет - поиск с проверками (точное название, без ремиксов/версий, которые не
 * указаны в самом названии чарта).
 *
 * Запуск вручную: node scripts/build-covers.mjs
 */
import fs from "node:fs";
import path from "node:path";
import dns from "node:dns";

dns.setDefaultResultOrder("ipv4first");

const OUT = path.resolve("public/data/covers.json");
const CHART = process.env.CHART_URL || "https://music98.news/api/top50";

/* те же правила идентичности, что в воркере (functions/api/top50.js) */
const stripParen = (s) => String(s || "").replace(/\([^)]*\)|\[[^\]]*\]/g, " ");
const normTitle = (s) => stripParen(s).toLowerCase().replace(/[’‘]/g, "'")
  .replace(/\b(remastered|remix|single|deluxe|from)\b/g, "").replace(/[^a-z0-9]+/g, "");
const primaryArtist = (s) => String(s || "").split(/\s*(?:,|&|\/|\+| x | × | feat\.? | ft\.? | featuring | with | w\/ )\s*/i)[0]
  .toLowerCase().replace(/[^a-z0-9]+/g, "");
const mergeKey = (t, a) => `${normTitle(t)}|${primaryArtist(a)}`;
const idOf = (u) => (String(u || "").match(/[?&]i=(\d+)/) || [])[1] || "";
const isAppleArt = (u) => {
  try {
    const h = new URL(String(u || "")).hostname.toLowerCase();
    return h === "mzstatic.com" || h.endsWith(".mzstatic.com");
  } catch { return false; }
};
const art600 = (u) => String(u || "").replace("100x100bb", "600x600bb").replace("100x100bb.jpg", "600x600bb.jpg");

/* слово-вариант, которого нет в названии чарта, - признак чужого релиза (ремикс, live и т.п.).
   Границы слов обязательны: иначе "KPop Demon Hunters" ловится как "demo". */
const VARIANTS = /\b(remix|rmx|sped up|slowed|instrumental|karaoke|cover|live|acoustic|demo|edit|re-?recorded|version|acapella)\b/i;
function variantTrap(wantedTitle, candidate) {
  const want = `${candidate.trackName || ""} ${candidate.collectionName || ""}`.toLowerCase();
  return VARIANTS.test(want) && !VARIANTS.test(String(wantedTitle).toLowerCase());
}

const chart = await (await fetch(CHART + (CHART.includes("?") ? "&" : "?") + "cb=" + Date.now())).json();
const tracks = chart.tracks || [];
console.log(`в чарте ${tracks.length} треков (rev ${chart.rev || "-"})`);

const covers = {};

/* 1) точный релиз по Apple-ID из ссылки, одним batch-запросом */
const idWanted = tracks.map((t) => [t, idOf(t.url)]).filter(([, id]) => id);
if (idWanted.length) {
  const ids = [...new Set(idWanted.map(([, id]) => id))];
  const byId = new Map();
  for (let i = 0; i < ids.length; i += 50) {
    try {
      const d = await (await fetch(
        `https://itunes.apple.com/lookup?id=${ids.slice(i, i + 50).join(",")}&entity=song&country=US`
      )).json();
      for (const r of d.results || []) {
        const artwork = art600(r.artworkUrl100);
        if (r.trackId && artwork) byId.set(String(r.trackId), artwork);
      }
    } catch (e) {
      console.log(`  lookup ошибка: ${e.message}`);
    }
  }
  for (const [t, id] of idWanted) {
    const art = byId.get(id);
    if (art) covers[mergeKey(t.title, t.artist)] = art;
  }
  console.log(`по Apple-ID (точный релиз): ${idWanted.filter(([t]) => covers[mergeKey(t.title, t.artist)]).length}/${idWanted.length}`);
}

/* 2) поиском - только для строк без ссылки на Apple, с защитой от ремиксов */
for (const t of tracks) {
  if (covers[mergeKey(t.title, t.artist)]) continue;
  try {
    const term = encodeURIComponent(`${t.artist} ${stripParen(t.title)}`.trim());
    const d = await (await fetch(`https://itunes.apple.com/search?term=${term}&entity=song&limit=15&country=US`)).json();
    const wantT = normTitle(t.title);
    const wantA = primaryArtist(t.artist);
    const cand = (d.results || []).filter((r) => normTitle(r.trackName) === wantT && !variantTrap(t.title, r));
    const hit = cand.find((r) => primaryArtist(r.artistName) === wantA)
      || cand.sort((a, b) => String(a.trackName).length - String(b.trackName).length)[0];
    const art = hit && art600(hit.artworkUrl100);
    if (art) covers[mergeKey(t.title, t.artist)] = art;
    console.log(`  поиск: ${art ? "OK " : "НЕТ"} ${t.artist} - ${t.title}${hit ? ` -> ${hit.trackName} / ${String(hit.collectionName || "").slice(0, 40)}` : ""}`);
  } catch (e) {
    console.log(`  поиск: ошибка ${t.artist} - ${t.title}: ${e.message}`);
  }
}

/* 3) что уже знает живой ответ и это Apple - оставляем как есть */
for (const t of tracks) {
  const key = mergeKey(t.title, t.artist);
  if (!covers[key] && isAppleArt(t.art)) covers[key] = t.art;
}

const missing = tracks.filter((t) => !covers[mergeKey(t.title, t.artist)]);
const sorted = Object.fromEntries(Object.entries(covers).sort(([a], [b]) => a.localeCompare(b)));
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(sorted, null, 2) + "\n");
console.log(`\nзаписано ${Object.keys(sorted).length} обложек в ${path.relative(process.cwd(), OUT)}`);
console.log(`без Apple-обложки: ${missing.length}${missing.length ? " -> " + missing.map((t) => `${t.artist} - ${t.title}`).join("; ") : ""}`);
