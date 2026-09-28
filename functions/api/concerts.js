const TM_ROOT = "https://app.ticketmaster.com/discovery/v2/events.json";

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

/* Ticketmaster's preferred location filter is geoPoint (geohash). */
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
  const wide = list.filter(x => x.ratio === "16_9" && !x.fallback);
  const pool = wide.length ? wide : list.filter(x => !x.fallback).length ? list.filter(x => !x.fallback) : list;
  pool.sort((a, b) => (Number(b.width || 0) * Number(b.height || 0)) - (Number(a.width || 0) * Number(a.height || 0)));
  return pool[0]?.url || "";
}

function normalizeEvent(e) {
  const venue = e?._embedded?.venues?.[0] || {};
  const attraction = e?._embedded?.attractions?.[0] || {};
  const lat = finite(venue?.location?.latitude);
  const lng = finite(venue?.location?.longitude);
  if (lat == null || lng == null) return null;
  return {
    id: String(e.id || ""),
    name: String(e.name || attraction.name || "Concert"),
    artist: String(attraction.name || e.name || "Concert"),
    attractionId: String(attraction.id || ""),
    url: String(e.url || ""),
    image: bestImage(e.images || attraction.images),
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

export async function onRequestGet({ request, env }) {
  if (!env?.TICKETMASTER_API_KEY) {
    return json({ error: "ticketmaster_key_missing" }, 503);
  }

  const u = new URL(request.url);
  const lat = finite(u.searchParams.get("lat"));
  const lng = finite(u.searchParams.get("lng"));
  const artist = String(u.searchParams.get("artist") || "").trim().slice(0, 120);
  const radius = Math.min(500, Math.max(5, finite(u.searchParams.get("radius")) || 100));

  if (!artist && (lat == null || lng == null || lat < -90 || lat > 90 || lng < -180 || lng > 180)) {
    return json({ error: "location_required" }, 400);
  }

  /* Same-origin cache key contains no Ticketmaster credential. */
  const cache = caches.default;
  const cacheUrl = new URL(request.url);
  cacheUrl.searchParams.delete("_");
  const cacheKey = new Request(cacheUrl.toString(), { method: "GET" });
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  const tm = new URL(TM_ROOT);
  tm.searchParams.set("apikey", env.TICKETMASTER_API_KEY);
  tm.searchParams.set("classificationName", "music");
  tm.searchParams.set("includeTest", "no");
  tm.searchParams.set("includeTBA", "no");
  tm.searchParams.set("includeTBD", "no");
  tm.searchParams.set("locale", "*");
  tm.searchParams.set("size", "100");
  tm.searchParams.set("sort", artist ? "date,asc" : "distance,date,asc");

  if (artist) {
    tm.searchParams.set("keyword", artist);
  } else {
    tm.searchParams.set("geoPoint", geohash(lat, lng, 8));
    tm.searchParams.set("radius", String(radius));
    tm.searchParams.set("unit", "km");
  }

  let upstream;
  try {
    upstream = await fetch(tm.toString(), {
      headers: { "Accept": "application/json", "User-Agent": "music98.news/1.0" },
    });
  } catch (err) {
    return json({ error: "ticketmaster_unavailable" }, 502);
  }

  if (!upstream.ok) {
    const body = await upstream.text().catch(() => "");
    return json({
      error: "ticketmaster_error",
      status: upstream.status,
      detail: body.slice(0, 300),
    }, 502);
  }

  const raw = await upstream.json();
  const events = (raw?._embedded?.events || []).map(normalizeEvent).filter(Boolean);
  const payload = {
    ok: true,
    events,
    page: raw?.page || { size: events.length, totalElements: events.length, totalPages: 1, number: 0 },
    query: artist ? { artist } : { lat, lng, radius, unit: "km" },
  };
  const res = json(payload, 200);
  await cache.put(cacheKey, res.clone()).catch(() => {});
  return res;
}
