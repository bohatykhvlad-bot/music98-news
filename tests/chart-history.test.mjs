import test from "node:test";
import assert from "node:assert/strict";
import {parseChartStatsUsHistorical,verifiedDatedApple,verifiedDatedSpotify,datedChartPath}
 from "../functions/lib/chart-history.js";
import {verifiedTriSeed} from "../functions/lib/tri-source-chart.js";
import {readFileSync} from "node:fs";

const day="2026-10-08",now=Date.parse("2026-10-10T12:00:00Z");
const apples=Array.from({length:100},(_,i)=>({
 pos:i+1,title:"Track "+i,artist:"Artist "+i,art:"https://is1-ssl.mzstatic.com/image/thumb/a/600x600bb.jpg",url:""
}));
function apple(region,size,source){
 return {schema:2,updated:"2026-10-10",sourceDate:day,region,
  source,sourceUrl:region==="us"?"https://chartstats.com/US/songs/"+day:"https://music.apple.com/us/playlist/top-100-global/pl.d25f5d1181894928af76c85c967f8f31",
  cadence:"daily",tracks:apples.slice(0,size)};
}
test("archive paths require valid date and source",()=>{
 assert.equal(datedChartPath("apple-us",day),"chart-history/apple-us-"+day+".json");
 assert.throws(()=>datedChartPath("spotify-global","2026-10-99"));
 assert.throws(()=>datedChartPath("../apple-us",day));
});
test("genuine dated historical Apple US Top 100 and original Apple Global Top 50 are admissible",()=>{
 assert.ok(verifiedDatedApple(apple("us",100,"historical-apple-us-chartstats"),"U",day));
 assert.ok(verifiedDatedApple(apple("global",50,"official-apple-global-playlist"),"A",day));
 assert.equal(verifiedDatedApple(apple("global",49,"official-apple-global-playlist"),"A",day),null);
 const stale=apple("us",100,"historical-apple-us-chartstats");stale.sourceDate="2026-10-10";
 assert.equal(verifiedDatedApple(stale,"U",day),null);
});
test("ChartStats parser accepts dated structured top 100 and rejects partial or wrong-date HTML",()=>{
 const elements=apples.map((t,i)=>({position:i+1,item:{"@type":"MusicRecording",name:t.title,byArtist:{name:t.artist}}}));
 const rows=apples.map((t,i)=>'<tr><td>'+ (i+1) +
   '</td><td><img src="'+t.art+'"><a href="/song/test-'+i+'">'+t.title+
   '</a><a href="/artist/test-'+i+'">'+t.artist+'</a></td></tr>').join("");
 const html='<html><head><link rel="canonical" href="https://chartstats.com/US/songs/'+day+
  '"><meta name="description" content="The Apple Music Top 100 in United States"></head>'+
  '<script id="page-jsonld" type="application/ld+json">'+
  JSON.stringify({"@type":"ItemList",name:"United States "+day.slice(0,4),numberOfItems:100,itemListElement:elements.slice(0,10)})+
  '</script><tbody>'+rows+'</tbody></html>';
 const parsed=parseChartStatsUsHistorical(html,day);
 assert.equal(parsed.tracks.length,100);
 assert.equal(parsed.sourceDate,day);
 assert.equal(parsed.tracks[0].title,"Track 0");
 assert.throws(()=>parseChartStatsUsHistorical(html,"2026-10-09"));
 assert.throws(()=>parseChartStatsUsHistorical(html.replace("</tbody>","").replace(/<tr><td>100[\s\S]*?<\/tr>/,"")+"</tbody>",day));
});
test("Spotify archive requires all 200 real numbers and identities",()=>{
 const tracks=Array.from({length:200},(_,i)=>({pos:i+1,title:"Song "+i,artist:"Artist "+i,
  spotifyId:String(i+1).padStart(22,"0"),daily:1000000+i}));
 const snapshot={schema:1,source:"kworb-spotify-global-daily",region:"global",date:day,tracks};
 assert.ok(verifiedDatedSpotify(snapshot,day));
 const invalid=structuredClone(snapshot);invalid.tracks[4].daily=null;
 assert.equal(verifiedDatedSpotify(invalid,day),null);
});
test("three-source input never accepts US/Global dated today with older Spotify",()=>{
 const s=JSON.parse(readFileSync(new URL("../public/data/apple-spotify-streams.json",import.meta.url),"utf8"));
 assert.equal(s.appleUsDate,s.appleGlobalDate);
 if(s.appleUsDate!==s.spotifyDate)assert.equal(verifiedTriSeed(s,now),null);
});
