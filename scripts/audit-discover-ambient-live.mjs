// Strict read-only production check for the Discover ambient fix.
// Unlike the general Discover diagnostics, this fails when live files are stale.
import {readFile} from 'node:fs/promises';
import {setTimeout as delay} from 'node:timers/promises';

const origin='https://music98.news';
const html=await readFile(new URL('../public/index.html', import.meta.url),'utf8');
const source=await readFile(new URL('../public/discover-ambient.js', import.meta.url),'utf8');
const asset=html.match(/<script src="(\/discover-ambient\.js\?v=[^"]+)" defer><\/script>/)?.[1];
if(!asset || !source.includes('settleStartedAt') || !source.includes('now-settleStartedAt>=1100')){
  throw new Error('Repository does not contain the expected Discover ambient startup fix');
}
let ready=false;
for(let attempt=1;attempt<=12;attempt++){
  try{
    const nonce=Date.now();
    const [page,js]=await Promise.all([
      fetch(origin+'/discover?ambient-audit='+nonce,{signal:AbortSignal.timeout(10000)}),
      fetch(origin+asset+'&ambient-audit='+nonce,{signal:AbortSignal.timeout(10000)})
    ]);
    const [pageText,jsText]=await Promise.all([page.text(),js.text()]);
    const result={
      attempt,htmlStatus:page.status,scriptStatus:js.status,
      htmlReferencesRevision:pageText.includes(asset),
      scriptContainsFix:jsText.includes('settleStartedAt')&&jsText.includes('now-settleStartedAt>=1100'),
      scriptBytes:jsText.length
    };
    console.log('LIVE_AMBIENT',JSON.stringify(result));
    if(page.ok&&js.ok&&result.htmlReferencesRevision&&result.scriptContainsFix){ready=true;break;}
  }catch(error){
    console.log('LIVE_AMBIENT_RETRY',attempt,String(error).slice(0,160));
  }
  if(attempt<12)await delay(6000);
}
if(!ready){
  console.error('LIVE_AMBIENT_CHECK: FAIL - updated Discover HTML and ambient JS are not both deployed');
  process.exitCode=1;
}else{
  console.log('LIVE_AMBIENT_CHECK: PASS - updated Discover HTML and ambient JS visible at origin');
}
