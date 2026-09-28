/* Поддерживает два файла для чарта:
 * - public/data/covers.json: immutable cover registry, song identity -> fixed artwork URL
 * - public/data/apple-names.json: Apple spelling/link/preview metadata for current rows
 *
 * Cover rule: existing cover keys are NEVER rewritten automatically.
 * For a new song identity, resolve an exact Deezer release first, then Apple as fallback.
 * Matching is strict by title + primary artist + version (remix/live/sped-up etc.).
 * Once pinned, the URL is permanent until an explicit editorial correction.
 *
 * Запуск вручную: node scripts/build-covers.mjs
 */
import fs from "node:fs";
import path from "node:path";
import dns from "node:dns";
import {
  appleCandidateCompatible,
  mergeKey,
  normTitle,
  pickAppleCandidate,
  primaryArtist,
  stripParen,
  versionSignature,
} from "../functions/lib/chart-identity.js";

dns.setDefaultResultOrder("ipv4first");

const OUT = path.resolve("public/data/covers.json");
const OUT_NAMES = path.resolve("public/data/apple-names.json");
const CHART = process.env.CHART_URL || "https://music98.news/api/top50";

const idOf = (u) => (String(u || "").match(/[?&]i=(\d+)/) || [])[1] || "";
const art600 = (u) => String(u || "").replace("100x100bb", "600x600bb").replace("100x100bb.jpg", "600x600bb.jpg");

async function deezerCover(wantedTitle, wantedArtist) {
  const q = encodeURIComponent(`${wantedArtist} ${stripParen(wantedTitle)}`.trim());
  const r = await fetch(`https://api.deezer.com/search?q=${q}&limit=25`);
  if (!r.ok) throw new Error(`Deezer ${r.status}`);
  const d = await r.json();
  const wantT = normTitle(wantedTitle);
  const wantA = primaryArtist(wantedArtist);
  const wantV = versionSignature(wantedTitle);
  const candidates = (d.data || []).filter((x) => {
    if (normTitle(x.title) !== wantT) return false;
    if (versionSignature(x.title) !== wantV) return false;
    if (wantA && primaryArtist(x.artist && x.artist.name) !== wantA) return false;
    return true;
  });
  candidates.sort((a, b) => {
    const av = versionSignature(a.album && a.album.title);
    const bv = versionSignature(b.album && b.album.title);
    const ap = av && av !== wantV ? 1 : 0;
    const bp = bv && bv !== wantV ? 1 : 0;
    return ap - bp;
  });
  const hit = candidates[0];
  return hit && hit.album
    ? (hit.album.cover_xl || hit.album.cover_big || hit.album.cover_medium || "")
    : "";
}

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

/* Canonical artwork registry.
 * Existing keys are immutable: an external catalog may change artwork later,
 * but music98 keeps the first approved cover for that song identity.
 * The daily job may only append covers for previously unseen keys.
 */
let covers = {};
try {
  const saved = JSON.parse(fs.readFileSync(OUT, "utf8"));
  if (saved && typeof saved === "object" && !Array.isArray(saved)) covers = { ...saved };
} catch {}
const lockedAtStart = new Set(Object.keys(covers));
const pinCover = (key, url) => {
  if (!key || !url || covers[key]) return false;
  covers[key] = url;
  return true;
};
const names = {};
console.log(`закреплённых обложек до сборки: ${lockedAtStart.size}`);

/* 0) Для НОВЫХ ключей сначала Deezer: artwork у песни берём из одного
   конкретного релиза и после этого замораживаем. Строгая проверка title + artist +
   version не даёт ремиксу/live/sped-up занять ключ оригинала. */
for (const t of tracks) {
  const key = mergeKey(t.title, t.artist);
  if (covers[key]) continue;
  try {
    const art = await deezerCover(t.title, t.artist);
    if (art) {
      pinCover(key, art);
      console.log(`  Deezer lock: ${t.artist} - ${t.title}`);
    }
  } catch (e) {
    console.log(`  Deezer ошибка: ${t.artist} - ${t.title}: ${e.message}`);
  }
}

/* 1) Для НОВЫХ ключей пробуем точный релиз по Apple-ID одним batch-запросом.
   Уже закреплённые covers[key] не меняются ни при каких ответах каталога. */
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
    const key = mergeKey(t.title, t.artist);
    if (covers[key]) {
      const hit = byId.get(id);
      if (hit) names[key] = appleRecord(hit);
      continue;
    }
    const hit = byId.get(id);
    if (!hit) continue;
    /* Existing Apple URLs are hints, not truth. If a row now points to a remix,
       live/sped-up version or even a different title/artist, ignore it and let
       the canonical search below repair all fields. */
    if (!appleCandidateCompatible(t.title, t.artist, hit)) {
      console.log(`  ссылка не совпадает с оригиналом: ${t.artist} - ${t.title} -> ${hit.trackName} / ${hit.collectionName || ""}`);
      continue;
    }
    pinCover(key, art600(hit.artworkUrl100));
    names[key] = appleRecord(hit);
  }
  console.log(`по Apple-ID: ${idWanted.filter(([t]) => covers[mergeKey(t.title, t.artist)]).length}/${idWanted.length} имеют закреплённую обложку`);
}

/* 2) Search only NEW rows whose exact Apple ID is missing or failed strict identity.
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
      pinCover(key, art600(hit.artworkUrl100));
      names[key] = appleRecord(hit);
    }
    console.log(`  поиск: ${hit ? "OK " : "НЕТ"} ${t.artist} - ${t.title}${hit ? ` -> ${hit.trackName} / ${String(hit.collectionName || "").slice(0, 48)}` : ""}`);
  } catch (e) {
    console.log(`  поиск: ошибка ${t.artist} - ${t.title}: ${e.message}`);
  }
}

const missing = tracks.filter((t) => !covers[mergeKey(t.title, t.artist)]);
const sorted = Object.fromEntries(Object.entries(covers).sort(([a], [b]) => a.localeCompare(b)));
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(sorted, null, 2) + "\n");
console.log(`\nв registry ${Object.keys(sorted).length} закреплённых обложек (+${Object.keys(sorted).length - lockedAtStart.size} новых) в ${path.relative(process.cwd(), OUT)}`);
console.log(`без закреплённой обложки: ${missing.length}${missing.length ? " -> " + missing.map((t) => `${t.artist} - ${t.title}`).join("; ") : ""}`);

const sortedNames = Object.fromEntries(Object.entries(names).sort(([a], [b]) => a.localeCompare(b)));
fs.writeFileSync(OUT_NAMES, JSON.stringify(sortedNames, null, 2) + "\n");
const noName = tracks.filter((t) => !names[mergeKey(t.title, t.artist)]);
console.log(`записано ${Object.keys(sortedNames).length} Apple-написаний в ${path.relative(process.cwd(), OUT_NAMES)}`);
console.log(`без Apple-написания: ${noName.length}${noName.length ? " -> " + noName.map((t) => `${t.artist} - ${t.title}`).join("; ") : ""}`);
