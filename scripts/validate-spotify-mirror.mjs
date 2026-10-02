import {mergeKey} from "../functions/lib/chart-identity.js";
const [mrRes,kwRes]=await Promise.all([
fetch("https://musicrank.org/spotify",{signal:AbortSignal.timeout(14000)}),
fetch("https://kworb.net/spotify/country/global_daily.html",{signal:AbortSignal.timeout(14000)})
]);
const [h,k]=await Promise.all([mrRes.text(),kwRes.text()]);
const blocks=[...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>{try{return JSON.parse(m[1])}catch{return null}});
const list=blocks.find(x=>x?.["@type"]==="ItemList"&&x.name?.includes("Spotify"));
const main=h.slice(h.indexOf("<main"),h.indexOf("<script>(self.__next_f",h.indexOf("<main")));
const htmlDecode=s=>String(s||"").replace(/<[^>]+>/g,"").replace(/&#x([\da-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)))
.replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&nbsp;/g," ").trim();
const songs=[];
const re=/<h3\b[^>]*>[\s\S]*?<a\b[^>]*href="\/track\/[^"]+"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h3>/g;let m;
while((m=re.exec(main)) && songs.length<180) {
 const after=main.slice(re.lastIndex,re.lastIndex+2200);
 const artist=after.match(/<p\b[^>]*>[\s\S]*?<a\b[^>]*href="\/artist\/[^"]+"[^>]*>([\s\S]*?)<\/a>/);
 songs.push({pos:songs.length+2,title:htmlDecode(m[1]),artist:htmlDecode(artist?.[1]||""),
  afterSnippet:!artist?after.slice(0,200):undefined});
}
const ld=list?.itemListElement?.map(x=>({pos:x.position,title:x.item?.name,artist:x.item?.byArtist?.name}))||[];
const kw=[...k.matchAll(/<tr\b[^>]*>\s*<td class="np">(\d+)<\/td>\s*<td class="np">[^<]*<\/td>\s*<td class="text mp"><div>(.*?)<\/div><\/td>/gs)]
.map(m=>{const t=htmlDecode(m[2]).split(" - ");return {pos:Number(m[1]),artist:t[0],title:t.slice(1).join(" - ")}}).filter(x=>x.pos<=50);
const mr=[ld[0],...songs.slice(0,49)],mismatches=mr.map((s,i)=>({pos:i+1,rank:s,kw:kw[i]})).filter(x=>!x.rank||!x.kw||mergeKey(x.rank.title,x.rank.artist)!==mergeKey(x.kw.title,x.kw.artist));
const ldDiff=ld.slice(1).map((x,i)=>({pos:i+2,ok:mergeKey(x.title,x.artist)===mergeKey(songs[i]?.title,songs[i]?.artist)})).filter(x=>!x.ok);
console.log("MUSICRANK_PARSE",JSON.stringify({count:songs.length,ld:ld.length,first:songs.slice(0,5),
 dates:[h.match(/for ([A-Z][a-z]+ \d{1,2}, 2026)/)?.[1],k.match(/2026\/\d\d\/\d\d/)?.[0]],
 ldMismatch:ldDiff.slice(0,8),kwCount:kw.length,
 mismatchCount:mismatches.length,mismatches:mismatches.slice(0,13)}));
