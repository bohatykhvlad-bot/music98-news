import test from "node:test";
import assert from "node:assert/strict";
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
import { refreshHotspotSnapshot, refreshPopularSnapshot, onRequestGet } from "../functions/api/concerts.js";

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


test("public hotspot read never triggers Ticketmaster discovery", async () => {
  const kv=memoryKv();
  await kv.put(HOTSPOT_SNAPSHOT_KEY,JSON.stringify({
    ok:true,mode:"hotspots",version:HOTSPOT_VERSION,threshold:HOTSPOT_THRESHOLD,
    partial:false,builtAt:new Date().toISOString(),
    hotspots:[{city:"Paris",countryCode:"FR",stateCode:"",lat:48.8566,lng:2.3522,count:10}]
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


test("public Popular read is snapshot-only and spends no Ticketmaster call", async () => {
  const kv=memoryKv();
  await kv.put("concert-popular:v3",JSON.stringify({
    ok:true,mode:"popular",version:"popular-v3",builtAt:new Date().toISOString(),
    artists:[{id:"a1",name:"Artist",image:"",rank:1}]
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
    assert.equal(data.artists[0].name,"Artist");
    assert.equal(externalCalls,0);
  }finally{
    globalThis.fetch=oldFetch;
  }
});

test("exact-city user query paginates and stays scoped to that city", async () => {
  const kv=memoryKv();
  const oldFetch=globalThis.fetch;
  const oldCaches=globalThis.caches;
  const seen=[];
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
      dates:{start:{localDate:"2026-10-0"+(page+1),localTime:"20:00:00"}},
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
    assert.equal(data.pagesFetched,2);
    assert.equal(data.partial,false);
    assert.equal(seen.length,2);
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
    return new Response("not found",{status:404});
  };

  try{
    let result;
    for(let i=0;i<4;i++){
      result=await refreshPopularSnapshot({TICKETMASTER_API_KEY:"test",DESK:kv});
      if(result.complete) break;
    }
    assert.equal(result.complete,true);
    const snap=JSON.parse(kv.raw("concert-popular:v3"));
    assert.equal(snap.version,"popular-v3");
    assert.equal(snap.artists.length,30);
    assert.deepEqual(snap.artists.map(x=>x.rank),Array.from({length:30},(_,i)=>i+1));
    assert.deepEqual(snap.artists.map(x=>x.popularityRank),Array.from({length:30},(_,i)=>i+1));
    assert.equal(snap.artists[0].name,"Artist 1");
    assert.equal(snap.artists[29].name,"Artist 30");
    assert.equal(kworbCalls,1);
    assert.equal(ticketmasterCalls,30);

    // A fresh daily snapshot must not hit either source again.
    const before=ticketmasterCalls;
    const fresh=await refreshPopularSnapshot({TICKETMASTER_API_KEY:"test",DESK:kv});
    assert.equal(fresh.fresh,true);
    assert.equal(ticketmasterCalls,before);
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
    const state=JSON.parse(kv.raw("concert-popular:v3:state"));
    assert.equal(state.index,0);
    assert.equal(state.found.length,0);
  }finally{
    globalThis.fetch=oldFetch;
  }
});
