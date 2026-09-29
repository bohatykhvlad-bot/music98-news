export const HOTSPOT_VERSION = "hotspots-v19";
export const HOTSPOT_THRESHOLD = 10;
export const HOTSPOT_STATE_KEY = "concert-hotspots:v19:state";
export const HOTSPOT_SNAPSHOT_KEY = "concert-hotspots:v19:snapshot";
export const HOTSPOT_MAX_RADIUS_KM = 480;
export const HOTSPOT_MAX_DEPTH = 7;

/*
 * Ticketmaster documents these country codes for Discovery API. Countries are
 * queried directly first: this removes the holes produced by a world-wide
 * circle grid and normally needs only 1-5 Venue Search calls per country.
 * Europe is intentionally first because those missing points were the visible
 * regression that prompted this rebuild.
 */
export const SUPPORTED_COUNTRY_CODES = [
  "FR","ES","DE","AT","CZ","PL","GB","IE","ND","NL","BE","CH","IT","PT",
  "SE","NO","DK","FI","IS","GR","HU","RO","BG","HR","SI","SK","EE","LV","LT",
  "LU","MT","CY","RS","ME","AD","MC","GI","FO","TR","UA","GE","AZ",
  "US","CA","MX","CR","DO","BS","AI","BM","BB","JM","LC","TT","AR","BR","CL",
  "CO","EC","PE","UY","VE","AN",
  "AU","NZ","CN","HK","IN","JP","KR","MY","SG","TW","TH",
  "IL","LB","BH","SA","AE","MA","GH","ZA"
];

/* High-volume countries use official state/province filters before geography. */
export const COUNTRY_STATE_CODES = {
  US:[
    "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS",
    "KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY",
    "NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV",
    "WI","WY","DC"
  ],
  CA:["AB","BC","MB","NB","NL","NS","NT","NU","ON","PE","QC","SK","YT"],
  AU:["ACT","NSW","NT","QLD","SA","TAS","VIC","WA"],
};

/*
 * Only used when a country/state still exceeds Ticketmaster's 1000-item deep
 * paging ceiling. The boxes deliberately over-cover; countryCode/stateCode
 * remain on the Venue Search request, so neighboring countries cannot leak in.
 */
export const COUNTRY_BOUNDS = {
  US:{minLat:18,maxLat:72,minLng:-171,maxLng:-66},
  CA:{minLat:41,maxLat:84,minLng:-141,maxLng:-52},
  AU:{minLat:-44,maxLat:-10,minLng:112,maxLng:154},
  GB:{minLat:49,maxLat:61,minLng:-9,maxLng:3},
  ND:{minLat:54,maxLat:56,minLng:-8.5,maxLng:-5},
  DE:{minLat:47,maxLat:55.5,minLng:5,maxLng:16},
  FR:{minLat:41,maxLat:52,minLng:-6,maxLng:10},
  ES:{minLat:35,maxLat:44.5,minLng:-10,maxLng:5},
  IT:{minLat:35,maxLat:48,minLng:6,maxLng:19},
  NL:{minLat:50,maxLat:54,minLng:3,maxLng:8},
  BE:{minLat:49,maxLat:52,minLng:2,maxLng:7},
  CH:{minLat:45,maxLat:48.5,minLng:5,maxLng:11},
  PL:{minLat:48.5,maxLat:55.5,minLng:13.5,maxLng:25},
  AT:{minLat:46,maxLat:49.5,minLng:9,maxLng:18},
  CZ:{minLat:48,maxLat:52,minLng:12,maxLng:19},
  PT:{minLat:36,maxLat:43,minLng:-10,maxLng:-6},
  SE:{minLat:55,maxLat:70,minLng:10,maxLng:25},
  NO:{minLat:57,maxLat:72,minLng:4,maxLng:32},
  DK:{minLat:54,maxLat:58,minLng:7,maxLng:16},
  FI:{minLat:59,maxLat:71,minLng:19,maxLng:32},
  IE:{minLat:51,maxLat:56,minLng:-11,maxLng:-5},
  TR:{minLat:35,maxLat:43,minLng:25,maxLng:45},
  UA:{minLat:44,maxLat:53,minLng:22,maxLng:41},
  RU:{minLat:41,maxLat:82,minLng:19,maxLng:180},
  BR:{minLat:-34,maxLat:6,minLng:-74,maxLng:-34},
  MX:{minLat:14,maxLat:33,minLng:-119,maxLng:-86},
  AR:{minLat:-56,maxLat:-21,minLng:-74,maxLng:-53},
  CL:{minLat:-56,maxLat:-17,minLng:-76,maxLng:-66},
  CO:{minLat:-5,maxLat:14,minLng:-80,maxLng:-66},
  IN:{minLat:6,maxLat:36,minLng:68,maxLng:98},
  CN:{minLat:18,maxLat:54,minLng:73,maxLng:135},
  JP:{minLat:24,maxLat:46,minLng:128,maxLng:146},
  KR:{minLat:33,maxLat:39,minLng:124,maxLng:132},
  ZA:{minLat:-35,maxLat:-22,minLng:16,maxLng:33},
  NZ:{minLat:-48,maxLat:-33,minLng:166,maxLng:179},
};

