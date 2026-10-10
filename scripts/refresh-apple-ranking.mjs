import fs from "node:fs";
import {datedChartPath,verifiedDatedApple} from "../functions/lib/chart-history.js";
import {SOURCE_SIZE,APPLE_GLOBAL_URL,APPLE_US_URL,parseAppleGlobal,parseAppleUs,verifiedDailySeed}
 from "../functions/lib/daily-chart-sources.js";
async function fetchChart(url,parse,region,source) {
 let chart,lastError;
 for(let attempt=0;attempt<3;attempt++){
  try{
   const r=await fetch(url,{headers:{"user-agent":"Mozilla/5.0 (compatible; music98-chart-source/2.1)","cache-control":"no-cache"},
    signal:AbortSignal.timeout(12000)});
   if(!r.ok)throw new Error("Apple "+region+" HTTP "+r.status);
   chart=parse(await r.text(),SOURCE_SIZE);break;
  }catch(e){lastError=e;if(attempt<2)await new Promise(done=>setTimeout(done,2500));}
 }
 if(!chart)throw lastError||new Error("Apple "+region+" unavailable");
 const snapshot={schema:2,updated:new Date().toISOString().slice(0,10),
  capturedAt:new Date().toISOString(),source,sourceDate:chart.date,publishedAt:chart.publishedAt,
  region,cadence:"daily",sourceUrl:url,tracks:chart.tracks};
 if(!verifiedDailySeed(snapshot,region==="us"?"U":"A"))throw new Error("Invalid Apple "+region+" snapshot");
 return snapshot;
}
/* Byte-stable collection: identical content keeps the existing timestamps, so
   quiet four-hour runs change nothing downstream (no commits, no audits).
   capturedAt/updated refresh only when ranks or provenance actually change. */
function writeVerified(fileUrl, snapshot, label){
 const body=JSON.stringify(snapshot,null,2)+"\n";
 let previous=null;
 try{ previous=JSON.parse(fs.readFileSync(fileUrl,"utf8")); }catch{}
 if(previous){
  const {updated:_oldUpdated,capturedAt:_oldCaptured,...before}=previous;
  const {updated:_newUpdated,capturedAt:_newCaptured,...after}=snapshot;
  if(JSON.stringify(before)===JSON.stringify(after)){
   console.log("CHART_SOURCE_UNCHANGED",label,snapshot.sourceDate);
   return;
  }
 }
 fs.writeFileSync(fileUrl,body);
}
const [global,us]=await Promise.all([
 fetchChart(APPLE_GLOBAL_URL,parseAppleGlobal,"global","official-apple-global-playlist"),
 fetchChart(APPLE_US_URL,parseAppleUs,"us","official-apple-us-playlist")
]);
// Require one Apple edition: mixing US and Global days skews the weighting.
if(global.sourceDate!==us.sourceDate)throw new Error("Apple regions have different edition dates; retain previous snapshots");
for(const [kind,snapshot,region] of [["apple-global",global,"A"],["apple-us",us,"U"]]){
 if(!verifiedDatedApple(snapshot,region,snapshot.sourceDate))
  throw new Error("Refusing invalid Apple dated archive: "+kind);
 const archived=new URL("../public/data/"+datedChartPath(kind,snapshot.sourceDate),import.meta.url);
 fs.mkdirSync(new URL("../public/data/chart-history/",import.meta.url),{recursive:true});
 // Keep the latest verified capture of each date. Never relabel today's
 // rankings as yesterday's. Historical archives are selected by sourceDate.
 writeVerified(archived,snapshot,"archive:"+kind);
}
writeVerified(new URL("../public/data/apple-chart.json",import.meta.url),global,"rolling:apple-chart");
writeVerified(new URL("../public/data/apple-us-chart.json",import.meta.url),us,"rolling:apple-us-chart");
console.log("APPLE_GLOBAL_US_SOURCES_ARCHIVED",global.sourceDate,global.tracks.length,us.tracks.length);
