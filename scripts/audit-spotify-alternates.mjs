// Diagnose candidate independent public sources; diagnostic only, never publish.
const targets=[
 ["kworb","https://kworb.net/spotify/country/global_daily.html"],
 ["musicrank","https://musicrank.org/spotify"],
 ["mytopspotify","https://mytopspotify.io/spotify-top-songs.json"],
 ["spotify-csv-old","https://spotifycharts.com/regional/global/daily/latest/download"],
 ["spotify-charts-new","https://charts.spotify.com/api/charts/regional/global/daily/2026-09-30"]
];
for(const [name,url] of targets){
 try{
  const r=await fetch(url,{headers:{"user-agent":"Mozilla/5.0 (compatible; music98-source-check/1.0)"},
    redirect:"follow",signal:AbortSignal.timeout(9000)});
  const body=await r.text(),dates=[...new Set((body.match(/2026[-/]0[89][-/]\d\d/g)||[]))].slice(0,8);
  const around=(needle)=>{
    const pos=body.toLowerCase().indexOf(needle.toLowerCase());
    return pos<0?"":body.slice(Math.max(0,pos-110),pos+360).replace(/\s+/g," ").slice(0,470);
  };
  console.log("SOURCE_DIAG",JSON.stringify({name,status:r.status,redirect:r.url,
    type:r.headers.get("content-type"),size:body.length,title:body.match(/<title[^>]*>([^<]{1,120})/i)?.[1],
    dates,containsRanking:body.includes("Patient Zero")||body.includes("BbY WOW"),
    patientSnippet:around("Patient Zero"),markup:body.slice(0,400).replace(/\s+/g," ")}));
 }catch(err){console.log("SOURCE_DIAG",JSON.stringify({name,error:String(err)}))}
}

const mr=await fetch("https://musicrank.org/spotify",{signal:AbortSignal.timeout(15000)});
const h=await mr.text();
const main=h.indexOf("<main"),target=h.indexOf("Patient Zero",Math.max(0,main));
const patterns=["Sep 30, 2026","2026-09-30","No. 1","Number 2","BbY WOW","Patient Zero","application/ld+json","__next_f"];
for(const pat of patterns){
 const positions=[],re=new RegExp(pat.replace(/[.*+?^$\{\}()|[\]\\]/g,"\\$&"),"gi");let mt;
 while((mt=re.exec(h)) && positions.length<5)positions.push(mt.index);
 console.log("MUSICRANK_PROBE",JSON.stringify({pattern:pat,count:h.split(pat).length-1,
  hits:positions.map(pos=>({pos,s:h.slice(Math.max(0,pos-220),pos+550).replace(/\\s+/g," ").slice(0,770)}))}));
}
console.log("MUSICRANK_TAGS",JSON.stringify({main,firstPatient:target,articleCount:(h.match(/<article\\b/g)||[]).length,
  itemRank:(h.match(/data-rank=/g)||[]).length,jsonLd:(h.match(/application\\/ld\\+json/g)||[]).length}));
