import fs from "node:fs";
import {parseMusicrankSpotify,spotifyDateCurrent,validatedSpotifyRows,
 verifiedSpotifySnapshot,SPOTIFY_INPUT_SIZE,SPOTIFY_CHART_PROVIDERS,SPOTIFY_PROVIDER_ORDER,
 buildSpotifySnapshot} from "../functions/lib/spotify-chart.js";
import {snapshotFromWorker} from "../functions/lib/spotify-source.js";
const OUT=new URL("../public/data/spotify-chart.json",import.meta.url);
const UA={"user-agent":"Mozilla/5.0 (compatible; music98-chart-source/8.0)","cache-control":"no-cache"};

async function fetchText(url){
 const res=await fetch(url,{headers:UA,signal:AbortSignal.timeout(25000)});
 if(!res.ok)throw new Error("HTTP "+res.status+" "+url);
 return await res.text();
}

/* Every provider publishes the same thing: a dated Spotify Global Top 200 with
   the daily stream count of each row. They are tried in order, and the first
   one that answers with a current, complete chart wins. A provider that
   answers 403 or changes its markup is skipped, not fatal. */
async function collect(){
 const failures=[];
 for(const id of SPOTIFY_PROVIDER_ORDER){
  const provider=SPOTIFY_CHART_PROVIDERS[id];
  for(let attempt=0;attempt<2;attempt++){
   try{
    const html=await fetchText(provider.sourceUrl);
    const out=provider.parse(html,SPOTIFY_INPUT_SIZE);
    if(!spotifyDateCurrent(out.date))throw new Error("stale/future "+out.date);
    return {provider,chosen:out};
   }catch(e){
    failures.push(id+": "+String(e?.message||e));
    if(attempt<1)await new Promise(resolve=>setTimeout(resolve,1800));
   }
  }
 }
 throw new Error("No Spotify chart provider answered: "+failures.join(" | "));
}

/* Musicrank answers the machines of this job with a Cloudflare challenge and
   not the Worker, so the Worker reads the chart and keeps the verified
   snapshot. When the job cannot reach the source itself, it takes the
   snapshot from there - the same rows, the same date, the same fingerprint. */

let payload=null,providerId=null;
try{
 const {provider,chosen}=await collect();
 payload=buildSpotifySnapshot(chosen,provider.id);
 providerId=provider.id;
 console.log("SPOTIFY_SOURCE_READ_DIRECT",JSON.stringify({date:chosen.date,provider:provider.id}));
}catch(direct){
 try{
  payload=await snapshotFromWorker();
  providerId=payload.provider;
  console.log("SPOTIFY_SOURCE_READ_FROM_WORKER",JSON.stringify({date:payload.chartDate,provider:payload.provider}));
 }catch(worker){
  throw new Error(String(direct?.message||direct)+" | "+String(worker?.message||worker));
 }
}

const tracks=validatedSpotifyRows(payload.tracks,SPOTIFY_INPUT_SIZE);
let old=null;try{old=JSON.parse(fs.readFileSync(OUT,"utf8"));}catch{}
if(old?.chartDate&&old.chartDate>payload.chartDate)
 throw new Error("Refusing older Spotify edition "+payload.chartDate+" after "+old.chartDate);
if(old?.chartDate===payload.chartDate&&old?.fingerprint===payload.fingerprint&&verifiedSpotifySnapshot(old)){
 console.log("SPOTIFY_SOURCE_UNCHANGED",JSON.stringify({date:payload.chartDate,provider:providerId,rows:tracks.length}));
 process.exit(0);
}
fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+"\n");
console.log("SPOTIFY_SOURCE_VERIFIED",JSON.stringify({date:payload.chartDate,provider:providerId,
 rows:tracks.length,fingerprint:payload.fingerprint}));
