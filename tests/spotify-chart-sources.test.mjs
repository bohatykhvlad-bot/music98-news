import test from "node:test";
import assert from "node:assert/strict";
import {execFile} from "node:child_process";
import {promisify} from "node:util";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {compareSpotifyRankings,parseKworbSpotify,parseMusicrankSpotify,spotifyDateCurrent,
 validatedSpotifyRows,verifiedSpotifySnapshot} from "../functions/lib/spotify-chart.js";
const tracks=Array.from({length:50},(_,i)=>({pos:i+1,title:"Song "+(i+1),artist:"Artist "+(i+1)}));
function kworb(rows=tracks,date="2026-09-30"){
 const markup=rows.map(t=>{
  const styled=[17,36,50].includes(t.pos),open=styled?'<tr class="d2">':"<tr>";
  const artist=styled?"<b>"+t.artist+"</b>":t.artist;
  return open+'<td class="np">'+t.pos+'</td><td class="np">=</td>'+
    '<td class="text mp"><div><a>'+artist+'</a> - <a>'+t.title+'</a></div></td></tr>';
 }).join("");
 return '<html><title>Spotify Daily Chart - Global</title><h2>'+date.replaceAll("-","/")+
   '</h2><table>'+markup+'</table></html>';
}
function musicrank(rows=tracks,date="Sep 30, 2026"){
 const json={"@type":"ItemList",name:"Spotify global chart",
  itemListElement:rows.slice(0,20).map(t=>({position:t.pos,item:{name:t.title,byArtist:{name:t.artist}}}))};
 const links=rows.map(t=>'<a href="/track/'+t.pos+'">'+t.title+'</a>'+
    '<p><a href="/artist/'+t.pos+'">'+t.artist+'</a></p>').join("");
 return '<html><head><meta name="description" content="Spotify&#x27;s daily top songs worldwide for '+
   date+'. Worldwide"/></head><body><main><script type="application/ld+json">'+JSON.stringify(json)+
   '</script>'+links+'</main></body></html>';
}
test("bold/highlighted Kworb rows and all 50 positions are retained",()=>{
 const v=parseKworbSpotify(kworb());
 assert.equal(v.date,"2026-09-30");
 assert.deepEqual(v.tracks.map(t=>t.pos),tracks.map(t=>t.pos));
 for(const rank of [17,36,50])assert.equal(v.tracks[rank-1].title,"Song "+rank);
});
test("Kworb tolerates alternate class order and nested bold text",()=>{
 const html=kworb().replace('<td class="text mp">','<td class="mp text highlight">')
   .replace("<b>Artist 17</b>","<strong>Artist &amp; Guest</strong>");
 assert.equal(parseKworbSpotify(html).tracks[16].artist,"Artist & Guest");
});
test("partial ranks, duplicates and wrong chart markup are rejected",()=>{
 assert.throws(()=>parseKworbSpotify(kworb(tracks.slice(0,49))));
 assert.throws(()=>parseKworbSpotify(kworb().replace('Spotify Daily Chart - Global','Wrong chart')));
 assert.throws(()=>validatedSpotifyRows(tracks.map(t=>({...t,pos:t.pos===50?49:t.pos}))));
 assert.throws(()=>validatedSpotifyRows(tracks.map(t=>({...t,
   title:t.pos===50?"Song 1":t.title,artist:t.pos===50?"Artist 1":t.artist}))));
});
test("Musicrank independently confirms visible top 20 and yields all 50",()=>{
 const mr=parseMusicrankSpotify(musicrank());
 assert.equal(mr.tracks.length,50);
 assert.equal(mr.ldConfirmed,20);
 assert.equal(compareSpotifyRankings(parseKworbSpotify(kworb()),mr).ok,true);
 const h=musicrank().replace('>Song 5</a>','>Wrong title</a>');
 assert.throws(()=>parseMusicrankSpotify(h),/metadata_mismatch/);
});
test("mismatched ranks and dates block cross-provider verification",()=>{
 const a=parseKworbSpotify(kworb()),b=parseMusicrankSpotify(musicrank());
 assert.deepEqual(compareSpotifyRankings(a,b).mismatchPositions,[]);
 b.tracks[35].title="Other";
 assert.deepEqual(compareSpotifyRankings(a,b).mismatchPositions,[36]);
 assert.equal(compareSpotifyRankings(a,{...b,date:"2026-09-29"}).dateMatch,false);
 assert.equal(compareSpotifyRankings({...a,tracks:tracks.slice(0,49)},
   {...b,tracks:tracks.slice(0,49)}).ok,false);
 assert.equal(compareSpotifyRankings({date:a.date},{date:a.date}).ok,false);
});
test("Spotify source dates are checked in UTC and expire after two days",()=>{
 const now=Date.parse("2026-10-02T16:00:00Z");
 assert.equal(spotifyDateCurrent("2026-09-30",now),true);
 assert.equal(spotifyDateCurrent("2026-09-29",now),false);
 assert.equal(spotifyDateCurrent("2026-10-03",now),false);
 assert.equal(spotifyDateCurrent("no date",now),false);
 assert.equal(spotifyDateCurrent("2026-02-30",Date.parse("2026-03-02T16:00:00Z")),false);
});
test("daily fallback requires verified provenance and all 50 tracks",()=>{
 const now=Date.parse("2026-10-02T16:00:00Z");
 const s={schema:1,verified:true,chartDate:"2026-09-30",provider:"kworb+musicrank",
   mirrorMatched:50,fingerprint:"a".repeat(64),tracks};
 assert.equal(verifiedSpotifySnapshot(s,now)?.tracks.length,50);
 assert.equal(verifiedSpotifySnapshot({...s,mirrorMatched:49},now),null);
 assert.equal(verifiedSpotifySnapshot({...s,fingerprint:"invalid"},now),null);
 assert.equal(verifiedSpotifySnapshot({...s,tracks:tracks.slice(0,49)},now),null);
 assert.equal(verifiedSpotifySnapshot({...s,chartDate:"2026-09-29"},now),null);
 assert.equal(verifiedSpotifySnapshot({...s,provider:"musicrank-self-validated",ldConfirmed:20},now),null);
 assert.equal(verifiedSpotifySnapshot({...s,provider:"musicrank-self-validated",ldConfirmed:19},now),null);
});

