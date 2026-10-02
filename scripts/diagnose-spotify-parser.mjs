const url="https://kworb.net/spotify/country/global_daily.html";
const res=await fetch(url,{headers:{"user-agent":"Mozilla/5.0 (compatible; music98-spotify-audit/1.0)"},signal:AbortSignal.timeout(20000)});
if(!res.ok) throw new Error("Kworb HTTP "+res.status);
const html=await res.text();
const old=/<tr><td class="np">(\d+)<\/td>\s*<td class="np">[^<]*<\/td>\s*<td class="text mp"><div>(.*?)<\/div><\/td>/gs;
const parsed=[];let m;
while((m=old.exec(html))) {
 const pos=Number(m[1]);
 if(pos>50)continue;
 const text=m[2].replace(/<[^>]+>/g,"").replace(/\s+/g," ").trim();
 if(!text.includes(" - "))continue;
 parsed.push(pos);
}
const rows=[...html.matchAll(/<tr(?:\s[^>]*)?>[\s\S]*?<\/tr>/gi)];
const details=[];
for(const row of rows){
 const posMatch=row[0].match(/<td\b[^>]*class=["'][^"']*\bnp\b[^"']*["'][^>]*>\s*(\d+)\s*<\/td>/i);
 if(!posMatch)continue;
 const pos=Number(posMatch[1]);
 if(pos<1||pos>50)continue;
 const names=row[0].match(/<td\b[^>]*class=["'][^"']*\btext\b[^"']*["'][^>]*>[\s\S]*?<\/td>/i);
 const text=(names?.[0]||"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();
 details.push({pos,text,html:row[0].slice(0,500)});
}
const missing=[...Array(50)].map((_,i)=>i+1).filter(i=>!parsed.includes(i));
const genericMissing=[...Array(50)].map((_,i)=>i+1).filter(i=>!details.some(x=>x.pos===i));
console.log("HTML_BYTES",html.length,"PAGE_HEADING",html.match(/Spotify Daily Chart[^<]{0,90}/)?.[0]||"");
console.log("CURRENT_PARSER",JSON.stringify({count:parsed.length,missing}));
console.log("GENERAL_TABLE",JSON.stringify({count:details.length,missing:genericMissing}));
for(const n of missing)console.log("MISSED_RANK",JSON.stringify(details.find(x=>x.pos===n)||{rank:n,notFound:true}));
