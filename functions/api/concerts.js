const TM_EVENTS_ROOT = "https://app.ticketmaster.com/discovery/v2/events.json";
const KWORB_ARTISTS_URL = "https://kworb.net/spotify/listeners.html";

const HOTSPOT_SCAN_CELLS = {
  americas: [
    [40,-74,620],[34,-118,720],[42,-91,780],[30,-97,820],[27,-81,620],
    [49,-123,720],[45,-74,700],[20,-99,850],[-23,-46,900],[-34,-58,900]
  ],
  europe: [
    [54,-3,620],[50,3,560],[52,10,560],[59,17,720],[41,-4,650],
    [44,10,520],[48,20,650],[42,24,560],[50,31,620],[39,33,700]
  ],
  mena: [
    [41,29,460],[38,27,480],[39,35,620],[25,55,760],[31,35,520],
    [30,31,720],[-26,28,850],[-1,36,900],[6,3,900]
  ],
  apac: [
    [36,139,650],[37,127,600],[23,114,760],[1,104,850],[14,121,650],
    [-34,151,900],[-32,116,900],[-37,175,720],[19,73,900],[13,100,700]
  ]
};
const KWORB_FALLBACK = [
  "Bruno Mars","Rihanna","Justin Bieber","The Weeknd","Taylor Swift","Lady Gaga","Drake","Coldplay",
  "Bad Bunny","Ariana Grande","Shakira","Katy Perry","Michael Jackson","David Guetta","Maroon 5","Ed Sheeran",
  "Pitbull","Billie Eilish","Dua Lipa","Calvin Harris","Eminem","J Balvin","Kanye West","Kendrick Lamar",
  "Post Malone","Sia","KAROL G","Olivia Rodrigo","SZA","Black Eyed Peas","Beyoncé","Lana Del Rey",
  "Daddy Yankee","Harry Styles","Miley Cyrus","Tame Impala","Travis Scott","Sean Paul","Adele","Justin Timberlake",
  "Shawn Mendes","Linkin Park","Chris Brown","Marshmello","Ellie Goulding","Arctic Monkeys","Zara Larsson",
  "Shreya Ghoshal","Doja Cat","Halsey","Sabrina Carpenter","Alicia Keys","Rauw Alejandro","Madonna","Sam Smith",
  "Elton John","sombr","Arijit Singh","Ozuna","JAŸ-Z"
]

function json(data, status = 200, extra = {}) {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": status === 200 ? "public, max-age=60, s-maxage=600" : "no-store",
    ...extra,
  });
  return new Response(JSON.stringify(data), { status, headers });
}

