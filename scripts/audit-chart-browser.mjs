import fs from "node:fs";
import {execFileSync} from "node:child_process";

const origin="https://music98.news";
const stamp=Date.now();
const expectedMethod="apple-us40-spotify30-global30-v3";
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const browser=["/usr/bin/google-chrome","/usr/bin/chromium","/usr/bin/chromium-browser"].find(x=>fs.existsSync(x));
if(!browser)throw Error("Chromium not installed on browser smoke runner");
let last="";
for(let n=1;n<=8;n++){
  try{
    const [page,api]=await Promise.all([
      fetch(origin+"/chart?chartSmoke="+stamp+"&try="+n,{signal:AbortSignal.timeout(15000),headers:{"cache-control":"no-cache"}}),
      fetch(origin+"/api/top50?chartSmoke="+stamp+"&try="+n,{signal:AbortSignal.timeout(15000),headers:{"cache-control":"no-cache"}})
    ]);
    if(!page.ok||!api.ok)throw Error("LIVE_ENDPOINT_ERROR html="+page.status+" api="+api.status);
    const html=await page.text(),j=await api.json();
    if(!html.includes('const TRI_CHART_METHOD = "'+expectedMethod+'"'))
      throw Error("LATEST_HTML_NOT_DEPLOYED");
    if(j.methodology!==expectedMethod||j.tracks?.length!==50)
      throw Error("LATEST_API_NOT_READY: "+j.methodology+"/"+j.tracks?.length);
    // A REAL browser must accept the JSON and construct 50 DOM rows.
    // Test both desktop and mobile, using a fresh profile every time.
    for(const [name,size] of [["desktop","1440,1000"],["mobile","390,880"]]){
      const url=origin+"/chart?chartSmoke="+stamp+"&view="+name+"&try="+n;
      const dump=execFileSync(browser,[
        "--headless=new","--no-sandbox","--disable-dev-shm-usage",
        "--disable-gpu","--disable-features=Translate,MediaRouter",
        "--window-size="+size,"--force-device-scale-factor=1",
        "--virtual-time-budget=14000","--dump-dom",url
      ],{encoding:"utf8",timeout:45000,maxBuffer:18*1024*1024,stdio:["ignore","pipe","ignore"]});
      const list=dump.match(/<div\s+id="chartList"[^>]*>([\s\S]*?)<\/div>\s*<\/section>/);
      const count=(list?list[1]:dump).match(/class="chart-row(?:\s|")/g)?.length||0;
      const artists=([...(list?list[1]:dump).matchAll(/data-title="([^"]+)"/g)]).slice(0,4).map(m=>m[1]);
      console.log("CHART_BROWSER",JSON.stringify({name,count,htmlUpdated:j.updated,method:j.methodology,artists}));
      if(count!==50)throw Error("LIVE_CHROME_"+name+"_HAS_"+count+"_ROWS_INSTEAD_OF_50");
      if(!dump.includes("Daily Top 50"))throw Error("LIVE_CHROME_"+name+"_TITLE_NOT_UPDATED");
    }
    console.log("CHART_LIVE_BROWSER_PASS",JSON.stringify({date:j.updated,method:j.methodology,rows:j.tracks.length}));
    process.exit(0);
  }catch(e){
    last=String(e.message||e).slice(0,300);
    console.error("CHART_BROWSER_RETRY",n,last);
    if(n<8)await sleep(12000);
  }
}
throw Error("LIVE_CHART_BROWSER_FAILED: "+last);
