import {
  HOTSPOT_VERSION,
  HOTSPOT_THRESHOLD,
  HOTSPOT_STATE_KEY,
  HOTSPOT_SNAPSHOT_KEY,
  HOTSPOT_MAX_DEPTH,
  freshState,
  validJob,
  jobSearchCircle,
  needsGeographicSplit,
  splitHotspotJob,
  shouldSplitVenueResult,
  venueCandidate,
  mergeCandidate,
  candidatePoint,
  snapshotFromState,
} from "../lib/concert-hotspots.js";

const TM_EVENTS_ROOT = "https://app.ticketmaster.com/discovery/v2/events.json";
const TM_ATTRACTIONS_ROOT = "https://app.ticketmaster.com/discovery/v2/attractions.json";
const TM_VENUES_ROOT = "https://app.ticketmaster.com/discovery/v2/venues.json";
const KWORB_ARTISTS_URL = "https://kworb.net/spotify/listeners.html";

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
  if (v == null || (typeof v === "string" && !v.trim())) return null;
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
  if (lat == null || lng == null || lat < -90 || lat > 90 || lng < -180 || lng > 180 || (Math.abs(lat) < 1e-7 && Math.abs(lng) < 1e-7)) return null;
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

const HOTSPOT_BUILD_JOB_BUDGET = 2;
const HOTSPOT_VERIFY_BUDGET = 10;
const HOTSPOT_CACHE_TTL = 24 * 60 * 60;
const HOTSPOT_VENUE_CACHE_PREFIX = "concert-hotspots:v17:venue:";
const HOTSPOT_CITY_CACHE_PREFIX = "concert-hotspots:v17:city:";
let hotspotLastFetchAt = 0;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function hotspotTmJson(url) {
  const wait = Math.max(0, 225 - (Date.now() - hotspotLastFetchAt));
  if (wait) await sleep(wait);
  const out = await tmJson(url);
  hotspotLastFetchAt = Date.now();
  return out;
}

