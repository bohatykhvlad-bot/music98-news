import {
  HOTSPOT_VERSION,
  HOTSPOT_THRESHOLD,
  HOTSPOT_STATE_KEY,
  HOTSPOT_SNAPSHOT_KEY,
  EUROPE_CAPITAL_SEEDS,
  freshState,
  validJob,
  jobSearchCircle,
  needsGeographicSplit,
  splitHotspotJob,
  overflowHotspotJobs,
  shouldSplitVenueResult,
  venueCandidate,
  mergeCandidate,
  candidatePoint,
  snapshotFromState,
} from "../lib/concert-hotspots.js";
import { MAP_MARKET_SEEDS } from "../lib/concert-map-seeds.js";

const TM_EVENTS_ROOT = "https://app.ticketmaster.com/discovery/v2/events.json";
const TM_ATTRACTIONS_ROOT = "https://app.ticketmaster.com/discovery/v2/attractions.json";
const TM_VENUES_ROOT = "https://app.ticketmaster.com/discovery/v2/venues.json";
const KWORB_ARTISTS_URL = "https://kworb.net/spotify/listeners.html";
const POPULAR_LIMIT = 30;
const POPULAR_CANDIDATE_LIMIT = 500;
const POPULAR_SNAPSHOT_KEY = "concert-popular:v4";
const POPULAR_STATE_KEY = "concert-popular:v4:state";
const POPULAR_REFRESH_MS = 24 * 60 * 60 * 1000;
const POPULAR_BATCH_SIZE = 10;
const POPULAR_TOUR_STATE_KEY = "concert-popular:v4:tours-state";
const POPULAR_TOUR_PREFIX = "concert-popular:v4:tour:";
const CAPITAL_EVENTS_STATE_KEY = "concert-capitals:v1:state";
const CAPITAL_EVENTS_PREFIX = "concert-capitals:v1:city:";
const CAPITAL_HUB_SNAPSHOT_KEY = "concert-capitals:v1:hubs";
const PREWARM_MAX_AGE_MS = 26 * 60 * 60 * 1000;
const MAP_WARM_LOCK_KEY = "concert-map:warm-lock:v1";
const MAP_WARM_LOCK_MS = 15 * 60 * 1000;
const MAP_MARKET_VERSION = "concert-markets-v4";
const MAP_MARKET_STATE_KEY = "concert-markets:v4:state";
const MAP_MARKET_SNAPSHOT_KEY = "concert-markets:v4:snapshot";
const MAP_MARKET_LEGACY_SNAPSHOT_KEY = "concert-markets:v3:snapshot";
const MAP_MARKET_LEGACY2_SNAPSHOT_KEY = "concert-markets:v2:snapshot";
const MAP_MARKET_BATCH_SIZE = 20;
const MARKET_AUDIT_COVERAGE_TARGETS = [
  {label:"US-AK",city:"Juneau",countryCode:"US",stateCode:"AK"},
  {label:"US-SD",city:"Pierre",countryCode:"US",stateCode:"SD"},
  {label:"US-VT",city:"Montpelier",countryCode:"US",stateCode:"VT"},
  {label:"AU-Brisbane",city:"Brisbane",countryCode:"AU",stateCode:""},
  {label:"AU-Perth",city:"Perth",countryCode:"AU",stateCode:""},
  {label:"CA-BC",city:"Victoria",countryCode:"CA",stateCode:"BC"},
  {label:"CA-AB",city:"Edmonton",countryCode:"CA",stateCode:"AB"},
  {label:"CA-SK",city:"Regina",countryCode:"CA",stateCode:"SK"},
  {label:"CA-MB",city:"Winnipeg",countryCode:"CA",stateCode:"MB"},
  {label:"CA-ON",city:"Toronto",countryCode:"CA",stateCode:"ON"},
  {label:"CA-QC",city:"Quebec City",countryCode:"CA",stateCode:"QC"},
  {label:"CA-NB",city:"Fredericton",countryCode:"CA",stateCode:"NB"},
  {label:"CA-NS",city:"Halifax",countryCode:"CA",stateCode:"NS"},
  {label:"CA-PE",city:"Charlottetown",countryCode:"CA",stateCode:"PE"},
  {label:"CA-NL",city:"St. John's",countryCode:"CA",stateCode:"NL"},
];

/* The source list is intentionally human-readable and grouped, but a batch must
   not scan Europe for hours before touching the rest of the world. Build a
   deterministic round-robin order across broad geographic regions so the very
   first 20 Ticketmaster validations include the US, Americas, Europe, Africa,
   Middle East, Asia and Pacific. Correctness still comes only from Ticketmaster:
   this changes scan order, never which cities are published. */
function mapMarketRegion(seed){
  const cc=String(seed?.countryCode||"").toUpperCase();
  const lng=Number(seed?.lng);
  if(cc==="US" || cc==="PR") return "us";
  if(Number.isFinite(lng) && lng < -30) return "americas";
  if(["AE","QA","SA","KW","BH","OM","JO","IL","LB"].includes(cc)) return "middle-east";
  if(["JP","KR","SG","TH","PH","ID","MY","IN","HK"].includes(cc)) return "asia";
  if(["AU","NZ"].includes(cc)) return "pacific";
  if(["EG","ZA"].includes(cc)) return "africa";
  return "europe";
}
function orderedMapMarketSeeds(){
  const order=["us","americas","europe","africa","middle-east","asia","pacific"];
  const buckets=new Map(order.map(k=>[k,[]]));
  for(const seed of MAP_MARKET_SEEDS) (buckets.get(mapMarketRegion(seed))||buckets.get("europe")).push(seed);
  const out=[];
  let added=true;
  for(let i=0;added;i++){
    added=false;
    for(const key of order){
      const row=buckets.get(key)[i];
      if(row){out.push(row);added=true;}
    }
  }
  return out;
}
const ORDERED_MAP_MARKET_SEEDS=orderedMapMarketSeeds();
function mapMarketSeedKey(seed){
  return [String(seed?.city||"").toLowerCase(),String(seed?.stateCode||"").toUpperCase(),String(seed?.countryCode||"").toUpperCase()].join("|");
}
function marketCoverageAudit(){
  return MARKET_AUDIT_COVERAGE_TARGETS.map(target=>{
    const samePlace=seed=>
      String(seed.city||"").toLowerCase()===String(target.city||"").toLowerCase() &&
      String(seed.countryCode||"").toUpperCase()===String(target.countryCode||"").toUpperCase();
    const exactState=MAP_MARKET_SEEDS.find(seed=>samePlace(seed) &&
      (!target.stateCode || String(seed.stateCode||"").toUpperCase()===String(target.stateCode||"").toUpperCase()));
    const cityCandidate=exactState||MAP_MARKET_SEEDS.find(samePlace);
    const stateTagged=!!exactState;
    return {...target,candidate:!!cityCandidate,candidateCity:cityCandidate?.city||"",candidateStateCode:cityCandidate?.stateCode||"",
      reason:!cityCandidate?"missing_candidate_seed":(stateTagged?"candidate_present":"candidate_present_without_state_code")};
  });
}
function appendMarketAudit(state,seed,entry){
  if(!Array.isArray(state.audit)) state.audit=[];
  const key=mapMarketSeedKey(seed);
  state.audit=state.audit.filter(row=>row.key!==key);
  const record={key,city:String(seed?.city||""),stateCode:String(seed?.stateCode||""),
    countryCode:String(seed?.countryCode||""),kind:String(seed?.kind||""),
    checkedAt:new Date().toISOString(),...entry};
  state.audit.push(record);
  try{console.info("concert-market-audit",JSON.stringify(record));}catch(e){}
  return record;
}


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

