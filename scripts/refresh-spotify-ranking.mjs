import fs from "node:fs";
import {createHash} from "node:crypto";
import {parseKworbSpotify,parseMusicrankSpotify,spotifyDateCurrent,
 compareSpotifyRankings,validatedSpotifyRows,verifiedSpotifySnapshot} from "../functions/lib/spotify-chart.js";
const OUT=new URL("../public/data/spotify-chart.json",import.meta.url);
const sources=[
 {name:"Kworb",url:"https://kworb.net/spotify/country/global_daily.html",parse:parseKworbSpotify},
 {name:"Musicrank",url:"https://musicrank.org/spotify",parse:parseMusicrankSpotify}
];
async function collect(src){
 let last;
 for(let n=0;n<2;n++){
  try{
   const res=await fetch(src.url,{headers:{"user-agent":"Mozilla/5.0 (compatible; music98-chart-check/1.0)"},
    signal:AbortSignal.timeout(14000)});
   if(!res.ok)throw new Error("HTTP "+res.status);
   const out=src.parse(await res.text());
   if(!spotifyDateCurrent(out.date))throw new Error("stale/future "+out.date);
   return {ok:true,data:out};
  }catch(e){last=e;if(!n)await new Promise(resolve=>setTimeout(resolve,1500));}
 }
 return {ok:false,error:String(last)};
}
const [kw,mr]=await Promise.all(sources.map(collect));
let chosen,provider,mirrorMatched=0,ldConfirmed=0;
if(kw.ok&&mr.ok&&kw.data.date===mr.data.date){
 const match=compareSpotifyRankings(kw.data,mr.data);
 if(!match.ok)throw new Error("Spotify mirrors disagree at "+match.mismatchPositions.join(","));
 chosen=kw.data;provider="kworb+musicrank";mirrorMatched=50;ldConfirmed=mr.data.ldConfirmed;
}else if(mr.ok&&(!kw.ok||mr.data.date>kw.data.date)){
 /* Musicrank has 50 visible ranks plus a separate agreeing top-20 JSON-LD.
    This is the alternative when Kworb is down or its edition is delayed. */
 chosen=mr.data;provider="musicrank-self-validated";ldConfirmed=mr.data.ldConfirmed;
}else if(kw.ok&&mr.ok&&kw.data.date!==mr.data.date){
 throw new Error("Kworb is newer than the independent mirror: await same-date verification");
}else{
 throw new Error("No independently verified Spotify source: "+
   JSON.stringify({kworb:kw.ok?kw.data.date:kw.error,musicrank:mr.ok?mr.data.date:mr.error}));
}
const tracks=validatedSpotifyRows(chosen.tracks);
const fingerprint=createHash("sha256").update(JSON.stringify(tracks.map(t=>[t.pos,t.title,t.artist]))).digest("hex");
let old=null;try{old=JSON.parse(fs.readFileSync(OUT,"utf8"));}catch{}
if(old?.chartDate&&old.chartDate>chosen.date)
 throw new Error("Refusing older Spotify edition "+chosen.date+" after "+old.chartDate);
if(old?.chartDate===chosen.date&&old.fingerprint===fingerprint){
 /* A one-provider outage must not downgrade the existing two-provider audit. */
 if(old.provider==="kworb+musicrank"||old.provider===provider){
  console.log("SPOTIFY_SOURCE_UNCHANGED",JSON.stringify({date:chosen.date,provider:old.provider,
   rows:tracks.length,kw:kw.ok,mr:mr.ok}));
  process.exit(0);
 }
}
const payload={schema:1,verified:true,chartDate:chosen.date,
 provider,mirrorMatched,ldConfirmed,fingerprint,tracks,
 capturedAt:new Date().toISOString()};
if(!verifiedSpotifySnapshot(payload))throw new Error("Refusing invalid Spotify payload");
fs.writeFileSync(OUT,JSON.stringify(payload,null,2)+"\n");
console.log("SPOTIFY_SOURCE_VERIFIED",JSON.stringify({
 date:chosen.date,provider,rows:tracks.length,mirrorMatched,ldConfirmed,fingerprint,
 kworb:kw.ok?kw.data.date:kw.error,musicrank:mr.ok?mr.data.date:mr.error}));
