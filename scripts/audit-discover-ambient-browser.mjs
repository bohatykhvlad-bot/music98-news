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

async function screenshotSamples(){
 const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
 const expression='(async()=>{const img=new Image();img.src='+JSON.stringify('data:image/png;base64,'+shot.data)+
  ';await img.decode();const cv=document.createElement("canvas");cv.width=img.width;cv.height=img.height;'+
  'const c=cv.getContext("2d");c.drawImage(img,0,0);const d=c.getImageData(0,0,img.width,img.height).data;'+
  'const out=[];for(let y=40;y<Math.min(img.height,700);y+=40){for(let x=20;x<img.width;x+=40){'+
  'const i=(y*img.width+x)*4;out.push([d[i],d[i+1],d[i+2]])}}return out})()';
 return await evaluate(expression);
}

const inspect=String.raw`(()=>{
  const c=document.getElementById('discoverAmbient');
  if(!c) return {href:location.href,ready:document.readyState,title:document.title,html:document.body?.outerHTML.slice(0,800),error:'canvas absent'};
  const p=document.getElementById('tab-discover');
  const st=document.getElementById('discoverPlayerStage');
  const styles=x=>{const s=getComputedStyle(x);return {display:s.display,position:s.position,opacity:s.opacity,visibility:s.visibility,z:s.zIndex,background:s.backgroundColor}};
  const rect=x=>{const r=x.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}};
  window.music98DiscoverAmbient?.setVisible(true);
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
  const on=await screenshotSamples();
  await evaluate('document.getElementById("discoverAmbient").style.visibility="hidden"');
  await sleep(140);
  const off=await screenshotSamples();
  const diffs=on.map((v,i)=>v.reduce((sum,ch,k)=>sum+Math.abs(ch-off[i][k]),0)/3);
  const changed=diffs.filter(v=>v>=3);
  const contrast={view,count:diffs.length,changed:changed.length,mean:Math.round(diffs.reduce((a,b)=>a+b,0)/diffs.length*100)/100,
   maximum:Math.max(...diffs),over10:diffs.filter(x=>x>10).length,
   onExamples:on.slice(0,12),offExamples:off.slice(0,12)};
  console.log('REAL_BROWSER_AMBIENT_CONTRAST '+JSON.stringify(contrast));
  if(view==='desktop'){
    await evaluate('document.getElementById("discoverAmbient").style.visibility="visible"');
    await sleep(250);
    const shot=await call('Page.captureScreenshot',{format:'png',clip:{x:0,y:0,width:1200,height:650,scale:0.72}});
    const data=shot.data;
    const batch=5000,parts=Math.ceil(data.length/batch);
    for(let n=0;n<parts;n++) console.log('AMBIENT_IMAGE_CHUNK '+n+'/'+parts+' '+data.slice(n*batch,(n+1)*batch));
  }
 }
}finally{if(ws)ws.close();browser.kill('SIGTERM');}