function finite(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function geohash(lat, lon, precision = 8) {
  const base32 = "0123456789bcdefghjkmnpqrstuvwxyz";
  let latMin = -90, latMax = 90, lonMin = -180, lonMax = 180;
  let even = true, bit = 0, ch = 0, out = "";
  while (out.length < precision) {
    if (even) {
      const mid = (lonMin + lonMax) / 2;
      if (lon >= mid) { ch = (ch << 1) | 1; lonMin = mid; } else { ch <<= 1; lonMax = mid; }
    } else {
      const mid = (latMin + latMax) / 2;
      if (lat >= mid) { ch = (ch << 1) | 1; latMin = mid; } else { ch <<= 1; latMax = mid; }
    }
    even = !even;
    bit++;
    if (bit === 5) {
      out += base32[ch];
      bit = 0;
      ch = 0;
    }
  }
  return out;
}

function bestImage(images) {
  const list = Array.isArray(images) ? images.filter(x => x && x.url) : [];
  const nonFallback = list.filter(x => !x.fallback);
  const pool = nonFallback.length ? nonFallback : list;
  pool.sort((a, b) => (Number(b.width || 0) * Number(b.height || 0)) - (Number(a.width || 0) * Number(a.height || 0)));
  return pool[0]?.url || "";
}

function bestArtistImage(images) {
  const list = Array.isArray(images) ? images.filter(x => x && x.url) : [];
  const nonFallback = list.filter(x => !x.fallback);
  const pool = nonFallback.length ? nonFallback : list;
  pool.sort((a, b) => {
    const ar = String(a.ratio || "");
    const br = String(b.ratio || "");
    const ap = ar === "4_3" ? 3 : ar === "3_2" ? 2 : ar === "16_9" ? 1 : 0;
    const bp = br === "4_3" ? 3 : br === "3_2" ? 2 : br === "16_9" ? 1 : 0;
    if (bp !== ap) return bp - ap;
    return (Number(b.width || 0) * Number(b.height || 0)) - (Number(a.width || 0) * Number(a.height || 0));
  });
  return pool[0]?.url || "";
}

function normalizeEvent(e) {
  const venue = e?._embedded?.venues?.[0] || {};
  const attractions = Array.isArray(e?._embedded?.attractions) ? e._embedded.attractions : [];
  const attraction = attractions[0] || {};
  const lat = finite(venue?.location?.latitude);
  const lng = finite(venue?.location?.longitude);
  if (lat == null || lng == null) return null;
  return {
    id: String(e.id || ""),
    name: String(e.name || attraction.name || "Concert"),
    artist: String(attraction.name || e.name || "Concert"),
    attractionId: String(attraction.id || ""),
    attractionIds: attractions.map(a => String(a?.id || "")).filter(Boolean),
    url: String(e.url || ""),
    image: bestImage(e.images),
    artistImage: bestArtistImage(attraction.images) || bestImage(e.images),
    date: String(e?.dates?.start?.localDate || ""),
    time: String(e?.dates?.start?.localTime || ""),
    dateTime: String(e?.dates?.start?.dateTime || ""),
    timezone: String(e?.dates?.timezone || venue?.timezone || ""),
    status: String(e?.dates?.status?.code || ""),
    venue: String(venue.name || ""),
    city: String(venue?.city?.name || ""),
    state: String(venue?.state?.name || venue?.state?.stateCode || ""),
    country: String(venue?.country?.name || venue?.country?.countryCode || ""),
    countryCode: String(venue?.country?.countryCode || ""),
    lat,
    lng,
    onSaleStart: String(e?.sales?.public?.startDateTime || ""),
    onSaleEnd: String(e?.sales?.public?.endDateTime || ""),
  };
}

function upcomingIso() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function baseEventUrl(apiKey) {
  const tm = new URL(TM_EVENTS_ROOT);
  tm.searchParams.set("apikey", apiKey);
  tm.searchParams.set("classificationName", "music");
  tm.searchParams.set("includeTest", "no");
  tm.searchParams.set("includeTBA", "no");
  tm.searchParams.set("includeTBD", "no");
  tm.searchParams.set("locale", "en-us,en,*");
  tm.searchParams.set("startDateTime", upcomingIso());
  return tm;
}

async function tmJson(url) {
  let res;
  try {
    res = await fetch(url.toString(), {
      headers: { "Accept": "application/json", "User-Agent": "music98.news/1.0" },
    });
  } catch {
    throw Object.assign(new Error("ticketmaster_unavailable"), { status: 502 });
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    const err = new Error("ticketmaster_error");
    err.status = res.status;
    err.detail = detail.slice(0, 300);
    throw err;
  }
  return res.json();
}

function decodeHtml(s) {
  return String(s || "")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/\s+/g, " ")
    .trim();
}

async function kworbArtists() {
  try {
    const r = await fetch(KWORB_ARTISTS_URL, {
      headers: {
        "Accept": "text/html,application/xhtml+xml",
        "User-Agent": "music98.news concert discovery/1.0",
      },
    });
    if (!r.ok) throw new Error("kworb_http_" + r.status);
    const html = await r.text();
    const artists = [];
    const seen = new Set();

    const rows = html.match(/<tr\b[\s\S]*?<\/tr>/gi) || [];
    for (const row of rows) {
      const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(m => decodeHtml(m[1]));
      if (cells.length < 3) continue;
      const rank = Number(String(cells[0]).replace(/[^0-9]/g, ""));
      const name = String(cells[1] || "").trim();
      const listeners = Number(String(cells[2]).replace(/[^0-9]/g, ""));
      if (!rank || !name || !listeners) continue;
      const key = normName(name);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      artists.push({ name, rank, listeners });
    }

    artists.sort((a,b)=>a.rank-b.rank);
    return artists.length >= 10
      ? { artists, source: "spotify_monthly_listeners" }
      : { artists: KWORB_FALLBACK.map((name,i)=>({name,rank:i+1,listeners:0})), source: "spotify_monthly_fallback" };
  } catch {
    return { artists: KWORB_FALLBACK.map((name,i)=>({name,rank:i+1,listeners:0})), source: "spotify_monthly_fallback" };
  }
}

