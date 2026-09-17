const SIZE = 50;
const LAUNCH = Date.UTC(2026, 8, 17);

function chartWeek() {
  return Math.max(0, Math.floor((Date.now() - LAUNCH) / 86400000 / 7));
}
function tenureKey(title, artist) {
  return `${String(title || "").trim().toLowerCase()}|${String(artist || "").trim().toLowerCase()}`;
}
async function applyTenure(env, tracks) {
  const week = chartWeek();
  let ten = { launch: "2026-09-17", week, keys: [], seen: {} };
  if (env && env.DESK) {
    const v = await env.DESK.get("tenure", { type: "json" });
    if (v && v.seen) ten = v;
  }
  const prevKeys = ten.keys || [];
  const seen = ten.seen || {};
  const first = !prevKeys.length;
  const rolled = first || ten.week !== week;
  const newKeys = [];
  tracks.forEach((track, i) => {
    const key = tenureKey(track.title, track.artist);
    newKeys.push(key);
    const prevPos = prevKeys.indexOf(key);
    const rec = seen[key] || { weeks: 0 };
    if (first) {
      track.weeks = 1;
      track.delta = "0";
    } else if (!rolled) {
      track.weeks = rec.weeks || 1;
      track.delta = prevPos < 0 ? "new" : String(prevPos - i);
    } else {
      track.weeks = prevPos >= 0 ? (rec.weeks || 0) + 1 : 1;
      track.delta = prevPos < 0 ? "new" : String(prevPos - i);
    }
    seen[key] = { weeks: track.weeks, lastPos: i, lastWeek: week };
  });
  ten.week = week;
  ten.keys = newKeys;
  ten.seen = seen;
  if (env && env.DESK) await env.DESK.put("tenure", JSON.stringify(ten));
  return tracks;
}
const UA = "Mozilla/5.0 (compatible; music98/1.0)";

function stripParen(s) {
  return String(s || "").replace(/\([^)]*\)|\[[^\]]*\]/g, " ");
}
function normTitle(s) {
  const t = stripParen(s)
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/\b(remastered|remix|single|deluxe|from)\b/g, "")
    .replace(/[^a-z0-9]+/g, "");
  return t;
}
function primaryArtist(s) {
  return String(s || "")
    .split(/\s*(?:,|&|\/|\+| x | × | feat\.? | ft\.? | featuring | with | w\/ )\s*/i)[0]
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}
function mergeKey(title, artist) {
  return `${normTitle(title)}|${primaryArtist(artist)}`;
}
function points(pos) {
  const n = Number(pos);
  if (!n || n < 1 || n > SIZE) return 0;
  return SIZE + 1 - n;
}

