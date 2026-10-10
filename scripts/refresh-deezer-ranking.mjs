import fs from "node:fs";
import {createHash} from "node:crypto";
import {SOURCE_SIZE,DEEZER_GLOBAL_URL,parseDeezerWorldwide,verifiedDailySeed} from "../functions/lib/daily-chart-sources.js";

const output=new URL("../public/data/deezer-chart.json",import.meta.url);
const r=await fetch(DEEZER_GLOBAL_URL,{headers:{"user-agent":"music98-chart-source/2.0"},
  signal:AbortSignal.timeout(15000)});
if(!r.ok)throw new Error("Deezer Worldwide HTTP "+r.status);
const data=await r.json(),tracks=parseDeezerWorldwide(data,SOURCE_SIZE);
const capturedAt=new Date().toISOString(),today=capturedAt.slice(0,10);
// The public playlist has no closed chart-day date. Record when it was read;
// do not label this as a measured 24-hour streaming total.
const snapshot={schema:2,updated:today,capturedAt,sourceDate:today,dateKind:"capture",
  source:"official-deezer-worldwide-playlist",region:"global",cadence:"daily",
  sourceUrl:DEEZER_GLOBAL_URL,checksum:String(data.checksum||""),
  // Version evidence for diagnostics, never a substitute for an upstream date.
  fingerprint:createHash("sha256").update(JSON.stringify(tracks.map(t=>[t.pos,t.title,t.artist]))).digest("hex"),tracks};
if(!verifiedDailySeed(snapshot,"D"))throw new Error("Invalid Deezer Worldwide snapshot");
fs.writeFileSync(output,JSON.stringify(snapshot,null,2)+"\n");
console.log("DEEZER_DAILY_WORLDWIDE_SOURCE",today,tracks.length);
