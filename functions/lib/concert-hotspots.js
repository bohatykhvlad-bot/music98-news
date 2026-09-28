export const HOTSPOT_VERSION = "hotspots-v17";
export const HOTSPOT_THRESHOLD = 11;
export const HOTSPOT_STATE_KEY = "concert-hotspots:v17:state";
export const HOTSPOT_SNAPSHOT_KEY = "concert-hotspots:v17:snapshot";
export const HOTSPOT_MAX_RADIUS_KM = 480;
export const HOTSPOT_MAX_DEPTH = 7;

/*
 * Root rectangles deliberately cover the inhabited world with overlap only at
 * borders. Jobs are subdivided until one Ticketmaster venue query can cover the
 * rectangle without geographic gaps.
 */
export const HOTSPOT_ROOTS = [
  // Europe first so a cold rebuild fills the area that was visibly missing
  // before moving on to the rest of the world.
  { id:"eu_west",        minLat:34, maxLat:72, minLng:-12, maxLng:12, depth:0 },
  { id:"eu_central",     minLat:34, maxLat:72, minLng:12,  maxLng:32, depth:0 },
  { id:"eu_east",        minLat:38, maxLat:72, minLng:32,  maxLng:60, depth:0 },
  { id:"north_atlantic", minLat:50, maxLat:72, minLng:-30, maxLng:-12,depth:0 },

  { id:"na_pacific",     minLat:18, maxLat:72, minLng:-180,maxLng:-130,depth:0 },
  { id:"na_west",        minLat:24, maxLat:72, minLng:-130,maxLng:-100,depth:0 },
  { id:"na_east",        minLat:24, maxLat:72, minLng:-100,maxLng:-52, depth:0 },
  { id:"latam_north",    minLat:5,  maxLat:32, minLng:-120,maxLng:-60, depth:0 },
  { id:"latam_south",    minLat:-56,maxLat:8,  minLng:-82, maxLng:-34, depth:0 },

  { id:"mena",           minLat:12, maxLat:43, minLng:24,  maxLng:64, depth:0 },
  { id:"africa",         minLat:-36,maxLat:16, minLng:-18, maxLng:52, depth:0 },
  { id:"south_asia",     minLat:5,  maxLat:36, minLng:60,  maxLng:100,depth:0 },
  { id:"central_asia",   minLat:36, maxLat:60, minLng:60,  maxLng:100,depth:0 },
  { id:"north_asia",     minLat:55, maxLat:72, minLng:60,  maxLng:180,depth:0 },
  { id:"east_asia",      minLat:18, maxLat:55, minLng:98,  maxLng:146,depth:0 },
  { id:"se_asia",        minLat:-12,maxLat:23, minLng:94,  maxLng:142,depth:0 },
  { id:"oceania",        minLat:-48,maxLat:-8, minLng:108, maxLng:180,depth:0 },
];

