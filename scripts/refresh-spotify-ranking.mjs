import fs from "node:fs";
import {createHash} from "node:crypto";
import {parseMusicrankSpotify,spotifyDateCurrent,validatedSpotifyRows,
 verifiedSpotifySnapshot,SPOTIFY_INPUT_SIZE,SPOTIFY_CHART_PROVIDERS,SPOTIFY_PROVIDER_ORDER} from "../functions/lib/spotify-chart.js";
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

const {provider,chosen}=await collect();
const tracks=validatedSpotifyRows(chosen.tracks,SPOTIFY_INPUT_SIZE);
const fingerprint=createHash("sha256").update(JSON.stringify(
 tracks.map(t=>[t.pos,t.title,t.artist,t.daily,t.spotifyId||null])
)).digest("hex");
let old=null;try{old=JSON.parse(fs.readFileSync(OUT,"utf8"));}catch{}
if(old?.chartDate&&old.chartDate>chosen.date)
 throw new Error("Refusing older Spotify edition "+chosen.date+" after "+old.chartDate);
const payload={schema:1,verified:true,chartDate:chosen.date,provider:provider.id,
 sourceUrl:provider.sourceUrl,ldConfirmed:chosen.ldConfirmed||0,fingerprint,tracks,
 capturedAt:new Date().toISOString()};
if(!verifiedSpotifySnapshot(payload))throw new Error("Refusing invalid Spotify payload");
if(old?.chartDate===chosen.date&&old?.fingerprint===fingerprint&&verifiedSpotifySnapshot(old)){
 console.log("SPOTIFY_SOURCE_UNCHANGED",JSON.stringify({date:chosen.date,provider:provider.id,rows:tracks.length}));
 process.exit(0);
}
fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+"\n");
console.log("SPOTIFY_SOURCE_VERIFIED",JSON.stringify({date:chosen.date,provider:provider.id,
 rows:tracks.length,fingerprint}));