function normName(s) {
  return String(s || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase();
}

async function validatePopularArtist(apiKey, name, popularityRank, listeners) {
  const tm = baseEventUrl(apiKey);
  tm.searchParams.set("keyword", name);
  tm.searchParams.set("size", "20");
  tm.searchParams.set("sort", "relevance,desc");

  const raw = await tmJson(tm);
  const wanted = normName(name);
  const events = raw?._embedded?.events || [];

  for (const rawEvent of events) {
    const attractions = Array.isArray(rawEvent?._embedded?.attractions) ? rawEvent._embedded.attractions : [];
    const exact = attractions.find(a => normName(a?.name) === wanted);
    if (!exact) continue;
    const event = normalizeEvent(rawEvent);
    if (!event) continue;
    return {
      id: String(exact.id || ""),
      name: String(exact.name || name),
      image: bestArtistImage(exact.images) || event.artistImage || event.image,
      popularityRank,
      listeners,
      firstDate: event.date,
    };
  }
  return null;
}

async function popularPayload(apiKey) {
  const ranking = await kworbArtists();
  const candidates = ranking.artists.slice(0, 42);
  const found = [];

  for (let i = 0; i < candidates.length && found.length < 10; i += 6) {
    const chunk = candidates.slice(i, i + 6);
    const checked = await Promise.all(chunk.map(a =>
      validatePopularArtist(apiKey, a.name, a.rank, a.listeners).catch(() => null)
    ));
    for (const artist of checked) {
      if (!artist || found.some(x => x.id === artist.id)) continue;
      found.push(artist);
      if (found.length >= 10) break;
    }
  }

  return {
    ok: true,
    mode: "popular",
    artists: found.slice(0, 10).map((a, i) => ({
      id: a.id,
      name: a.name,
      image: a.image,
      rank: i + 1,
      popularityRank: a.popularityRank,
      listeners: a.listeners,
      firstDate: a.firstDate,
    })),
    source: ranking.source,
    ranking: "Spotify monthly listeners",
  };
}

function kmBetween(lat1, lng1, lat2, lng2) {
  const r = 6371;
  const toRad = d => d * Math.PI / 180;
  const p1 = toRad(lat1), p2 = toRad(lat2);
  const dp = toRad(lat2 - lat1), dl = toRad(lng2 - lng1);
  const h = Math.sin(dp/2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl/2) ** 2;
  return 2 * r * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

async function scanHotspotCell(apiKey, cell) {
  const [lat, lng, radius] = cell;
  const tm = baseEventUrl(apiKey);
  tm.searchParams.set("geoPoint", geohash(lat, lng, 8));
  tm.searchParams.set("radius", String(radius));
  tm.searchParams.set("unit", "km");
  tm.searchParams.set("size", "200");
  tm.searchParams.set("sort", "date,asc");
  const raw = await tmJson(tm);
  return raw?._embedded?.events || [];
}

async function verifyMetroHotspot(apiKey, candidate) {
  const tm = baseEventUrl(apiKey);
  tm.searchParams.set("geoPoint", geohash(candidate.lat, candidate.lng, 8));
  tm.searchParams.set("radius", "45");
  tm.searchParams.set("unit", "km");
  if (candidate.countryCode) tm.searchParams.set("countryCode", candidate.countryCode);
  tm.searchParams.set("size", "1");
  tm.searchParams.set("sort", "date,asc");
  const raw = await tmJson(tm);
  const count = Number(raw?.page?.totalElements || 0);
  if (count < 10) return null;
  return { city:candidate.city, countryCode:candidate.countryCode, lng:candidate.lng, lat:candidate.lat, count };
}

async function hotspotsPayload(apiKey, region) {
  const cells = HOTSPOT_SCAN_CELLS[region] || [];
  const groups = new Map();
  const seenEvents = new Set();

  for (let i = 0; i < cells.length; i += 4) {
    const chunk = cells.slice(i, i + 4);
    const batches = await Promise.all(chunk.map(cell => scanHotspotCell(apiKey, cell).catch(() => [])));

    for (const events of batches) {
      for (const e of events) {
        const eventId = String(e?.id || "");
        if (eventId && seenEvents.has(eventId)) continue;
        if (eventId) seenEvents.add(eventId);

        const venue = e?._embedded?.venues?.[0] || {};
        const city = String(venue?.city?.name || "").trim();
        const countryCode = String(venue?.country?.countryCode || "").trim();
        const lat = finite(venue?.location?.latitude);
        const lng = finite(venue?.location?.longitude);
        if (!city || lat == null || lng == null) continue;

        const key = (city + "|" + countryCode).toLowerCase();
        const g = groups.get(key) || { city, countryCode, latSum:0, lngSum:0, samples:0 };
        g.latSum += lat;
        g.lngSum += lng;
        g.samples++;
        groups.set(key, g);
      }
    }
  }

  const probeBudget = Math.max(0, 44 - cells.length);
  const candidates = [...groups.values()]
    .map(g => ({
      city:g.city,
      countryCode:g.countryCode,
      lat:g.latSum/g.samples,
      lng:g.lngSum/g.samples,
      samples:g.samples,
    }))
    .sort((a,b)=>b.samples-a.samples || a.city.localeCompare(b.city))
    .slice(0, probeBudget);

  const verified = [];
  for (let i = 0; i < candidates.length; i += 6) {
    const chunk = candidates.slice(i, i + 6);
    const rows = await Promise.all(chunk.map(c => verifyMetroHotspot(apiKey, c).catch(() => null)));
    rows.filter(Boolean).forEach(x => verified.push(x));
  }

  verified.sort((a,b)=>b.count-a.count || a.city.localeCompare(b.city));

  const hotspots = [];
  for (const item of verified) {
    const duplicate = hotspots.some(existing =>
      existing.countryCode === item.countryCode &&
      kmBetween(existing.lat, existing.lng, item.lat, item.lng) < 28
    );
    if (!duplicate) hotspots.push(item);
  }

  return {
    ok:true,
    mode:"hotspots",
    region,
    threshold:10,
    discovery:"automatic",
    scannedCells:cells.length,
    candidateCities:candidates.length,
    hotspots,
  };
}

export async function onRequestGet({ request, env }) {
  if (!env?.TICKETMASTER_API_KEY) {
    return json({ error: "ticketmaster_key_missing" }, 503);
  }

  const u = new URL(request.url);
  const mode = String(u.searchParams.get("mode") || "").toLowerCase();
  const region = String(u.searchParams.get("region") || "").toLowerCase();
  const lat = finite(u.searchParams.get("lat"));
  const lng = finite(u.searchParams.get("lng"));
  const artist = String(u.searchParams.get("artist") || "").trim().slice(0, 120);
  const attractionId = String(u.searchParams.get("attractionId") || "").trim().slice(0, 160);
  const radius = Math.min(500, Math.max(5, finite(u.searchParams.get("radius")) || 100));

  if (mode !== "popular" && mode !== "hotspots" && !artist && !attractionId &&
      (lat == null || lng == null || lat < -90 || lat > 90 || lng < -180 || lng > 180)) {
    return json({ error: "location_required" }, 400);
  }

  const cache = caches.default;
  const cacheUrl = new URL(request.url);
  cacheUrl.searchParams.delete("_");
  cacheUrl.searchParams.set("__cachev", "concerts-global-v12");
  const cacheKey = new Request(cacheUrl.toString(), { method: "GET" });
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  try {
    if (mode === "popular") {
      const payload = await popularPayload(env.TICKETMASTER_API_KEY);
      const res = json(payload, 200, { "Cache-Control": "public, max-age=300, s-maxage=3600" });
      await cache.put(cacheKey, res.clone()).catch(() => {});
      return res;
    }

    if (mode === "hotspots") {
      const payload = await hotspotsPayload(env.TICKETMASTER_API_KEY, region);
      const res = json(payload, 200, { "Cache-Control": "public, max-age=300, s-maxage=21600" });
      await cache.put(cacheKey, res.clone()).catch(() => {});
      return res;
    }

    const tm = baseEventUrl(env.TICKETMASTER_API_KEY);
    tm.searchParams.set("size", "200");
    tm.searchParams.set("sort", (artist || attractionId) ? "date,asc" : "distance,date,asc");

    if (attractionId) {
      tm.searchParams.set("attractionId", attractionId);
    } else if (artist) {
      tm.searchParams.set("keyword", artist);
    } else {
      tm.searchParams.set("geoPoint", geohash(lat, lng, 8));
      tm.searchParams.set("radius", String(radius));
      tm.searchParams.set("unit", "km");
    }

    const raw = await tmJson(tm);
    const events = (raw?._embedded?.events || []).map(normalizeEvent).filter(Boolean);
    const payload = {
      ok: true,
      events,
      page: raw?.page || { size: events.length, totalElements: events.length, totalPages: 1, number: 0 },
      query: attractionId ? { attractionId } : artist ? { artist } : { lat, lng, radius, unit: "km" },
    };
    const res = json(payload, 200);
    await cache.put(cacheKey, res.clone()).catch(() => {});
    return res;
  } catch (err) {
    if (err?.message === "ticketmaster_unavailable") {
      return json({ error: "ticketmaster_unavailable" }, 502);
    }
    return json({
      error: "ticketmaster_error",
      status: Number(err?.status || 502),
      detail: String(err?.detail || "").slice(0, 300),
    }, 502);
  }
}
