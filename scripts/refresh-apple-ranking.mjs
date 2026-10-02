import fs from "node:fs";
const url="https://rss.applemarketingtools.com/api/v2/us/music/most-played/50/songs.json";
const output=new URL("../public/data/apple-chart.json",import.meta.url);
let j,lastError;
for(let attempt=0;attempt<3;attempt++){
 try{
   const r=await fetch(url,{headers:{"user-agent":"music98-chart-source/1.0"},
     signal:AbortSignal.timeout(12000)});
   if(!r.ok)throw new Error("Apple RSS HTTP "+r.status);
   j=await r.json();break;
 }catch(e){lastError=e;if(attempt<2)await new Promise(done=>setTimeout(done,2500));}
}
if(!j)throw lastError||new Error("Apple RSS unavailable");
if(!Array.isArray(j?.feed?.results))throw new Error("Apple RSS results missing");
const identities=new Set();
const tracks=j.feed.results.slice(0,50).map((t,i)=>{
 const title=String(t.name||"").trim(),artist=String(t.artistName||"").trim();
 const key=(title+"|"+artist).normalize("NFKC").toLowerCase();
 if(!title||!artist||identities.has(key))throw new Error("Invalid Apple row "+(i+1));
 identities.add(key);
 return {pos:i+1,title,artist,url:String(t.url||""),
   art:String(t.artworkUrl100||"").replace("100x100bb","600x600bb"),
   year:String(t.releaseDate||"").slice(0,4)};
});
if(tracks.length<40)throw new Error("Partial Apple RSS "+tracks.length);
const snapshot={schema:1,updated:new Date().toISOString().slice(0,10),
 source:"official-apple-rss",tracks};
fs.writeFileSync(output,JSON.stringify(snapshot,null,2)+"\n");
console.log("APPLE_DAILY_SOURCE",snapshot.updated,tracks.length);