async function kvGetJson(env, key) {
  if (!env?.DESK) return null;
  try {
    const value = await env.DESK.get(key, "json");
    if (value && typeof value === "object") return value;
  } catch {}
  try {
    const raw = await env.DESK.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function kvPutJson(env, key, value, options = undefined) {
  if (!env?.DESK) return;
  await env.DESK.put(key, JSON.stringify(value), options);
}

function normalizeBuildState(state) {
  if (!state || state.version !== HOTSPOT_VERSION || !Array.isArray(state.queue) ||
      !state.candidates || !state.verified || !Array.isArray(state.verifyQueue)) {
    return freshState();
  }
  return state;
}

async function venuePage(env, apiKey, job, page = 0) {
  const circle = jobSearchCircle(job);
  if (!circle) throw new Error("invalid_hotspot_job");
  const cacheKey = HOTSPOT_VENUE_CACHE_PREFIX + String(job.id || "job") + ":" + String(page);
  const cached = await kvGetJson(env, cacheKey);
  if (cached) return cached;

  const tm = new URL(TM_VENUES_ROOT);
  tm.searchParams.set("apikey", apiKey);
  tm.searchParams.set("geoPoint", geohash(circle.lat, circle.lng, 8));
  tm.searchParams.set("radius", String(Math.ceil(circle.radius)));
  tm.searchParams.set("unit", "km");
  tm.searchParams.set("size", "200");
  tm.searchParams.set("page", String(page));
  tm.searchParams.set("locale", "en-us,en,*");
  const raw = await hotspotTmJson(tm);
  await kvPutJson(env, cacheKey, raw, { expirationTtl: HOTSPOT_CACHE_TTL }).catch(() => {});
  return raw;
}

async function verifyHotspotCity(env, apiKey, record) {
  const point = candidatePoint(record);
  if (!point.city || !point.countryCode) return null;

  const cacheKey = HOTSPOT_CITY_CACHE_PREFIX + encodeURIComponent(
    [point.city, point.stateCode, point.countryCode].join("|").toLowerCase()
  );
  let cached = await kvGetJson(env, cacheKey);
  let count;

  if (cached && Number.isFinite(Number(cached.count))) {
    count = Number(cached.count);
  } else {
    const tm = baseEventUrl(apiKey);
    tm.searchParams.set("city", point.city);
    tm.searchParams.set("countryCode", point.countryCode);
    if (point.stateCode) tm.searchParams.set("stateCode", point.stateCode);
    tm.searchParams.set("size", "1");
    tm.searchParams.set("sort", "date,asc");

    const raw = await hotspotTmJson(tm);
    count = Number(raw?.page?.totalElements || 0);
    await kvPutJson(env, cacheKey, { count }, { expirationTtl: HOTSPOT_CACHE_TTL }).catch(() => {});
  }

  if (count < HOTSPOT_THRESHOLD) return null;
  return {
    city:point.city,
    stateCode:point.stateCode,
    countryCode:point.countryCode,
    lat:point.lat,
    lng:point.lng,
    count,
  };
}

function queueCandidate(state, candidate) {
  if (!candidate?.key) return;
  mergeCandidate(state.candidates, candidate);
  const rec = state.candidates[candidate.key];
  if (!rec.queued && !rec.verified) {
    rec.queued = true;
    state.verifyQueue.push(candidate.key);
  }
}

async function processVenueJob(env, apiKey, state, job) {
  if (!validJob(job)) return { queried:false };

  if (needsGeographicSplit(job)) {
    state.queue.unshift(...splitHotspotJob(job));
    return { queried:false };
  }

  const first = await venuePage(env, apiKey, job, 0);
  const total = Number(first?.page?.totalElements || 0);
  const totalPages = Number(first?.page?.totalPages || 0);

  if ((shouldSplitVenueResult(total, job) || totalPages > 5) && Number(job.depth || 0) < HOTSPOT_MAX_DEPTH) {
    state.queue.unshift(...splitHotspotJob(job));
    return { queried:true };
  }

  if (total > 1000 || totalPages > 5) {
    state.partial = true;
    return { queried:true };
  }

  const pages = [first];
  for (let page = 1; page < totalPages; page++) {
    pages.push(await venuePage(env, apiKey, job, page));
  }

  for (const raw of pages) {
    const venues = raw?._embedded?.venues || [];
    for (const venue of venues) {
      const candidate = venueCandidate(venue);
      if (candidate) queueCandidate(state, candidate);
    }
  }
  state.scannedJobs = Number(state.scannedJobs || 0) + 1;
  return { queried:true };
}

async function processCityVerification(env, apiKey, state, key) {
  const rec = state.candidates[key];
  if (!rec || rec.verified) return;
  const verified = await verifyHotspotCity(env, apiKey, rec);
  rec.verified = true;
  if (verified) state.verified[key] = verified;
}

async function loadHotspotState(env) {
  const stored = await kvGetJson(env, HOTSPOT_STATE_KEY);
  const state = normalizeBuildState(stored);

  if (state.complete) {
    const finished = Date.parse(state.completedAt || state.updatedAt || 0) || 0;
    if (Date.now() - finished >= 20 * 60 * 60 * 1000) return freshState();
  }
  return state;
}

export async function refreshHotspotSnapshot(env, options = {}) {
  if (!env?.TICKETMASTER_API_KEY || !env?.DESK) return { ok:false, reason:"hotspot_storage_or_key_missing" };

  const jobBudget = Math.max(1, Math.min(4, Number(options.jobBudget || HOTSPOT_BUILD_JOB_BUDGET)));
  const verifyBudget = Math.max(1, Math.min(16, Number(options.verifyBudget || HOTSPOT_VERIFY_BUDGET)));
  const state = await loadHotspotState(env);

  if (state.complete) return { ok:true, complete:true, hotspots:Object.keys(state.verified || {}).length };

  let jobsDone = 0;
  let dequeued = 0;
  while (state.queue.length && jobsDone < jobBudget && dequeued < 160) {
    const job = state.queue.shift();
    dequeued++;
    try {
      const result = await processVenueJob(env, env.TICKETMASTER_API_KEY, state, job);
      if (result?.queried) jobsDone++;
    } catch (err) {
      state.errors = Number(state.errors || 0) + 1;
      state.queue.unshift({ ...job, attempts:Number(job?.attempts || 0) + 1 });
      state.updatedAt = new Date().toISOString();
      await kvPutJson(env, HOTSPOT_STATE_KEY, state);
      return { ok:false, complete:false, retry:true, status:Number(err?.status || 0), error:String(err?.message || err) };
    }
  }

  let verifiedDone = 0;
  while (state.verifyQueue.length && verifiedDone < verifyBudget) {
    const key = state.verifyQueue.shift();
    try {
      await processCityVerification(env, env.TICKETMASTER_API_KEY, state, key);
      verifiedDone++;
    } catch (err) {
      state.verifyQueue.unshift(key);
      state.errors = Number(state.errors || 0) + 1;
      state.updatedAt = new Date().toISOString();
      await kvPutJson(env, HOTSPOT_STATE_KEY, state);
      return { ok:false, complete:false, retry:true, status:Number(err?.status || 0), error:String(err?.message || err) };
    }
  }

  state.updatedAt = new Date().toISOString();

  if (!state.queue.length && !state.verifyQueue.length) {
    state.complete = !state.partial;
    state.completedAt = new Date().toISOString();

    if (state.complete) {
      const snapshot = snapshotFromState(state);
      await kvPutJson(env, HOTSPOT_SNAPSHOT_KEY, snapshot);
    }
  }

  await kvPutJson(env, HOTSPOT_STATE_KEY, state);
  return {
    ok:true,
    complete:!!state.complete,
    partial:!!state.partial,
    queue:state.queue.length,
    verifyQueue:state.verifyQueue.length,
    verified:Object.keys(state.verified || {}).length,
  };
}

async function hotspotSnapshotPayload(env) {
  const snapshot = await kvGetJson(env, HOTSPOT_SNAPSHOT_KEY);
  if (snapshot?.version === HOTSPOT_VERSION && Array.isArray(snapshot.hotspots)) {
    return { ...snapshot, partial:false, warming:false };
  }

  const storedState = await kvGetJson(env, HOTSPOT_STATE_KEY);
  const state = normalizeBuildState(storedState);
  const progress = snapshotFromState(state);
  return {
    ...progress,
    partial:true,
    warming:true,
    cold:!storedState,
    progress:{
      queue:state.queue.length,
      verifyQueue:state.verifyQueue.length,
      scannedJobs:Number(state.scannedJobs || 0),
    },
  };
}

export async function onRequestGet({ request, env, waitUntil }) {
  const u = new URL(request.url);
  const mode = String(u.searchParams.get("mode") || "").toLowerCase();
  const region = String(u.searchParams.get("region") || "").toLowerCase();
  void region;

  if (mode === "hotspots") {
    const payload = await hotspotSnapshotPayload(env);
    if (payload.cold && env?.TICKETMASTER_API_KEY && env?.DESK && typeof waitUntil === "function") {
      waitUntil(refreshHotspotSnapshot(env, { jobBudget:3, verifyBudget:12 }).catch(() => {}));
    }
    if (!payload.hotspots.length && !env?.TICKETMASTER_API_KEY) {
      return json({ error:"ticketmaster_key_missing", ...payload }, 503);
    }
    return json(payload, 200, {
      "Cache-Control": payload.partial
        ? "public, max-age=15, s-maxage=30"
        : "public, max-age=300, s-maxage=3600"
    });
  }

  if (!env?.TICKETMASTER_API_KEY) {
    return json({ error: "ticketmaster_key_missing" }, 503);
  }
  const q = String(u.searchParams.get("q") || "").trim().slice(0, 120);
  const lat = finite(u.searchParams.get("lat"));
  const lng = finite(u.searchParams.get("lng"));
  const artist = String(u.searchParams.get("artist") || "").trim().slice(0, 120);
  const attractionId = String(u.searchParams.get("attractionId") || "").trim().slice(0, 160);
  const radius = Math.min(500, Math.max(5, finite(u.searchParams.get("radius")) || 100));

  if (mode !== "popular" && mode !== "artist-search" && !artist && !attractionId &&
      (lat == null || lng == null || lat < -90 || lat > 90 || lng < -180 || lng > 180)) {
    return json({ error: "location_required" }, 400);
  }

  const cache = caches.default;
  const cacheUrl = new URL(request.url);
  cacheUrl.searchParams.delete("_");
  cacheUrl.searchParams.set("__cachev", "concerts-global-v17");
  const cacheKey = new Request(cacheUrl.toString(), { method: "GET" });
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  try {
    if (mode === "artist-search") {
      if (q.length < 2) return json({ ok:true, mode:"artist-search", artists:[] }, 200);
      const tm = new URL(TM_ATTRACTIONS_ROOT);
      tm.searchParams.set("apikey", env.TICKETMASTER_API_KEY);
      tm.searchParams.set("keyword", q);
      tm.searchParams.set("classificationName", "music");
      tm.searchParams.set("includeTest", "no");
      tm.searchParams.set("locale", "en-us,en,*");
      tm.searchParams.set("size", "6");
      const raw = await tmJson(tm);
      const artists = (raw?._embedded?.attractions || []).map(x => ({
        id: String(x?.id || ""),
        name: String(x?.name || ""),
        image: bestArtistImage(x?.images) || bestImage(x?.images),
      })).filter(x => x.id && x.name);
      const res = json({ ok:true, mode:"artist-search", artists }, 200, { "Cache-Control":"public, max-age=120, s-maxage=600" });
      await cache.put(cacheKey, res.clone()).catch(() => {});
      return res;
    }

    if (mode === "popular") {
      const payload = await popularPayload(env.TICKETMASTER_API_KEY);
      const res = json(payload, 200, { "Cache-Control": "public, max-age=300, s-maxage=3600" });
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
