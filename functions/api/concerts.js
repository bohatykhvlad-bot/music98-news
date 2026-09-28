const TM_EVENTS_ROOT = "https://app.ticketmaster.com/discovery/v2/events.json";
const TM_ATTRACTIONS_ROOT = "https://app.ticketmaster.com/discovery/v2/attractions.json";

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

function normalizeAttraction(a) {
  if (!a || !a.id || !a.name) return null;
  return {
    id: String(a.id),
    name: String(a.name),
    image: bestArtistImage(a.images),
    url: String(a.url || ""),
  };
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

function baseEventUrl(apiKey) {
  const tm = new URL(TM_EVENTS_ROOT);
  tm.searchParams.set("apikey", apiKey);
  tm.searchParams.set("classificationName", "music");
  tm.searchParams.set("includeTest", "no");
  tm.searchParams.set("includeTBA", "no");
  tm.searchParams.set("includeTBD", "no");
  tm.searchParams.set("locale", "*");
  tm.searchParams.set("startDateTime", upcomingIso());
  return tm;
}

async function popularPayload(apiKey) {
  const attrsUrl = new URL(TM_ATTRACTIONS_ROOT);
  attrsUrl.searchParams.set("apikey", apiKey);
  attrsUrl.searchParams.set("classificationName", "music");
  attrsUrl.searchParams.set("includeTest", "no");
  attrsUrl.searchParams.set("locale", "*");
  attrsUrl.searchParams.set("sort", "relevance,desc");
  attrsUrl.searchParams.set("size", "60");

  const attrRaw = await tmJson(attrsUrl);
  const attractions = (attrRaw?._embedded?.attractions || [])
    .map(normalizeAttraction)
    .filter(Boolean);

  if (!attractions.length) {
    return { ok: true, mode: "popular", artists: [], events: [] };
  }

  const candidateIds = attractions.map(a => a.id).slice(0, 60);
  const eventsUrl = baseEventUrl(apiKey);
  eventsUrl.searchParams.set("attractionId", candidateIds.join(","));
  eventsUrl.searchParams.set("size", "200");
  eventsUrl.searchParams.set("sort", "relevance,desc");

  const eventRaw = await tmJson(eventsUrl);
  const events = (eventRaw?._embedded?.events || []).map(normalizeEvent).filter(Boolean);

  const counts = new Map();
  for (const e of events) {
    const ids = e.attractionIds.length ? e.attractionIds : [e.attractionId];
    for (const id of ids) {
      if (!candidateIds.includes(id)) continue;
      counts.set(id, (counts.get(id) || 0) + 1);
    }
  }

  const artists = attractions
    .filter(a => (counts.get(a.id) || 0) > 0)
    .slice(0, 10)
    .map((a, index) => ({
      ...a,
      rank: index + 1,
      shows: counts.get(a.id) || 0,
    }));

  const selected = new Set(artists.map(a => a.id));
  const selectedEvents = events.filter(e => e.attractionIds.some(id => selected.has(id)) || selected.has(e.attractionId));

  return {
    ok: true,
    mode: "popular",
    artists,
    events: selectedEvents,
    source: "ticketmaster_relevance",
  };
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

  if (mode !== "popular" && !artist && !attractionId &&
      (lat == null || lng == null || lat < -90 || lat > 90 || lng < -180 || lng > 180)) {
    return json({ error: "location_required" }, 400);
  }

  const cache = caches.default;
  const cacheUrl = new URL(request.url);
  cacheUrl.searchParams.delete("_");
  const cacheKey = new Request(cacheUrl.toString(), { method: "GET" });
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  try {
    if (mode === "popular") {
      const payload = await popularPayload(env.TICKETMASTER_API_KEY);
      const res = json(payload, 200, { "Cache-Control": "public, max-age=120, s-maxage=1800" });
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
