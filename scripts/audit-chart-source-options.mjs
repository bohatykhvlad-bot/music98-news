/* Diagnostic only. Never writes production ranking or published sources. */
import fs from "node:fs";
import {mergeKey} from "../functions/lib/chart-identity.js";
const read=name=>JSON.parse(fs.readFileSync(new URL("../public/data/"+name,import.meta.url),"utf8"));
const apple=read("apple-chart.json");
const spotify=read("spotify-chart.json");
const worldwide=read("deezer-chart.json");
const sources=[apple,spotify,worldwide];
const sourceDates=sources.map(s=>s.chartDate||s.sourceDate);
const a=new Set(apple.tracks.map(t=>mergeKey(t.title,t.artist)));
const s=new Set(spotify.tracks.map(t=>mergeKey(t.title,t.artist)));
const base=new Map(sources.map((v,i)=>[["apple","spotify","deezer-playlist"][i],v]));
const report={sourceDates,sourceLengths:sources.map(s=>s.tracks.length),checks:[]};
const observed=new Set();
for(const limit of [100,200,500]){
  const url="https://api.deezer.com/chart/0/tracks?limit="+limit;
  try{
    const res=await fetch(url,{headers:{"User-Agent":"music98-diagnostic/1.0"},
      signal:AbortSignal.timeout(18000)});
    if(!res.ok)throw new Error("Deezer returned HTTP "+res.status);
    const j=await res.json();
    if(j.error)throw new Error(JSON.stringify(j.error));
    if(!Array.isArray(j.data)||!j.data.length)throw new Error("No chart data");
    const tracks=j.data.map((t,i)=>({
      pos:Number(t.position)||i+1,
      title:String(t.title_short||t.title||"").trim(),
      artist:String(t.artist?.name||"").trim(),
      deezerId:t.id,
      version:t.title_version||""
    }));
    const both=tracks.filter(t=>a.has(mergeKey(t.title,t.artist))&&s.has(mergeKey(t.title,t.artist)));
    const result={provider:"deezer-chart-api",requested:limit,rows:tracks.length,
      total:j.total||null,next:!!j.next,
      pairApple:tracks.filter(t=>a.has(mergeKey(t.title,t.artist))).length,
      pairSpotify:tracks.filter(t=>s.has(mergeKey(t.title,t.artist))).length,
      triple:both.length,
      firstTen:tracks.slice(0,10),
      tripleTitles:both.map(t=>t.title+" | "+t.artist),
      sourceUrl:url
    };
    report.checks.push(result);
    console.log("DEEZEＲ_CHART_SOURCE_TEST "+JSON.stringify(result));
    observed.add(tracks.length);
  }catch(e){
    const result={provider:"deezer-chart-api",requested:limit,error:String(e)};
    report.checks.push(result);
    console.log("DEEZER_CHART_SOURCE_ERROR "+JSON.stringify(result));
  }
}
const p=worldwide.tracks;
const bothP=p.filter(t=>a.has(mergeKey(t.title,t.artist))&&s.has(mergeKey(t.title,t.artist)));
const playlist={provider:"deezer-worldwide-playlist",rows:p.length,
  pairApple:p.filter(t=>a.has(mergeKey(t.title,t.artist))).length,
  pairSpotify:p.filter(t=>s.has(mergeKey(t.title,t.artist))).length,
  triple:bothP.length,
  firstTen:p.slice(0,10).map(t=>({pos:t.pos,title:t.title,artist:t.artist}))
};
report.checks.push(playlist);
console.log("DEEZER_PLAYLIST_SOURCE_TEST "+JSON.stringify(playlist));
console.log("CANDIDATE_SELECTION_DIAGNOSIS "+JSON.stringify({sourceDates:report.sourceDates,
  options:report.checks.map(t=>({provider:t.provider,requested:t.requested,rows:t.rows,
    triple:t.triple,error:t.error})),
  strict50Possible:report.checks.some(t=>t.triple>=50)}));
fs.writeFileSync("/tmp/music98-chart-source-audit.json",JSON.stringify(report,null,2)+"\n");
