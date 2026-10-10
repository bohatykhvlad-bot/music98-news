import fs from "node:fs";
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
const [global,us]=await Promise.all([
 fetchChart(APPLE_GLOBAL_URL,parseAppleGlobal,"global","official-apple-global-playlist"),
 fetchChart(APPLE_US_URL,parseAppleUs,"us","official-apple-us-playlist")
]);
// Require one Apple edition: mixing US and Global days skews the weighting.
if(global.sourceDate!==us.sourceDate)throw new Error("Apple regions have different edition dates; retain previous snapshots");
fs.writeFileSync(new URL("../public/data/apple-chart.json",import.meta.url),JSON.stringify(global,null,2)+"\n");
fs.writeFileSync(new URL("../public/data/apple-us-chart.json",import.meta.url),JSON.stringify(us,null,2)+"\n");
console.log("APPLE_GLOBAL_US_SOURCES",global.sourceDate,global.tracks.length,us.tracks.length);
