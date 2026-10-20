import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {setTimeout as sleep} from 'node:timers/promises';
const chrome=['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);
if(!chrome)throw Error('Chrome missing');
const profile=fs.mkdtempSync('/tmp/music98-ambient-cdp-'),port=9231;
const browser=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage',
 '--enable-unsafe-swiftshader','--use-gl=angle','--disable-features=Translate,MediaRouter',
 '--remote-debugging-port='+port,'--user-data-dir='+profile,'about:blank'],{stdio:'ignore'});
async function openCDP(){
 for(let i=0;i<35;i++){try{const pages=await (await fetch('http://localhost:'+port+'/json/list')).json();
 const page=pages.find(p=>p.type==='page'&&p.webSocketDebuggerUrl);
 if(page)return page.webSocketDebuggerUrl;}catch{} await sleep(200);}
 throw Error('Chrome CDP not reachable');
}
const pending=new Map();let seq=0,ws;
function call(method,params={}){
 return new Promise((resolve,reject)=>{
 const id=++seq;const timeout=setTimeout(()=>{pending.delete(id);reject(new Error('CDP timeout '+method));},15000);
 pending.set(id,x=>{clearTimeout(timeout);x.error?reject(Error(JSON.stringify(x.error))):resolve(x.result);});
 ws.send(JSON.stringify({id,method,params}));
 });
}
async function evaluate(expression){
 const x=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
 if(x.exceptionDetails)throw Error(JSON.stringify(x.exceptionDetails).slice(0,2200));
 return x.result?.value;
}
const inspect=String.raw`(()=>{
  const c=document.getElementById('discoverAmbient');
  if(!c) return {href:location.href,ready:document.readyState,title:document.title,html:document.body?.outerHTML.slice(0,800),error:'canvas absent'};
  const p=document.getElementById('tab-discover');
  const st=document.getElementById('discoverPlayerStage');
  const styles=x=>{const s=getComputedStyle(x);return {display:s.display,position:s.position,opacity:s.opacity,visibility:s.visibility,z:s.zIndex,background:s.backgroundColor}};
  const rect=x=>{const r=x.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}};
  const gl=c.getContext('webgl'); const pix=[];
  if(gl){
    for(const [x,y] of [[10,10],[Math.floor(c.width/2),Math.floor(c.height/2)],[Math.floor(c.width/4),Math.floor(c.height/3)]]){
      const rgba=new Uint8Array(4);
      try{gl.readPixels(x,y,1,1,gl.RGBA,gl.UNSIGNED_BYTE,rgba);pix.push([...rgba]);}catch(e){pix.push(String(e))}
    }
  }
  return {
    href:location.href,body:document.body.className,doc:document.documentElement.dataset.m98InitialTab,
    API:!!window.music98DiscoverAmbient,tab:p.className,canvas:{style:styles(c),rect:rect(c),width:c.width,height:c.height},
    tabStyle:styles(p),tabRect:rect(p),stageRect:rect(st),mainStyle:styles(document.querySelector('main')),
    rendering:{webgl:!!gl,program:gl?!!gl.getParameter(gl.CURRENT_PROGRAM):null,error:gl?gl.getError():null,pix},
    elementsAtTop:document.elementsFromPoint(innerWidth/2,Math.min(200,innerHeight/2)).slice(0,7).map(x=>x.tagName+'.'+String(x.className)+'#'+x.id),
    countCanvases:document.querySelectorAll('canvas').length,
    subscribeRect:rect(document.querySelector('.subscribe')),scrollY,innerWidth,innerHeight
  };
})()`;
try{
 ws=new WebSocket(await openCDP());
 await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
 ws.onmessage=e=>{const p=JSON.parse(e.data);if(p.id&&pending.has(p.id)){pending.get(p.id)(p);pending.delete(p.id);}};
 await call('Page.enable');await call('Runtime.enable');
 for(const [view,w,h,mobile] of [['desktop',1440,900,false],['mobile',390,844,true]]){
  await call('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile});
  await call('Page.navigate',{url:'https://music98.news/discover?real-ambient-diag='+Date.now()});
  await sleep(5500);
  const out=await evaluate(inspect);
  console.log('REAL_BROWSER_AMBIENT '+view+' '+JSON.stringify(out));
 }
}finally{if(ws)ws.close();browser.kill('SIGTERM');}