async function runCollector({kwDate,mrDate,kwOffline=false,mrOffline=false,initial}){
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),"music98-spotify-"));
 try{
  await Promise.all(["scripts","functions/lib","public/data"].map(p=>fs.mkdir(path.join(dir,p),{recursive:true})));
  await fs.writeFile(path.join(dir,"package.json"),'{"type":"module"}');
  await Promise.all(["scripts/refresh-spotify-ranking.mjs","functions/lib/spotify-chart.js","functions/lib/chart-identity.js"]
   .map(p=>fs.copyFile(new URL("../"+p,import.meta.url),path.join(dir,p))));
  const output=path.join(dir,"public/data/spotify-chart.json");
  const original=JSON.stringify(initial)+"\n";
  await fs.writeFile(output,original);
  const mrHuman=new Date(mrDate+"T00:00:00Z").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric",timeZone:"UTC"});
  const responses={kworb:{status:kwOffline?503:200,body:kworb(tracks,kwDate)},
   musicrank:{status:mrOffline?503:200,body:musicrank(tracks,mrHuman)}};
  const preload=path.join(dir,"fetch.mjs");
  await fs.writeFile(preload,'const responses='+JSON.stringify(responses)+';\n'+
   'globalThis.fetch=async input=>{const host=new URL(String(input)).hostname;'+
   'const fixture=host==="kworb.net"?responses.kworb:host==="musicrank.org"?responses.musicrank:null;'+
   'if(!fixture)throw new Error("Unexpected network request: "+input);'+
   'return new Response(fixture.body,{status:fixture.status});};\n');
  let status=0,stderr="";
  try{await promisify(execFile)(process.execPath,["--import",preload,path.join(dir,"scripts/refresh-spotify-ranking.mjs")]);}
  catch(e){status=e.code;stderr=e.stderr;}
  const bytes=await fs.readFile(output,"utf8");
  return {status,stderr,unchanged:bytes===original,snapshot:JSON.parse(bytes)};
 }finally{await fs.rm(dir,{recursive:true,force:true});}
}
test("collector preserves the last verified snapshot while either mirror is missing or delayed",async()=>{
 const today=new Date().toISOString().slice(0,10),yesterday=new Date(Date.now()-86400000).toISOString().slice(0,10);
 const initial={schema:1,verified:true,chartDate:yesterday,provider:"kworb+musicrank",
  mirrorMatched:50,fingerprint:"a".repeat(64),tracks};
 const outcomes=await Promise.all([
  {kwDate:today,mrDate:today,kwOffline:true},
  {kwDate:today,mrDate:today,mrOffline:true},
  {kwDate:yesterday,mrDate:today},
  {kwDate:today,mrDate:yesterday}
 ].map(s=>runCollector({...s,initial})));
 for(const outcome of outcomes){
  assert.notEqual(outcome.status,0);
  assert.match(outcome.stderr,/No independently verified Spotify source|await same-date verification/);
  assert.equal(outcome.unchanged,true);
 }
});
test("collector publishes only after both mirrors agree on the new date and all 50 ranks",async()=>{
 const today=new Date().toISOString().slice(0,10),yesterday=new Date(Date.now()-86400000).toISOString().slice(0,10);
 const result=await runCollector({kwDate:today,mrDate:today,initial:{chartDate:yesterday}});
 assert.equal(result.status,0,result.stderr);
 assert.equal(result.snapshot.chartDate,today);
 assert.equal(result.snapshot.provider,"kworb+musicrank");
 assert.equal(result.snapshot.mirrorMatched,50);
 assert.equal(verifiedSpotifySnapshot(result.snapshot)?.tracks.length,50);
});