async function getText(url) {
  const r = await fetch(url, {
    headers: { "User-Agent": UA },
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) throw new Error(String(r.status));
  return r.text();
}
async function getJson(url) {
  return JSON.parse(await getText(url));
}

function parseApple(data) {
  return ((data.feed && data.feed.results) || []).slice(0, SIZE).map((item, i) => ({
    pos: i + 1,
    title: item.name || "",
    artist: item.artistName || "",
    url: item.url || "",
    art: (item.artworkUrl100 || "").replace("100x100bb", "600x600bb"),
    year: (item.releaseDate || "").slice(0, 4),
    prev: "",
  })).filter((r) => r.title && r.artist);
}

function parseDeezer(data) {
  return (data.data || []).slice(0, SIZE).map((item, i) => ({
    pos: i + 1,
    title: item.title || "",
    artist: (item.artist && item.artist.name) || "",
    url: "",
    art: (item.album && (item.album.cover_xl || item.album.cover_medium)) || "",
    year: "",
    prev: item.preview || "",
  })).filter((r) => r.title && r.artist);
}

function parseSpotify(html) {
  const rows = [];
  const re = /<tr><td class="np">(\d+)<\/td>\s*<td class="np">[^<]*<\/td>\s*<td class="text mp"><div>(.*?)<\/div><\/td>/gs;
  let m;
  while ((m = re.exec(html))) {
    const pos = Number(m[1]);
    if (pos > SIZE) continue;
    const text = m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    const cut = text.indexOf(" - ");
    if (cut < 0) continue;
    rows.push({
      pos,
      title: text.slice(cut + 3).trim(),
      artist: text.slice(0, cut).trim(),
      url: "",
      art: "",
      year: "",
      prev: "",
    });
  }
  return rows.sort((a, b) => a.pos - b.pos).slice(0, SIZE);
}

function parseBillboard(html) {
  const parts = html.split("o-chart-results-list-row //");
  const seen = new Set();
  const rows = [];
  for (const chunk of parts.slice(1)) {
    const tm = chunk.match(/id="title-of-a-story"[^>]*>\s*([^<]+)/);
    const am = chunk.match(/href="https:\/\/www\.billboard\.com\/artist\/[^"]+"[^>]*>\s*([^<]+)/);
    if (!tm || !am) continue;
    const title = tm[1].replace(/&#039;/g, "'").trim();
    const artist = am[1].trim();
    if (!title || !artist) continue;
    const key = mergeKey(title, artist);
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({ pos: rows.length + 1, title, artist, url: "", art: "", year: "", prev: "" });
    if (rows.length >= SIZE) break;
  }
  return rows;
}

function ingest(bucket, src, rows) {
  for (const row of rows) {
    const key = mergeKey(row.title, row.artist);
    const rec = bucket.get(key) || {
      title: row.title,
      artist: row.artist,
      ranks: {},
      url: "",
      art: "",
      prev: "",
      year: "",
    };
    rec.ranks[src] = row.pos;
    if (src === "A") {
      rec.title = row.title;
      rec.artist = row.artist;
    }
    if (row.url && !rec.url) rec.url = row.url;
    if (row.art && !rec.art) rec.art = row.art;
    if (row.prev && !rec.prev) rec.prev = row.prev;
    if (row.year && !rec.year) rec.year = row.year;
    bucket.set(key, rec);
  }
}

async function safe(label, fn) {
  try {
    const rows = await fn();
    return rows || [];
  } catch {
    return [];
  }
}

export async function buildTop50() {
  const [apple, spotify, deezer, billboard] = await Promise.all([
    safe("A", async () => parseApple(await getJson("https://rss.applemarketingtools.com/api/v2/us/music/most-played/50/songs.json"))),
    safe("S", async () => parseSpotify(await getText("https://kworb.net/spotify/country/global_daily.html"))),
    safe("D", async () => parseDeezer(await getJson("https://api.deezer.com/chart/0/tracks?limit=50"))),
    safe("B", async () => parseBillboard(await getText("https://www.billboard.com/charts/hot-100/"))),
  ]);
  const bucket = new Map();
  ingest(bucket, "A", apple);
  ingest(bucket, "S", spotify);
  ingest(bucket, "D", deezer);
  ingest(bucket, "B", billboard);
  const ranked = [...bucket.values()]
    .sort((a, b) => {
      const sa = ["A", "S", "D", "B"].reduce((n, k) => n + points(a.ranks[k]), 0);
      const sb = ["A", "S", "D", "B"].reduce((n, k) => n + points(b.ranks[k]), 0);
      if (sb !== sa) return sb - sa;
      const ca = ["A", "S", "D", "B"].filter((k) => a.ranks[k]).length;
      const cb = ["A", "S", "D", "B"].filter((k) => b.ranks[k]).length;
      if (cb !== ca) return cb - ca;
      const ba = Math.min(...["A", "S", "D", "B"].map((k) => a.ranks[k]).filter(Boolean), 99);
      const bb = Math.min(...["A", "S", "D", "B"].map((k) => b.ranks[k]).filter(Boolean), 99);
      if (ba !== bb) return ba - bb;
      return a.title.localeCompare(b.title);
    })
    .slice(0, SIZE);
  const tracks = ranked.map((rec, i) => ({
    rank: i + 1,
    title: rec.title,
    artist: rec.artist,
    url: rec.url || "",
    art: rec.art || "",
    prev: rec.prev || "",
    year: rec.year || "",
  }));
  return {
    updated: new Date().toISOString().slice(0, 10),
    launch: "2026-09-17",
    week: chartWeek() + 1,
    tracks,
  };
}

function top50Response(payload) {
  return new Response(JSON.stringify(payload), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600",
    },
  });
}

async function bakedTop50(request) {
  try {
    const r = await fetch(new URL("/data/top50.json", request.url));
    if (r.ok) return await r.json();
  } catch {}
  return null;
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

export async function onRequestGet({ env, request }) {
  const today = new Date().toISOString().slice(0, 10);
  if (env && env.DESK) {
    try {
      const cached = await env.DESK.get("top50", { type: "json" });
      if (cached && cached.updated === today && Array.isArray(cached.tracks) && cached.tracks.length) {
        return top50Response(cached);
      }
    } catch {}
  }
  try {
    const payload = await withTimeout(buildTop50(), 12000);
    payload.tracks = await applyTenure(env, payload.tracks);
    if (env && env.DESK && payload.tracks && payload.tracks.length) {
      try { await env.DESK.put("top50", JSON.stringify(payload)); } catch {}
    }
    if (payload.tracks && payload.tracks.length) return top50Response(payload);
  } catch (err) {
    const baked = await bakedTop50(request);
    if (baked && Array.isArray(baked.tracks) && baked.tracks.length) return top50Response(baked);
    return new Response(JSON.stringify({ error: "rebuild_failed", detail: String(err) }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
  const baked = await bakedTop50(request);
  if (baked && Array.isArray(baked.tracks) && baked.tracks.length) return top50Response(baked);
  return new Response(JSON.stringify({ error: "rebuild_failed" }), {
    status: 502,
    headers: { "Content-Type": "application/json" },
  });
}
