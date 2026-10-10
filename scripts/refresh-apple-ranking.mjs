import fs from "node:fs";
import {SOURCE_SIZE,APPLE_GLOBAL_URL,parseAppleGlobal,verifiedDailySeed} from "../functions/lib/daily-chart-sources.js";
const output=new URL("../public/data/apple-chart.json",import.meta.url);
let chart,lastError;
for(let attempt=0;attempt<3;attempt++){
 try{
   const r=await fetch(APPLE_GLOBAL_URL,{headers:{"user-agent":"Mozilla/5.0 (compatible; music98-chart-source/2.0)"},
     signal:AbortSignal.timeout(12000)});
   if(!r.ok)throw new Error("Apple Global HTTP "+r.status);
   chart=parseAppleGlobal(await r.text(),SOURCE_SIZE);break;
 }catch(e){lastError=e;if(attempt<2)await new Promise(done=>setTimeout(done,2500));}
}
if(!chart)throw lastError||new Error("Apple Global unavailable");
const snapshot={schema:2,updated:new Date().toISOString().slice(0,10),
 capturedAt:new Date().toISOString(),source:"official-apple-global-playlist",
 sourceDate:chart.date,publishedAt:chart.publishedAt,region:"global",cadence:"daily",
 sourceUrl:APPLE_GLOBAL_URL,tracks:chart.tracks};
if(!verifiedDailySeed(snapshot,"A"))throw new Error("Invalid Apple Global snapshot");
fs.writeFileSync(output,JSON.stringify(snapshot,null,2)+"\n");
console.log("APPLE_DAILY_GLOBAL_SOURCE",snapshot.sourceDate,snapshot.tracks.length);
