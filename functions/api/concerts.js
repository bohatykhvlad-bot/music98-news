const TM_EVENTS_ROOT = "https://app.ticketmaster.com/discovery/v2/events.json";
const KWORB_ARTISTS_URL = "https://kworb.net/itunes/";

const KWORB_FALLBACK = [
  "Taylor Swift","Bad Bunny","Drake","Olivia Rodrigo","Ariana Grande","KAROL G","ADÉLA","Tiakola",
  "Omar Courtz","Shakira","HUGEL","The Weeknd","Dua Lipa","Olivia Dean","BTS","LINKIN PARK",
  "Bruno Mars","Justin Bieber","Ella Langley","Anuel AA","Fuerza Regida","Rihanna","Tame Impala",
  "KATSEYE","Katy Perry","Lady Gaga","Alex Warren","Noah Kahan","sombr","Billie Eilish","Oasis",
  "Rauw Alejandro","Burna Boy","Miley Cyrus","Morgan Wallen","Ed Sheeran","Kanye West","Harry Styles",
  "Lana Del Rey","Zara Larsson","Sabrina Carpenter","SZA","Teddy Swims","Coldplay","Arctic Monkeys"
];

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
    const names = [];
    const seen = new Set();

    /* Kworb's artist links live in the ranking table and use artist/... URLs. */
    const re = /<a\b[^>]*href=["'][^"']*(?:\/itunes\/)?artist\/[^"']+["'][^>]*>([\s\S]*?)<\/a>/gi;
    let m;
    while ((m = re.exec(html)) && names.length < 80) {
      const name = decodeHtml(m[1]);
      const key = name.toLowerCase();
      if (!name || seen.has(key)) continue;
      seen.add(key);
      names.push(name);
    }
    return names.length >= 20
      ? { names, source: "kworb_live" }
      : { names: KWORB_FALLBACK, source: "kworb_fallback" };
  } catch {
    return { names: KWORB_FALLBACK, source: "kworb_fallback" };
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

async function validatePopularArtist(apiKey, name, kworbRank) {
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
      kworbRank,
      firstDate: event.date,
    };
  }
  return null;
}

async function popularPayload(apiKey) {
  const ranking = await kworbArtists();
  const candidates = ranking.names.slice(0, 42);
  const found = [];

  /* Work in small parallel batches and stop as soon as ten ranked artists
     with real upcoming Ticketmaster events have been confirmed. */
  for (let i = 0; i < candidates.length && found.length < 10; i += 6) {
    const chunk = candidates.slice(i, i + 6);
    const checked = await Promise.all(chunk.map((name, j) =>
      validatePopularArtist(apiKey, name, i + j + 1).catch(() => null)
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
      kworbRank: a.kworbRank,
      firstDate: a.firstDate,
    })),
    source: ranking.source,
    ranking: "Kworb Global Digital Artist Ranking",
  };
}

async function hotspotsPayload(apiKey) {
  const raws = await Promise.all([0, 1, 2, 3, 4].map(page => {
    const tm = baseEventUrl(apiKey);
    tm.searchParams.set("size", "200");
    tm.searchParams.set("page", String(page));
    tm.searchParams.set("sort", "relevance,desc");
    return tmJson(tm).catch(() => null);
  }));

  const groups = new Map();
  let sampledEvents = 0;

  for (const raw of raws) {
    const events = raw?._embedded?.events || [];
    sampledEvents += events.length;
    for (const e of events) {
      const venue = e?._embedded?.venues?.[0] || {};
      const city = String(venue?.city?.name || "").trim();
      const countryCode = String(venue?.country?.countryCode || "").trim();
      const lat = finite(venue?.location?.latitude);
      const lng = finite(venue?.location?.longitude);
      if (!city || lat == null || lng == null) continue;

      const key = (city + "|" + countryCode).toLowerCase();
      const g = groups.get(key) || { city, countryCode, latSum: 0, lngSum: 0, points: 0, count: 0 };
      g.latSum += lat;
      g.lngSum += lng;
      g.points++;
      g.count++;
      groups.set(key, g);
    }
  }

  const hotspots = [...groups.values()]
    .map(g => ({
      city: g.city,
      countryCode: g.countryCode,
      lat: g.latSum / g.points,
      lng: g.lngSum / g.points,
      count: g.count,
    }))
    .filter(x => x.count >= 2)
    .sort((a, b) => b.count - a.count || a.city.localeCompare(b.city))
    .slice(0, 40);

  return { ok: true, mode: "hotspots", hotspots, sampledEvents };
}

export async function onRequestGet({ request, env }) {
  if (!env?.TICKETMASTER_API_KEY) {
    return json({ error: "ticketmaster_key_missing" }, 503);
  }

  const u = new URL(request.url);
  const mode = String(u.searchParams.get("mode") || "").toLowerCase();
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
  cacheUrl.searchParams.set("__cachev", "concerts-popular-v4");
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
      const payload = await hotspotsPayload(env.TICKETMASTER_API_KEY);
      const res = json(payload, 200, { "Cache-Control": "public, max-age=300, s-maxage=10800" });
      await cache.put(cacheKey, res.clone()).catch(() => {});
      return res;
    }

    const tm = baseEventUrl(env.TICKETMASTER_API_KEY);
    tm.searchParams.set("size", (artist || attractionId) ? "200" : "100");
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