export function finiteCoord(v) {
  if (v == null || (typeof v === "string" && !v.trim())) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function countryJob(countryCode) {
  return { id:"country:"+countryCode, kind:"country", countryCode, depth:0 };
}

export function stateJob(countryCode,stateCode) {
  return { id:"state:"+countryCode+":"+stateCode, kind:"state", countryCode, stateCode, depth:0 };
}

export function geoJob(countryCode,bounds,baseId,stateCode="") {
  return {
    id:baseId || "geo:"+countryCode+(stateCode?":"+stateCode:""),
    kind:"geo", countryCode, stateCode,
    minLat:Number(bounds.minLat), maxLat:Number(bounds.maxLat),
    minLng:Number(bounds.minLng), maxLng:Number(bounds.maxLng),
    depth:0,
  };
}

export function validJob(job) {
  if (!job || !String(job.countryCode||"").trim()) return false;
  if (job.kind === "country") return !job.stateCode;
  if (job.kind === "state") return !!String(job.stateCode||"").trim();
  if (job.kind !== "geo") return false;
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
  if (!validJob(job) || job.kind !== "geo") return null;
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
  if (!validJob(job) || job.kind !== "geo") return [];
  const midLat=(Number(job.minLat)+Number(job.maxLat))/2;
  const midLng=(Number(job.minLng)+Number(job.maxLng))/2;
  const d=Number(job.depth||0)+1;
  const base=String(job.id||"geo");
  const common={kind:"geo",countryCode:job.countryCode,stateCode:job.stateCode||"",depth:d};
  return [
    {...common,id:base+"/0",minLat:job.minLat,maxLat:midLat,minLng:job.minLng,maxLng:midLng},
    {...common,id:base+"/1",minLat:job.minLat,maxLat:midLat,minLng:midLng,maxLng:job.maxLng},
    {...common,id:base+"/2",minLat:midLat,maxLat:job.maxLat,minLng:job.minLng,maxLng:midLng},
    {...common,id:base+"/3",minLat:midLat,maxLat:job.maxLat,minLng:midLng,maxLng:job.maxLng},
  ];
}

export function needsGeographicSplit(job) {
  const circle=jobSearchCircle(job);
  return !!circle && circle.radius > HOTSPOT_MAX_RADIUS_KM;
}

export function overflowHotspotJobs(job) {
  if (!validJob(job)) return [];

  if (job.kind === "country") {
    const states=COUNTRY_STATE_CODES[job.countryCode];
    if (states?.length) return states.map(code=>stateJob(job.countryCode,code));
    const bounds=COUNTRY_BOUNDS[job.countryCode];
    return bounds ? [geoJob(job.countryCode,bounds,"geo:"+job.countryCode)] : [];
  }

  if (job.kind === "state") {
    const bounds=COUNTRY_BOUNDS[job.countryCode];
    return bounds ? [geoJob(job.countryCode,bounds,"geo:"+job.countryCode+":"+job.stateCode,job.stateCode)] : [];
  }

  if (job.kind === "geo" && Number(job.depth||0) < HOTSPOT_MAX_DEPTH) {
    return splitHotspotJob(job);
  }

  return [];
}

export function cityKey(city,stateCode,countryCode) {
  return [city,stateCode,countryCode].map(x=>String(x||"").trim().toLowerCase()).join("|");
}

export function venueCandidate(venue) {
  const city=String(venue?.city?.name||"").trim();
  const stateCode=String(venue?.state?.stateCode||"").trim();
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
  return Number(totalElements||0)>1000 && (
    job?.kind !== "geo" || Number(job?.depth||0)<HOTSPOT_MAX_DEPTH
  );
}

export function freshState(now=Date.now()) {
  return {
    version:HOTSPOT_VERSION,
    startedAt:new Date(now).toISOString(),
    updatedAt:new Date(now).toISOString(),
    queue:SUPPORTED_COUNTRY_CODES.map(countryJob),
    candidates:{},
    verifyQueue:[],
    verified:{},
    partial:false,
    overflow:[],
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