export function finiteCoord(v) {
  if (v == null || (typeof v === "string" && !v.trim())) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function validJob(job) {
  if (!job) return false;
  const vals = ["minLat","maxLat","minLng","maxLng"].map(k=>Number(job[k]));
  if (!vals.every(Number.isFinite)) return false;
  const [minLat,maxLat,minLng,maxLng] = vals;
  return minLat >= -90 && maxLat <= 90 && minLng >= -180 && maxLng <= 180 &&
    minLat < maxLat && minLng < maxLng && Number(job.depth||0) >= 0;
}

function haversineKm(lat1,lng1,lat2,lng2) {
  const r=6371, rad=d=>d*Math.PI/180;
  const p1=rad(lat1),p2=rad(lat2),dp=rad(lat2-lat1),dl=rad(lng2-lng1);
  const h=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
  return 2*r*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
}

export function jobSearchCircle(job) {
  if (!validJob(job)) return null;
  const lat=(Number(job.minLat)+Number(job.maxLat))/2;
  const lng=(Number(job.minLng)+Number(job.maxLng))/2;
  const corners=[
    [job.minLat,job.minLng],[job.minLat,job.maxLng],
    [job.maxLat,job.minLng],[job.maxLat,job.maxLng],
  ];
  const radius=Math.max(...corners.map(([a,b])=>haversineKm(lat,lng,Number(a),Number(b))))*1.04;
  return {lat,lng,radius};
}

export function splitHotspotJob(job) {
  if (!validJob(job)) return [];
  const midLat=(Number(job.minLat)+Number(job.maxLat))/2;
  const midLng=(Number(job.minLng)+Number(job.maxLng))/2;
  const d=Number(job.depth||0)+1;
  const base=String(job.id||"job");
  return [
    {id:base+"/0",minLat:job.minLat,maxLat:midLat,minLng:job.minLng,maxLng:midLng,depth:d},
    {id:base+"/1",minLat:job.minLat,maxLat:midLat,minLng:midLng,maxLng:job.maxLng,depth:d},
    {id:base+"/2",minLat:midLat,maxLat:job.maxLat,minLng:job.minLng,maxLng:midLng,depth:d},
    {id:base+"/3",minLat:midLat,maxLat:job.maxLat,minLng:midLng,maxLng:job.maxLng,depth:d},
  ];
}

export function needsGeographicSplit(job) {
  const circle=jobSearchCircle(job);
  return !!circle && circle.radius > HOTSPOT_MAX_RADIUS_KM;
}

export function cityKey(city,stateCode,countryCode) {
  return [city,stateCode,countryCode].map(x=>String(x||"").trim().toLowerCase()).join("|");
}

export function venueCandidate(venue) {
  const city=String(venue?.city?.name||"").trim();
  const stateCode=String(venue?.state?.stateCode||venue?.state?.name||"").trim();
  const countryCode=String(venue?.country?.countryCode||"").trim();
  const lat=finiteCoord(venue?.location?.latitude);
  const lng=finiteCoord(venue?.location?.longitude);
  if (!city || !countryCode || lat==null || lng==null || lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  if (Math.abs(lat)<1e-7 && Math.abs(lng)<1e-7) return null;
  const upcoming=venue?.upcomingEvents?._total;
  if (upcoming != null && Number(upcoming) === 0) return null;
  return {key:cityKey(city,stateCode,countryCode),city,stateCode,countryCode,lat,lng};
}

export function mergeCandidate(store,candidate) {
  if (!candidate?.key) return false;
  const prev=store[candidate.key];
  if (!prev) {
    store[candidate.key]={
      city:candidate.city,stateCode:candidate.stateCode,countryCode:candidate.countryCode,
      latSum:Number(candidate.lat),lngSum:Number(candidate.lng),samples:1,queued:false,verified:false,
    };
    return true;
  }
  prev.latSum+=Number(candidate.lat);
  prev.lngSum+=Number(candidate.lng);
  prev.samples+=1;
  return false;
}

export function candidatePoint(record) {
  const samples=Math.max(1,Number(record?.samples||1));
  return {
    city:String(record?.city||""),
    stateCode:String(record?.stateCode||""),
    countryCode:String(record?.countryCode||""),
    lat:Number(record?.latSum||0)/samples,
    lng:Number(record?.lngSum||0)/samples,
  };
}

export function shouldSplitVenueResult(totalElements,job) {
  return Number(totalElements||0)>1000 && Number(job?.depth||0)<HOTSPOT_MAX_DEPTH;
}

export function freshState(now=Date.now()) {
  return {
    version:HOTSPOT_VERSION,
    startedAt:new Date(now).toISOString(),
    updatedAt:new Date(now).toISOString(),
    queue:HOTSPOT_ROOTS.map(x=>({...x})),
    candidates:{},
    verifyQueue:[],
    verified:{},
    partial:false,
    errors:0,
    scannedJobs:0,
    complete:false,
  };
}

export function snapshotFromState(state,now=Date.now()) {
  const hotspots=Object.values(state?.verified||{})
    .filter(x=>Number(x?.count||0)>=HOTSPOT_THRESHOLD)
    .sort((a,b)=>Number(b.count||0)-Number(a.count||0) ||
      String(a.city||"").localeCompare(String(b.city||"")));
  return {
    ok:true,
    mode:"hotspots",
    version:HOTSPOT_VERSION,
    threshold:HOTSPOT_THRESHOLD,
    partial:!!state?.partial,
    builtAt:new Date(now).toISOString(),
    hotspots,
  };
}
