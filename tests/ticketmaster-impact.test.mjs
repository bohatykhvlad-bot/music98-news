import test from "node:test";
import assert from "node:assert/strict";
import {
  IMPACT_PUBLISHER_ID,impactTicketUrl,impactTicketMarket,
} from "../functions/lib/ticketmaster-impact.js";
import { onRequestGet } from "../functions/api/concerts.js";

const publisher=IMPACT_PUBLISHER_ID;
function check(source,host,ad,campaign){
  const result=new URL(impactTicketUrl(source));
  assert.equal(result.hostname,host);
  assert.equal(result.pathname,`/c/${publisher}/${ad}/${campaign}`);
  assert.equal(result.searchParams.get("u"),source);
  assert.equal(result.searchParams.get("utm_medium"),"affiliate");
  assert.equal(impactTicketUrl(result.toString()),result.toString(),"avoid nested affiliate wrapping");
}
test("each supported Ticketmaster market uses its own ad/campaign, not a US-only wrapper",()=>{
  assert.equal(publisher,"4932692");
  check("https://www.ticketmaster.com/event/001?foo=a%26b","ticketmaster.evyy.net","264167","4272");
  check("https://www.ticketmaster.ca/event/002","ticketmaster.evyy.net","264167","4272");
  check("https://www.ticketmaster.de/event/test-123","ticketmaster-de.tm7514.net","427757","7514");
  check("https://www.ticketmaster.fr/event/test-456","ticketmaster-fr.tm7516.net","427761","7516");
  check("https://www.ticketmaster.co.uk/event/789","ticketmaster-uk.tm7559.net","431519","7559");
  check("https://www.ticketmaster.it/event/123","ticketmasteritalia.46uy.net","458790","8188");
  check("https://www.ticketmaster.com.au/event/999","ticketmaster-au.tm7566.net","431533","7566");
});

test("all documented local ticket domains use the same publisher and event-level deep link",()=>{
  const suffixes=["com","ca","com.au","at","be","co.uk","cz","dk","fi","fr","de","ie","es","it","nl","no","pl","ch","se"];
  for(const suffix of suffixes){
    const original=`https://www.ticketmaster.${suffix}/event/123456?encoded=%C3%B6`;
    const out=new URL(impactTicketUrl(original));
    assert.match(out.pathname,/^\/c\/4932692\/\d+\/\d+$/);
    assert.equal(out.searchParams.get("u"),original);
    assert.equal(impactTicketMarket(original),suffix);
  }
});

test("unknown or unrelated ticketing sites never inherit Ticketmaster's Impact campaign",()=>{
  for(const link of [
    "https://www.travelcircus.de/event/show",
    "https://www.universe.com/events/123",
    "https://www.ticketmaster.com.mx/event/123", // no verified local wrapper
    "https://ticketmaster.de.evil.example/event/123",
    "mailto:hello@example.com",
  ]){
    assert.equal(impactTicketUrl(link),link);
  }
});

test("preserves original affiliate tracking and replaces other publishers only for eligible Ticketmaster landings",()=>{
  const dest="https://www.ticketmaster.fr/event/abc?lang=fr&seat=1";
  const existing="https://ticketmaster-fr.tm7516.net/c/4932692/427761/7516?u="+encodeURIComponent(dest)+"&subId1=map";
  assert.equal(impactTicketUrl(existing),new URL(existing).toString());
  const wrongPublisher="https://ticketmaster-fr.tm7516.net/c/1209822/427761/7516?u="+encodeURIComponent(dest);
  assert.equal(new URL(impactTicketUrl(wrongPublisher)).pathname,"/c/4932692/427761/7516");
  assert.equal(new URL(impactTicketUrl(wrongPublisher)).searchParams.get("u"),dest);
});

test("the public concerts API wraps uncached and prewarmed events while preserving their event URLs",async()=>{
  const oldFetch=globalThis.fetch,oldCaches=globalThis.caches;
  const original="https://www.ticketmaster.fr/event/paris-tour-tickets/12345678?lang=fr";
  const kv=new Map();
  const desk={
    async get(k,format){const v=kv.get(k);return format==="json"?(v?JSON.parse(v):null):v||null;},
    async put(k,v){kv.set(k,String(v));}
  };
  globalThis.caches={default:{match:async()=>null,put:async()=>{}}};
  globalThis.fetch=async input=>{
    const url=new URL(String(input));
    assert.equal(url.searchParams.get("city"),"Paris");
    const raw={
      _embedded:{events:[{
        id:"paris-event",name:"Artist Paris Live",url:original,
        dates:{start:{dateTime:"2099-11-01T20:00:00Z",localDate:"2099-11-01"}},
        _embedded:{attractions:[{id:"paris-artist",name:"Artist Paris",images:[]}],
          venues:[{id:"paris-venue",name:"Venue",city:{name:"Paris"},country:{countryCode:"FR"},
            location:{latitude:"48.8566",longitude:"2.3522"}}]},
        images:[]
      }]},
      page:{totalElements:1,totalPages:1,size:200,number:0}
    };
    return new Response(JSON.stringify(raw),{status:200,headers:{"content-type":"application/json","Rate-Limit-Available":"4900"}});
  };
  try{
    const env={TICKETMASTER_API_KEY:"test",DESK:desk};
    const params={request:new Request("https://music98.news/api/concerts?city=Paris&countryCode=FR"),env,waitUntil:()=>{}};
    const fresh=await (await onRequestGet(params)).json();
    assert.equal(new URL(fresh.events[0].url).hostname,"ticketmaster-fr.tm7516.net");
    assert.equal(new URL(fresh.events[0].url).searchParams.get("u"),original);
    assert.equal(fresh.events[0].ticketOptions[0].url,fresh.events[0].url);
    const cachedEvent={...fresh.events[0],url:original,ticketOptions:[{url:original,name:"Standard",eventId:"paris-event"}]};
    await kv.set("concert-capitals:v1:city:FR%7Cparis",
      JSON.stringify({builtAt:new Date().toISOString(),events:[cachedEvent]}));
    globalThis.fetch=async()=>{throw Error("prewarmed event must be served without Ticketmaster calls")};
    const prewarm=await (await onRequestGet(params)).json();
    assert.equal(prewarm.events[0].url,fresh.events[0].url);
    assert.equal(prewarm.events[0].ticketOptions[0].url,fresh.events[0].url);
  }finally{
    globalThis.fetch=oldFetch;globalThis.caches=oldCaches;
  }
});