function packageLikeScore(value) {
  const text=String(value||"").toLowerCase();
  return /\b(vip|package|premium|first entry|fast track|meet\s*(?:&|and)\s*greet|platinum|hospitality|soundcheck|early entry|upgrade|merch(?:andise)?)\b/.test(text) ? 10 : 0;
}
function normalizeEvent(e) {
  const venue = e?._embedded?.venues?.[0] || {};
  const attractions = Array.isArray(e?._embedded?.attractions) ? e._embedded.attractions : [];
  let attraction = attractions[0] || {};
  if(packageLikeScore(attraction?.name)>0){
    attraction=attractions.find(a=>packageLikeScore(a?.name)===0) || attraction;
  }
  const status=String(e?.dates?.status?.code||"").trim().toLowerCase();
  if(["cancelled","canceled","postponed","rescheduled"].includes(status)) return null;
  const rawName=String(e?.name||"").trim();
  const venueName=String(venue?.name||"").trim();
  const qaText=(rawName+" "+String(e?.info||"")+" "+String(e?.pleaseNote||"")).toLowerCase();
  const testEvent=e?.test===true ||
    /do\s+not\s+purchase/i.test(qaText) ||
    /\bqa\b[^\n]{0,40}\b(?:test|testing|festival)\b/i.test(qaText) ||
    /\b(?:test|testing)\b[^\n]{0,30}\b(?:event|festival)\b/i.test(qaText) ||
    venueName.toLowerCase()==="ticketmaster";
  if(testEvent) return null;
  const rawLat = finite(venue?.location?.latitude);
  const rawLng = finite(venue?.location?.longitude);
  const hasValidCoords = rawLat != null && rawLng != null &&
    rawLat >= -90 && rawLat <= 90 && rawLng >= -180 && rawLng <= 180 &&
    !(Math.abs(rawLat) < 1e-7 && Math.abs(rawLng) < 1e-7);
  const lat = hasValidCoords ? rawLat : null;
  const lng = hasValidCoords ? rawLng : null;
  return {
    id: String(e.id || ""),
    name: String(e.name || attraction.name || "Concert"),
    artist: String(attraction.name || e.name || "Concert"),
    attractionId: String(attraction.id || ""),
    attractionIds: attractions.map(a => String(a?.id || "")).filter(Boolean),
    url: String(e.url || ""),
    ticketOptions: e.url ? [{url:String(e.url),name:String(e.name||"Ticket"),eventId:String(e.id||"")}] : [],
    image: bestImage(e.images),
    artistImage: bestArtistImage(attraction.images) || bestImage(e.images),
    date: String(e?.dates?.start?.localDate || ""),
    time: String(e?.dates?.start?.localTime || ""),
    dateTime: String(e?.dates?.start?.dateTime || ""),
    timezone: String(e?.dates?.timezone || venue?.timezone || ""),
    status,
    venueId: String(venue.id || ""),
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

function eventCollapseKey(e) {
  const clean=v=>String(v||"").toLowerCase().replace(/\s+/g," ").trim();
  const artist=clean(e?.artist||e?.name);
  const venueId=clean(e?.venueId);
  const venue=venueId ? "id:"+venueId : clean(e?.venue);
  const city=clean(e?.city);
  const date=clean(e?.date),time=clean(String(e?.time||"").slice(0,5));
  if(!artist || !venue || !date) return "id:"+String(e?.id||"");
  return [artist,venue,city,date,time].join("|");
}
function packageEventPenalty(e) {
  return Math.max(
    packageLikeScore(e?.name),
    packageLikeScore(e?.ticketOptions?.[0]?.name)
  );
}
function mergeTicketOptions(...groups) {
  const seen=new Set(),out=[];
  for(const group of groups) for(const opt of Array.isArray(group)?group:[]){
    const url=String(opt?.url||"").trim();
    if(!url || seen.has(url)) continue;
    seen.add(url); out.push({url,name:String(opt?.name||"Ticket"),eventId:String(opt?.eventId||"")});
  }
  return out;
}
function collapseDuplicateEvents(events) {
  const order=[],byKey=new Map();
  for(const ev of events||[]){
    const key=eventCollapseKey(ev);
    if(!byKey.has(key)){byKey.set(key,ev);order.push(key);continue;}
    const prev=byKey.get(key);
    const preferNew=packageEventPenalty(ev)<packageEventPenalty(prev);
    const primary=preferNew?ev:prev,secondary=preferNew?prev:ev;
    primary.ticketOptions=mergeTicketOptions(primary.ticketOptions,secondary.ticketOptions);
    if(!primary.url && primary.ticketOptions[0]?.url) primary.url=primary.ticketOptions[0].url;
    primary.duplicateCount=Number(prev?.duplicateCount||1)+1;
    byKey.set(key,primary);
  }
  return order.map(key=>byKey.get(key));
}
function normalizedEventIsBlocked(e) {
  const status=String(e?.status||"").trim().toLowerCase();
  if(["cancelled","canceled","postponed","rescheduled"].includes(status)) return true;
  const name=String(e?.name||"");
  const venue=String(e?.venue||"");
  const qaText=name.toLowerCase();
  return /do\s+not\s+purchase/i.test(qaText) ||
    /\bqa\b[^\n]{0,40}\b(?:test|testing|festival)\b/i.test(qaText) ||
    /\b(?:test|testing)\b[^\n]{0,30}\b(?:event|festival)\b/i.test(qaText) ||
    venue.trim().toLowerCase()==="ticketmaster";
}
function normalizedEventIsUpcoming(e,now=Date.now()) {
  const dateTime=String(e?.dateTime||"").trim();
  if(dateTime){
    const start=Date.parse(dateTime);
    if(Number.isFinite(start)) return start>=now;
  }
  const date=String(e?.date||"").trim();
  if(/^\d{4}-\d{2}-\d{2}$/.test(date)){
    const today=new Date(now).toISOString().slice(0,10);
    return date>=today;
  }
  return true;
}
function sanitizeNormalizedEvents(events) {
  const now=Date.now();
  return collapseDuplicateEvents((Array.isArray(events)?events:[])
    .filter(e=>e && !normalizedEventIsBlocked(e) && normalizedEventIsUpcoming(e,now))
    .map(e=>({
      ...e,
      ticketOptions:Array.isArray(e.ticketOptions)&&e.ticketOptions.length
        ? e.ticketOptions
        : (e.url?[{url:String(e.url),name:String(e.name||"Ticket"),eventId:String(e.id||"")}]:[])
    })));
}
function normalizeEvents(events) {
  return sanitizeNormalizedEvents((Array.isArray(events)?events:[]).map(normalizeEvent).filter(Boolean));
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

const TM_DAILY_GUARD_DEFAULT = 2500;
const TM_INTERACTIVE_GUARD_DEFAULT = 600;
const TM_MIN_INTERVAL_MS = 550;
const TM_ORIGIN_INTERACTIVE_RESERVE = 1000;
const TM_ORIGIN_SCHEDULED_RESERVE = 500;
let tmSharedLastFetchAt = 0;
let tmGate = Promise.resolve();
const tmOriginInflight = new Map();
/* Free Workers KV allows only 1,000 writes/day. The old quota guard wrote
   1-3 KV keys for EVERY Ticketmaster origin call, so background map refreshes
   could burn the entire free allowance even with very little site traffic.
   Reserve quota in coarse leases instead: one KV write covers many origin calls. */
const TM_GLOBAL_LEASE_SIZE = 25;
const TM_INTERACTIVE_LEASE_SIZE = 10;
let tmGlobalLease = { day:"", left:0 };
let tmInteractiveLease = { day:"", left:0 };
let tmObservedAvailable = Number.NaN;
let tmObservedAt = 0;

async function readBudget(env,key) {
  try{ return Number(await env.DESK.get(key))||0; }catch(e){ return 0; }
}
async function writeBudget(env,key,value) {
  try{ await env.DESK.put(key,String(value),{expirationTtl:172800}); }catch(e){}
}
async function consumeBudgetLease(env,key,limit,lease,chunk,scope){
  const day=new Date().toISOString().slice(0,10);
  if(lease.day===day && lease.left>0){
    lease.left-=1;
    return;
  }
  const used=await readBudget(env,key+day);
  if(used>=limit){
    throw Object.assign(new Error("ticketmaster_budget_guard"),{status:429,scope});
  }
  const reserve=Math.max(1,Math.min(chunk,limit-used));
  await writeBudget(env,key+day,used+reserve);
  lease.day=day;
  lease.left=reserve-1;
}

async function reserveTicketmasterCall(env, scope="interactive") {
  if (!env?.DESK) return;

  // Ticketmaster's own Rate-Limit-Available header is more authoritative than
  // our soft KV counter (which is intentionally only a safety estimate).
  const observed=await kvGetJson(env,"ticketmaster:quota:last");
  const observedAt=Date.parse(observed?.observedAt||0)||0;
  const observedAvailable=Number(observed?.available);
  if(Number.isFinite(observedAvailable)){
    tmObservedAvailable=observedAvailable;
    tmObservedAt=observedAt;
  }
  const rawReset=Number(observed?.reset);
  const resetMs=Number.isFinite(rawReset)
    ? (rawReset>1e12 ? rawReset : rawReset>1e9 ? rawReset*1000 : 0)
    : 0;
  const originWindowStillActive=!resetMs || Date.now()<resetMs;
  if(observed?.headerObserved===true &&
     originWindowStillActive &&
     Date.now()-observedAt<12*60*60*1000 &&
     Number.isFinite(observedAvailable)){
    const floor=scope==="interactive" ? TM_ORIGIN_INTERACTIVE_RESERVE : TM_ORIGIN_SCHEDULED_RESERVE;
    if(observedAvailable<=floor){
      throw Object.assign(new Error("ticketmaster_budget_guard"),{
        status:429,scope,originAvailable:observedAvailable
      });
    }
  }

  const configured=Number(env.TICKETMASTER_DAILY_BUDGET);
  const globalLimit=Number.isFinite(configured) && configured>0
    ? Math.max(100,Math.floor(configured))
    : TM_DAILY_GUARD_DEFAULT;
  const configuredInteractive=Number(env.TICKETMASTER_INTERACTIVE_DAILY_BUDGET);
  const interactiveLimit=Number.isFinite(configuredInteractive) && configuredInteractive>0
    ? Math.max(50,Math.floor(configuredInteractive))
    : TM_INTERACTIVE_GUARD_DEFAULT;

  await consumeBudgetLease(
    env,"ticketmaster:daily:global:",globalLimit,
    tmGlobalLease,TM_GLOBAL_LEASE_SIZE,"global"
  );
  if(scope==="interactive"){
    await consumeBudgetLease(
      env,"ticketmaster:daily:interactive:",interactiveLimit,
      tmInteractiveLease,TM_INTERACTIVE_LEASE_SIZE,"interactive"
    );
  }
}

async function tmJson(url, env, scope="interactive") {
  const requestUrl=url.toString();
  const inflightKey=scope+"|"+requestUrl;
  const existing=tmOriginInflight.get(inflightKey);
  if(existing) return existing;

  const run = tmGate.catch(()=>{}).then(async()=>{
    await reserveTicketmasterCall(env,scope);
    const configuredInterval=Number(env?.TICKETMASTER_MIN_INTERVAL_MS);
    const minInterval=Number.isFinite(configuredInterval) && configuredInterval>=0
      ? configuredInterval
      : (String(env?.TICKETMASTER_API_KEY||"")==="test" ? 0 : TM_MIN_INTERVAL_MS);
    const wait=Math.max(0,minInterval-(Date.now()-tmSharedLastFetchAt));
    if(wait) await new Promise(resolve=>setTimeout(resolve,wait));

    const configuredTimeout=Number(env?.TICKETMASTER_FETCH_TIMEOUT_MS);
    const timeoutMs=Number.isFinite(configuredTimeout) && configuredTimeout>=1000
      ? Math.min(30000,Math.floor(configuredTimeout))
      : 12000;
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),timeoutMs);

    let res;
    try {
      res = await fetch(requestUrl, {
        headers: { "Accept":"application/json", "User-Agent":"music98.news/1.0" },
        signal:controller.signal,
      });
      tmSharedLastFetchAt=Date.now();
    } catch {
      throw Object.assign(new Error("ticketmaster_unavailable"), { status:502 });
    } finally {
      clearTimeout(timer);
    }

    // Ticketmaster exposes authoritative quota state in response headers.
    // Keep the latest observed value in KV as a second safety signal.
    const availableHeader=res.headers?.get?.("Rate-Limit-Available");
    const availableText=availableHeader==null ? "" : String(availableHeader).trim();
    const available=availableText ? Number(availableText) : Number.NaN;
    const reset=String(res.headers?.get?.("Rate-Limit-Reset")||"");
    if(Number.isFinite(available) && env?.DESK){
      /* Persist only meaningful quota checkpoints. Previously this wrote on
         every Ticketmaster response and was a major source of the 1,000/day
         Free KV write exhaustion. Reads are cheap; writes stay sparse. */
      const now=Date.now();
      const quotaFloor=scope==="interactive" ? TM_ORIGIN_INTERACTIVE_RESERVE : TM_ORIGIN_SCHEDULED_RESERVE;
      const shouldPersist=
        !Number.isFinite(tmObservedAvailable) ||
        available<=quotaFloor ||
        available<=tmObservedAvailable-25 ||
        now-tmObservedAt>=30*60*1000;
      if(shouldPersist){
        tmObservedAvailable=available;
        tmObservedAt=now;
        kvPutJson(env,"ticketmaster:quota:last",{
          available,reset,headerObserved:true,observedAt:new Date(now).toISOString()
        },{expirationTtl:172800}).catch(()=>{});
      }
    }

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      const err = new Error("ticketmaster_error");
      err.status = res.status;
      err.detail = detail.slice(0, 300);
      throw err;
    }
    return res.json();
  });

  tmOriginInflight.set(inflightKey,run);
  tmGate=run.catch(()=>{});
  try{
    return await run;
  }finally{
    if(tmOriginInflight.get(inflightKey)===run) tmOriginInflight.delete(inflightKey);
  }
}
async function tmEventPages(url, env, maxPages = 5, scope = "interactive") {
  const first = await tmJson(url, env, scope);
  const totalPages = Math.max(1, Number(first?.page?.totalPages || 1));
  const pages = [first];
  const limit = Math.min(Math.max(1, Number(maxPages || 1)), 5, totalPages);

  for (let page = 1; page < limit; page++) {
    const nextUrl = new URL(url.toString());
    nextUrl.searchParams.set("page", String(page));
    try {
      pages.push(await tmJson(nextUrl, env, scope));
    } catch (err) {
      // First page is still useful. Avoid turning a single later-page failure
      // into an empty map/card; expose that the result is partial instead.
      break;
    }
  }

  const events = [];
  const seen = new Set();
  for (const raw of pages) {
    for (const ev of raw?._embedded?.events || []) {
      const id = String(ev?.id || "");
      if (id && seen.has(id)) continue;
      if (id) seen.add(id);
      events.push(ev);
    }
  }
  return {
    events,
    page:first?.page || {size:events.length,totalElements:events.length,totalPages:1,number:0},
    partial:pages.length < totalPages,
    pagesFetched:pages.length,
  };
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
    return artists.length >= POPULAR_LIMIT
      ? { artists, source: "spotify_monthly_listeners" }
      : { artists: [], source: "spotify_monthly_unavailable" };
  } catch {
    return { artists: [], source: "spotify_monthly_unavailable" };
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

function attractionUpcomingTotal(attraction){
  const upcoming=attraction?.upcomingEvents;
  if(!upcoming || typeof upcoming!=="object") return 0;
  const direct=Number(upcoming._total);
  if(Number.isFinite(direct)) return Math.max(0,direct);
  let total=0;
  for(const [key,value] of Object.entries(upcoming)){
    if(key.startsWith("_")) continue;
    const n=Number(value);
    if(Number.isFinite(n) && n>0) total+=n;
  }
  return total;
}
function attractionIsMusic(attraction){
  const classifications=Array.isArray(attraction?.classifications) ? attraction.classifications : [];
  if(!classifications.length) return true;
  return classifications.some(x=>normName(x?.segment?.name)==="music");
}
async function popularValidationEventsForAttraction(env, attractionId) {
  const eventsUrl = baseEventUrl(env.TICKETMASTER_API_KEY);
  eventsUrl.searchParams.set("attractionId", String(attractionId));
  eventsUrl.searchParams.set("size", "200");
  eventsUrl.searchParams.set("sort", "date,asc");
  eventsUrl.searchParams.set("locale", "en-us,en,*");
  const eventsRaw = await tmJson(eventsUrl, env, "scheduled");
  const events = eventsRaw?._embedded?.events || [];
  const rawTotal = Number(eventsRaw?.page?.totalElements ?? events.length) || 0;
  return {eventsRaw,rawTotal,normalizedEvents:normalizeEvents(events)};
}

async function popularValidationKeywordFallback(env,name,wanted){
  const eventsUrl=baseEventUrl(env.TICKETMASTER_API_KEY);
  eventsUrl.searchParams.set("keyword",name);
  eventsUrl.searchParams.set("size","200");
  eventsUrl.searchParams.set("sort","date,asc");
  eventsUrl.searchParams.set("locale","en-us,en,*");
  const eventsRaw=await tmJson(eventsUrl,env,"scheduled");
  const rawEvents=eventsRaw?._embedded?.events||[];
  const matchingRaw=rawEvents.filter(e=>
    (Array.isArray(e?._embedded?.attractions)?e._embedded.attractions:[])
      .some(a=>normName(a?.name)===wanted)
  );
  const normalizedEvents=normalizeEvents(matchingRaw);
  const exactEventAttraction=matchingRaw
    .flatMap(e=>Array.isArray(e?._embedded?.attractions)?e._embedded.attractions:[])
    .find(a=>normName(a?.name)===wanted);
  return {eventsRaw,rawTotal:normalizedEvents.length,normalizedEvents,exactEventAttraction};
}

async function validatePopularArtist(env, name, popularityRank, listeners) {
  const tm = new URL(TM_ATTRACTIONS_ROOT);
  tm.searchParams.set("apikey", env.TICKETMASTER_API_KEY);
  tm.searchParams.set("keyword", name);
  tm.searchParams.set("size", "50");
  tm.searchParams.set("locale", "en-us,en,*");

  const raw = await tmJson(tm, env, "scheduled");
  const wanted = normName(name);
  const attractions = raw?._embedded?.attractions || [];
  const exactMatches = attractions
    .filter(a=>normName(a?.name)===wanted && attractionIsMusic(a) && a?.id)
    .sort((a,b)=>attractionUpcomingTotal(b)-attractionUpcomingTotal(a));

  let exact=null;
  let eventsRaw=null;
  let normalizedEvents=[];
  let rawTotal=0;
  let evidence="";

  for(const candidate of exactMatches.slice(0,3)){
    const result=await popularValidationEventsForAttraction(env,candidate.id);
    if(!result.normalizedEvents.length) continue;
    exact=candidate;
    eventsRaw=result.eventsRaw;
    normalizedEvents=result.normalizedEvents;
    rawTotal=result.rawTotal;
    evidence="popular_validation_attraction_events";
    break;
  }

  if(!normalizedEvents.length){
    const fallback=await popularValidationKeywordFallback(env,name,wanted);
    if(fallback.normalizedEvents.length && fallback.exactEventAttraction?.id){
      exact=fallback.exactEventAttraction;
      eventsRaw=fallback.eventsRaw;
      normalizedEvents=fallback.normalizedEvents;
      rawTotal=fallback.rawTotal;
      evidence="popular_validation_keyword_events";
    }
  }

  if(!exact?.id || !normalizedEvents.length) return null;

  const first=normalizedEvents[0];
  const builtAt=new Date().toISOString();
  await kvPutJson(env,popularTourCacheKey(exact.id),{
    ok:true,
    events:normalizedEvents,
    page:evidence==="popular_validation_keyword_events"
      ? {size:normalizedEvents.length,totalElements:normalizedEvents.length,totalPages:1,number:0}
      : (eventsRaw?.page||{size:normalizedEvents.length,totalElements:rawTotal,totalPages:1,number:0}),
    partial:evidence==="popular_validation_keyword_events" ? false : normalizedEvents.length<rawTotal,
    pagesFetched:1,
    query:{attractionId:String(exact.id)},
    builtAt,
    artistId:String(exact.id),
    evidence
  },{expirationTtl:36*60*60}).catch(()=>{});

  return {
    id:String(exact.id),
    name:String(exact.name||name),
    image:bestArtistImage(exact.images) || String(first?.artistImage||first?.image||""),
    popularityRank,
    listeners,
    shows:normalizedEvents.length,
    firstDate:String(first?.date||""),
    eventConfirmed:true,
  };
}

const HOTSPOT_BUILD_JOB_BUDGET = 2;
const HOTSPOT_VERIFY_BUDGET = 10;
const HOTSPOT_CACHE_TTL = 24 * 60 * 60;
const HOTSPOT_VENUE_CACHE_PREFIX = "concert-hotspots:v19:venue:";
const HOTSPOT_CITY_CACHE_PREFIX = "concert-hotspots:v19:city:";
async function hotspotTmJson(url, env) {
  const out = await tmJson(url, env, "scheduled");
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
async function kvDelete(env,key){
  if(!env?.DESK?.delete) return;
  try{await env.DESK.delete(key);}catch(e){}
}

const POPULAR_BUILD_ALGORITHM="rank-ordered-event-query-v2";
function newPopularBuildState(ranking,now=Date.now()){
  return {
    version:"popular-v4",
    algorithm:POPULAR_BUILD_ALGORITHM,
    startedAt:new Date(now).toISOString(),
    updatedAt:new Date(now).toISOString(),
    source:ranking.source,
    ranking:"Spotify monthly listeners",
    candidates:ranking.artists.slice(0,POPULAR_CANDIDATE_LIMIT),
    index:0,
    found:[],
    errors:0,
  };
}

async function cachedPopularEventEvidence(env,existing){
  const byName=new Map();

  const put=(name,value)=>{
    const key=normName(name);
    if(!key || !value?.id) return;
    const prev=byName.get(key);
    const nextShows=Number(value.shows||0);
    if(nextShows<=0) return;
    if(!prev || Number(prev.shows||0)<nextShows) byName.set(key,value);
  };

  const existingArtists=Array.isArray(existing?.artists)?existing.artists.filter(a=>a?.id && a?.name):[];
  const tourRows=await Promise.all(existingArtists.map(async artist=>[
    artist,
    await kvGetJson(env,popularTourCacheKey(artist.id))
  ]));
  for(const [artist,payload] of tourRows){
    const events=sanitizeNormalizedEvents(payload?.events);
    if(!prewarmFresh(payload) || !events.length) continue;
    const first=events[0]||{};
    put(artist.name,{
      id:String(artist.id),
      name:String(artist.name),
      image:String(artist.image||first.artistImage||first.image||""),
      shows:events.length,
      firstDate:String(first.date||""),
      eventConfirmed:true,
      evidence:"ticketmaster_cached_tour",
    });
  }

  const capitalPayloads=await Promise.all(EUROPE_CAPITAL_SEEDS.map(async seed=>[
    seed,
    await kvGetJson(env,capitalEventCacheKey(seed.city,seed.countryCode))
  ]));
  const capitalCounts=new Map();
  for(const [,payload] of capitalPayloads){
    const events=sanitizeNormalizedEvents(payload?.events);
    if(!prewarmFresh(payload) || !events.length) continue;
    for(const ev of events){
      const name=String(ev?.artist||"").trim();
      const id=String(ev?.attractionId||"").trim();
      if(!name || !id) continue;
      const key=normName(name);
      if(!key) continue;
      const prev=capitalCounts.get(key);
      if(!prev){
        capitalCounts.set(key,{
          id,name,
          image:String(ev?.artistImage||ev?.image||""),
          shows:1,
          firstDate:String(ev?.date||""),
          eventConfirmed:true,
          evidence:"ticketmaster_cached_capital_event",
        });
      }else{
        prev.shows=Number(prev.shows||0)+1;
        if(!prev.image) prev.image=String(ev?.artistImage||ev?.image||"");
        if(!prev.firstDate || (ev?.date && String(ev.date)<prev.firstDate)) prev.firstDate=String(ev.date);
      }
    }
  }
  for(const rec of capitalCounts.values()) put(rec.name,rec);

  return byName;
}

export async function refreshPopularSnapshot(env, force = false) {
  if (!env?.TICKETMASTER_API_KEY || !env?.DESK) {
    return { ok:false, reason:"popular_storage_or_key_missing" };
  }

  const existing = await kvGetJson(env, POPULAR_SNAPSHOT_KEY);
  let state = await kvGetJson(env, POPULAR_STATE_KEY);
  const age = Date.now() - (Date.parse(existing?.builtAt || 0) || 0);

  if(!force && !state && existing?.version==="popular-v4" &&
     existing?.algorithm===POPULAR_BUILD_ALGORITHM &&
     existing?.source==="spotify_monthly_listeners" &&
     existing?.eligibility==="ticketmaster_event_payload_gt_0" &&
     existing?.artists?.length>=POPULAR_LIMIT &&
     existing.artists.every(a=>a?.eventConfirmed===true && Number(a?.shows||0)>0) &&
     age < POPULAR_REFRESH_MS){
    return { ok:true, fresh:true, complete:true, artists:existing.artists.length };
  }

  if(force || !state || state.version!=="popular-v4" ||
     state.algorithm!==POPULAR_BUILD_ALGORITHM ||
     !Array.isArray(state.candidates) || !Array.isArray(state.found)){
    const ranking=await kworbArtists();
    if(ranking.source!=="spotify_monthly_listeners"){
      // Never publish or continue from a hard-coded/stale popularity ranking.
      // Keep a previously published real Spotify snapshot if one exists and
      // retry the live ranking source on the next scheduled pass.
      await kvDelete(env,POPULAR_STATE_KEY);
      const keptExisting=existing?.source==="spotify_monthly_listeners" &&
        existing?.eligibility==="ticketmaster_event_payload_gt_0" &&
        Array.isArray(existing?.artists) && existing.artists.length>=POPULAR_LIMIT;
      return {
        ok:false,retry:true,keptExisting,
        reason:"popular_ranking_source_unavailable",
        artists:keptExisting ? existing.artists.length : 0
      };
    }
    state=newPopularBuildState(ranking);

    // A partial snapshot must be resumed, not treated as a finished daily
    // result. Reuse already-validated artists and continue after the last
    // candidate the previous build reached so an 8/30 snapshot cannot freeze
    // for the rest of the day or repeatedly restart from rank 1.
    if(!force &&
       existing?.version==="popular-v4" &&
       existing?.eligibility==="ticketmaster_event_payload_gt_0" &&
       existing?.source===ranking.source &&
       existing?.algorithm===POPULAR_BUILD_ALGORITHM &&
       Array.isArray(existing?.artists) &&
       existing.artists.length>0 &&
       existing.artists.length<POPULAR_LIMIT &&
       age<POPULAR_REFRESH_MS){
      state.found=existing.artists.map(a=>({...a}));
      const rankedMax=state.found.reduce((m,a)=>Math.max(m,Number(a?.popularityRank||0)),0);
      const storedCursor=Number(existing.candidateCount||0);
      const resumeAt=Math.max(rankedMax,Number.isFinite(storedCursor)?storedCursor:0);
      state.index=Math.max(0,Math.min(state.candidates.length,resumeAt));
    }
  }

  // POPULAR_CANDIDATE_LIMIT was increased after some v4 states already existed
  // in KV. Extend an exhausted legacy candidate array in place instead of
  // leaving a 27/30 build permanently parked at the old cursor.
  if(!force &&
     state?.version==="popular-v4" &&
     Array.isArray(state.candidates) &&
     Array.isArray(state.found) &&
     state.found.length<POPULAR_LIMIT &&
     state.index>=state.candidates.length &&
     state.candidates.length<POPULAR_CANDIDATE_LIMIT){
    const ranking=await kworbArtists();
    if(ranking.source===state.source){
      const expanded=ranking.artists.slice(0,POPULAR_CANDIDATE_LIMIT);
      if(expanded.length>state.candidates.length){
        state.candidates=expanded;
        state.updatedAt=new Date().toISOString();
        await kvPutJson(env,POPULAR_STATE_KEY,state);
      }
    }
  }

  // Reuse recent real Ticketmaster event payloads only when the ranked
  // candidate reaches the cursor. Pre-filling all cached artists can let lower
  // ranks fill Top 30 before higher-ranked candidates are checked.
  const cachedEvidence=await cachedPopularEventEvidence(env,existing);

  let processed=0;
  while(state.index<state.candidates.length &&
        state.found.length<POPULAR_LIMIT &&
        processed<POPULAR_BATCH_SIZE){
    const candidate=state.candidates[state.index++];

    if(state.found.some(x=>normName(x?.name)===normName(candidate.name))) continue;

    const evidence=cachedEvidence.get(normName(candidate?.name));
    if(evidence){
      if(!state.found.some(x=>String(x?.id||"")===String(evidence.id))){
        state.found.push({
          ...evidence,
          name:String(evidence.name||candidate.name),
          popularityRank:Number(candidate.rank||999999),
          listeners:Number(candidate.listeners||0),
          eventConfirmed:true,
        });
      }
      continue;
    }

    processed++;
    try{
      const artist=await validatePopularArtist(
        env,candidate.name,candidate.rank,candidate.listeners
      );
      if(artist && !state.found.some(x=>x.id===artist.id)) state.found.push(artist);
    }catch(err){
      state.errors=Number(state.errors||0)+1;
      const status=Number(err?.status||0);
      const transient=err?.message==="ticketmaster_budget_guard" ||
        err?.message==="ticketmaster_unavailable" || status===429 || status>=500;

      // A transient origin/quota failure must not silently discard a ranked
      // candidate. Rewind the cursor so the next cron retries the same artist.
      if(transient) state.index=Math.max(0,state.index-1);
      state.updatedAt=new Date().toISOString();
      await kvPutJson(env,POPULAR_STATE_KEY,state);

      if(transient){
        return {
          ok:false,retry:true,status,
          processed,index:state.index,found:state.found.length
        };
      }
    }
  }

  state.updatedAt=new Date().toISOString();
  const complete=state.found.length>=POPULAR_LIMIT || state.index>=state.candidates.length;

  if(!complete){
    await kvPutJson(env,POPULAR_STATE_KEY,state);
    return {
      ok:true,fresh:false,complete:false,processed,
      index:state.index,totalCandidates:state.candidates.length,found:state.found.length
    };
  }

  const artists=state.found
    .slice()
    .filter(a=>a?.eventConfirmed===true && Number(a?.shows||0)>0)
    .sort((a,b)=>Number(a.popularityRank||999999)-Number(b.popularityRank||999999))
    .slice(0,POPULAR_LIMIT)
    .map((a,i)=>({
    id:a.id,name:a.name,image:a.image,rank:i+1,
    popularityRank:a.popularityRank,listeners:a.listeners,shows:Number(a.shows||0),firstDate:a.firstDate,eventConfirmed:true,
  }));

  // A public Popular snapshot is atomic: publish only a complete strict Top 30.
  // Keep the previous snapshot while a new daily build is still short, so a
  // 27/30 rebuild can never replace a healthy 30/30 list.
  if(artists.length<POPULAR_LIMIT){
    state.failedAt=new Date().toISOString();
    await kvPutJson(env,POPULAR_STATE_KEY,state,{expirationTtl:21600});
    return {
      ok:false,fresh:false,complete:true,
      keptExisting:Array.isArray(existing?.artists) && existing.artists.length>=POPULAR_LIMIT,
      reason:"popular_refresh_incomplete",artists:artists.length,targetCount:POPULAR_LIMIT
    };
  }

  const snapshot={
    ok:true,mode:"popular",version:"popular-v4",
    algorithm:POPULAR_BUILD_ALGORITHM,
    builtAt:new Date().toISOString(),
    artists,
    source:state.source,
    ranking:state.ranking,
    eligibility:"ticketmaster_event_payload_gt_0",
    candidateCount:state.index,
    eligibleCount:artists.length,
    targetCount:POPULAR_LIMIT,
  };
  await kvPutJson(env,POPULAR_SNAPSHOT_KEY,snapshot);
  await kvDelete(env,POPULAR_STATE_KEY);
  return {ok:true,fresh:false,complete:true,artists:artists.length,processed};
}

function isTransientTicketmasterError(err){
  const status=Number(err?.status||0);
  return err?.message==="ticketmaster_budget_guard" ||
    err?.message==="ticketmaster_unavailable" ||
    status===429 || status>=500;
}
function prewarmFresh(payload,now=Date.now()){
  const built=Date.parse(payload?.builtAt||0)||0;
  return !!built && now-built<PREWARM_MAX_AGE_MS && Array.isArray(payload?.events);
}
function popularTourCacheKey(id){
  return POPULAR_TOUR_PREFIX+encodeURIComponent(String(id||"").trim());
}
function capitalEventCacheKey(city,countryCode){
  return CAPITAL_EVENTS_PREFIX+encodeURIComponent(
    String(countryCode||"").trim().toUpperCase()+"|"+String(city||"").trim().toLowerCase()
  );
}
async function scheduledEventPayload(env,params){
  const tm=baseEventUrl(env.TICKETMASTER_API_KEY);
  tm.searchParams.set("size","200");
  tm.searchParams.set("sort","date,asc");
  if(params.attractionId){
    tm.searchParams.set("attractionId",params.attractionId);
  }else{
    tm.searchParams.set("city",params.city);
    tm.searchParams.set("countryCode",params.countryCode);
  }
  const merged=await tmEventPages(tm,env,5,"scheduled");
  const events=normalizeEvents(merged.events);
  return {
    ok:true,
    events,
    page:merged.page||{size:events.length,totalElements:events.length,totalPages:1,number:0},
    partial:!!merged.partial,
    pagesFetched:Number(merged.pagesFetched||1),
    query:params.attractionId ? {attractionId:params.attractionId} : {city:params.city,countryCode:params.countryCode},
    builtAt:new Date().toISOString(),
  };
}

export async function refreshPopularTourSnapshots(env,budget=4){
  if(!env?.TICKETMASTER_API_KEY || !env?.DESK) return {ok:false,reason:"tour_prewarm_missing_env"};
  const popular=await kvGetJson(env,POPULAR_SNAPSHOT_KEY);
  if(!popular?.artists?.length) return {ok:false,reason:"popular_snapshot_missing"};

  let state=await kvGetJson(env,POPULAR_TOUR_STATE_KEY);
  if(!state || state.version!=="popular-tours-v1" || state.sourceBuiltAt!==popular.builtAt){
    state={version:"popular-tours-v1",sourceBuiltAt:popular.builtAt,index:0,updatedAt:new Date().toISOString()};
  }else if(state.complete){
    return {ok:true,complete:true,fresh:true,index:state.index,total:popular.artists.length,processed:0};
  }

  let processed=0;
  const limit=Math.max(1,Math.min(6,Number(budget)||4));
  while(state.index<popular.artists.length && processed<limit){
    const artist=popular.artists[state.index++];
    if(!artist?.id) continue;
    const key=popularTourCacheKey(artist.id);
    const cached=await kvGetJson(env,key);
    // A fresh validation-seeded tour cache is just as useful as a later
    // prewarm. Skipping it must not consume the one-origin-call cron budget.
    const cachedEvents=sanitizeNormalizedEvents(cached?.events);
    if(prewarmFresh(cached) && cachedEvents.length) continue;
    processed++;
    try{
      const payload=await scheduledEventPayload(env,{attractionId:artist.id});
      payload.sourceBuiltAt=popular.builtAt;
      payload.artistId=artist.id;
      await kvPutJson(env,key,payload,{expirationTtl:36*60*60});
    }catch(err){
      if(isTransientTicketmasterError(err)){
        state.index=Math.max(0,state.index-1);
        state.updatedAt=new Date().toISOString();
        await kvPutJson(env,POPULAR_TOUR_STATE_KEY,state,{expirationTtl:172800});
        return {ok:false,retry:true,status:Number(err?.status||0),index:state.index,processed};
      }
      // A permanently invalid attraction must not block all later prewarms.
    }
  }

  state.updatedAt=new Date().toISOString();
  state.complete=state.index>=popular.artists.length;
  await kvPutJson(env,POPULAR_TOUR_STATE_KEY,state,{expirationTtl:172800});
  return {ok:true,complete:state.complete,index:state.index,total:popular.artists.length,processed};
}

export async function refreshCapitalEventSnapshots(env,budget=2){
  if(!env?.TICKETMASTER_API_KEY || !env?.DESK) return {ok:false,reason:"capital_prewarm_missing_env"};
  let state=await kvGetJson(env,CAPITAL_EVENTS_STATE_KEY);
  const cycle=new Date().toISOString().slice(0,10);
  if(!state || state.version!=="capital-events-v1" || state.cycle!==cycle){
    state={version:"capital-events-v1",cycle,index:0,updatedAt:new Date().toISOString()};
  }

  let processed=0;
  const limit=Math.max(1,Math.min(4,Number(budget)||2));
  while(state.index<EUROPE_CAPITAL_SEEDS.length && processed<limit){
    const capital=EUROPE_CAPITAL_SEEDS[state.index++];
    processed++;
    const key=capitalEventCacheKey(capital.city,capital.countryCode);
    const cached=await kvGetJson(env,key);
    if(prewarmFresh(cached)) continue;
    try{
      const payload=await scheduledEventPayload(env,{city:capital.city,countryCode:capital.countryCode});
      payload.capital=true;
      await kvPutJson(env,key,payload,{expirationTtl:36*60*60});
    }catch(err){
      if(isTransientTicketmasterError(err)){
        state.index=Math.max(0,state.index-1);
        state.updatedAt=new Date().toISOString();
        await kvPutJson(env,CAPITAL_EVENTS_STATE_KEY,state,{expirationTtl:172800});
        return {ok:false,retry:true,status:Number(err?.status||0),index:state.index,processed};
      }
      // Unsupported/invalid market: skip it and continue the rest of Europe.
    }
  }

  state.updatedAt=new Date().toISOString();
  state.complete=state.index>=EUROPE_CAPITAL_SEEDS.length;
  await kvPutJson(env,CAPITAL_EVENTS_STATE_KEY,state,{expirationTtl:172800});
  await capitalHubSnapshot(env,true).catch(()=>null);
  return {ok:true,complete:state.complete,index:state.index,total:EUROPE_CAPITAL_SEEDS.length,processed};
}

async function capitalHubSnapshot(env, force=false){
  const stored=await kvGetJson(env,CAPITAL_HUB_SNAPSHOT_KEY);
  const storedAge=Date.now()-(Date.parse(stored?.builtAt||0)||0);
  if(!force && stored?.version==="capital-hubs-v1" && Array.isArray(stored.hotspots) && storedAge<2*60*60*1000){
    return stored;
  }

  const rows=await Promise.all(EUROPE_CAPITAL_SEEDS.map(async seed=>{
    const payload=await kvGetJson(env,capitalEventCacheKey(seed.city,seed.countryCode));
    const count=Number(payload?.page?.totalElements||payload?.events?.length||0);
    if(count<HOTSPOT_THRESHOLD) return null;
    return {
      city:seed.city,stateCode:"",countryCode:seed.countryCode,
      lat:Number(seed.lat),lng:Number(seed.lng),count
    };
  }));
  const hotspots=rows.filter(Boolean).sort((a,b)=>Number(b.count||0)-Number(a.count||0));
  const snapshot={version:"capital-hubs-v1",builtAt:new Date().toISOString(),hotspots};
  if(hotspots.length) await kvPutJson(env,CAPITAL_HUB_SNAPSHOT_KEY,snapshot,{expirationTtl:6*60*60}).catch(()=>{});
  return snapshot;
}

async function marketSeedResult(env,seed){
  const searchRadius=seed.kind==="state_capital" ? 45 : 60;
  const tm=baseEventUrl(env.TICKETMASTER_API_KEY);
  tm.searchParams.set("size","1");
  tm.searchParams.set("sort","date,asc");
  tm.searchParams.set("geoPoint",geohash(Number(seed.lat),Number(seed.lng),8));
  tm.searchParams.set("radius",String(searchRadius));
  tm.searchParams.set("unit","km");
  tm.searchParams.set("countryCode",seed.countryCode);
  if(seed.stateCode) tm.searchParams.set("stateCode",seed.stateCode);

  const raw=await tmJson(tm,env,"scheduled");
  const events=raw?._embedded?.events||[];
  const total=Number(raw?.page?.totalElements ?? events.length) || 0;
  if(total<=0) return null;
  const first=events[0]||{};
  return {
    city:seed.city,
    stateCode:seed.stateCode||"",
    countryCode:seed.countryCode,
    lat:Number(seed.lat),
    lng:Number(seed.lng),
    count:total,
    radiusKm:searchRadius,
    firstDate:String(first?.dates?.start?.localDate||""),
    verified:true,
    pinned:1,
    tier:seed.kind==="state_capital"?2:1,
  };
}

export async function refreshMapMarketSnapshot(env, force=false){
  if(!env?.TICKETMASTER_API_KEY || !env?.DESK) return {ok:false,reason:"market_snapshot_missing_env"};

  const cycle=new Date().toISOString().slice(0,10);
  let state=await kvGetJson(env,MAP_MARKET_STATE_KEY);
  if(force || !state || state.version!==MAP_MARKET_VERSION || state.cycle!==cycle){
    state={version:MAP_MARKET_VERSION,cycle,index:0,markets:[],audit:[],coverageAudit:marketCoverageAudit(),updatedAt:new Date().toISOString()};
  }else if(state.complete && (!Array.isArray(state.audit) || state.audit.length<ORDERED_MAP_MARKET_SEEDS.length)){
    state={...state,index:0,complete:false,audit:[],coverageAudit:marketCoverageAudit(),updatedAt:new Date().toISOString()};
  }else if(state.complete){
    return {ok:true,complete:true,fresh:true,index:state.index,total:ORDERED_MAP_MARKET_SEEDS.length,processed:0,found:Array.isArray(state.markets)?state.markets.length:0};
  }
  if(!Array.isArray(state.audit)) state.audit=[];
  if(!Array.isArray(state.coverageAudit)) state.coverageAudit=marketCoverageAudit();

  const seen=new Map(
    (Array.isArray(state.markets)?state.markets:[])
      .map(x=>[String(x.city||"").toLowerCase()+"|"+String(x.stateCode||"").toUpperCase()+"|"+String(x.countryCode||"").toUpperCase(),x])
  );

  let processed=0;
  while(state.index<ORDERED_MAP_MARKET_SEEDS.length && processed<MAP_MARKET_BATCH_SIZE){
    const seed=ORDERED_MAP_MARKET_SEEDS[state.index++];
    processed++;
    try{
      const row=await marketSeedResult(env,seed);
      const key=mapMarketSeedKey(seed);
      if(row){
        seen.set(key,row);
        appendMarketAudit(state,seed,{outcome:"included",reason:"upcoming_events",count:Number(row.count||0)});
      }else{
        seen.delete(key);
        appendMarketAudit(state,seed,{outcome:"excluded",reason:"no_upcoming_events",count:0});
      }
    }catch(err){
      if(isTransientTicketmasterError(err)){
        state.index=Math.max(0,state.index-1);
        state.markets=[...seen.values()];
        state.updatedAt=new Date().toISOString();
        await kvPutJson(env,MAP_MARKET_STATE_KEY,state,{expirationTtl:3*24*60*60});
        return {ok:false,retry:true,status:Number(err?.status||0),index:state.index,processed,found:state.markets.length};
      }
      seen.delete(mapMarketSeedKey(seed));
      appendMarketAudit(state,seed,{outcome:"excluded",reason:"ticketmaster_error",status:Number(err?.status||0),detail:String(err?.detail||err?.message||"").slice(0,160)});
    }
  }

  state.markets=[...seen.values()]
    .filter(x=>Number(x.count||0)>0)
    .sort((a,b)=>Number(b.count||0)-Number(a.count||0)||String(a.city||"").localeCompare(String(b.city||"")));
  state.updatedAt=new Date().toISOString();
  state.complete=state.index>=ORDERED_MAP_MARKET_SEEDS.length;
  await kvPutJson(env,MAP_MARKET_STATE_KEY,state,{expirationTtl:3*24*60*60});

  if(state.complete){
    const snapshot={
      ok:true,
      mode:"markets",
      version:MAP_MARKET_VERSION,
      cycle,
      builtAt:new Date().toISOString(),
      markets:state.markets,
      candidateCount:ORDERED_MAP_MARKET_SEEDS.length,
      verifiedCount:state.markets.length,
    };
    await kvPutJson(env,MAP_MARKET_SNAPSHOT_KEY,snapshot,{expirationTtl:3*24*60*60});
  }

  return {
    ok:true,
    complete:state.complete,
    index:state.index,
    total:ORDERED_MAP_MARKET_SEEDS.length,
    processed,
    found:state.markets.length,
  };
}

async function marketSnapshotPayload(env){
  const [snapshot,state,legacySnapshot,legacySnapshot2]=await Promise.all([
    kvGetJson(env,MAP_MARKET_SNAPSHOT_KEY),
    kvGetJson(env,MAP_MARKET_STATE_KEY),
    kvGetJson(env,MAP_MARKET_LEGACY_SNAPSHOT_KEY),
    kvGetJson(env,MAP_MARKET_LEGACY2_SNAPSHOT_KEY),
  ]);

  const cycle=new Date().toISOString().slice(0,10);
  const snapshotMarkets=snapshot?.version===MAP_MARKET_VERSION && Array.isArray(snapshot.markets)
    ? snapshot.markets.filter(x=>Number(x?.count||0)>0)
    : [];
  const legacyMarkets=legacySnapshot?.version==="concert-markets-v3" && Array.isArray(legacySnapshot.markets)
    ? legacySnapshot.markets.filter(x=>Number(x?.count||0)>0)
    : [];
  const legacyMarkets2=legacySnapshot2?.version==="concert-markets-v2" && Array.isArray(legacySnapshot2.markets)
    ? legacySnapshot2.markets.filter(x=>Number(x?.count||0)>0)
    : [];
  const currentState=state?.version===MAP_MARKET_VERSION && state?.cycle===cycle && Array.isArray(state.markets);
  const warming=currentState
    ? state.markets.filter(x=>Number(x?.count||0)>0)
    : [];
  const snapshotAt=Date.parse(snapshot?.builtAt||"")||0;
  const stateAt=Date.parse(state?.updatedAt||"")||0;
  const stateIsNewer=currentState && stateAt>=snapshotAt;

  // Do not let yesterday's completed snapshot hide cities already verified by
  // today's scan. Rome is in the first scheduled batch, so once today's state
  // confirms it the public map must see it immediately instead of waiting for
  // the entire global scan to finish.
  const snapshotMatchesCurrentSeedSet=
    Number(snapshot?.candidateCount||0)===ORDERED_MAP_MARKET_SEEDS.length &&
    snapshot?.complete!==false;

  if(snapshotMarkets.length && snapshotMatchesCurrentSeedSet &&
     (!stateIsNewer || state?.complete || !warming.length)){
    return {...snapshot,markets:snapshotMarkets,complete:true};
  }

  let previous=snapshotMarkets;
  let usedLegacyFallback=false;
  if(!snapshotMatchesCurrentSeedSet && (legacyMarkets.length || legacyMarkets2.length)){
    previous=[...legacyMarkets2,...legacyMarkets,...previous];
    usedLegacyFallback=true;
  }
  /* Never replace a previously verified world view with a partial scan.
     v4 scans regions round-robin, so its first batch already contains the US,
     Americas, Europe, Africa, Middle East, Asia and Pacific. While incomplete,
     merge older verified rows underneath; today's verified rows always win. */
  if(!snapshotMatchesCurrentSeedSet || (stateIsNewer && !state?.complete) || !previous.length){
    const fallback=await hotspotSnapshotPayload(env);
    const world=(fallback?.hotspots||[])
      .filter(x=>Number(x?.count||0)>0)
      .map(x=>({...x,verified:true,pinned:1,tier:(String(x?.countryCode||"")==="US"&&x?.stateCode)?2:1}));
    if(world.length){
      previous=[...world,...previous];
      usedLegacyFallback=true;
    }
  }

  const merged=new Map();
  for(const row of [...previous,...warming]){
    const key=String(row?.city||"").toLowerCase()+"|"+String(row?.stateCode||"").toUpperCase()+"|"+String(row?.countryCode||"").toUpperCase();
    if(!key || Number(row?.count||0)<=0) continue;
    merged.set(key,{...row,verified:true,pinned:1});
  }
  const markets=[...merged.values()]
    .sort((a,b)=>Number(b.count||0)-Number(a.count||0)||String(a.city||"").localeCompare(String(b.city||"")));

  return {
    ok:true,
    mode:"markets",
    version:MAP_MARKET_VERSION,
    builtAt:String(stateIsNewer ? state?.updatedAt||"" : snapshot?.builtAt||""),
    markets,
    candidateCount:ORDERED_MAP_MARKET_SEEDS.length,
    verifiedCount:markets.length,
    complete:stateIsNewer ? !!state?.complete : snapshotMarkets.length>0,
    warming:stateIsNewer ? !state?.complete : snapshotMarkets.length===0,
    progress:stateIsNewer ? {index:Number(state?.index||0),total:ORDERED_MAP_MARKET_SEEDS.length} : undefined,
    fallback:usedLegacyFallback,
  };
}

async function popularSnapshotPayload(env) {
  const [snapshot,state]=await Promise.all([
    kvGetJson(env, POPULAR_SNAPSHOT_KEY),
    kvGetJson(env, POPULAR_STATE_KEY),
  ]);

  const strict=(list)=>Array.isArray(list)
    ? list.filter(a=>a?.eventConfirmed===true && Number(a?.shows||0)>0)
        .sort((a,b)=>Number(a?.popularityRank||a?.rank||999999)-Number(b?.popularityRank||b?.rank||999999))
        .slice(0,POPULAR_LIMIT)
        .map((a,i)=>({...a,rank:i+1,shows:Number(a.shows||0),eventConfirmed:true}))
    : [];

  const published=snapshot?.version==="popular-v4" &&
    snapshot?.algorithm===POPULAR_BUILD_ALGORITHM &&
    snapshot?.source==="spotify_monthly_listeners" &&
    snapshot?.eligibility==="ticketmaster_event_payload_gt_0"
      ? strict(snapshot.artists)
      : [];

  // Public UI is atomic: never expose 27/28/29 while the scheduled builder is
  // still working. Keep the last complete Top 30, or show a warming state.
  if(published.length>=POPULAR_LIMIT){
    const age=Date.now()-(Date.parse(snapshot?.builtAt||0)||0);
    return {
      ...snapshot,
      ok:true,
      mode:"popular",
      version:"popular-v4",
      eligibility:"ticketmaster_event_payload_gt_0",
      artists:published,
      targetCount:POPULAR_LIMIT,
      stale:age>30*60*60*1000,
      warming:false,
    };
  }

  const validated=state?.version==="popular-v4" && state?.algorithm===POPULAR_BUILD_ALGORITHM ? strict(state.found).length : 0;
  return {
    ok:true,mode:"popular",version:"popular-v4",builtAt:"",
    artists:[],source:"scheduled",ranking:"Spotify monthly listeners",
    algorithm:POPULAR_BUILD_ALGORITHM,
    eligibility:"ticketmaster_event_payload_gt_0",
    targetCount:POPULAR_LIMIT,validatedCount:validated,stale:false,warming:true
  };
}

function normalizeBuildState(state) {
  if (!state || state.version !== HOTSPOT_VERSION || !Array.isArray(state.queue) ||
      !state.candidates || !state.verified || !Array.isArray(state.verifyQueue)) {
    return freshState();
  }
  return state;
}

async function venuePage(env, apiKey, job, page = 0) {
  if (!validJob(job)) throw new Error("invalid_hotspot_job");
  const cacheKey = HOTSPOT_VENUE_CACHE_PREFIX + String(job.id || "job") + ":" + String(page);
  const cached = await kvGetJson(env, cacheKey);
  if (cached) return cached;

  const tm = new URL(TM_VENUES_ROOT);
  tm.searchParams.set("apikey", apiKey);
  tm.searchParams.set("countryCode", job.countryCode);
  if (job.stateCode) tm.searchParams.set("stateCode", job.stateCode);

  if (job.kind === "geo") {
    const circle = jobSearchCircle(job);
    if (!circle) throw new Error("invalid_hotspot_job");
    tm.searchParams.set("geoPoint", geohash(circle.lat, circle.lng, 8));
    tm.searchParams.set("radius", String(Math.ceil(circle.radius)));
    tm.searchParams.set("unit", "km");
    tm.searchParams.set("sort", "distance,asc");
  } else {
    tm.searchParams.set("sort", "name,asc");
  }

  tm.searchParams.set("includeTest", "no");
  tm.searchParams.set("size", "200");
  tm.searchParams.set("page", String(page));
  tm.searchParams.set("locale", "en-us,en,*");

  const raw = await hotspotTmJson(tm, env);
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

    const raw = await hotspotTmJson(tm, env);
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

  // Geo fallback jobs are split before querying until one radius covers the
  // rectangle's corners. countryCode/stateCode stay on every request.
  if (job.kind === "geo" && needsGeographicSplit(job)) {
    state.queue.unshift(...splitHotspotJob(job));
    return { queried:false };
  }

  const first = await venuePage(env, apiKey, job, 0);
  const total = Number(first?.page?.totalElements || 0);
  const totalPages = Number(first?.page?.totalPages || 0);

  if (shouldSplitVenueResult(total, job) || totalPages > 5) {
    const children = overflowHotspotJobs(job);
    if (children.length) {
      state.queue.unshift(...children);
      return { queried:true };
    }
    state.partial = true;
    if (!Array.isArray(state.overflow)) state.overflow = [];
    state.overflow.push({
      id:String(job.id||""),
      kind:String(job.kind||""),
      countryCode:String(job.countryCode||""),
      stateCode:String(job.stateCode||""),
      total,
      totalPages,
    });
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
    if (Date.now() - finished >= 25 * 60 * 60 * 1000) return freshState();
  }
  if (state.partial && !state.queue.length && !state.verifyQueue.length) {
    const failed = Date.parse(state.failedAt || state.updatedAt || 0) || 0;
    if (Date.now() - failed >= 60 * 60 * 1000) return freshState();
  }
  return state;
}

function hotspotErrorIsTransient(err){
  const status=Number(err?.status||0);
  return err?.message==="ticketmaster_budget_guard" ||
    err?.message==="ticketmaster_unavailable" ||
    status===429 || status>=500 || status===0;
}

function recordRejectedHotspot(state,kind,id,err){
  if(!Array.isArray(state.rejected)) state.rejected=[];
  state.rejected.push({
    kind:String(kind||""),
    id:String(id||""),
    status:Number(err?.status||0),
    error:String(err?.message||err||""),
    detail:String(err?.detail||"").slice(0,220),
    at:new Date().toISOString(),
  });
  if(state.rejected.length>120) state.rejected=state.rejected.slice(-120);
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
      if(hotspotErrorIsTransient(err)){
        state.queue.unshift({ ...job, attempts:Number(job?.attempts || 0) + 1 });
        state.updatedAt = new Date().toISOString();
        await kvPutJson(env, HOTSPOT_STATE_KEY, state);
        return {
          ok:false,complete:false,retry:true,
          status:Number(err?.status||0),error:String(err?.message||err),
          job:String(job?.id||"")
        };
      }

      // A permanent 4xx on one country/state/geo query must not pin the
      // resumable world scan forever. Record it for audit and continue.
      recordRejectedHotspot(state,"venue-job",job?.id,err);
      jobsDone++;
    }
  }

  let verifiedDone = 0;
  while (state.verifyQueue.length && verifiedDone < verifyBudget) {
    const key = state.verifyQueue.shift();
    try {
      await processCityVerification(env, env.TICKETMASTER_API_KEY, state, key);
      verifiedDone++;
    } catch (err) {
      state.errors = Number(state.errors || 0) + 1;
      if(hotspotErrorIsTransient(err)){
        state.verifyQueue.unshift(key);
        state.updatedAt = new Date().toISOString();
        await kvPutJson(env, HOTSPOT_STATE_KEY, state);
        return {
          ok:false,complete:false,retry:true,
          status:Number(err?.status||0),error:String(err?.message||err),
          candidate:String(key||"")
        };
      }

      // Unsupported/invalid city filters are permanent for this build.
      // Mark the candidate consumed and continue with later cities.
      const rec=state.candidates?.[key];
      if(rec) rec.verified=true;
      recordRejectedHotspot(state,"city-verify",key,err);
      verifiedDone++;
    }
  }

  state.updatedAt = new Date().toISOString();

  if (!state.queue.length && !state.verifyQueue.length) {
    state.complete = !state.partial;
    state.completedAt = new Date().toISOString();

    if (state.complete) {
      const snapshot = snapshotFromState(state);
      await kvPutJson(env, HOTSPOT_SNAPSHOT_KEY, snapshot);
    } else {
      state.failedAt = new Date().toISOString();
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
    rejected:Array.isArray(state.rejected)?state.rejected.length:0,
  };
}

async function scheduleMapWarmupIfSparse(env,waitUntil,visibleCount){
  if(!env?.DESK || !env?.TICKETMASTER_API_KEY || typeof waitUntil!=="function" || Number(visibleCount||0)>=3) return;
  const lock=await kvGetJson(env,MAP_WARM_LOCK_KEY);
  const lockAt=Date.parse(lock?.at||0)||0;
  if(Date.now()-lockAt<MAP_WARM_LOCK_MS) return;

  await kvPutJson(env,MAP_WARM_LOCK_KEY,{at:new Date().toISOString()},{expirationTtl:20*60});
  waitUntil((async()=>{
    try{
      // Cheap first-aid path: refresh a small capital batch so the public map
      // gets real Ticketmaster-backed points quickly. The normal cron keeps
      // advancing the full global hotspot builder separately.
      await refreshCapitalEventSnapshots(env,4);
    }catch(e){}
    try{
      await refreshHotspotSnapshot(env,{jobBudget:2,verifyBudget:10});
    }catch(e){}
  })());
}

async function hotspotSnapshotPayload(env) {
  const snapshot = await kvGetJson(env, HOTSPOT_SNAPSHOT_KEY);
  if (snapshot?.version === HOTSPOT_VERSION &&
      Array.isArray(snapshot.hotspots) &&
      snapshot.hotspots.length) {
    return { ...snapshot, partial:false, warming:false, stale:false };
  }

  const storedState = await kvGetJson(env, HOTSPOT_STATE_KEY);
  const state = normalizeBuildState(storedState);
  const progress = snapshotFromState(state);

  // Never blank the public map while a new generation is rebuilding.
  // Merge every safe read-only source we already have in Cloudflare.
  const [legacy18,legacy17,capitalHubs]=await Promise.all([
    kvGetJson(env,"concert-hotspots:v18:snapshot"),
    kvGetJson(env,"concert-hotspots:v17:snapshot"),
    capitalHubSnapshot(env).catch(()=>({hotspots:[]})),
  ]);
  const fallback18=Array.isArray(legacy18?.hotspots)?legacy18.hotspots:[];
  const fallback17=Array.isArray(legacy17?.hotspots)?legacy17.hotspots:[];
  const capitalFallback=Array.isArray(capitalHubs?.hotspots)?capitalHubs.hotspots:[];
  const current=Array.isArray(snapshot?.hotspots)?snapshot.hotspots:[];
  const live=Array.isArray(progress.hotspots)?progress.hotspots:[];
  const merged=new Map();
  for(const list of [fallback17,fallback18,capitalFallback,current,live]){
    for(const h of list){
      const key=[h?.city,h?.stateCode,h?.countryCode].map(x=>String(x||"").trim().toLowerCase()).join("|");
      if(key!=="||") merged.set(key,h);
    }
  }
  const visible=[...merged.values()].sort((a,b)=>Number(b?.count||0)-Number(a?.count||0));

  return {
    ...progress,
    version:HOTSPOT_VERSION,
    hotspots:visible,
    partial:true,
    warming:true,
    stale:!!(fallback17.length||fallback18.length||capitalFallback.length),
    progress:{
      queue:state.queue.length,
      verifyQueue:state.verifyQueue.length,
      scannedJobs:Number(state.scannedJobs || 0),
    },
  };
}

function nearbyCacheStep(radius) {
  if (radius <= 25) return 0.025;
  if (radius <= 75) return 0.05;
  if (radius <= 150) return 0.10;
  return 0.20;
}
function snapCoord(value, step) {
  return Math.round(Number(value) / step) * step;
}
function canonicalConcertCacheUrl(requestUrl, {mode,q,lat,lng,artist,attractionId,city,countryCode,stateCode,radius}) {
  const out = new URL(requestUrl);
  out.search = "";
  out.searchParams.set("__cachev","concerts-global-v23");

  if(mode==="artist-search"){
    out.searchParams.set("mode","artist-search");
    out.searchParams.set("q",String(q||"").trim().toLowerCase());
    return out;
  }
  if(attractionId){
    out.searchParams.set("attractionId",String(attractionId).trim());
    return out;
  }
  if(artist){
    out.searchParams.set("artist",String(artist).trim().toLowerCase());
    return out;
  }
  if(city){
    out.searchParams.set("city",String(city).trim().toLowerCase());
    if(countryCode) out.searchParams.set("countryCode",String(countryCode).trim().toUpperCase());
    if(stateCode) out.searchParams.set("stateCode",String(stateCode).trim().toUpperCase());
    return out;
  }

  const step=nearbyCacheStep(radius);
  out.searchParams.set("lat",snapCoord(lat,step).toFixed(3));
  out.searchParams.set("lng",snapCoord(lng,step).toFixed(3));
  out.searchParams.set("radius",String(radius));
  return out;
}

export async function onRequestGet({ request, env, waitUntil }) {
  const u = new URL(request.url);
  const mode = String(u.searchParams.get("mode") || "").toLowerCase();
  const region = String(u.searchParams.get("region") || "").toLowerCase();
  void region;

  if (mode === "markets") {
    const payload=await marketSnapshotPayload(env);
    return json(payload,200,{
      "Cache-Control":payload.complete===false
        ? "no-store, max-age=0"
        : "public, max-age=300, s-maxage=900"
    });
  }

  if (mode === "hotspots") {
    // The UI now uses a static global discovery layer, so this compatibility
    // endpoint is read-only. Never let a visitor start Ticketmaster/KV warmup.
    const payload = await hotspotSnapshotPayload(env);
    return json(payload, 200, {
      "Cache-Control": payload.partial
        ? "public, max-age=30, s-maxage=60"
        : "public, max-age=300, s-maxage=900"
    });
  }

  if (mode === "popular") {
    // Same rule for the default right panel: KV snapshot only, no quota spend.
    // Never let a partial rebuild (for example 8/30) become a long-lived
    // browser/CDN response. Only a complete Top 30 is cacheable.
    const payload = await popularSnapshotPayload(env);
    const complete=Array.isArray(payload.artists) &&
      payload.artists.length>=Number(payload.targetCount||POPULAR_LIMIT);
    return json(payload, 200, {
      "Cache-Control": complete
        ? "public, max-age=300, s-maxage=900"
        : "no-store, max-age=0"
    });
  }

  const q = String(u.searchParams.get("q") || "").trim().slice(0, 120);
  const lat = finite(u.searchParams.get("lat"));
  const lng = finite(u.searchParams.get("lng"));
  const artist = String(u.searchParams.get("artist") || "").trim().slice(0, 120);
  const attractionId = String(u.searchParams.get("attractionId") || "").trim().slice(0, 160);
  const city = String(u.searchParams.get("city") || "").trim().slice(0, 120);
  const countryCode = String(u.searchParams.get("countryCode") || "").trim().toUpperCase().slice(0, 3);
  const stateCode = String(u.searchParams.get("stateCode") || "").trim().toUpperCase().slice(0, 3);
  const radius = Math.min(500, Math.max(5, finite(u.searchParams.get("radius")) || 100));

  if (mode !== "popular" && mode !== "artist-search" && !artist && !attractionId && !city &&
      (lat == null || lng == null || lat < -90 || lat > 90 || lng < -180 || lng > 180)) {
    return json({ error: "location_required" }, 400);
  }

  if(attractionId){
    const prewarmed=await kvGetJson(env,popularTourCacheKey(attractionId));
    if(prewarmFresh(prewarmed)){
      const events=sanitizeNormalizedEvents(prewarmed.events);
      if(events.length){
        return json({...prewarmed,events},200,{"Cache-Control":"public, max-age=600, s-maxage=3600"});
      }
    }
  }
  if(city && countryCode){
    const prewarmed=await kvGetJson(env,capitalEventCacheKey(city,countryCode));
    if(prewarmFresh(prewarmed)){
      const events=sanitizeNormalizedEvents(prewarmed.events);
      return json({...prewarmed,events},200,{"Cache-Control":"public, max-age=600, s-maxage=3600"});
    }
  }

  const cache = caches.default;
  const cacheUrl = canonicalConcertCacheUrl(request.url,{mode,q,lat,lng,artist,attractionId,city,countryCode,stateCode,radius});
  const cacheKey = new Request(cacheUrl.toString(), { method: "GET" });
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  if (!env?.TICKETMASTER_API_KEY) {
    return json({ error: "ticketmaster_key_missing" }, 503);
  }

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
      const raw = await tmJson(tm, env);
      const artists = (raw?._embedded?.attractions || []).map(x => ({
        id: String(x?.id || ""),
        name: String(x?.name || ""),
        image: bestArtistImage(x?.images) || bestImage(x?.images),
      })).filter(x => x.id && x.name);
      const res = json({ ok:true, mode:"artist-search", artists }, 200, { "Cache-Control":"public, max-age=300, s-maxage=21600, stale-while-revalidate=86400" });
      await cache.put(cacheKey, res.clone()).catch(() => {});
      return res;
    }

    const tm = baseEventUrl(env.TICKETMASTER_API_KEY);
    tm.searchParams.set("size", "200");
    // The first five 200-item pages must contain the earliest upcoming dates,
    // not simply the geographically closest results.
    tm.searchParams.set("sort", "date,asc");

    if (attractionId) {
      tm.searchParams.set("attractionId", attractionId);
    } else if (artist) {
      tm.searchParams.set("keyword", artist);
    } else if (city) {
      tm.searchParams.set("city", city);
      if(countryCode) tm.searchParams.set("countryCode", countryCode);
      if(stateCode) tm.searchParams.set("stateCode", stateCode);
    } else {
      const step=nearbyCacheStep(radius);
      const queryLat=snapCoord(lat,step);
      const queryLng=snapCoord(lng,step);
      tm.searchParams.set("geoPoint", geohash(queryLat, queryLng, 8));
      tm.searchParams.set("radius", String(radius));
      tm.searchParams.set("unit", "km");
    }

    const merged = await tmEventPages(tm, env, 5);
    const events = normalizeEvents(merged.events);
    const payload = {
      ok: true,
      events,
      page: merged.page || { size: events.length, totalElements: events.length, totalPages: 1, number: 0 },
      partial:!!merged.partial,
      pagesFetched:Number(merged.pagesFetched||1),
      query: attractionId ? { attractionId } : artist ? { artist } : city ? { city, countryCode } : { lat, lng, radius, unit: "km" },
    };
    const cacheControl=payload.partial
      ? "public, max-age=60, s-maxage=300"
      : (artist||attractionId)
        ? "public, max-age=300, s-maxage=7200, stale-while-revalidate=21600"
        : "public, max-age=180, s-maxage=1800, stale-while-revalidate=7200";
    const res = json(payload, 200, { "Cache-Control":cacheControl });
    await cache.put(cacheKey, res.clone()).catch(() => {});
    return res;
  } catch (err) {
    if (err?.message === "ticketmaster_budget_guard" || Number(err?.status||0)===429) {
      return json({ error:"ticketmaster_temporarily_limited" }, 429, { "Retry-After":"3600" });
    }
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
