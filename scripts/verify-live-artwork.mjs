/* CI deployment contract: the live API must serve the EXACT cover URLs
 * committed by this run, not merely 50 nonempty strings from a stale build. */
import fs from "node:fs";
import {artworkKey,mergeKey} from "../functions/lib/chart-identity.js";
import {hasCompleteChartArtwork,artworkRegistryMismatches} from "../functions/lib/chart-artwork-gate.js";

const registry=JSON.parse(fs.readFileSync(new URL("../public/data/covers.json",import.meta.url),"utf8"));
const audit=JSON.parse(fs.readFileSync(new URL("../public/data/artwork-audit.json",import.meta.url),"utf8"));
if(audit.rows!==50 || audit.verified!==50 || audit.unresolved?.length)
  throw new Error("Cannot verify production with incomplete artwork audit");
let last=null;
for(let attempt=1;attempt<=20;attempt++){
  try{
    const r=await fetch("https://music98.news/api/top50?artworkContract="+Date.now()+"-"+attempt,{
      headers:{"user-agent":"music98-deployed-artwork-contract/1.0","cache-control":"no-cache"},
      signal:AbortSignal.timeout(25000)
    });
    const j=await r.json();
    const mismatches=artworkRegistryMismatches(j.tracks,registry,artworkKey,mergeKey);
    last={attempt,http:r.status,updated:j.updated,chartExpected:audit.chartUpdated,
      count:j.tracks?.length||0,complete:j.complete===true,fallback:j.fallback||null,
      missingArtwork:!hasCompleteChartArtwork(j.tracks),mismatches:mismatches.slice(0,6),
      mismatchCount:mismatches.length,cacheControl:r.headers.get("cache-control")};
    console.log("ARTWORK_PRODUCTION_CHECK",JSON.stringify(last));
    if(r.ok && j.updated===audit.chartUpdated && j.complete===true && !j.fallback &&
       hasCompleteChartArtwork(j.tracks) && mismatches.length===0 &&
       String(last.cacheControl||"").includes("no-store")){
      console.log("ARTWORK_PRODUCTION_PASS",JSON.stringify({rows:50,exactCovers:50,date:j.updated}));
      process.exit(0);
    }
  }catch(err){
    last={attempt,error:String(err?.message||err)};
    console.warn("ARTWORK_PRODUCTION_WAIT",JSON.stringify(last));
  }
  if(attempt<20)await new Promise(resolve=>setTimeout(resolve,15000));
}
throw new Error("Production did not deploy the complete verified artwork registry: "+JSON.stringify(last));
