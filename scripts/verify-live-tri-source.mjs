import fs from "node:fs";
import {TRI_METHOD,verifiedTriSeed,isTriChart} from "../functions/lib/tri-source-chart.js";
const seed=JSON.parse(fs.readFileSync(new URL("../public/data/apple-spotify-streams.json",import.meta.url),"utf8"));
if(!verifiedTriSeed(seed))throw new Error("No current verified three-source snapshot to audit");
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const site=process.env.MUSIC98_CHART_BASE||"https://music98.news";
let reason="",live=null;
for(let attempt=1;attempt<=24;attempt++){
 try{
  const res=await fetch(site+"/api/top50?triAudit="+Date.now()+"&attempt="+attempt,{
   headers:{"cache-control":"no-cache","user-agent":"music98-tri-source-live-audit/1.0"},
   signal:AbortSignal.timeout(15000)});
  if(!res.ok)throw new Error("HTTP "+res.status);
  live=await res.json();
  if(live.methodology!==TRI_METHOD||live.fallback||
    live.spotifyFingerprint!==seed.fingerprint ||
    live.sourceDates?.S!==seed.spotifyDate ||
    live.sourceDates?.U!==seed.appleUsDate ||
    live.sourceDates?.A!==seed.appleGlobalDate){
   throw new Error(JSON.stringify({method:live.methodology,fallback:live.fallback,
    liveFingerprint:live.spotifyFingerprint,expectedFingerprint:seed.fingerprint,
    dates:live.sourceDates,expectedDate:seed.spotifyDate}));
  }
  if(!isTriChart(live))throw new Error("Live formula, source ranks or all-50 stream gate failed");
  if(live.tracks.some(t=>!t.art||!/^https:\/\/[^/]*mzstatic\.com\//.test(t.art)||
    !t.url||!t.url.includes("music.apple.com")||t.spotify.daily===null))
   throw new Error("Published chart has incomplete media/stream counts");
  if(live.arrows?.ok!==true)throw new Error("Published chart has broken arrows or tenure");
  const rows=live.tracks;
  const breakdown={
   US:rows.filter(t=>t.sourceRanks.U!==null).length,
   Global:rows.filter(t=>t.sourceRanks.A!==null).length,
   Spotify:rows.filter(t=>t.sourceRanks.S!==null).length,
   SpotifyOnly:rows.filter(t=>t.sourceRanks.U===null&&t.sourceRanks.A===null).length
  };
  console.log("LIVE_TRI_SOURCE_VERIFIED",JSON.stringify({updated:live.updated,
   methodology:live.methodology,sourceDates:live.sourceDates,
   fingerprint:live.spotifyFingerprint,rows:rows.length,
   numericalSpotify:rows.filter(t=>Number.isSafeInteger(t.spotify.daily)).length,
   artwork:rows.filter(t=>!!t.art).length,links:rows.filter(t=>!!t.url).length,
   arrows:live.arrows,breakdown,top10:rows.slice(0,10).map(t=>({
    rank:t.rank,artist:t.artist,title:t.title,daily:t.spotify.daily
   }))}));
  process.exit(0);
 }catch(e){
  reason=String(e?.message||e).slice(0,350);
  console.warn("LIVE_TRI_PENDING",attempt,reason);
  if(attempt<24)await wait(10000);
 }
}
throw new Error("Production has not published the current fully verified tri-source chart: "+reason);
