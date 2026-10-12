import test from "node:test";
import assert from "node:assert/strict";
import {execFile} from "node:child_process";
import {promisify} from "node:util";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {parseMusicrankSpotify,spotifyDateCurrent,validatedSpotifyRows,
 verifiedSpotifySnapshot} from "../functions/lib/spotify-chart.js";

const tracks=Array.from({length:200},(_,i)=>({pos:i+1,title:"Song "+(i+1),artist:"Artist "+(i+1),daily:5000000-i*10000}));
function musicrank(rows=tracks,date="Oct 10, 2026"){
 const json={"@type":"ItemList",name:"Spotify global chart",
  itemListElement:rows.slice(0,20).map(t=>({position:t.pos,item:{name:t.title,byArtist:{name:t.artist}}}))};
 const links=rows.map(t=>'<a href="/track/'+t.pos+'">'+t.title+'</a>'+
  '<p><a href="/artist/'+t.pos+'">'+t.artist+'</a></p><span>'+String(t.daily/1000000)+'M streams</span>').join("");
 return '<html><head><meta name="description" content="Spotify&#x27;s daily top songs worldwide for '+
  date+'. Worldwide"/></head><body><main><script type="application/ld+json">'+JSON.stringify(json)+
  '</script>'+links+'</main></body></html>';
}
test("Musicrank yields the full Spotify Top 200 with daily stream counts",()=>{
 const mr=parseMusicrankSpotify(musicrank(),200);
 assert.equal(mr.tracks.length,200);assert.equal(mr.ldConfirmed,20);
 assert.equal(mr.tracks[0].daily,5000000);assert.equal(mr.tracks[199].pos,200);
});
test("Musicrank structured metadata protects visible identities and ranks",()=>{
 const h=musicrank().replace('>Song 5</a>','>Wrong title</a>');
 assert.throws(()=>parseMusicrankSpotify(h,200),/metadata_mismatch/);
 assert.throws(()=>validatedSpotifyRows(tracks.map(t=>({...t,pos:t.pos===200?199:t.pos})),200));
});
test("Spotify dates allow the intended three-day source lag",()=>{
 const now=Date.parse("2026-10-12T16:00:00Z");
 assert.equal(spotifyDateCurrent("2026-10-10",now),true);
 assert.equal(spotifyDateCurrent("2026-10-09",now),true);
 assert.equal(spotifyDateCurrent("2026-10-08",now),false);
 assert.equal(spotifyDateCurrent("2026-10-13",now),false);
});
test("verified Musicrank snapshot requires all 200 rows and streams",()=>{
 const now=Date.parse("2026-10-12T16:00:00Z");
 const s={schema:1,verified:true,chartDate:"2026-10-10",provider:"musicrank",
  sourceUrl:"https://musicrank.org/spotify",ldConfirmed:20,fingerprint:"a".repeat(64),tracks};
 assert.equal(verifiedSpotifySnapshot(s,now)?.tracks.length,200);
 assert.equal(verifiedSpotifySnapshot({...s,tracks:tracks.slice(0,199)},now),null);
 assert.equal(verifiedSpotifySnapshot({...s,provider:"other"},now),null);
});
async function runCollector({offline=false,initial}={}){
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),"music98-spotify-"));
 try{
  await Promise.all(["scripts","functions/lib","public/data"].map(p=>fs.mkdir(path.join(dir,p),{recursive:true})));
  await fs.writeFile(path.join(dir,"package.json"),'{"type":"module"}');
  await Promise.all(["scripts/refresh-spotify-ranking.mjs","functions/lib/spotify-chart.js","functions/lib/chart-identity.js"]
   .map(p=>fs.copyFile(new URL("../"+p,import.meta.url),path.join(dir,p))));
  const output=path.join(dir,"public/data/spotify-chart.json");
  const original=JSON.stringify(initial||{})+"\n";await fs.writeFile(output,original);
  const nowHuman=new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric",timeZone:"UTC"});
  const preload=path.join(dir,"fetch.mjs"),html=musicrank(tracks,nowHuman);
  await fs.writeFile(preload,'globalThis.fetch=async()=>new Response('+JSON.stringify(html)+',{status:'+(offline?503:200)+'});\n');
  let status=0,stderr="";
  try{await promisify(execFile)(process.execPath,["--import",preload,path.join(dir,"scripts/refresh-spotify-ranking.mjs")]);}
  catch(e){status=e.code;stderr=e.stderr;}
  const bytes=await fs.readFile(output,"utf8");
  return {status,stderr,unchanged:bytes===original,snapshot:JSON.parse(bytes)};
 }finally{await fs.rm(dir,{recursive:true,force:true});}
}
test("collector publishes Musicrank alone and preserves the old file on outage",async()=>{
 const ok=await runCollector({initial:{chartDate:"2026-10-01"}});
 assert.equal(ok.status,0,ok.stderr);assert.equal(ok.snapshot.provider,"musicrank");assert.equal(ok.snapshot.tracks.length,200);
 const old={schema:1,verified:true,chartDate:new Date().toISOString().slice(0,10),provider:"musicrank",
  sourceUrl:"https://musicrank.org/spotify",ldConfirmed:20,fingerprint:"a".repeat(64),tracks};
 const down=await runCollector({offline:true,initial:old});
 assert.notEqual(down.status,0);assert.equal(down.unchanged,true);
});
