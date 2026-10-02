import test from "node:test";
import assert from "node:assert/strict";
import {buildTop50} from "../functions/api/top50.js";

function fakeSource({deezerCount=50,youtubeCount=50,kworbMissing=[],kworbSwap=false}={}){
 const today=new Date().toISOString().slice(0,10);
 const kwDate=today.replaceAll("-","/");
 const rows=Array.from({length:50},(_,i)=>({
   pos:i+1,title:"Source Song "+(i+1),artist:"Source Artist "+(i+1)
 }));
 const snapshot={schema:1,verified:true,provider:"kworb+musicrank",mirrorMatched:50,
   fingerprint:"a".repeat(64),chartDate:today,tracks:rows};
 const kw='<title>Spotify Daily Chart - Global</title><h2>'+kwDate+'</h2><table>'+
   rows.filter(x=>!kworbMissing.includes(x.pos)).map(x=>
     ([17,36,50].includes(x.pos)?'<tr class="d2">':"<tr>")+
     '<td class="np">'+x.pos+'</td><td class="np">=</td>'+
     '<td class="text mp"><div><b>'+x.artist+'</b> - '+(kworbSwap&&x.pos===36?"Wrong Song":x.title)+'</div></td></tr>'
   ).join("")+'</table>';
 const apple={feed:{results:rows.map(x=>({name:x.title,artistName:x.artist}))}};
 const deezer={data:rows.slice(0,deezerCount).map(x=>({
   title:x.title,artist:{name:x.artist}}))};
 const bb=rows.map(x=>'o-chart-results-list-row //'+
   '<span id="title-of-a-story">'+x.title+'</span>'+
   '<a href="https://www.billboard.com/artist/'+x.pos+'">'+x.artist+'</a>'
 ).join("");
 const youtube={contents:{sectionListRenderer:{contents:[{musicAnalyticsSectionRenderer:{
   content:{trackTypes:[{chartPeriodType:"CHART_PERIOD_TYPE_WEEKLY",
     trackViews:rows.slice(0,youtubeCount).map(x=>({
       name:x.title,artists:[{name:x.artist}],
       chartEntryMetadata:{currentPosition:x.pos}}))}]}
 }}]}}};
 const fakeFetch=async input=>{
   const url=String(input);
   const response=body=>new Response(typeof body==="string"?body:JSON.stringify(body),
    {status:200,headers:{"Content-Type":"application/json"}});
   if(url.includes("rss.applemarketingtools.com"))return response(apple);
   if(url.includes("kworb.net"))return response(kw);
   if(url.includes("api.deezer.com"))return response(deezer);
   if(url.includes("billboard.com"))return response(bb);
   if(url.includes("charts.youtube.com"))return response(youtube);
   return new Response("missing",{status:404});
 };
 return {fakeFetch,snapshot};
}
async function expectRejected(options,pattern){
 const {fakeFetch,snapshot}=fakeSource(options),previous=globalThis.fetch;
 globalThis.fetch=fakeFetch;
 try{await assert.rejects(buildTop50("https://music98.news",{},snapshot),pattern);}
 finally{globalThis.fetch=previous;}
}
test("worker refuses 49 Deezer rows rather than making an incomplete combined chart",async()=>{
 await expectRejected({deezerCount:49},/incomplete_chart_sources/);
});
test("worker refuses a weekly YouTube response with 49 valid positions",async()=>{
 await expectRejected({youtubeCount:49},/incomplete_chart_sources/);
});
test("worker rejects a changed Spotify rank even if both mirrors appear complete",async()=>{
 await expectRejected({kworbSwap:true},/spotify_mirror_disagreement:36/);
});
test("worker falls back to verified independent Spotify if the live HTML lost a row",async()=>{
 /* The mirror fallback is allowed, but another incomplete source must still
    block any publication before ranking/tenure mutations. */
 await expectRejected({kworbMissing:[17],deezerCount:49},/incomplete_chart_sources/);
});
