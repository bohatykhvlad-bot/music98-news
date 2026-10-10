import fs from "node:fs";
import {createHash} from "node:crypto";
import {pickAppleCandidate,primaryArtist} from "../functions/lib/chart-identity.js";
import {verifiedTriSeed,rankTriCandidates,songIdentity} from "../functions/lib/tri-source-chart.js";
const FILE=new URL("../public/data/apple-spotify-streams.json",import.meta.url);
const s=JSON.parse(fs.readFileSync(FILE,"utf8"));
if(!verifiedTriSeed(s))throw new Error("Fresh validated three-source candidate snapshot required");
const selected=rankTriCandidates(s.tracks,s.spotifyDate).tracks;
const keys=new Map(s.tracks.map(t=>[songIdentity(t.title,t.artist),t]));
const candidates=selected.map(t=>keys.get(songIdentity(t.title,t.artist)))
 .filter(t=>!t.url||!/^https:\/\/[^/]*mzstatic\.com\//.test(t.art||""));
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function query(term){
 let error;
 for(let i=0;i<3;i++){
  try{
   const res=await fetch("https://itunes.apple.com/search?term="+encodeURIComponent(term)+
    "&entity=song&country=US&limit=50",
    {headers:{"user-agent":"Mozilla/5.0 (compatible; music98-apple-media/1.0)"},
     signal:AbortSignal.timeout(14000)});
   if(!res.ok)throw new Error("Apple iTunes HTTP "+res.status);
   const json=await res.json();if(!Array.isArray(json.results))throw new Error("Invalid iTunes response");
   return json.results;
  }catch(e){error=e;if(i<2)await delay(1000*(i+1));}
 }
 throw error;
}
async function resolve(t){
 const names=[t.artist, String(t.artist||"").split(/\s*(?:,|\s+&\s+|\s+feat\.?\s+|\s+ft\.?\s+)\s*/i)[0]]
  .filter(Boolean);
 let chosen=null;
 for(const name of [...new Set(names)]){
  try{
   chosen=pickAppleCandidate(t.title,t.artist,await query(name+" "+t.title));
   if(chosen)break;
  }catch(e){console.warn("APPLE_MEDIA_SEARCH_FAILED",t.title,name,String(e.message||e));}
 }
 if(!chosen)return false;
 const album=Number(chosen.collectionId),id=Number(chosen.trackId);
 const art=String(chosen.artworkUrl100||"").replace(/100x100bb/,"600x600bb");
 if(!Number.isSafeInteger(album)||!Number.isSafeInteger(id)||
  !/^https:\/\/[^/]*mzstatic\.com\//.test(art))return false;
 t.url="https://music.apple.com/us/album/"+album+"?i="+id;
 t.art=art;
 if(/^https:\/\/[^/]*apple\.com\//.test(String(chosen.previewUrl||"")))t.prev=chosen.previewUrl;
 if(!t.year)t.year=String(chosen.releaseDate||"").slice(0,4);
 return true;
}
let cursor=0,recovered=0;
await Promise.all(Array.from({length:Math.min(4,candidates.length)},async()=>{
 while(cursor<candidates.length){
  const t=candidates[cursor++];
  if(await resolve(t))recovered++;
 }
}));
const missing=selected.map(t=>keys.get(songIdentity(t.title,t.artist)))
 .filter(t=>!t.url||!/^https:\/\/[^/]*mzstatic\.com\//.test(t.art||""));
console.log("TOP50_PREPARED_APPLE_MEDIA",JSON.stringify({
 required:candidates.length,recovered,stillMissing:missing.map(t=>({title:t.title,artist:t.artist}))}));
if(missing.length)throw new Error("BLOCKED: chart candidates have no verified Apple media. Last healthy chart remains live.");
s.coverage={...s.coverage,appleMediaRecovered:recovered,top50WithAppleArtwork:50};
s.fingerprint=createHash("sha256").update(JSON.stringify([
 s.appleUsDate,s.appleGlobalDate,s.spotifyDate,s.tracks])).digest("hex");
if(!verifiedTriSeed(s))throw new Error("Apple-media enrichment broke source verification");
const temp=new URL("../public/data/.apple-spotify-streams.tmp",import.meta.url);
fs.writeFileSync(temp,JSON.stringify(s,null,2)+"\n");
fs.renameSync(temp,FILE);
