import fs from "node:fs";
import {datedChartPath,verifiedDatedApple,verifiedDatedSpotify,parseChartStatsUsHistorical}
 from "../functions/lib/chart-history.js";
const root=new URL("../public/data/",import.meta.url);
const file=(kind,date)=>new URL(datedChartPath(kind,date),root);
const out=(kind,date,data)=>fs.writeFileSync(file(kind,date),JSON.stringify(data,null,2)+"\n");
async function request(url){
 let last;
 for(let n=0;n<3;n++){
  try{
   const r=await fetch(url,{headers:{"user-agent":"Mozilla/5.0 (compatible; music98-historical-archive/1.0)"},
     signal:AbortSignal.timeout(15000)});
   if(!r.ok)throw new Error("HTTP "+r.status);
   return await r.text();
  }catch(e){last=e;if(n<2)await new Promise(ok=>setTimeout(ok,(n+1)*1500));}
 }
 throw last;
}
for(const day of ["2026-10-08","2026-10-09"]){
 const g=JSON.parse(fs.readFileSync(file("apple-global",day),"utf8"));
 if(!verifiedDatedApple(g,"A",day)||g.tracks.length!==50||
    g.historicalSource!=="music98-original-github-snapshot")
  throw new Error("Original official Apple Global Top 50 archive missing for "+day);
 if(fs.existsSync(file("apple-us",day))){
  const old=JSON.parse(fs.readFileSync(file("apple-us",day),"utf8"));
  if(!verifiedDatedApple(old,"U",day))throw new Error("Corrupt historical US Apple chart "+day);
 }else{
  const us=parseChartStatsUsHistorical(await request("https://chartstats.com/US/songs/"+day),day);
  out("apple-us",day,us);
  console.log("APPLE_US_HISTORICAL_BACKFILL",day,us.tracks.length,us.source);
 }
}
const day="2026-10-08";
if(!fs.existsSync(file("spotify-global",day))){
 const seed=JSON.parse(fs.readFileSync(new URL("apple-spotify-streams.json",root),"utf8"));
 if(seed.schema!==3||seed.spotifyDate!==day||!Array.isArray(seed.tracks))
  throw new Error("Refusing to create 8 Oct Spotify archive from unverified different-day seed");
 const tracks=seed.tracks.filter(t=>Number.isInteger(t.sourceRanks?.S))
  .sort((a,b)=>a.sourceRanks.S-b.sourceRanks.S)
  .map(t=>({pos:t.sourceRanks.S,title:t.title,artist:t.artist,
    spotifyId:t.spotify.spotifyId,daily:t.spotify.daily}));
 const archive={schema:1,source:"kworb-spotify-global-daily",date:day,region:"global",
  cadence:"daily",sourceUrl:"https://kworb.net/spotify/country/global_daily.html",
  reconstructedFrom:"verified-v3-2026-10-10-Spotify-2026-10-08-snapshot",
  capturedAt:seed.capturedAt,tracks};
 if(!verifiedDatedSpotify(archive,day))throw new Error("Historic Spotify top 200 could not be verified");
 out("spotify-global",day,archive);
 console.log("SPOTIFY_HISTORICAL_BACKFILL",day,archive.tracks.length);
}else{
 const a=JSON.parse(fs.readFileSync(file("spotify-global",day),"utf8"));
 if(!verifiedDatedSpotify(a,day))throw new Error("Corrupt Spotify historical archive");
}
console.log("DATED_CHART_ARCHIVES_READY");
