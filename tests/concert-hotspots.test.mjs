import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  HOTSPOT_VERSION,
  HOTSPOT_THRESHOLD,
  HOTSPOT_MAX_RADIUS_KM,
  HOTSPOT_STATE_KEY,
  HOTSPOT_SNAPSHOT_KEY,
  SUPPORTED_COUNTRY_CODES,
  EUROPE_CAPITAL_SEEDS,
  COUNTRY_BOUNDS,
  freshState,
  countryJob,
  geoJob,
  validJob,
  jobSearchCircle,
  needsGeographicSplit,
  splitHotspotJob,
  overflowHotspotJobs,
  shouldSplitVenueResult,
  venueCandidate,
  mergeCandidate,
  candidatePoint,
  cityKey,
  snapshotFromState,
} from "../functions/lib/concert-hotspots.js";
import {
  isPlaceholderConcertArtist,
  artistScopedEvents,
  isNonPerformanceConcertEvent,
  refreshHotspotSnapshot,
  refreshPopularSnapshot,
  refreshPopularTourSnapshots,
  refreshCapitalEventSnapshots,
  refreshMapMarketSnapshot,
  onRequestGet
} from "../functions/api/concerts.js";

test("Ticketmaster placeholder artists are excluded before and after normalization",()=>{
  assert.equal(isPlaceholderConcertArtist("TEST ARTIST"),true);
  assert.equal(isPlaceholderConcertArtist(" live    music "),true);
  assert.equal(isPlaceholderConcertArtist("Bruno Mars"),false);
  const source=readFileSync(new URL("../functions/api/concerts.js",import.meta.url),"utf8");
  assert.match(source,/isPlaceholderConcertArtist\(attraction\.name \|\|/);
  assert.match(source,/return isPlaceholderConcertArtist\(e\?\.artist\) \|\|/);
});

test("hotspot threshold is 10 or more", () => {
  assert.equal(HOTSPOT_THRESHOLD, 10);
  const state=freshState(Date.UTC(2026,8,29));
  state.verified.a={city:"A",countryCode:"US",lat:1,lng:2,count:9};
  state.verified.b={city:"B",countryCode:"US",lat:1,lng:2,count:10};
  const snap=snapshotFromState(state,Date.UTC(2026,8,29));
  assert.deepEqual(snap.hotspots.map(x=>x.city),["B"]);
});

test("first-pass jobs are country queries and European capitals are verified first", () => {
  const state=freshState(Date.UTC(2026,8,29));
  assert.equal(state.queue.length,SUPPORTED_COUNTRY_CODES.length);
  assert.ok(state.queue.every(j=>j.kind==="country" && validJob(j)));
  assert.equal(state.verifyQueue.length,EUROPE_CAPITAL_SEEDS.length);
  assert.equal(state.candidates[state.verifyQueue[0]].city,"Paris");
  assert.equal(state.candidates[state.verifyQueue[1]].city,"Madrid");
  assert.equal(state.candidates[state.verifyQueue[2]].city,"Berlin");

  for(const code of ["FR","ES","DE","AT","CZ","PL"]){
    assert.ok(SUPPORTED_COUNTRY_CODES.includes(code),code+" must be queried directly");
  }
  assert.deepEqual(SUPPORTED_COUNTRY_CODES.slice(0,6),["FR","ES","DE","AT","CZ","PL"]);
});

test("overflow country jobs split by state or by bounded geography", () => {
  const us=overflowHotspotJobs(countryJob("US"));
  assert.ok(us.length>=50);
  assert.ok(us.every(j=>j.kind==="state" && j.countryCode==="US"));

  const gb=overflowHotspotJobs(countryJob("GB"));
  assert.equal(gb.length,1);
  assert.equal(gb[0].kind,"geo");
  assert.equal(gb[0].countryCode,"GB");
  assert.equal(validJob(gb[0]),true);
});

test("large geographic fallback is divided into four gap-free children", () => {
  const large=geoJob("FR",COUNTRY_BOUNDS.FR,"geo:FR");
  assert.equal(validJob(large),true);
  assert.equal(needsGeographicSplit(large),true);
  const children=splitHotspotJob(large);
  assert.equal(children.length,4);
  for(const child of children){
    assert.equal(validJob(child),true);
    assert.equal(child.countryCode,"FR");
  }
  const area=j=>(j.maxLat-j.minLat)*(j.maxLng-j.minLng);
  const total=children.reduce((sum,j)=>sum+area(j),0);
  assert.ok(Math.abs(total-area(large))<1e-9);
});

test("problem European cities are inside their overflow fallback boxes", () => {
  const cities=[
    ["Paris","FR",48.8566,2.3522],
    ["Lyon","FR",45.7640,4.8357],
    ["Madrid","ES",40.4168,-3.7038],
    ["Barcelona","ES",41.3874,2.1686],
    ["Berlin","DE",52.5200,13.4050],
    ["Vienna","AT",48.2082,16.3738],
    ["Prague","CZ",50.0755,14.4378],
    ["Warsaw","PL",52.2297,21.0122],
  ];
  for(const [name,code,lat,lng] of cities){
    const b=COUNTRY_BOUNDS[code];
    assert.ok(b,name+" fallback bounds missing");
    assert.equal(lat>=b.minLat&&lat<=b.maxLat&&lng>=b.minLng&&lng<=b.maxLng,true,name+" must be covered");
  }
});

test("venue candidates distinguish same-named cities in different states", () => {
  const a=venueCandidate({
    city:{name:"Springfield"}, state:{stateCode:"IL"}, country:{countryCode:"US"},
    location:{latitude:"39.80",longitude:"-89.64"}, upcomingEvents:{_total:5},
  });
  const b=venueCandidate({
    city:{name:"Springfield"}, state:{stateCode:"MO"}, country:{countryCode:"US"},
    location:{latitude:"37.21",longitude:"-93.29"}, upcomingEvents:{_total:5},
  });
  assert.ok(a && b);
  assert.notEqual(a.key,b.key);
  assert.notEqual(cityKey("Springfield","IL","US"),cityKey("Springfield","MO","US"));
});

test("state names are not sent as stateCode filters", () => {
  const paris=venueCandidate({
    city:{name:"Paris"},
    state:{name:"Île-de-France"},
    country:{countryCode:"FR"},
    location:{latitude:"48.8566",longitude:"2.3522"},
    upcomingEvents:{_total:5},
  });
  assert.ok(paris);
  assert.equal(paris.stateCode,"");
});

test("zero-upcoming venues and invalid coordinates are rejected", () => {
  assert.equal(venueCandidate({
    city:{name:"Paris"}, country:{countryCode:"FR"},
    location:{latitude:"48.8566",longitude:"2.3522"}, upcomingEvents:{_total:0},
  }),null);
  assert.equal(venueCandidate({
    city:{name:"Nowhere"}, country:{countryCode:"XX"},
    location:{latitude:"",longitude:""},
  }),null);
});

test("candidate merge preserves samples and produces an averaged point", () => {
  const store={};
  const one={key:"madrid||es",city:"Madrid",stateCode:"",countryCode:"ES",lat:40.4,lng:-3.7};
  const two={...one,lat:40.6,lng:-3.5};
  assert.equal(mergeCandidate(store,one),true);
  assert.equal(mergeCandidate(store,two),false);
  const p=candidatePoint(store[one.key]);
  assert.equal(p.lat,40.5);
  assert.equal(p.lng,-3.6);
});

test("Ticketmaster deep-pagination ceiling triggers a subdivision strategy", () => {
  assert.equal(shouldSplitVenueResult(1000,countryJob("FR")),false);
  assert.equal(shouldSplitVenueResult(1001,countryJob("FR")),true);
  const geo=geoJob("FR",{minLat:48,maxLat:49,minLng:2,maxLng:3},"geo:FR:test");
  const circle=jobSearchCircle(geo);
  assert.ok(circle && circle.radius < HOTSPOT_MAX_RADIUS_KM);
});

function memoryKv() {
  const map=new Map();
  return {
    async get(key,type){
      if(!map.has(key)) return null;
      const raw=map.get(key);
      return type==="json" ? JSON.parse(raw) : raw;
    },
    async put(key,value){ map.set(key,String(value)); },
    async delete(key){ map.delete(key); },
    raw(key){ return map.get(key) || null; },
  };
}

test("builder reads every venue page and publishes only a verified 10+ city", async () => {
  const kv=memoryKv();
  const state=freshState(Date.UTC(2026,8,29));
  state.queue=[countryJob("FR")];
  state.candidates={};
  state.verifyQueue=[];
  await kv.put(HOTSPOT_STATE_KEY,JSON.stringify(state));

  const oldFetch=globalThis.fetch;
  const seen=[];
  globalThis.fetch=async input=>{
    const u=new URL(String(input));
    seen.push(u.pathname+"?page="+(u.searchParams.get("page")||""));
    if(u.pathname.endsWith("/venues.json")){
      assert.equal(u.searchParams.get("countryCode"),"FR");
      const page=Number(u.searchParams.get("page")||0);
      const venue={
        id:"v"+page,
        city:{name:"Paris"},
        country:{countryCode:"FR"},
        location:{latitude:String(48.8566+page*.001),longitude:String(2.3522+page*.001)},
        upcomingEvents:{_total:5},
      };
      return new Response(JSON.stringify({
        _embedded:{venues:[venue]},
        page:{totalElements:201,totalPages:2,size:200,number:page},
      }),{status:200,headers:{"content-type":"application/json"}});
    }
    if(u.pathname.endsWith("/events.json")){
      assert.equal(u.searchParams.get("city"),"Paris");
      assert.equal(u.searchParams.get("countryCode"),"FR");
      return new Response(JSON.stringify({page:{totalElements:11,totalPages:1,size:1,number:0}}),
        {status:200,headers:{"content-type":"application/json"}});
    }
    return new Response("not found",{status:404});
  };

  try{
    const result=await refreshHotspotSnapshot(
      {TICKETMASTER_API_KEY:"test",DESK:kv},
      {jobBudget:1,verifyBudget:10}
    );
    assert.equal(result.complete,true);
    assert.equal(seen.filter(x=>x.includes("/venues.json")).length,2);
    const snap=JSON.parse(kv.raw(HOTSPOT_SNAPSHOT_KEY));
    assert.equal(snap.partial,false);
    assert.equal(snap.hotspots.length,1);
    assert.equal(snap.hotspots[0].city,"Paris");
    assert.equal(snap.hotspots[0].count,11);
  }finally{
    globalThis.fetch=oldFetch;
  }
});

test("429 is requeued and is never cached as an empty successful snapshot", async () => {
  const kv=memoryKv();
  const state=freshState(Date.UTC(2026,8,29));
  state.queue=[countryJob("FR")];
  state.candidates={};
  state.verifyQueue=[];
  await kv.put(HOTSPOT_STATE_KEY,JSON.stringify(state));

  const oldFetch=globalThis.fetch;
  globalThis.fetch=async()=>new Response("rate limited",{status:429});
  try{
    const result=await refreshHotspotSnapshot(
      {TICKETMASTER_API_KEY:"test",DESK:kv},
      {jobBudget:1,verifyBudget:1}
    );
    assert.equal(result.ok,false);
    assert.equal(result.retry,true);
    assert.equal(result.status,429);
    const saved=JSON.parse(kv.raw(HOTSPOT_STATE_KEY));
    assert.equal(saved.queue.length,1);
    assert.equal(saved.queue[0].countryCode,"FR");
    assert.equal(kv.raw(HOTSPOT_SNAPSHOT_KEY),null);
  }finally{
    globalThis.fetch=oldFetch;
  }
});


test("permanent Ticketmaster 400 skips the bad hotspot job and continues the world scan", async () => {
  const kv=memoryKv();
  const state=freshState(Date.UTC(2026,8,29));
  state.queue=[countryJob("FR"),countryJob("ES")];
  state.candidates={};
  state.verifyQueue=[];
  await kv.put(HOTSPOT_STATE_KEY,JSON.stringify(state));

  const oldFetch=globalThis.fetch;
  const countries=[];
  globalThis.fetch=async input=>{
    const u=new URL(String(input));
    const country=u.searchParams.get("countryCode");
    countries.push(country);
    if(country==="FR"){
      return new Response('{"fault":{"faultstring":"unsupported filter"}}',{
        status:400,headers:{"content-type":"application/json"}
      });
    }
    return new Response(JSON.stringify({
      _embedded:{venues:[]},
      page:{totalElements:0,totalPages:1,size:200,number:0}
    }),{status:200,headers:{"content-type":"application/json"}});
  };

  try{
    const result=await refreshHotspotSnapshot(
      {TICKETMASTER_API_KEY:"test",DESK:kv},
      {jobBudget:2,verifyBudget:1}
    );
    assert.equal(result.ok,true);
    assert.equal(result.complete,true);
    assert.equal(result.rejected,1);
    assert.deepEqual(countries,["FR","ES"]);

    const saved=JSON.parse(kv.raw(HOTSPOT_STATE_KEY));
    assert.equal(saved.queue.length,0);
    assert.equal(saved.rejected.length,1);
    assert.equal(saved.rejected[0].kind,"venue-job");
    assert.equal(saved.rejected[0].id,"country:FR");
    assert.equal(saved.rejected[0].status,400);
  }finally{
    globalThis.fetch=oldFetch;
  }
});

test("empty current hotspot snapshot falls back instead of blanking the public map", async () => {
  const kv=memoryKv();
  await kv.put(HOTSPOT_SNAPSHOT_KEY,JSON.stringify({
    ok:true,mode:"hotspots",version:HOTSPOT_VERSION,threshold:HOTSPOT_THRESHOLD,
    partial:false,builtAt:new Date().toISOString(),hotspots:[]
  }));
  await kv.put("concert-hotspots:v18:snapshot",JSON.stringify({
    ok:true,mode:"hotspots",version:"hotspots-v18",
    builtAt:new Date().toISOString(),
    hotspots:[{city:"Paris",countryCode:"FR",stateCode:"",lat:48.8566,lng:2.3522,count:11}]
  }));
  await kv.put("concert-map:warm-lock:v1",JSON.stringify({at:new Date().toISOString()}));

  const oldFetch=globalThis.fetch;
  let externalCalls=0;
  globalThis.fetch=async()=>{ externalCalls++; throw new Error("public fallback read must not hit Ticketmaster"); };
  try{
    const response=await onRequestGet({
      request:new Request("https://music98.news/api/concerts?mode=hotspots"),
      env:{TICKETMASTER_API_KEY:"test",DESK:kv},
      waitUntil:()=>{ throw new Error("public hotspot fallback read must stay snapshot-only"); }
    });
    assert.equal(response.status,200);
    const data=await response.json();
    assert.equal(data.hotspots.length,1);
    assert.equal(data.hotspots[0].city,"Paris");
    assert.equal(data.hotspots[0].count,11);
    assert.equal(externalCalls,0);
  }finally{
    globalThis.fetch=oldFetch;
  }
});

test("public hotspot read never triggers Ticketmaster discovery", async () => {
  const kv=memoryKv();
  await kv.put(HOTSPOT_SNAPSHOT_KEY,JSON.stringify({
    ok:true,mode:"hotspots",version:HOTSPOT_VERSION,threshold:HOTSPOT_THRESHOLD,
    partial:false,builtAt:new Date().toISOString(),
    hotspots:[
      {city:"Paris",countryCode:"FR",stateCode:"",lat:48.8566,lng:2.3522,count:10},
      {city:"London",countryCode:"GB",stateCode:"",lat:51.5072,lng:-0.1276,count:12},
      {city:"Berlin",countryCode:"DE",stateCode:"",lat:52.52,lng:13.405,count:14}
    ]
  }));

  const oldFetch=globalThis.fetch;
  let externalCalls=0;
  globalThis.fetch=async()=>{ externalCalls++; throw new Error("visitor must not scan Ticketmaster"); };
  try{
    const response=await onRequestGet({
      request:new Request("https://music98.news/api/concerts?mode=hotspots"),
      env:{TICKETMASTER_API_KEY:"test",DESK:kv},
      waitUntil:()=>{ throw new Error("visitor hotspot read must not schedule rebuild"); }
    });
    assert.equal(response.status,200);
    const data=await response.json();
    assert.equal(data.hotspots[0].city,"Paris");
    assert.equal(externalCalls,0);
  }finally{
    globalThis.fetch=oldFetch;
  }
});


test("sparse public hotspot read is read-only and never starts background warmup", async () => {
  const kv=memoryKv();
  await kv.put(HOTSPOT_SNAPSHOT_KEY,JSON.stringify({
    ok:true,mode:"hotspots",version:HOTSPOT_VERSION,threshold:HOTSPOT_THRESHOLD,
    partial:false,builtAt:new Date().toISOString(),hotspots:[]
  }));

  const queued=[];
  const oldFetch=globalThis.fetch;
  let externalCalls=0;
  globalThis.fetch=async()=>{ externalCalls++; throw new Error("hotspot read must remain snapshot-only"); };
  try{
    const response=await onRequestGet({
      request:new Request("https://music98.news/api/concerts?mode=hotspots"),
      env:{TICKETMASTER_API_KEY:"test",DESK:kv},
      waitUntil:p=>queued.push(p)
    });
    assert.equal(response.status,200);
    assert.equal(queued.length,0);
    assert.equal(externalCalls,0);
    assert.equal(kv.raw("concert-map:warm-lock:v1"),null);
  }finally{
    globalThis.fetch=oldFetch;
  }
});

test("daily market snapshot publishes only cities with real upcoming Ticketmaster music events", async () => {
  const kv=memoryKv();
  const oldFetch=globalThis.fetch;
  let calls=0;
  const firstBatchCountries=[];
  globalThis.fetch=async input=>{
    const u=new URL(String(input));
    if(!u.pathname.endsWith("/events.json")) return new Response("not found",{status:404});
    calls++;
    assert.equal(u.searchParams.get("classificationName"),"music");
    assert.ok(u.searchParams.get("startDateTime"));
    assert.ok(u.searchParams.get("geoPoint"));
    assert.equal(u.searchParams.get("city"),null);
    assert.equal(u.searchParams.get("unit"),"km");
    const cc=u.searchParams.get("countryCode")||"";
    if(firstBatchCountries.length<20) firstBatchCountries.push(cc);
    const hasShows=["GB","FR","IT","AE"].includes(cc);
    return new Response(JSON.stringify(hasShows ? {
      _embedded:{events:[{id:"e-"+cc,dates:{start:{localDate:"2026-10-10"}}}]},
      page:{totalElements:3,totalPages:1,size:1,number:0}
    } : {
      page:{totalElements:0,totalPages:0,size:1,number:0}
    }),{status:200,headers:{"content-type":"application/json","Rate-Limit-Available":"4900"}});
  };

  try{
    let result;
    for(let i=0;i<8;i++){
      result=await refreshMapMarketSnapshot({TICKETMASTER_API_KEY:"test",DESK:kv},i===0);
      if(result.complete) break;
    }
    assert.equal(result.complete,true);
    assert.ok(calls>100);
    assert.ok(firstBatchCountries.includes("US"));
    assert.ok(firstBatchCountries.includes("AE"));
    assert.ok(firstBatchCountries.includes("CA"));
    assert.ok(firstBatchCountries.includes("JP") || firstBatchCountries.includes("AU"));
    assert.ok(firstBatchCountries.includes("GB") || firstBatchCountries.includes("FR"));

    const response=await onRequestGet({
      request:new Request("https://music98.news/api/concerts?mode=markets"),
      env:{TICKETMASTER_API_KEY:"test",DESK:kv},
      waitUntil:()=>{}
    });
    assert.equal(response.status,200);
    const data=await response.json();
    assert.equal(data.version,"concert-markets-v4");
    assert.equal(data.complete,true);
    assert.ok(data.markets.length>=4);
    assert.ok(data.markets.every(x=>x.verified===true && Number(x.count)>0));
    assert.ok(data.markets.some(x=>x.city==="Rome"));
    assert.equal(data.markets.some(x=>x.city==="Yerevan"),false);
  }finally{
    globalThis.fetch=oldFetch;
  }
});

test("public market read exposes verified worldwide rows before the whole daily scan finishes", async () => {
  const kv=memoryKv();
  const oldFetch=globalThis.fetch;
  globalThis.fetch=async input=>{
    const u=new URL(String(input));
    if(!u.pathname.endsWith("/events.json")) return new Response("not found",{status:404});
    const cc=u.searchParams.get("countryCode");
    const hasShows=cc==="GB" || cc==="AE";
    return new Response(JSON.stringify(hasShows ? {
      _embedded:{events:[{id:"event-"+cc,dates:{start:{localDate:"2026-10-10"}}}]},
      page:{totalElements:cc==="AE"?5:7,totalPages:1,size:1,number:0}
    } : {page:{totalElements:0,totalPages:0,size:1,number:0}}),
    {status:200,headers:{"content-type":"application/json","Rate-Limit-Available":"4900"}});
  };
  try{
    const warm=await refreshMapMarketSnapshot({TICKETMASTER_API_KEY:"test",DESK:kv},true);
    assert.equal(warm.complete,false);

    const response=await onRequestGet({
      request:new Request("https://music98.news/api/concerts?mode=markets"),
      env:{TICKETMASTER_API_KEY:"test",DESK:kv},
      waitUntil:()=>{}
    });
    const data=await response.json();
    assert.equal(data.version,"concert-markets-v4");
    assert.equal(data.complete,false);
    assert.equal(data.warming,true);
    assert.ok(data.markets.some(x=>x.city==="London" && x.countryCode==="GB" && Number(x.count)===7));
    assert.ok(data.markets.some(x=>x.city==="Dubai" && x.countryCode==="AE" && Number(x.count)===5));
  }finally{
    globalThis.fetch=oldFetch;
  }
});

test("public Popular read serves only a complete Top 30 and spends no Ticketmaster call", async () => {
  const kv=memoryKv();
  const artists=Array.from({length:30},(_,i)=>({
    id:"a"+(i+1),name:"Artist "+(i+1),image:"",rank:i+1,popularityRank:i+1,shows:2,eventConfirmed:true
  }));
  await kv.put("concert-popular:v4",JSON.stringify({
    ok:true,mode:"popular",version:"popular-v4",algorithm:"rank-ordered-event-query-v2",identityValidation:"primary-attraction-v3",builtAt:new Date().toISOString(),
    source:"spotify_monthly_listeners",eligibility:"ticketmaster_event_payload_gt_0",artists,targetCount:30
  }));
  const oldFetch=globalThis.fetch;
  let externalCalls=0;
  globalThis.fetch=async()=>{ externalCalls++; throw new Error("popular read must not hit Ticketmaster"); };
  try{
    const response=await onRequestGet({
      request:new Request("https://music98.news/api/concerts?mode=popular"),
      env:{TICKETMASTER_API_KEY:"test",DESK:kv},
      waitUntil:()=>{}
    });
    assert.equal(response.status,200);
    const data=await response.json();
    assert.equal(data.artists.length,30);
    assert.equal(data.artists[0].name,"Artist 1");
    assert.equal(data.warming,false);
    assert.equal(externalCalls,0);
  }finally{
    globalThis.fetch=oldFetch;
  }
});

test("public Popular never exposes an incomplete or weakly verified snapshot", async () => {
  const kv=memoryKv();
  await kv.put("concert-popular:v4",JSON.stringify({
    ok:true,mode:"popular",version:"popular-v4",builtAt:new Date().toISOString(),
    eligibility:"ticketmaster_event_payload_gt_0",
    artists:[
      {id:"ok",name:"Has Shows",rank:1,popularityRank:1,shows:2,eventConfirmed:true},
      {id:"counter-only",name:"Counter Only",rank:2,popularityRank:2,shows:4,eventConfirmed:false},
      {id:"zero",name:"No Shows",rank:3,popularityRank:3,shows:0,eventConfirmed:true},
      {id:"unknown",name:"Unknown",rank:4,popularityRank:4}
    ],
    targetCount:30
  }));
  const response=await onRequestGet({
    request:new Request("https://music98.news/api/concerts?mode=popular"),
    env:{TICKETMASTER_API_KEY:"test",DESK:kv},
    waitUntil:()=>{}
  });
  assert.equal(response.status,200);
  const data=await response.json();
  assert.deepEqual(data.artists,[]);
  assert.equal(data.warming,true);
  assert.equal(data.targetCount,30);
});

test("exact-city user query paginates and stays scoped to that city", async () => {
  const kv=memoryKv();
  const oldFetch=globalThis.fetch;
  const oldCaches=globalThis.caches;
  const seen=[];
  /* A fixed mock date expired on 2 October and correctly got filtered out.
     Always supply future event days: the test concerns pagination, not history. */
  const futureDates=[1,2].map(days=>
    new Date(Date.now()+days*86400000).toISOString().slice(0,10));
  globalThis.caches={default:{match:async()=>null,put:async()=>{}}};
  globalThis.fetch=async input=>{
    const u=new URL(String(input));
    seen.push(u);
    if(!u.pathname.endsWith("/events.json")) return new Response("not found",{status:404});
    assert.equal(u.searchParams.get("city"),"Paris");
    assert.equal(u.searchParams.get("countryCode"),"FR");
    const page=Number(u.searchParams.get("page")||0);
    const event={
      id:"e"+page,
      name:"Show "+page,
      dates:{start:{localDate:futureDates[page],localTime:"20:00:00"}},
      _embedded:{
        attractions:[{id:"artist",name:"Artist",images:[]}],
        venues:[{
          id:"venue",name:"Venue",city:{name:"Paris"},
          country:{name:"France",countryCode:"FR"},
          location:{latitude:"48.8566",longitude:"2.3522"}
        }]
      },
      images:[]
    };
    return new Response(JSON.stringify({
      _embedded:{events:[event]},
      page:{size:200,totalElements:201,totalPages:2,number:page}
    }),{status:200,headers:{"content-type":"application/json"}});
  };
  try{
    const response=await onRequestGet({
      request:new Request("https://music98.news/api/concerts?city=Paris&countryCode=FR"),
      env:{TICKETMASTER_API_KEY:"test",DESK:kv},
      waitUntil:()=>{}
    });
    assert.equal(response.status,200);
    const data=await response.json();
    assert.equal(data.events.length,2);
    assert.deepEqual(data.events.map(e=>e.date),futureDates);
    assert.equal(data.pagesFetched,2);
    assert.equal(data.partial,false);
    assert.equal(seen.length,2);
    assert.deepEqual(seen.map(u=>u.searchParams.get("page")||"0"),["0","1"]);
  }finally{
    globalThis.fetch=oldFetch;
    globalThis.caches=oldCaches;
  }
});


test("daily Popular builder produces 30 eligible artists in source-rank order", async () => {
  const kv=memoryKv();
  const oldFetch=globalThis.fetch;
  const rows=Array.from({length:40},(_,i)=>
    "<tr><td>"+(i+1)+"</td><td>Artist "+(i+1)+"</td><td>"+(100000000-i*1000)+"</td></tr>"
  ).join("");

  let kworbCalls=0;
  let ticketmasterCalls=0;
  globalThis.fetch=async input=>{
    const u=new URL(String(input));
    if(u.hostname==="kworb.net"){
      kworbCalls++;
      return new Response("<table>"+rows+"</table>",{status:200,headers:{"content-type":"text/html"}});
    }
    if(u.hostname==="app.ticketmaster.com" && u.pathname.endsWith("/attractions.json")){
      ticketmasterCalls++;
      const name=u.searchParams.get("keyword")||"";
      const n=Number(name.replace(/[^0-9]/g,""))||1;
      const attraction={
        id:"artist-"+n,
        name,
        images:[],
        classifications:[{segment:{name:"Music"}}],
        upcomingEvents:{_total:3}
      };
      return new Response(JSON.stringify({_embedded:{attractions:[attraction]},page:{totalElements:1,totalPages:1,size:50,number:0}}),
        {status:200,headers:{"content-type":"application/json","Rate-Limit-Available":"4900"}});
    }
    if(u.hostname==="app.ticketmaster.com" && u.pathname.endsWith("/events.json")){
      ticketmasterCalls++;
      const id=u.searchParams.get("attractionId")||"";
      const n=Number(id.replace(/[^0-9]/g,""))||1;
      if(n<=2){
        return new Response(JSON.stringify({page:{totalElements:0,totalPages:0,size:1,number:0}}),
          {status:200,headers:{"content-type":"application/json","Rate-Limit-Available":"4900"}});
      }
      const day=String((n%28)+1).padStart(2,"0");
      return new Response(JSON.stringify({
        _embedded:{events:[{
          id:"event-"+n,name:"Artist "+n+" Live",url:"https://example.com/event-"+n,
          dates:{start:{dateTime:"2026-11-"+day+"T20:00:00Z",localDate:"2026-11-"+day,localTime:"20:00:00"}},
          _embedded:{
            attractions:[{id:"artist-"+n,name:"Artist "+n,images:[]}],
            venues:[{id:"venue-"+n,name:"Venue",city:{name:"Paris"},country:{name:"France",countryCode:"FR"},location:{latitude:"48.8566",longitude:"2.3522"}}]
          },
          images:[]
        }]},
        page:{totalElements:3,totalPages:3,size:1,number:0}
      }),{status:200,headers:{"content-type":"application/json","Rate-Limit-Available":"4900"}});
    }
    return new Response("not found",{status:404});
  };

  try{
    let result;
    for(let i=0;i<8;i++){
      result=await refreshPopularSnapshot({TICKETMASTER_API_KEY:"test",DESK:kv});
      if(result.complete) break;
    }
    assert.equal(result.complete,true);
    const snap=JSON.parse(kv.raw("concert-popular:v4"));
    assert.equal(snap.version,"popular-v4");
    assert.equal(snap.artists.length,30);
    assert.equal(snap.eligibility,"ticketmaster_event_payload_gt_0");
    assert.equal(snap.artists.every(x=>x.eventConfirmed===true && Number(x.shows)>0),true);
    assert.deepEqual(snap.artists.map(x=>x.rank),Array.from({length:30},(_,i)=>i+1));
    assert.deepEqual(snap.artists.map(x=>x.popularityRank),Array.from({length:30},(_,i)=>i+3));
    assert.equal(snap.artists[0].name,"Artist 3");
    assert.equal(snap.artists[29].name,"Artist 32");
    assert.equal(kworbCalls,1);
    assert.equal(ticketmasterCalls,66);

    // A fresh daily snapshot must not hit either source again.
    const before=ticketmasterCalls;
    const fresh=await refreshPopularSnapshot({TICKETMASTER_API_KEY:"test",DESK:kv});
    assert.equal(fresh.fresh,true);
    assert.equal(ticketmasterCalls,before);
  }finally{
    globalThis.fetch=oldFetch;
  }
});


test("fresh partial Popular snapshot resumes from its cursor and reaches Top 30", async () => {
  const kv=memoryKv();
  const partial=Array.from({length:8},(_,i)=>({
    id:"artist-"+(i+1),
    name:"Artist "+(i+1),
    image:"",
    rank:i+1,
    popularityRank:i+1,
    listeners:100000000-i*1000,
    shows:3,
    eventConfirmed:true,
    firstDate:""
  }));
  await kv.put("concert-popular:v4",JSON.stringify({
    ok:true,mode:"popular",version:"popular-v4",algorithm:"rank-ordered-event-query-v2",identityValidation:"primary-attraction-v3",
    builtAt:new Date().toISOString(),
    source:"spotify_monthly_listeners",
    ranking:"Spotify monthly listeners",
    eligibility:"ticketmaster_event_payload_gt_0",
    candidateCount:8,
    eligibleCount:8,
    targetCount:30,
    artists:partial
  }));

  const rows=Array.from({length:40},(_,i)=>
    "<tr><td>"+(i+1)+"</td><td>Artist "+(i+1)+"</td><td>"+(100000000-i*1000)+"</td></tr>"
  ).join("");

  const oldFetch=globalThis.fetch;
  const ticketmasterKeywords=[];
  globalThis.fetch=async input=>{
    const u=new URL(String(input));
    if(u.hostname==="kworb.net"){
      return new Response("<table>"+rows+"</table>",{status:200,headers:{"content-type":"text/html"}});
    }
    if(u.hostname==="app.ticketmaster.com" && u.pathname.endsWith("/attractions.json")){
      const name=u.searchParams.get("keyword")||"";
      ticketmasterKeywords.push(name);
      const n=Number(name.replace(/[^0-9]/g,""))||1;
      return new Response(JSON.stringify({
        _embedded:{attractions:[{
          id:"artist-"+n,
          name,
          images:[],
          classifications:[{segment:{name:"Music"}}],
          upcomingEvents:{_total:3}
        }]},
        page:{totalElements:1,totalPages:1,size:50,number:0}
      }),{status:200,headers:{"content-type":"application/json","Rate-Limit-Available":"4900"}});
    }
    if(u.hostname==="app.ticketmaster.com" && u.pathname.endsWith("/events.json")){
      const id=u.searchParams.get("attractionId")||"";
      const n=Number(id.replace(/[^0-9]/g,""))||1;
      return new Response(JSON.stringify({
        _embedded:{events:[{
          id:"event-"+n,name:"Artist "+n+" Live",url:"https://example.com/event-"+n,
          dates:{start:{dateTime:"2026-12-01T20:00:00Z",localDate:"2026-12-01",localTime:"20:00:00"}},
          _embedded:{
            attractions:[{id:"artist-"+n,name:"Artist "+n,images:[]}],
            venues:[{id:"venue-"+n,name:"Venue",city:{name:"Paris"},country:{name:"France",countryCode:"FR"},location:{latitude:"48.8566",longitude:"2.3522"}}]
          },
          images:[]
        }]},
        page:{totalElements:3,totalPages:3,size:1,number:0}
      }),{status:200,headers:{"content-type":"application/json","Rate-Limit-Available":"4900"}});
    }
    return new Response("not found",{status:404});
  };

  try{
    let result=await refreshPopularSnapshot({TICKETMASTER_API_KEY:"test",DESK:kv});
    assert.equal(result.complete,false);
    assert.equal(result.found,18);
    assert.equal(ticketmasterKeywords[0],"Artist 9");

    for(let i=0;i<6 && !result.complete;i++){
      result=await refreshPopularSnapshot({TICKETMASTER_API_KEY:"test",DESK:kv});
    }
    assert.equal(result.complete,true);
    assert.equal(result.artists,30);

    const snap=JSON.parse(kv.raw("concert-popular:v4"));
    assert.equal(snap.artists.length,30);
    assert.deepEqual(snap.artists.map(x=>x.rank),Array.from({length:30},(_,i)=>i+1));
    assert.deepEqual(snap.artists.map(x=>x.popularityRank),Array.from({length:30},(_,i)=>i+1));
    assert.equal(ticketmasterKeywords.includes("Artist 1"),false);
    assert.equal(ticketmasterKeywords.includes("Artist 8"),false);
  }finally{
    globalThis.fetch=oldFetch;
  }
});

test("public Popular exposes only identity-validated in-progress artists without showing unverified leftovers", async () => {
  const kv=memoryKv();
  const snapshotArtists=Array.from({length:8},(_,i)=>({
    id:"artist-"+(i+1),name:"Artist "+(i+1),rank:i+1,popularityRank:i+1,shows:3,eventConfirmed:true
  }));
  const stateArtists=Array.from({length:12},(_,i)=>({
    id:"artist-"+(i+1),name:"Artist "+(i+1),rank:i+1,popularityRank:i+1,shows:3,eventConfirmed:true
  }));
  await kv.put("concert-popular:v4",JSON.stringify({
    ok:true,mode:"popular",version:"popular-v4",algorithm:"rank-ordered-event-query-v2",builtAt:new Date().toISOString(),
    source:"spotify_monthly_listeners",eligibility:"ticketmaster_event_payload_gt_0",artists:snapshotArtists,targetCount:30
  }));
  await kv.put("concert-popular:v4:state",JSON.stringify({
    version:"popular-v4",algorithm:"rank-ordered-event-query-v2",identityValidation:"primary-attraction-v3",source:"spotify_monthly_listeners",
    candidates:[],index:12,found:stateArtists,errors:0
  }));

  const oldFetch=globalThis.fetch;
  let externalCalls=0;
  globalThis.fetch=async()=>{ externalCalls++; throw new Error("Popular public read must stay snapshot-only"); };
  try{
    const response=await onRequestGet({
      request:new Request("https://music98.news/api/concerts?mode=popular"),
      env:{TICKETMASTER_API_KEY:"test",DESK:kv},
      waitUntil:()=>{}
    });
    assert.equal(response.status,200);
    const data=await response.json();
    assert.deepEqual(data.artists.map(a=>a.name),stateArtists.map(a=>a.name));
    assert.equal(data.identityValidation,"primary-attraction-v3");
    assert.equal(data.validatedCount,12);
    assert.equal(data.warming,true);
    assert.equal(data.targetCount,30);
    assert.equal(externalCalls,0);
  }finally{
    globalThis.fetch=oldFetch;
  }
});

test("Popular builder retries the same ranked artist after a transient 5xx", async () => {
  const kv=memoryKv();
  const oldFetch=globalThis.fetch;
  let eventCalls=0;
  const rows=Array.from({length:30},(_,i)=>
    "<tr><td>"+(i+1)+"</td><td>Retry Artist "+(i+1)+"</td><td>"+(90000000-i*1000)+"</td></tr>"
  ).join("");

  globalThis.fetch=async input=>{
    const u=new URL(String(input));
    if(u.hostname==="kworb.net"){
      return new Response("<table>"+rows+"</table>",{status:200});
    }
    if(u.hostname==="app.ticketmaster.com"){
      eventCalls++;
      if(eventCalls===1) return new Response("temporary",{status:503});
      const name=u.searchParams.get("keyword")||"";
      return new Response(JSON.stringify({
        _embedded:{attractions:[{
          id:"a-"+eventCalls,name,images:[],
          classifications:[{segment:{name:"Music"}}],
          upcomingEvents:{_total:2}
        }]},page:{totalElements:1,totalPages:1,size:50,number:0}
      }),{status:200,headers:{"content-type":"application/json"}});
    }
    return new Response("not found",{status:404});
  };

  try{
    const first=await refreshPopularSnapshot({TICKETMASTER_API_KEY:"test",DESK:kv});
    assert.equal(first.retry,true);
    assert.equal(first.index,0);
    const state=JSON.parse(kv.raw("concert-popular:v4:state"));
    assert.equal(state.index,0);
    assert.equal(state.found.length,0);
  }finally{
    globalThis.fetch=oldFetch;
  }
});


test("Popular ranking keeps the last real Spotify snapshot when the ranking source falls back", async () => {
  const kv=memoryKv();
  const artists=Array.from({length:30},(_,i)=>({
    id:"existing-"+i,name:"Existing "+i,rank:i+1,popularityRank:i+1,shows:2,eventConfirmed:true
  }));
  await kv.put("concert-popular:v4",JSON.stringify({
    ok:true,mode:"popular",version:"popular-v4",
    builtAt:new Date(Date.now()-25*60*60*1000).toISOString(),
    source:"spotify_monthly_listeners",
    eligibility:"ticketmaster_event_payload_gt_0",
    artists
  }));

  const oldFetch=globalThis.fetch;
  globalThis.fetch=async input=>{
    const u=new URL(String(input));
    if(u.hostname==="kworb.net") return new Response("broken",{status:503});
    throw new Error("Ticketmaster must not be queried when ranking source is unavailable");
  };
  try{
    const result=await refreshPopularSnapshot({TICKETMASTER_API_KEY:"test",DESK:kv},true);
    assert.equal(result.keptExisting,true);
    assert.equal(result.reason,"popular_ranking_source_unavailable");
    const snap=JSON.parse(kv.raw("concert-popular:v4"));
    assert.equal(snap.artists.length,30);
    assert.equal(snap.source,"spotify_monthly_listeners");
  }finally{
    globalThis.fetch=oldFetch;
  }
});

test("popular artist tours are prewarmed and later served from KV without Ticketmaster", async () => {
  const kv=memoryKv();
  const builtAt=new Date().toISOString();
  await kv.put("concert-popular:v4",JSON.stringify({
    ok:true,mode:"popular",version:"popular-v4",builtAt,
    source:"spotify_monthly_listeners",
    eligibility:"ticketmaster_event_payload_gt_0",
    artists:[{id:"artist-1",name:"Artist One",rank:1,popularityRank:1,shows:1,eventConfirmed:true}]
  }));

  const oldFetch=globalThis.fetch;
  const oldCaches=globalThis.caches;
  let tmCalls=0;
  globalThis.caches={default:{match:async()=>null,put:async()=>{}}};
  globalThis.fetch=async input=>{
    const u=new URL(String(input));
    if(u.hostname==="app.ticketmaster.com" && u.pathname.endsWith("/events.json")){
      tmCalls++;
      assert.equal(u.searchParams.get("attractionId"),"artist-1");
      return new Response(JSON.stringify({
        _embedded:{events:[{
          id:"e1",name:"Show",dates:{start:{localDate:"2026-10-10",localTime:"20:00:00"}},
          _embedded:{
            attractions:[{id:"artist-1",name:"Artist One",images:[]}],
            venues:[{name:"Venue",city:{name:"Paris"},country:{name:"France",countryCode:"FR"},location:{latitude:"48.8566",longitude:"2.3522"}}]
          },images:[]
        }]},
        page:{size:200,totalElements:1,totalPages:1,number:0}
      }),{status:200,headers:{"content-type":"application/json","Rate-Limit-Available":"4900"}});
    }
    return new Response("not found",{status:404});
  };

  try{
    const warm=await refreshPopularTourSnapshots({TICKETMASTER_API_KEY:"test",DESK:kv},1);
    assert.equal(warm.complete,true);
    assert.equal(tmCalls,1);

    globalThis.fetch=async()=>{ throw new Error("prewarmed visitor read must not call Ticketmaster"); };
    const response=await onRequestGet({
      request:new Request("https://music98.news/api/concerts?attractionId=artist-1"),
      env:{TICKETMASTER_API_KEY:"test",DESK:kv},
      waitUntil:()=>{}
    });
    assert.equal(response.status,200);
    const data=await response.json();
    assert.equal(data.events.length,1);
    assert.equal(data.events[0].artist,"Artist One");
    assert.equal(tmCalls,1);
  }finally{
    globalThis.fetch=oldFetch;
    globalThis.caches=oldCaches;
  }
});

test("European capital event lists are prewarmed for Cloudflare-only map clicks", async () => {
  const kv=memoryKv();
  const oldFetch=globalThis.fetch;
  const oldCaches=globalThis.caches;
  let tmCalls=0;
  globalThis.caches={default:{match:async()=>null,put:async()=>{}}};
  globalThis.fetch=async input=>{
    const u=new URL(String(input));
    if(u.hostname==="app.ticketmaster.com" && u.pathname.endsWith("/events.json")){
      tmCalls++;
      const city=u.searchParams.get("city");
      const cc=u.searchParams.get("countryCode");
      return new Response(JSON.stringify({
        _embedded:{events:[{
          id:"city-"+tmCalls,name:"Show",dates:{start:{localDate:"2026-10-11",localTime:"20:00:00"}},
          _embedded:{
            attractions:[{id:"artist",name:"Artist",images:[]}],
            venues:[{name:"Venue",city:{name:city},country:{name:cc,countryCode:cc},location:{latitude:"48.8566",longitude:"2.3522"}}]
          },images:[]
        }]},
        page:{size:200,totalElements:1,totalPages:1,number:0}
      }),{status:200,headers:{"content-type":"application/json","Rate-Limit-Available":"4900"}});
    }
    return new Response("not found",{status:404});
  };

  try{
    const warm=await refreshCapitalEventSnapshots({TICKETMASTER_API_KEY:"test",DESK:kv},1);
    assert.equal(warm.index,1);
    assert.equal(tmCalls,1);

    globalThis.fetch=async()=>{ throw new Error("capital visitor click must use KV"); };
    const response=await onRequestGet({
      request:new Request("https://music98.news/api/concerts?city=Paris&countryCode=FR"),
      env:{TICKETMASTER_API_KEY:"test",DESK:kv},
      waitUntil:()=>{}
    });
    assert.equal(response.status,200);
    const data=await response.json();
    assert.equal(data.events.length,1);
    assert.equal(data.query.city,"Paris");
    assert.equal(tmCalls,1);
  }finally{
    globalThis.fetch=oldFetch;
    globalThis.caches=oldCaches;
  }
});


test("incomplete validated Popular rebuild never publishes a 29-row snapshot", async () => {
  const kv=memoryKv();
  const oldFetch=globalThis.fetch;
  const rows=Array.from({length:30},(_,i)=>
    "<tr><td>"+(i+1)+"</td><td>Atomic Artist "+(i+1)+"</td><td>"+(80000000-i*1000)+"</td></tr>"
  ).join("");

  globalThis.fetch=async input=>{
    const u=new URL(String(input));
    if(u.hostname==="kworb.net"){
      return new Response("<table>"+rows+"</table>",{status:200,headers:{"content-type":"text/html"}});
    }
    if(u.hostname==="app.ticketmaster.com" && u.pathname.endsWith("/attractions.json")){
      const name=u.searchParams.get("keyword")||"";
      const n=Number(name.replace(/[^0-9]/g,""))||1;
      return new Response(JSON.stringify({_embedded:{attractions:[{
        id:"atomic-"+n,name,images:[],classifications:[{segment:{name:"Music"}}],upcomingEvents:{_total:2}
      }]},page:{totalElements:1,totalPages:1,size:50,number:0}}),{status:200,headers:{"content-type":"application/json","Rate-Limit-Available":"4900"}});
    }
    if(u.hostname==="app.ticketmaster.com" && u.pathname.endsWith("/events.json")){
      const id=u.searchParams.get("attractionId")||"";
      const n=Number(id.replace(/[^0-9]/g,""))||1;
      if(n===30) return new Response(JSON.stringify({page:{totalElements:0,totalPages:0,size:1,number:0}}),{status:200,headers:{"content-type":"application/json","Rate-Limit-Available":"4900"}});
      return new Response(JSON.stringify({_embedded:{events:[{
        id:"atomic-event-"+n,name:"Atomic Artist "+n+" Live",url:"https://example.com/atomic-"+n,
        dates:{start:{dateTime:"2026-12-01T20:00:00Z",localDate:"2026-12-01",localTime:"20:00:00"}},
        _embedded:{
          attractions:[{id:"atomic-"+n,name:"Atomic Artist "+n,images:[]}],
          venues:[{id:"atomic-venue-"+n,name:"Venue",city:{name:"Paris"},country:{name:"France",countryCode:"FR"},location:{latitude:"48.8566",longitude:"2.3522"}}]
        },
        images:[]
      }]},page:{totalElements:2,totalPages:2,size:1,number:0}}),{status:200,headers:{"content-type":"application/json","Rate-Limit-Available":"4900"}});
    }
    return new Response("not found",{status:404});
  };

  try{
    let result;
    for(let i=0;i<4;i++) result=await refreshPopularSnapshot({TICKETMASTER_API_KEY:"test",DESK:kv});
    assert.equal(result.reason,"popular_refresh_incomplete");
    assert.equal(result.artists,29);
    assert.equal(kv.raw("concert-popular:v4"),null);
  }finally{
    globalThis.fetch=oldFetch;
  }
});


test("current exhausted 27-row Popular state expands to the new candidate depth and reaches 30", async () => {
  const kv=memoryKv();
  const found=Array.from({length:27},(_,i)=>({
    id:"artist-"+(i+1),name:"Artist "+(i+1),image:"",
    rank:i+1,popularityRank:i+1,listeners:100000000-i*1000,
    shows:2,eventConfirmed:true,firstDate:"2026-12-01"
  }));
  const oldCandidates=Array.from({length:30},(_,i)=>({
    name:"Artist "+(i+1),rank:i+1,listeners:100000000-i*1000
  }));
  await kv.put("concert-popular:v4",JSON.stringify({
    ok:true,mode:"popular",version:"popular-v4",algorithm:"rank-ordered-event-query-v2",identityValidation:"primary-attraction-v3",builtAt:new Date().toISOString(),
    source:"spotify_monthly_listeners",ranking:"Spotify monthly listeners",
    eligibility:"ticketmaster_event_payload_gt_0",candidateCount:30,
    eligibleCount:27,targetCount:30,artists:found
  }));
  await kv.put("concert-popular:v4:state",JSON.stringify({
    version:"popular-v4",algorithm:"rank-ordered-event-query-v2",identityValidation:"primary-attraction-v3",startedAt:new Date().toISOString(),updatedAt:new Date().toISOString(),
    source:"spotify_monthly_listeners",ranking:"Spotify monthly listeners",
    candidates:oldCandidates,index:30,found:found.map(x=>({...x})),errors:0
  }));

  const rows=Array.from({length:40},(_,i)=>
    "<tr><td>"+(i+1)+"</td><td>Artist "+(i+1)+"</td><td>"+(100000000-i*1000)+"</td></tr>"
  ).join("");
  const oldFetch=globalThis.fetch;
  const keywords=[];
  const eventSizes=[];
  globalThis.fetch=async input=>{
    const u=new URL(String(input));
    if(u.hostname==="kworb.net"){
      return new Response("<table>"+rows+"</table>",{status:200,headers:{"content-type":"text/html"}});
    }
    if(u.hostname==="app.ticketmaster.com" && u.pathname.endsWith("/attractions.json")){
      const name=u.searchParams.get("keyword")||"";
      keywords.push(name);
      const n=Number(name.replace(/[^0-9]/g,""))||1;
      return new Response(JSON.stringify({_embedded:{attractions:[{
        id:"artist-"+n,name,images:[],classifications:[{segment:{name:"Music"}}],upcomingEvents:{_total:2}
      }]},page:{totalElements:1,totalPages:1,size:50,number:0}}),
      {status:200,headers:{"content-type":"application/json","Rate-Limit-Available":"4900"}});
    }
    if(u.hostname==="app.ticketmaster.com" && u.pathname.endsWith("/events.json")){
      eventSizes.push(u.searchParams.get("size"));
      const id=u.searchParams.get("attractionId")||"";
      const n=Number(id.replace(/[^0-9]/g,""))||1;
      return new Response(JSON.stringify({
        _embedded:{events:[{
          id:"event-"+n,name:"Artist "+n+" Live",url:"https://example.com/event-"+n,
          dates:{start:{localDate:"2026-12-01",localTime:"20:00:00"}},
          _embedded:{
            attractions:[{id:"artist-"+n,name:"Artist "+n,images:[]}],
            venues:[{name:"Venue",city:{name:"Paris"},country:{name:"France",countryCode:"FR"},location:{latitude:"48.8566",longitude:"2.3522"}}]
          },images:[]
        }]},
        page:{totalElements:2,totalPages:1,size:200,number:0}
      }),{status:200,headers:{"content-type":"application/json","Rate-Limit-Available":"4900"}});
    }
    return new Response("not found",{status:404});
  };

  try{
    const result=await refreshPopularSnapshot({TICKETMASTER_API_KEY:"test",DESK:kv});
    assert.equal(result.complete,true);
    assert.equal(result.artists,30);
    assert.equal(keywords[0],"Artist 31");
    assert.deepEqual(keywords.slice(0,3),["Artist 31","Artist 32","Artist 33"]);
    assert.equal(eventSizes.every(x=>x==="200"),true);

    const snap=JSON.parse(kv.raw("concert-popular:v4"));
    assert.equal(snap.artists.length,30);
    assert.equal(snap.artists[29].name,"Artist 33");

    const seeded=JSON.parse(kv.raw("concert-popular:v4:tour:artist-31"));
    assert.equal(seeded.evidence,"popular_validation_attraction_events");
    assert.equal(seeded.events.length,1);
    assert.equal(seeded.events[0].artist,"Artist 31");
  }finally{
    globalThis.fetch=oldFetch;
  }
});

test("tour prewarm skips a fresh validation cache without spending its origin-call budget", async () => {
  const kv=memoryKv();
  const builtAt=new Date().toISOString();
  await kv.put("concert-popular:v4",JSON.stringify({
    ok:true,mode:"popular",version:"popular-v4",builtAt,
    source:"spotify_monthly_listeners",eligibility:"ticketmaster_event_payload_gt_0",
    artists:[
      {id:"artist-1",name:"Artist One",rank:1,popularityRank:1,shows:1,eventConfirmed:true},
      {id:"artist-2",name:"Artist Two",rank:2,popularityRank:2,shows:1,eventConfirmed:true}
    ]
  }));
  await kv.put("concert-popular:v4:tour:artist-1",JSON.stringify({
    ok:true,builtAt:new Date().toISOString(),evidence:"popular_validation_first_page",
    events:[{id:"cached",artist:"Artist One",attractionId:"artist-1",lat:1,lng:1}],page:{totalElements:1}
  }));

  const oldFetch=globalThis.fetch;
  let tmCalls=0;
  globalThis.fetch=async input=>{
    const u=new URL(String(input));
    if(u.hostname==="app.ticketmaster.com" && u.pathname.endsWith("/events.json")){
      tmCalls++;
      assert.equal(u.searchParams.get("attractionId"),"artist-2");
      return new Response(JSON.stringify({
        _embedded:{events:[{
          id:"e2",name:"Show",dates:{start:{localDate:"2026-10-10",localTime:"20:00:00"}},
          _embedded:{
            attractions:[{id:"artist-2",name:"Artist Two",images:[]}],
            venues:[{name:"Venue",city:{name:"Paris"},country:{name:"France",countryCode:"FR"},location:{latitude:"48.8566",longitude:"2.3522"}}]
          },images:[]
        }]},
        page:{size:200,totalElements:1,totalPages:1,number:0}
      }),{status:200,headers:{"content-type":"application/json","Rate-Limit-Available":"4900"}});
    }
    return new Response("not found",{status:404});
  };

  try{
    const warm=await refreshPopularTourSnapshots({TICKETMASTER_API_KEY:"test",DESK:kv},1);
    assert.equal(warm.complete,true);
    assert.equal(warm.processed,1);
    assert.equal(tmCalls,1);
  }finally{
    globalThis.fetch=oldFetch;
  }
});


test("new daily market state overrides an older complete snapshot before the world scan finishes", async () => {
  const kv=memoryKv();
  const cycle=new Date().toISOString().slice(0,10);
  await kv.put("concert-markets:v3:snapshot",JSON.stringify({
    ok:true,mode:"markets",version:"concert-markets-v3",
    cycle:"2026-09-28",builtAt:"2026-09-28T23:00:00.000Z",
    markets:[
      {city:"Paris",countryCode:"FR",stateCode:"",lat:48.8566,lng:2.3522,count:20,verified:true,pinned:1,tier:1}
    ],
    candidateCount:100,verifiedCount:1
  }));
  await kv.put("concert-markets:v4:state",JSON.stringify({
    version:"concert-markets-v4",cycle,index:20,complete:false,
    updatedAt:new Date().toISOString(),
    markets:[
      {city:"Rome",countryCode:"IT",stateCode:"",lat:41.9028,lng:12.4964,count:7,verified:true,pinned:1,tier:1}
    ]
  }));
  await kv.put(HOTSPOT_SNAPSHOT_KEY,JSON.stringify({
    version:HOTSPOT_VERSION,builtAt:new Date().toISOString(),
    hotspots:[
      {city:"New York",countryCode:"US",stateCode:"NY",lat:40.7128,lng:-74.006,count:80},
      {city:"Dubai",countryCode:"AE",stateCode:"",lat:25.2048,lng:55.2708,count:18},
      {city:"Tokyo",countryCode:"JP",stateCode:"",lat:35.6762,lng:139.6503,count:45}
    ]
  }));

  const oldFetch=globalThis.fetch;
  let externalCalls=0;
  globalThis.fetch=async()=>{ externalCalls++; throw new Error("public market read must stay snapshot-only"); };
  try{
    const response=await onRequestGet({
      request:new Request("https://music98.news/api/concerts?mode=markets&v=concert-markets-v7"),
      env:{TICKETMASTER_API_KEY:"test",DESK:kv},
      waitUntil:()=>{}
    });
    assert.equal(response.status,200);
    const data=await response.json();
    assert.equal(data.complete,false);
    assert.equal(data.warming,true);
    assert.ok(data.markets.some(x=>x.city==="Paris" && x.countryCode==="FR"));
    assert.ok(data.markets.some(x=>x.city==="Rome" && x.countryCode==="IT" && Number(x.count)===7));
    assert.ok(data.markets.some(x=>x.city==="New York" && x.countryCode==="US"));
    assert.ok(data.markets.some(x=>x.city==="Dubai" && x.countryCode==="AE"));
    assert.ok(data.markets.some(x=>x.city==="Tokyo" && x.countryCode==="JP"));
    assert.equal(data.progress.index,20);
    assert.equal(externalCalls,0);
  }finally{
    globalThis.fetch=oldFetch;
  }
});


test("Ticketmaster quota accounting is leased so Free KV writes are not spent per origin call", async () => {
  const fs = await import("node:fs");
  const src = fs.readFileSync(new URL("../functions/api/concerts.js", import.meta.url), "utf8");
  assert.match(src,/TM_GLOBAL_LEASE_SIZE = 25/);
  assert.match(src,/TM_INTERACTIVE_LEASE_SIZE = 10/);
  assert.match(src,/MAP_MARKET_BATCH_SIZE = 20/);
  assert.match(src,/consumeBudgetLease\(/);
  assert.match(src,/available<=tmObservedAvailable-25/);
  assert.doesNotMatch(src,/writeBudget\(env,interactiveKey,interactiveUsed\+1\)/);
  assert.doesNotMatch(src,/writeBudget\(env,globalKey,globalUsed\+1\)/);
});


test("daily Popular and map snapshots are built by cron, never by visitors", async () => {
  const fs = await import("node:fs");
  const worker = fs.readFileSync(new URL("../worker.js", import.meta.url), "utf8");
  const wrangler = fs.readFileSync(new URL("../wrangler.toml", import.meta.url), "utf8");
  assert.match(wrangler,/20 0 \* \* \*/);
  assert.match(wrangler,/20 1 \* \* \*/);
  assert.match(wrangler,/"\* \* \* \* \*"/);
  assert.match(worker,/for\(let i=0;i<4;i\+\+\)[\s\S]*refreshPopularSnapshot\(env,i===0\)/);
  assert.match(worker,/for\(let i=0;i<2;i\+\+\)[\s\S]*refreshMapMarketSnapshot\(env,i===0\)/);
  const api = fs.readFileSync(new URL("../functions/api/concerts.js", import.meta.url), "utf8");
  assert.match(api,/const MAP_MARKET_VERSION = "concert-markets-v4"/);
});


test("event pipeline filters QA/status noise and collapses package duplicates", async()=>{
  const fs=await import("node:fs");
  const src=fs.readFileSync(new URL("../functions/api/concerts.js",import.meta.url),"utf8");
  assert.match(src,/\["cancelled","canceled","postponed","rescheduled"\]\.includes\(status\)/);
  assert.match(src,/do\\s\+not\\s\+purchase/);
  assert.match(src,/venueName\.toLowerCase\(\)==="ticketmaster"/);
  assert.match(src,/function collapseDuplicateEvents\(events\)/);
  assert.match(src,/function packageEventPenalty\(e\)/);
  assert.match(src,/ticketOptions:/);
});
test("market scan keeps internal accept/reject audit out of public API", async()=>{
  const kv=memoryKv(),oldFetch=globalThis.fetch;
  globalThis.fetch=async input=>{
    const u=new URL(String(input));
    if(!u.pathname.endsWith("/events.json")) return new Response("not found",{status:404});
    const hasShows=u.searchParams.get("countryCode")==="GB";
    return new Response(JSON.stringify(hasShows?{_embedded:{events:[{id:"gb",dates:{start:{localDate:"2026-10-10"}}}]},page:{totalElements:2,totalPages:1,size:1,number:0}}:{page:{totalElements:0,totalPages:0,size:1,number:0}}),{status:200,headers:{"content-type":"application/json","Rate-Limit-Available":"4900"}});
  };
  try{
    await refreshMapMarketSnapshot({TICKETMASTER_API_KEY:"test",DESK:kv},true);
    const state=JSON.parse(kv.raw("concert-markets:v4:state"));
    assert.equal(state.audit.length,20);
    assert.ok(state.audit.some(x=>x.reason==="upcoming_events"));
    assert.ok(state.audit.some(x=>x.reason==="no_upcoming_events"));
    assert.ok(state.coverageAudit.some(x=>x.label==="US-AK"&&x.candidate));
    assert.ok(state.coverageAudit.some(x=>x.label==="US-SD"&&x.candidate));
    assert.ok(state.coverageAudit.some(x=>x.label==="US-VT"&&x.candidate));
    assert.ok(state.coverageAudit.some(x=>x.label==="AU-Brisbane"&&x.reason==="missing_candidate_seed"));
    assert.ok(state.coverageAudit.some(x=>x.label==="AU-Perth"&&x.reason==="missing_candidate_seed"));
    assert.ok(state.coverageAudit.some(x=>x.label==="CA-AB"&&x.reason==="missing_candidate_seed"));
    assert.ok(state.coverageAudit.some(x=>x.label==="CA-ON"&&x.reason==="candidate_present_without_state_code"));
    const response=await onRequestGet({request:new Request("https://music98.news/api/concerts?mode=markets"),env:{TICKETMASTER_API_KEY:"test",DESK:kv},waitUntil:()=>{}});
    const data=await response.json();
    assert.equal("audit" in data,false);
    assert.equal("coverageAudit" in data,false);
  }finally{globalThis.fetch=oldFetch;}
});


test("interactive events keep one primary ticket and exclude non-live rows", async()=>{
  const kv=memoryKv(),oldFetch=globalThis.fetch,oldCaches=globalThis.caches;
  globalThis.caches={default:{match:async()=>null,put:async()=>{}}};
  const venue={name:"Columbiahalle",city:{name:"Berlin"},country:{name:"Germany",countryCode:"DE"},location:{latitude:"52.4849",longitude:"13.3917"}};
  const attraction={id:"tove",name:"Tove Lo",images:[{url:"https://img.test/artist-small.jpg",width:305,height:225,ratio:"4_3",fallback:false}]};
  const mk=(id,name,url,status="onsale",v=venue)=>({
    id,name,url,test:false,dates:{status:{code:status},start:{localDate:"2026-11-14",localTime:"20:00:00"}},
    images:[{url:"https://img.test/event-large.jpg",width:2048,height:1152,ratio:"16_9",fallback:false}],
    _embedded:{attractions:[attraction],venues:[v]}
  });
  globalThis.fetch=async input=>{
    const u=new URL(String(input));
    if(!u.pathname.endsWith("/events.json")) return new Response("not found",{status:404});
    const rows=[
      mk("std","Tove Lo","https://tickets.test/standard"),
      mk("vip","Tove Lo - Signed First Entry Package","https://tickets.test/vip"),
      mk("qa","QA Festival DO NOT PURCHASE","https://tickets.test/qa"),
      mk("cancel","Cancelled Artist","https://tickets.test/cancel","cancelled"),
      mk("post","Postponed Artist","https://tickets.test/post","postponed"),
      mk("resched","Rescheduled Artist","https://tickets.test/rescheduled","rescheduled"),
      mk("venue-test","QA Testing","https://tickets.test/venue-test","onsale",{...venue,name:"Ticketmaster"})
    ];
    return new Response(JSON.stringify({_embedded:{events:rows},page:{size:200,totalElements:rows.length,totalPages:1,number:0}}),{status:200,headers:{"content-type":"application/json","Rate-Limit-Available":"4900"}});
  };
  try{
    const response=await onRequestGet({request:new Request("https://music98.news/api/concerts?city=Berlin&countryCode=DE"),env:{TICKETMASTER_API_KEY:"test",DESK:kv},waitUntil:()=>{}});
    assert.equal(response.status,200);
    const data=await response.json();
    assert.equal(data.events.length,1);
    const event=data.events[0];
    assert.equal(event.artist,"Tove Lo");
    assert.equal(event.url,"https://tickets.test/standard");
    assert.equal(event.artistImage,"https://img.test/artist-small.jpg");
    assert.equal(event.image,"https://img.test/event-large.jpg");
    assert.equal(event.ticketOptions.length,2);
    assert.ok(event.ticketOptions.some(x=>x.url==="https://tickets.test/vip"));
  }finally{
    globalThis.fetch=oldFetch;
    globalThis.caches=oldCaches;
  }
});

test("concert cache version bypasses event payloads created before hygiene filtering", async()=>{
  const fs=await import("node:fs");
  const src=fs.readFileSync(new URL("../functions/api/concerts.js",import.meta.url),"utf8");
  assert.match(src,/__cachev","concerts-global-v24"/);
  assert.match(src,/sanitizeNormalizedEvents\(prewarmed\.events\)/);
});

test("Popular validation requires a usable normalized event, not raw totalElements", async () => {
  const kv=memoryKv();
  const rows=Array.from({length:40},(_,i)=>
    "<tr><td>"+(i+1)+"</td><td>Artist "+(i+1)+"</td><td>"+(100000000-i*1000)+"</td></tr>"
  ).join("");
  const oldFetch=globalThis.fetch;
  globalThis.fetch=async input=>{
    const u=new URL(String(input));
    if(u.hostname==="kworb.net") return new Response("<table>"+rows+"</table>",{status:200});
    if(u.pathname.endsWith("/attractions.json")){
      const name=u.searchParams.get("keyword")||"";
      const n=Number(name.replace(/[^0-9]/g,""))||1;
      return new Response(JSON.stringify({_embedded:{attractions:[{
        id:"artist-"+n,name,images:[],classifications:[{segment:{name:"Music"}}],upcomingEvents:{_total:2}
      }]},page:{totalElements:1,totalPages:1,size:50,number:0}}),{status:200,headers:{"content-type":"application/json","Rate-Limit-Available":"4900"}});
    }
    if(u.pathname.endsWith("/events.json")){
      const id=u.searchParams.get("attractionId")||"";
      const n=Number(id.replace(/[^0-9]/g,""))||1;
      if(n===1){
        return new Response(JSON.stringify({
          _embedded:{events:[{
            id:"bad-1",name:"Canceled show",dates:{status:{code:"cancelled"},start:{dateTime:"2026-12-01T20:00:00Z",localDate:"2026-12-01"}},
            _embedded:{attractions:[{id:"artist-1",name:"Artist 1"}],venues:[{id:"v1",name:"Venue",city:{name:"Paris"},country:{countryCode:"FR"},location:{latitude:"48.8",longitude:"2.3"}}]}
          }]},
          page:{totalElements:2,totalPages:1,size:200,number:0}
        }),{status:200,headers:{"content-type":"application/json","Rate-Limit-Available":"4900"}});
      }
      return new Response(JSON.stringify({
        _embedded:{events:[{
          id:"event-"+n,name:"Artist "+n+" Live",url:"https://example.com/"+n,
          dates:{start:{dateTime:"2026-12-01T20:00:00Z",localDate:"2026-12-01",localTime:"20:00:00"}},
          _embedded:{attractions:[{id:"artist-"+n,name:"Artist "+n,images:[]}],venues:[{id:"v"+n,name:"Venue",city:{name:"Paris"},country:{countryCode:"FR"},location:{latitude:"48.8",longitude:"2.3"}}]},
          images:[]
        }]},
        page:{totalElements:1,totalPages:1,size:200,number:0}
      }),{status:200,headers:{"content-type":"application/json","Rate-Limit-Available":"4900"}});
    }
    return new Response("not found",{status:404});
  };
  try{
    let result;
    for(let i=0;i<5;i++) result=await refreshPopularSnapshot({TICKETMASTER_API_KEY:"test",DESK:kv});
    const stateRaw=kv.raw("concert-popular:v4:state");
    const snapRaw=kv.raw("concert-popular:v4");
    const rowsFound=snapRaw ? JSON.parse(snapRaw).artists : JSON.parse(stateRaw).found;
    assert.equal(rowsFound.some(x=>x.name==="Artist 1"),false);
  }finally{
    globalThis.fetch=oldFetch;
  }
});

test("expired prewarmed artist event is ignored and live Ticketmaster is queried", async () => {
  const kv=memoryKv();
  await kv.put("concert-popular:v4:tour:artist-1",JSON.stringify({
    ok:true,builtAt:new Date().toISOString(),
    events:[{id:"past",artist:"Artist One",attractionId:"artist-1",name:"Old",date:"2026-09-29",dateTime:"2026-09-29T20:00:00Z",lat:48.8,lng:2.3}],
    page:{totalElements:1}
  }));
  const oldFetch=globalThis.fetch;
  const oldCaches=globalThis.caches;
  let calls=0;
  globalThis.caches={default:{match:async()=>null,put:async()=>{}}};
  globalThis.fetch=async input=>{
    const u=new URL(String(input));
    if(u.hostname==="app.ticketmaster.com" && u.pathname.endsWith("/events.json")){
      calls++;
      return new Response(JSON.stringify({
        _embedded:{events:[{
          id:"future",name:"Future",url:"https://example.com/future",
          dates:{start:{dateTime:"2026-12-01T20:00:00Z",localDate:"2026-12-01",localTime:"20:00:00"}},
          _embedded:{attractions:[{id:"artist-1",name:"Artist One",images:[]}],venues:[{id:"v1",name:"Venue",city:{name:"Paris"},country:{countryCode:"FR"},location:{latitude:"48.8",longitude:"2.3"}}]},
          images:[]
        }]},
        page:{totalElements:1,totalPages:1,size:200,number:0}
      }),{status:200,headers:{"content-type":"application/json","Rate-Limit-Available":"4900"}});
    }
    return new Response("not found",{status:404});
  };
  try{
    const response=await onRequestGet({
      request:new Request("https://music98.news/api/concerts?attractionId=artist-1"),
      env:{TICKETMASTER_API_KEY:"test",DESK:kv},
      waitUntil:()=>{}
    });
    const data=await response.json();
    assert.equal(calls,1);
    assert.equal(data.events[0].id,"future");
  }finally{
    globalThis.fetch=oldFetch;
    globalThis.caches=oldCaches;
  }
});

test("city cache key distinguishes stateCode and Ticketmaster duplicate calls coalesce", async () => {
  const kv=memoryKv();
  const oldFetch=globalThis.fetch;
  const oldCaches=globalThis.caches;
  const urls=[];
  globalThis.caches={default:{match:async()=>null,put:async()=>{}}};
  globalThis.fetch=async input=>{
    const u=new URL(String(input));
    if(u.hostname==="app.ticketmaster.com" && u.pathname.endsWith("/events.json")){
      urls.push(u.toString());
      await new Promise(r=>setTimeout(r,10));
      return new Response(JSON.stringify({_embedded:{events:[]},page:{totalElements:0,totalPages:1,size:200,number:0}}),{
        status:200,headers:{"content-type":"application/json","Rate-Limit-Available":"4900"}
      });
    }
    return new Response("not found",{status:404});
  };
  try{
    const env={TICKETMASTER_API_KEY:"test",DESK:kv};
    const req=()=>onRequestGet({request:new Request("https://music98.news/api/concerts?city=Springfield&countryCode=US&stateCode=IL"),env,waitUntil:()=>{}});
    await Promise.all([req(),req(),req()]);
    assert.equal(urls.length,1);

    await onRequestGet({request:new Request("https://music98.news/api/concerts?city=Springfield&countryCode=US&stateCode=MA"),env,waitUntil:()=>{}});
    assert.equal(urls.length,2);
    assert.match(urls[0],/stateCode=IL/);
    assert.match(urls[1],/stateCode=MA/);
  }finally{
    globalThis.fetch=oldFetch;
    globalThis.caches=oldCaches;
  }
});

test("package-first Ticketmaster entries collapse into the real artist show", async () => {
  const kv=memoryKv();
  const oldFetch=globalThis.fetch;
  const oldCaches=globalThis.caches;
  globalThis.caches={default:{match:async()=>null,put:async()=>{}}};
  globalThis.fetch=async input=>{
    const u=new URL(String(input));
    if(u.hostname==="app.ticketmaster.com" && u.pathname.endsWith("/events.json")){
      const baseVenue={id:"venue-1",name:"O2 arena",city:{name:"Prague"},country:{name:"Czechia",countryCode:"CZ"},location:{latitude:"50.104",longitude:"14.493"}};
      return new Response(JSON.stringify({
        _embedded:{events:[
          {
            id:"regular",name:"Pitbull Live",url:"https://tickets.example/regular",
            dates:{start:{dateTime:"2026-12-01T19:00:00Z",localDate:"2026-12-01",localTime:"20:00:00"}},
            _embedded:{attractions:[{id:"pitbull",name:"Pitbull",images:[]}],venues:[baseVenue]},images:[]
          },
          {
            id:"fast",name:"Fast Track - O2 arena",url:"https://tickets.example/fast",
            dates:{start:{dateTime:"2026-12-01T19:00:00Z",localDate:"2026-12-01",localTime:"20:00:00"}},
            _embedded:{attractions:[{id:"fast-track",name:"Fast Track - O2 arena",images:[]},{id:"pitbull",name:"Pitbull",images:[]}],venues:[baseVenue]},images:[]
          }
        ]},
        page:{size:200,totalElements:2,totalPages:1,number:0}
      }),{status:200,headers:{"content-type":"application/json","Rate-Limit-Available":"4900"}});
    }
    return new Response("not found",{status:404});
  };
  try{
    const response=await onRequestGet({
      request:new Request("https://music98.news/api/concerts?city=Prague&countryCode=CZ"),
      env:{TICKETMASTER_API_KEY:"test",DESK:kv},
      waitUntil:()=>{}
    });
    const data=await response.json();
    assert.equal(data.events.length,1);
    assert.equal(data.events[0].artist,"Pitbull");
    assert.equal(data.events[0].venueId,"venue-1");
    assert.equal(data.events[0].url,"https://tickets.example/regular");
    assert.equal(data.events[0].ticketOptions.some(x=>x.url==="https://tickets.example/fast"),true);
  }finally{
    globalThis.fetch=oldFetch;
    globalThis.caches=oldCaches;
  }
});

test("verified market rows publish the radius used for Ticketmaster validation", async () => {
  const source=await import("node:fs/promises").then(fs=>fs.readFile(new URL("../functions/api/concerts.js",import.meta.url),"utf8"));
  assert.match(source,/const searchRadius=seed\.kind===\"state_capital\" \? 45 : 60/);
  assert.match(source,/radiusKm:searchRadius/);
});

test("real Ticketmaster event without venue coordinates remains a valid upcoming concert", async () => {
  const kv=memoryKv();
  const oldFetch=globalThis.fetch;
  const oldCaches=globalThis.caches;
  globalThis.caches={default:{match:async()=>null,put:async()=>{}}};
  globalThis.fetch=async input=>{
    const u=new URL(String(input));
    if(u.hostname==="app.ticketmaster.com" && u.pathname.endsWith("/events.json")){
      return new Response(JSON.stringify({
        _embedded:{events:[{
          id:"coordless",name:"Artist Live",url:"https://example.com/coordless",
          dates:{start:{dateTime:"2026-12-10T12:00:00Z",localDate:"2026-12-10",localTime:"20:00:00"}},
          _embedded:{
            attractions:[{id:"artist",name:"Artist",images:[]}],
            venues:[{id:"venue",name:"National Stadium",city:{name:"Singapore"},country:{name:"Singapore",countryCode:"SG"}}]
          },
          images:[]
        }]},
        page:{totalElements:1,totalPages:1,size:200,number:0}
      }),{status:200,headers:{"content-type":"application/json","Rate-Limit-Available":"4900"}});
    }
    return new Response("not found",{status:404});
  };
  try{
    const response=await onRequestGet({
      request:new Request("https://music98.news/api/concerts?attractionId=artist"),
      env:{TICKETMASTER_API_KEY:"test",DESK:kv},
      waitUntil:()=>{}
    });
    const data=await response.json();
    assert.equal(data.events.length,1);
    assert.equal(data.events[0].id,"coordless");
    assert.equal(data.events[0].lat,null);
    assert.equal(data.events[0].lng,null);
    assert.equal(data.events[0].url,"https://example.com/coordless");
  }finally{
    globalThis.fetch=oldFetch;
    globalThis.caches=oldCaches;
  }
});



test("Popular uses real event payloads even when attraction upcomingEvents is zero", async () => {
  const kv=memoryKv();
  const rows=Array.from({length:35},(_,i)=>{
    const name=i===3?"The Weeknd":"Artist "+(i+1);
    return "<tr><td>"+(i+1)+"</td><td>"+name+"</td><td>"+(120000000-i*1000)+"</td></tr>";
  }).join("");
  const oldFetch=globalThis.fetch;
  globalThis.fetch=async input=>{
    const u=new URL(String(input));
    if(u.hostname==="kworb.net") return new Response("<table>"+rows+"</table>",{status:200});
    if(u.pathname.endsWith("/attractions.json")){
      const name=u.searchParams.get("keyword")||"";
      const key=normTestName(name);
      const id=key==="the weeknd"?"weeknd":"id-"+key.replace(/\s+/g,"-");
      return new Response(JSON.stringify({_embedded:{attractions:[{
        id,name,images:[],classifications:[{segment:{name:"Music"}}],upcomingEvents:{_total:0}
      }]}}),{status:200,headers:{"content-type":"application/json","Rate-Limit-Available":"4900"}});
    }
    if(u.pathname.endsWith("/events.json")){
      const attractionId=u.searchParams.get("attractionId")||"";
      const keyword=u.searchParams.get("keyword")||"";
      const isWeeknd=attractionId==="weeknd" || normTestName(keyword)==="the weeknd";
      let artistName,artistId;
      if(isWeeknd){ artistName="The Weeknd"; artistId="weeknd"; }
      else if(attractionId.startsWith("id-")){
        artistName=attractionId.slice(3).split("-").map(x=>x[0]?.toUpperCase()+x.slice(1)).join(" ");
        artistId=attractionId;
      }else{
        artistName=keyword; artistId="kw-"+normTestName(keyword).replace(/\s+/g,"-");
      }
      return new Response(JSON.stringify({_embedded:{events:[{
        id:"event-"+artistId,name:artistName+" Live",url:"https://example.com/"+artistId,
        dates:{start:{dateTime:"2026-12-01T20:00:00Z",localDate:"2026-12-01",localTime:"20:00:00"}},
        _embedded:{attractions:[{id:artistId,name:artistName,images:[]}],venues:[{id:"v",name:"Venue",city:{name:isWeeknd?"Singapore":"Paris"},country:{countryCode:isWeeknd?"SG":"FR"}}]},
        images:[]
      }]},page:{totalElements:1,totalPages:1,size:200,number:0}}),{status:200,headers:{"content-type":"application/json","Rate-Limit-Available":"4900"}});
    }
    return new Response("not found",{status:404});
  };
  try{
    const env={TICKETMASTER_API_KEY:"test",DESK:kv};
    for(let i=0;i<4;i++) await refreshPopularSnapshot(env,i===0);
    const raw=kv.raw("concert-popular:v4")||kv.raw("concert-popular:v4:state");
    const parsed=JSON.parse(raw);
    const list=parsed.artists||parsed.found||[];
    const weeknd=list.find(x=>x.name==="The Weeknd");
    assert.ok(weeknd);
    assert.equal(weeknd.id,"weeknd");
    assert.equal(weeknd.eventConfirmed,true);
    assert.equal(weeknd.shows,1);
  }finally{globalThis.fetch=oldFetch;}
});

test("Popular tries duplicate exact attraction identities before rejecting a ranked artist", async () => {
  const kv=memoryKv(),oldFetch=globalThis.fetch;
  let eventCalls=[];
  globalThis.fetch=async input=>{
    const u=new URL(String(input));
    if(u.hostname==="kworb.net"){
      const rows=Array.from({length:35},(_,i)=>"<tr><td>"+(i+1)+"</td><td>Artist "+(i+1)+"</td><td>"+(100000000-i)+"</td></tr>").join("");
      return new Response("<table>"+rows+"</table>",{status:200});
    }
    if(u.pathname.endsWith("/attractions.json")){
      const name=u.searchParams.get("keyword")||"";
      const n=Number(name.replace(/[^0-9]/g,""))||1;
      const attractions=n===1?[
        {id:"stale-1",name,images:[],classifications:[{segment:{name:"Music"}}],upcomingEvents:{_total:10}},
        {id:"live-1",name,images:[],classifications:[{segment:{name:"Music"}}],upcomingEvents:{_total:0}}
      ]:[{id:"artist-"+n,name,images:[],classifications:[{segment:{name:"Music"}}]}];
      return new Response(JSON.stringify({_embedded:{attractions}}),{status:200,headers:{"content-type":"application/json","Rate-Limit-Available":"4900"}});
    }
    if(u.pathname.endsWith("/events.json")){
      const id=u.searchParams.get("attractionId")||"";
      eventCalls.push(id||("keyword:"+u.searchParams.get("keyword")));
      if(id==="stale-1") return new Response(JSON.stringify({page:{totalElements:0,totalPages:0,size:200,number:0}}),{status:200,headers:{"content-type":"application/json","Rate-Limit-Available":"4900"}});
      const n=Number(id.replace(/[^0-9]/g,""))||1;
      const artistName=id==="live-1"?"Artist 1":"Artist "+n;
      return new Response(JSON.stringify({_embedded:{events:[{
        id:"event-"+id,name:artistName+" Live",url:"https://example.com/"+id,
        dates:{start:{dateTime:"2026-12-01T20:00:00Z",localDate:"2026-12-01",localTime:"20:00:00"}},
        _embedded:{attractions:[{id,name:artistName,images:[]}],venues:[{id:"v",name:"Venue",city:{name:"Paris"},country:{countryCode:"FR"}}]},images:[]
      }]},page:{totalElements:1,totalPages:1,size:200,number:0}}),{status:200,headers:{"content-type":"application/json","Rate-Limit-Available":"4900"}});
    }
    return new Response("not found",{status:404});
  };
  try{
    await refreshPopularSnapshot({TICKETMASTER_API_KEY:"test",DESK:kv},true);
    const state=JSON.parse(kv.raw("concert-popular:v4:state"));
    const first=state.found.find(x=>x.name==="Artist 1");
    assert.ok(first);
    assert.equal(first.id,"live-1");
    assert.ok(eventCalls.includes("stale-1"));
    assert.ok(eventCalls.includes("live-1"));
  }finally{globalThis.fetch=oldFetch;}
});

test("public Popular rejects snapshots built by an old validation algorithm", async () => {
  const kv=memoryKv();
  const artists=Array.from({length:30},(_,i)=>({id:"a"+i,name:"Artist "+i,rank:i+1,popularityRank:i+1,shows:1,eventConfirmed:true}));
  await kv.put("concert-popular:v4",JSON.stringify({
    ok:true,mode:"popular",version:"popular-v4",algorithm:"rank-ordered-cache-v1",
    builtAt:new Date().toISOString(),artists,eligibility:"ticketmaster_event_payload_gt_0",targetCount:30
  }));
  const response=await onRequestGet({
    request:new Request("https://music98.news/api/concerts?mode=popular&v=popular-v11"),
    env:{TICKETMASTER_API_KEY:"test",DESK:kv},waitUntil:()=>{}
  });
  const data=await response.json();
  assert.equal(data.algorithm,"rank-ordered-event-query-v2");
  assert.equal(data.warming,true);
  assert.deepEqual(data.artists,[]);
});

test("date-only normalized events expire by local date fallback", async () => {
  const fs=await import("node:fs");
  const src=fs.readFileSync(new URL("../functions/api/concerts.js",import.meta.url),"utf8");
  assert.match(src,/const date=String\(e\?\.date\|\|""\)\.trim\(\)/);
  assert.match(src,/return date>=today/);
});

function normTestName(s){
  return String(s||"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/&/g,"and").replace(/[^a-z0-9]+/gi," ").trim().toLowerCase();
}


test("Popular never publishes a hard-coded ranking when live Spotify ranking is unavailable", async () => {
  const kv=memoryKv();
  const oldFetch=globalThis.fetch;
  let tmCalls=0;
  globalThis.fetch=async input=>{
    const u=new URL(String(input));
    if(u.hostname==="kworb.net") return new Response("unavailable",{status:503});
    if(u.hostname==="app.ticketmaster.com"){ tmCalls++; return new Response("unexpected",{status:500}); }
    return new Response("not found",{status:404});
  };
  try{
    const result=await refreshPopularSnapshot({TICKETMASTER_API_KEY:"test",DESK:kv},true);
    assert.equal(result.retry,true);
    assert.equal(result.keptExisting,false);
    assert.equal(result.reason,"popular_ranking_source_unavailable");
    assert.equal(result.artists,0);
    assert.equal(kv.raw("concert-popular:v4"),null);
    assert.equal(kv.raw("concert-popular:v4:state"),null);
    assert.equal(tmCalls,0);
  }finally{globalThis.fetch=oldFetch;}
});

test("public Popular rejects a complete current-algorithm snapshot from a non-live ranking source", async () => {
  const kv=memoryKv();
  const artists=Array.from({length:30},(_,i)=>({
    id:"f"+i,name:"Fallback "+i,rank:i+1,popularityRank:i+1,shows:1,eventConfirmed:true
  }));
  await kv.put("concert-popular:v4",JSON.stringify({
    ok:true,mode:"popular",version:"popular-v4",algorithm:"rank-ordered-event-query-v2",
    builtAt:new Date().toISOString(),source:"spotify_monthly_unavailable",
    artists,eligibility:"ticketmaster_event_payload_gt_0",targetCount:30
  }));
  const response=await onRequestGet({
    request:new Request("https://music98.news/api/concerts?mode=popular&v=popular-v11"),
    env:{TICKETMASTER_API_KEY:"test",DESK:kv},waitUntil:()=>{}
  });
  const data=await response.json();
  assert.equal(data.warming,true);
  assert.deepEqual(data.artists,[]);
});




test("interactive area paging uses chronological event order without raising five-page budget",async()=>{
  const fs=await import("node:fs");
  const source=fs.readFileSync(new URL("../functions/api/concerts.js",import.meta.url),"utf8");
  assert.match(source,/tm\.searchParams\.set\("sort", "date,asc"\)/);
  assert.match(source,/tm\.searchParams\.set\("size", "200"\)/);
  assert.match(source,/const merged = await tmEventPages\(tm, env, 5\)/);
  assert.match(source,/Math\.min\(Math\.max\(1, Number\(maxPages \|\| 1\)\), 5, totalPages\)/);
  assert.doesNotMatch(source,/tm\.searchParams\.set\("sort", "distance,date,asc"\)/);
});

test("artist tours exclude unrelated club dates even if the requested attraction was tagged",()=>{
  const events=[
    {id:"noto-drake",name:"Drake Night",artist:"Drake",attractionId:"drake",
      attractionIds:["drake","bad-bunny"],venue:"NOTO",city:"Philadelphia",
      image:"https://test.invalid/drake.jpg",date:"2099-10-31"},
    {id:"bad-bunny",name:"Bad Bunny Live",artist:"Bad Bunny",attractionId:"bad-bunny",
      attractionIds:["bad-bunny"],venue:"Stadium",city:"New York",
      artistImage:"https://test.invalid/bad-bunny.jpg",date:"2099-11-01"},
    {id:"ambiguous",name:"Drake",artist:"Drake",attractionId:"bad-bunny",
      attractionIds:["bad-bunny"],venue:"NOTO",date:"2099-11-02"},
    {id:"unattributed",name:"Bad Bunny",artist:"Bad Bunny",attractionId:"",
      attractionIds:[],date:"2099-11-03"},
  ];
  assert.deepEqual(artistScopedEvents(events,"bad-bunny","Bad Bunny").map(e=>e.id),["bad-bunny"]);
  assert.deepEqual(artistScopedEvents(events,"drake","Drake").map(e=>e.id),["noto-drake"]);
  assert.deepEqual(artistScopedEvents(events,"","Bad Bunny").map(e=>e.id),["bad-bunny"]);
});

test("stale cross-artist tour cache is ignored, and Ticketmaster responses are identity-filtered",async()=>{
  const kv=memoryKv();
  await kv.put("concert-popular:v4:tour:bad-bunny",JSON.stringify({
    ok:true,builtAt:new Date().toISOString(),artistId:"bad-bunny",
    events:[{id:"noto",artist:"Drake",attractionId:"drake",attractionIds:["drake","bad-bunny"],
      venue:"NOTO",city:"Philadelphia",date:"2099-10-31"}],
    page:{totalElements:1}
  }));
  const oldFetch=globalThis.fetch,oldCaches=globalThis.caches;
  let calls=0;
  globalThis.caches={default:{match:async()=>null,put:async()=>{}}};
  globalThis.fetch=async input=>{
    const url=new URL(String(input));
    assert.equal(url.searchParams.get("attractionId"),"bad-bunny");
    calls++;
    const mk=(id,name,primary,secondary)=>({
      id,name,url:"https://example.com/"+id,
      dates:{start:{dateTime:"2099-10-31T20:00:00Z",localDate:"2099-10-31"}},
      _embedded:{
        attractions:[{id:primary,name:primary==="drake"?"Drake":"Bad Bunny",images:[]},
          ...(secondary?[{id:secondary,name:"Bad Bunny",images:[]}]:[])],
        venues:[{id:"v1",name:"NOTO",city:{name:"Philadelphia"},
          country:{countryCode:"US"},location:{latitude:"39.95",longitude:"-75.16"}}]
      },
      images:[]
    });
    return new Response(JSON.stringify({
      _embedded:{events:[mk("drake-club","Drake Party","drake","bad-bunny"),
        mk("real-bad-bunny","Bad Bunny Live","bad-bunny","")]},
      page:{totalElements:2,totalPages:1,size:200,number:0}
    }),{status:200,headers:{"content-type":"application/json","Rate-Limit-Available":"4900"}});
  };
  try{
    const response=await onRequestGet({
      request:new Request("https://music98.news/api/concerts?attractionId=bad-bunny"),
      env:{TICKETMASTER_API_KEY:"test",DESK:kv},waitUntil:()=>{}
    });
    const data=await response.json();
    assert.equal(calls,1,"invalid prewarm must not be served");
    assert.deepEqual(data.events.map(e=>e.id),["real-bad-bunny"]);
    assert.equal(data.events[0].artist,"Bad Bunny");
  }finally{
    globalThis.fetch=oldFetch;globalThis.caches=oldCaches;
  }
});

test("legacy Popular Top 30 is revalidated without wiping the published snapshot",async()=>{
  const kv=memoryKv();
  const artists=Array.from({length:30},(_,i)=>({
    id:"old-"+i,name:"Artist "+i,rank:i+1,popularityRank:i+1,
    shows:1,eventConfirmed:true
  }));
  const old={
    version:"popular-v4",algorithm:"rank-ordered-event-query-v2",
    source:"spotify_monthly_listeners",eligibility:"ticketmaster_event_payload_gt_0",
    builtAt:new Date().toISOString(),artists
  };
  await kv.put("concert-popular:v4",JSON.stringify(old));
  const oldFetch=globalThis.fetch;
  let called=false;
  globalThis.fetch=async()=>{
    called=true;
    return new Response("ranking temporarily unavailable",{status:503});
  };
  try{
    const result=await refreshPopularSnapshot({TICKETMASTER_API_KEY:"test",DESK:kv},false);
    assert.equal(called,true,"legacy cache must trigger a fresh identity-aware rebuild");
    assert.equal(result.reason,"popular_ranking_source_unavailable");
    const stillPublished=JSON.parse(kv.raw("concert-popular:v4"));
    assert.equal(stillPublished.artists.length,30,"never blank Popular during rebuilding");
  }finally{
    globalThis.fetch=oldFetch;
  }
});

test("themed Drake and Bad Bunny dance nights cannot be counted as concerts",()=>{
  assert.equal(isNonPerformanceConcertEvent("Drake vs Bad Bunny Dance Night: Nightmare on Vine Street"),true);
  assert.equal(isNonPerformanceConcertEvent("Taylor Swift Tribute Night"),true);
  assert.equal(isNonPerformanceConcertEvent("Bad Bunny Fan Party"),true);
  assert.equal(isNonPerformanceConcertEvent("Taylor Swift Dance Party"),true);
  assert.equal(isNonPerformanceConcertEvent("Beyoncé Tribute to Rihanna"),true);
  assert.equal(isNonPerformanceConcertEvent("Bad Bunny Club Night"),true);
  assert.equal(isNonPerformanceConcertEvent("Bad Bunny Afterparty"),true);
  assert.equal(isNonPerformanceConcertEvent("Drake Live at Madison Square Garden"),false);
  assert.equal(isNonPerformanceConcertEvent("Bad Bunny - DeBÍ TiRAR MáS FOToS World Tour"),false);
  const rows=[
    {id:"club",name:"Drake vs Bad Bunny Dance Night: Nightmare on Vine Street",
      artist:"Drake",attractionId:"drake",attractionIds:["drake","bunny"],date:"2099-10-31"},
    {id:"concert",name:"Bad Bunny - World Tour",
      artist:"Bad Bunny",attractionId:"bunny",attractionIds:["bunny"],date:"2099-11-01"},
  ];
  assert.deepEqual(artistScopedEvents(rows,"bunny","Bad Bunny").map(e=>e.id),["concert"]);
  assert.deepEqual(artistScopedEvents(rows,"drake","Drake").map(e=>e.id),[]);
});

test("Popular read refuses unverified legacy snapshots but reuses genuine cached concerts",async()=>{
  const kv=memoryKv();
  const artists=Array.from({length:30},(_,i)=>({
    id:"id-"+i,name:"Artist "+i,rank:i+1,popularityRank:i+1,shows:1,eventConfirmed:true
  }));
  artists[0]={id:"drake",name:"Drake",rank:1,popularityRank:1,shows:1,eventConfirmed:true};
  artists[1]={id:"bunny",name:"Bad Bunny",rank:2,popularityRank:2,shows:1,eventConfirmed:true};
  await kv.put("concert-popular:v4",JSON.stringify({
    ok:true,version:"popular-v4",algorithm:"rank-ordered-event-query-v2",
    identityValidation:"primary-attraction-v1",source:"spotify_monthly_listeners",
    eligibility:"ticketmaster_event_payload_gt_0",
    builtAt:new Date().toISOString(),artists
  }));
  const builtAt=new Date().toISOString();
  const dance={id:"dance",name:"Drake vs Bad Bunny Dance Night: Nightmare on Vine Street",
    artist:"Drake",attractionId:"drake",attractionIds:["drake","bunny"],date:"2099-10-31"};
  await kv.put("concert-popular:v4:tour:drake",JSON.stringify({builtAt,events:[dance]}));
  await kv.put("concert-popular:v4:tour:bunny",JSON.stringify({builtAt,events:[dance]}));
  await kv.put("concert-popular:v4:tour:id-2",JSON.stringify({builtAt,events:[{
    id:"live",name:"Artist 2 live",artist:"Artist 2",attractionId:"id-2",date:"2099-11-05"
  }]}));
  const response=await onRequestGet({
    request:new Request("https://music98.news/api/concerts?mode=popular&v=popular-v13"),
    env:{TICKETMASTER_API_KEY:"test",DESK:kv},waitUntil:()=>{}
  });
  const data=await response.json();
  assert.deepEqual(data.artists.map(a=>a.name),["Artist 2"]);
  assert.equal(data.warming,true);
  assert.equal(data.identityValidation,"primary-attraction-v3");
});

test("completed correctly validated Popular snapshot keeps its full 30 items",async()=>{
  const kv=memoryKv();
  const artists=Array.from({length:30},(_,i)=>({
    id:"id-"+i,name:"Artist "+i,rank:i+1,popularityRank:i+1,shows:1,eventConfirmed:true
  }));
  await kv.put("concert-popular:v4",JSON.stringify({
    ok:true,version:"popular-v4",algorithm:"rank-ordered-event-query-v2",
    identityValidation:"primary-attraction-v3",source:"spotify_monthly_listeners",
    eligibility:"ticketmaster_event_payload_gt_0",
    builtAt:new Date().toISOString(),artists
  }));
  const res=await onRequestGet({request:new Request("https://music98.news/api/concerts?mode=popular&v=popular-v13"),
    env:{TICKETMASTER_API_KEY:"test",DESK:kv},waitUntil:()=>{}});
  const data=await res.json();
  assert.equal(data.artists.length,30);
  assert.equal(data.warming,false);
});
