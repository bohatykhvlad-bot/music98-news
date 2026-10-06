import fs from "node:fs";
import path from "node:path";
import {mergeKey} from "../functions/lib/chart-identity.js";
import {onRequestGet} from "../functions/api/top50.js";
import {DEEZER_GLOBAL_URL,DAILY_CHART_METHOD,completeDailySources} from "../functions/lib/daily-chart-sources.js";

const output=process.argv[2];
if(!output)throw new Error("Usage: node scripts/build-daily-chart-preview.mjs OUTPUT.json");
const assetRoot=new URL("../public/data/",import.meta.url);
const values=new Map();
const env={
  // Isolated in-memory KV: this exercises the real route without production writes.
  DESK:{get:async key=>values.get(key)||null,put:async(key,value)=>values.set(key,JSON.parse(value))},
  ASSETS:{fetch:async input=>{
    const url=new URL(String(input)),file=path.basename(url.pathname);
    try{return new Response(fs.readFileSync(new URL(file,assetRoot)));}
    catch{return new Response("missing",{status:404});}
  }}
};
const networkFetch=globalThis.fetch;
// Verify the production recovery path using the same-day official Deezer
// snapshot. This also supports execution environments that cannot reach Deezer.
globalThis.fetch=(input,init)=>String(input)===DEEZER_GLOBAL_URL
  ? Promise.resolve(new Response("use verified daily snapshot",{status:503}))
  : networkFetch(input,init);
try{
  const request=new Request("https://music98.news/api/top50");
  const response=await onRequestGet({env,request});
  const chart=await response.json();
  if(response.status!==200 || chart.fallback || chart.methodology!==DAILY_CHART_METHOD ||
     !completeDailySources(chart.sources) || chart.tracks?.length!==50 || chart.arrows?.ok!==true)
    throw new Error("Daily preview could not be verified: "+JSON.stringify(chart));
  const cached=await (await onRequestGet({env,request})).json();
  const ranking=rows=>rows.map(t=>[t.rank,mergeKey(t.title,t.artist),t.weeks,t.delta]);
  if(JSON.stringify(ranking(chart.tracks))!==JSON.stringify(ranking(cached.tracks)))
    throw new Error("Repeat request changed ranking or history");
  // The existing artwork repair may fill missing media on a cached request.
  chart.tracks=cached.tracks;
  fs.writeFileSync(output,JSON.stringify(chart,null,2)+"\n");
  console.log("DAILY_PREVIEW",JSON.stringify({updated:chart.updated,sourceDates:chart.sourceDates,
    sources:chart.sources,rows:chart.tracks.length,arrows:chart.arrows,
    previews:chart.tracks.filter(t=>t.prev).length,artwork:chart.tracks.filter(t=>t.art).length}));
}finally{globalThis.fetch=networkFetch;}
