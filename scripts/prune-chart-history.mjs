import fs from "node:fs";
import path from "node:path";
// The Worker needs only recent history to reconcile the lagging Spotify
// edition. Keep 14 days as a margin for outages, retries and audits.
const folder=new URL("../public/data/chart-history/",import.meta.url);
const floor=Date.now()-14*86400000;
let removed=[];
for(const filename of fs.readdirSync(folder)){
 const m=filename.match(/^(?:apple-us|apple-global|spotify-global)-(20\d{2}-\d{2}-\d{2})\.json$/);
 if(!m)continue;
 const at=Date.parse(m[1]+"T00:00:00Z");
 if(Number.isFinite(at)&&at<floor){
  fs.unlinkSync(new URL(filename,folder));
  removed.push(filename);
 }
}
console.log("CHART_HISTORY_RETENTION",JSON.stringify({days:14,pruned:removed.length,files:removed}));
