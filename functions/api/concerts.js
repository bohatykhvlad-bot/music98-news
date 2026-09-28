const TM_EVENTS_ROOT = "https://app.ticketmaster.com/discovery/v2/events.json";
const KWORB_ARTISTS_URL = "https://kworb.net/spotify/listeners.html";

const HOTSPOT_CITY_PROBES = {
  americas: [
    ["New York","US",-74.0060,40.7128],["Los Angeles","US",-118.2437,34.0522],
    ["Chicago","US",-87.6298,41.8781],["Miami","US",-80.1918,25.7617],
    ["San Francisco","US",-122.4194,37.7749],["Boston","US",-71.0589,42.3601],
    ["Washington","US",-77.0369,38.9072],["Philadelphia","US",-75.1652,39.9526],
    ["Atlanta","US",-84.3880,33.7490],["Dallas","US",-96.7970,32.7767],
    ["Houston","US",-95.3698,29.7604],["Seattle","US",-122.3321,47.6062],
    ["Las Vegas","US",-115.1398,36.1699],["Nashville","US",-86.7816,36.1627],
    ["Austin","US",-97.7431,30.2672],["Denver","US",-104.9903,39.7392],
    ["Phoenix","US",-112.0740,33.4484],["Minneapolis","US",-93.2650,44.9778],
    ["Toronto","CA",-79.3832,43.6532],["Vancouver","CA",-123.1207,49.2827],
    ["Montreal","CA",-73.5673,45.5017],["Calgary","CA",-114.0719,51.0447],
    ["Edmonton","CA",-113.4909,53.5461],["Mexico City","MX",-99.1332,19.4326],
    ["Monterrey","MX",-100.3161,25.6866],["Guadalajara","MX",-103.3496,20.6597],
    ["São Paulo","BR",-46.6333,-23.5505],["Rio de Janeiro","BR",-43.1729,-22.9068],
    ["Buenos Aires","AR",-58.3816,-34.6037],["Bogotá","CO",-74.0721,4.7110],
    ["Santiago","CL",-70.6693,-33.4489],["Lima","PE",-77.0428,-12.0464]
  ],
  europe: [
    ["London","GB",-0.1276,51.5072],["Manchester","GB",-2.2426,53.4808],
    ["Birmingham","GB",-1.8904,52.4862],["Glasgow","GB",-4.2518,55.8642],
    ["Dublin","IE",-6.2603,53.3498],["Paris","FR",2.3522,48.8566],
    ["Lyon","FR",4.8357,45.7640],["Marseille","FR",5.3698,43.2965],
    ["Amsterdam","NL",4.9041,52.3676],["Rotterdam","NL",4.4777,51.9244],
    ["Brussels","BE",4.3517,50.8503],["Berlin","DE",13.4050,52.5200],
    ["Hamburg","DE",9.9937,53.5511],["Munich","DE",11.5820,48.1351],
    ["Cologne","DE",6.9603,50.9375],["Frankfurt","DE",8.6821,50.1109],
    ["Madrid","ES",-3.7038,40.4168],["Barcelona","ES",2.1734,41.3851],
    ["Valencia","ES",-0.3763,39.4699],["Lisbon","PT",-9.1393,38.7223],
    ["Porto","PT",-8.6291,41.1579],["Milan","IT",9.1900,45.4642],
    ["Rome","IT",12.4964,41.9028],["Bologna","IT",11.3426,44.4949],
    ["Vienna","AT",16.3738,48.2082],["Zurich","CH",8.5417,47.3769],
    ["Prague","CZ",14.4378,50.0755],["Warsaw","PL",21.0122,52.2297],
    ["Krakow","PL",19.9445,50.0647],["Stockholm","SE",18.0686,59.3293],
    ["Copenhagen","DK",12.5683,55.6761],["Oslo","NO",10.7522,59.9139],
    ["Helsinki","FI",24.9384,60.1699],["Budapest","HU",19.0402,47.4979],
    ["Athens","GR",23.7275,37.9838],["Istanbul","TR",28.9784,41.0082],
    ["Dubai","AE",55.2708,25.2048],["Johannesburg","ZA",28.0473,-26.2041]
  ],
  apac: [
    ["Tokyo","JP",139.6917,35.6895],["Osaka","JP",135.5023,34.6937],
    ["Yokohama","JP",139.6380,35.4437],["Seoul","KR",126.9780,37.5665],
    ["Busan","KR",129.0756,35.1796],["Singapore","SG",103.8198,1.3521],
    ["Hong Kong","HK",114.1694,22.3193],["Taipei","TW",121.5654,25.0330],
    ["Bangkok","TH",100.5018,13.7563],["Manila","PH",120.9842,14.5995],
    ["Kuala Lumpur","MY",101.6869,3.1390],["Jakarta","ID",106.8456,-6.2088],
    ["Sydney","AU",151.2093,-33.8688],["Melbourne","AU",144.9631,-37.8136],
    ["Brisbane","AU",153.0251,-27.4698],["Perth","AU",115.8605,-31.9505],
    ["Adelaide","AU",138.6007,-34.9285],["Auckland","NZ",174.7633,-36.8485]
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

async function hotspotProbe(apiKey, row) {
  const [city, countryCode, lng, lat] = row;

  async function countMetro() {
    const tm = baseEventUrl(apiKey);
    tm.searchParams.set("geoPoint", geohash(lat, lng, 8));
    tm.searchParams.set("radius", "45");
    tm.searchParams.set("unit", "km");
    tm.searchParams.set("countryCode", countryCode);
    tm.searchParams.set("size", "1");
    tm.searchParams.set("sort", "date,asc");
    const raw = await tmJson(tm);
    return Number(raw?.page?.totalElements || 0);
  }

  let count = 0;
  try {
    count = await countMetro();
  } catch {
    await new Promise(resolve => setTimeout(resolve, 120));
    count = await countMetro();
  }

  if (count < 10) return null;
  return { city, countryCode, lng, lat, count };
}

async function hotspotsPayload(apiKey, region) {
  const probes = HOTSPOT_CITY_PROBES[region] || [];
  const hotspots = [];

  for (let i = 0; i < probes.length; i += 6) {
    const chunk = probes.slice(i, i + 6);
    const rows = await Promise.all(
      chunk.map(row => hotspotProbe(apiKey, row).catch(() => null))
    );
    rows.filter(Boolean).forEach(x => hotspots.push(x));
  }

  hotspots.sort((a, b) => b.count - a.count || a.city.localeCompare(b.city));
  return {
    ok: true,
    mode: "hotspots",
    region,
    threshold: 10,
    checkedCities: probes.length,
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
  cacheUrl.searchParams.set("__cachev", "concerts-global-v10");
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
