/* Собирает public/data/covers.json (обложки) и public/data/apple-names.json
 * (написание названия и артистов) для текущего чарта - всё из Apple.
 *
 * Зачем: iTunes API из Cloudflare отвечает через раз (Apple блокирует egress воркера),
 * а на сайте нужны и обложка, и написание ровно того релиза, на который ведёт ссылка
 * "Listen on Apple Music". Поэтому файлы собираются здесь и обновляются сами:
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
import {
  appleCandidateCompatible,
  mergeKey,
  pickAppleCandidate,
  stripParen,
} from "../functions/lib/chart-identity.js";

dns.setDefaultResultOrder("ipv4first");

const OUT = path.resolve("public/data/covers.json");
const OUT_NAMES = path.resolve("public/data/apple-names.json");
const CHART = process.env.CHART_URL || "https://music98.news/api/top50";

const idOf = (u) => (String(u || "").match(/[?&]i=(\d+)/) || [])[1] || "";
const isAppleArt = (u) => {
  try {
    const h = new URL(String(u || "")).hostname.toLowerCase();
    return h === "mzstatic.com" || h.endsWith(".mzstatic.com");
  } catch { return false; }
};
const art600 = (u) => String(u || "").replace("100x100bb", "600x600bb").replace("100x100bb.jpg", "600x600bb.jpg");

/* одна запись Apple на песню: имя, ссылка, превью, год. Воркер носит этот файл
   в бандле и берёт данные отсюда, когда Apple из Cloudflare не отвечает. */
function appleRecord(hit) {
  const album = String(hit.collectionId || "");
  const track = String(hit.trackId || "");
  const url = album && track ? `https://music.apple.com/us/album/${album}?i=${track}` : (hit.trackViewUrl || "");
  return {
    title: hit.trackName || "",
    artist: hit.artistName || "",
    url,
    prev: hit.previewUrl || "",
    year: String(hit.releaseDate || "").slice(0, 4),
  };
}

const chart = await (await fetch(CHART + (CHART.includes("?") ? "&" : "?") + "cb=" + Date.now())).json();
const tracks = chart.tracks || [];
console.log(`в чарте ${tracks.length} треков (rev ${chart.rev || "-"})`);

const covers = {};
const names = {};

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
        if (r.trackId && artwork) byId.set(String(r.trackId), r);
      }
    } catch (e) {
      console.log(`  lookup ошибка: ${e.message}`);
    }
  }
  for (const [t, id] of idWanted) {
    const hit = byId.get(id);
    if (!hit) continue;
    /* Existing Apple URLs are hints, not truth. If a row now points to a remix,
       live/sped-up version or even a different title/artist, ignore it and let
       the canonical search below repair all fields. */
    if (!appleCandidateCompatible(t.title, t.artist, hit)) {
      console.log(`  ссылка не совпадает с оригиналом: ${t.artist} - ${t.title} -> ${hit.trackName} / ${hit.collectionName || ""}`);
      continue;
    }
    const key = mergeKey(t.title, t.artist);
    covers[key] = art600(hit.artworkUrl100);
    names[key] = appleRecord(hit);
  }
  console.log(`по Apple-ID (точный релиз): ${idWanted.filter(([t]) => covers[mergeKey(t.title, t.artist)]).length}/${idWanted.length}`);
}

/* 2) Search only rows whose exact Apple ID is missing or failed strict identity.
   This keeps the blast radius small and avoids iTunes rate limits. The search
   matcher still enforces title + primary artist + exact version signature. */
for (const t of tracks) {
  const key = mergeKey(t.title, t.artist);
  if (covers[key]) continue;
  try {
    const term = encodeURIComponent(`${t.artist} ${stripParen(t.title)}`.trim());
    const d = await (await fetch(`https://itunes.apple.com/search?term=${term}&entity=song&limit=25&country=US`)).json();
    const hit = pickAppleCandidate(t.title, t.artist, d.results || []);
    if (hit) {
      covers[key] = art600(hit.artworkUrl100);
      names[key] = appleRecord(hit);
    }
    console.log(`  поиск: ${hit ? "OK " : "НЕТ"} ${t.artist} - ${t.title}${hit ? ` -> ${hit.trackName} / ${String(hit.collectionName || "").slice(0, 48)}` : ""}`);
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

const sortedNames = Object.fromEntries(Object.entries(names).sort(([a], [b]) => a.localeCompare(b)));
fs.writeFileSync(OUT_NAMES, JSON.stringify(sortedNames, null, 2) + "\n");
const noName = tracks.filter((t) => !names[mergeKey(t.title, t.artist)]);
console.log(`записано ${Object.keys(sortedNames).length} Apple-написаний в ${path.relative(process.cwd(), OUT_NAMES)}`);
console.log(`без Apple-написания: ${noName.length}${noName.length ? " -> " + noName.map((t) => `${t.artist} - ${t.title}`).join("; ") : ""}`);
