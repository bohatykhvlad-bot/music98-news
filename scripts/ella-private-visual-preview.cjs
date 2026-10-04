'use strict';
const fs=require('node:fs');
const {spawn}=require('node:child_process');
const source=JSON.parse(fs.readFileSync('/tmp/ella-review-draft.json','utf8'));
const secret=process.env.ADMIN_PASSWORD;
if(!secret)throw Error('EDITOR_KEY_MISSING');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const res=await fetch('https://music98.news/api/desk',{headers:{'X-Admin-Key':secret,'User-Agent':'Mozilla/5.0'},cache:'no-store'});
 if(!res.ok)throw Error('DESK_'+res.status);
 const real=await res.json();
 const draft=real.posts.find(p=>p.id==='ella26choosintexas');
 if(!draft||draft.status!=='draft')throw Error('ACTUAL_DRAFT_STATUS_CHANGED');
 const previewPosts=real.posts.map(p=>p.id===source.id?{...p,status:'live',body:source.body,excerpt:source.excerpt}:p);
 const previewJson=JSON.stringify({posts:previewPosts});
 const browser=['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);
 if(!browser)throw Error('NO_BROWSER');
 const chrome=spawn(browser,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--remote-debugging-port=9222','--remote-allow-origins=*','--user-data-dir=/tmp/ella-private-chrome','about:blank'],{stdio:'ignore'});
 let ws;
 try{
  let pages;
  for(let i=0;i<100;i++){
   try{const r=await fetch('http://127.0.0.1:9222/json/list');if(r.ok){pages=await r.json();if(pages.some(p=>p.type==='page'))break}}catch{}
   await wait(100);
  }
  if(!pages?.some(p=>p.type==='page'))throw Error('NO_CDP');
  ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);
  await new Promise((ok,fail)=>{ws.onopen=ok;ws.onerror=fail});
  let serial=0;const pending=new Map();
  ws.onmessage=e=>{let msg=JSON.parse(e.data);if(!msg.id)return;let p=pending.get(msg.id);if(!p)return;pending.delete(msg.id);msg.error?p.reject(Error(JSON.stringify(msg.error))):p.resolve(msg.result)};
  const c=(method,params={})=>new Promise((ok,fail)=>{let id=++serial;pending.set(id,{resolve:ok,reject:fail});ws.send(JSON.stringify({id,method,params}))});
  const ev=async code=>(await c('Runtime.evaluate',{expression:code,returnByValue:true,awaitPromise:true})).result?.value;
  await c('Page.enable');await c('Runtime.enable');
  const inject='(()=>{const json='+JSON.stringify(previewJson)+';const original=window.fetch.bind(window);window.fetch=function(input,init){const u=typeof input==="string"?input:input?.url||"";try{if(new URL(u,location.href).pathname==="/api/desk")return Promise.resolve(new Response(json,{status:200,headers:{"content-type":"application/json"}}));}catch{}return original(input,init)};})();';
  await c('Page.addScriptToEvaluateOnNewDocument',{source:inject});
  fs.mkdirSync('/tmp/ella-preview',{recursive:true});
  for(const width of [390,1280]){
   await c('Emulation.setDeviceMetricsOverride',{width,height:1500,deviceScaleFactor:1,mobile:width<700,screenWidth:width,screenHeight:1500});
   await c('Page.navigate',{url:'https://music98.news/the-ella-langley-phenomenon-and-countrys-new-boom?privatepreview='+Date.now()});
   let info;
   const metric=`(()=>{const img=[...document.querySelectorAll('#articlePage .abody-pic img')].find(i=>i.currentSrc.includes('ella-langley-live-caylee-robillard-2026.jpg'));if(!img?.complete||!img.naturalWidth||!img.classList.contains('cover-fitted'))return null;const box=img.closest('.abody-box').getBoundingClientRect();const all=[...document.querySelectorAll('#articlePage .atext>p')];const ending=all.slice(-2).map(e=>{const r=e.getBoundingClientRect();return {top:r.top+scrollY,bottom:r.bottom+scrollY,text:e.textContent.slice(0,80)}});const origin=img.getBoundingClientRect();return {natural:[img.naturalWidth,img.naturalHeight],fitted:true,photo:{x:box.x+scrollX,y:box.y+scrollY,width:box.width,height:box.height},img:{x:origin.x+scrollX,y:origin.y+scrollY,width:origin.width,height:origin.height},ending,title:document.querySelector('#articlePage h1')?.textContent||'',docHeight:document.documentElement.scrollHeight,scroll:[scrollX,scrollY]}})()`;
   for(let attempt=0;attempt<100;attempt++){
    await ev(`document.querySelector('#articlePage .abody-pic img[src*="ella-langley-live-caylee-robillard-2026.jpg"]')?.scrollIntoView({block:'center'})`);
    info=await ev(metric);
    if(info&&info.photo.width>150&&info.ending.length===2)break;
    await wait(170);
   }
   if(!info||info.ending.length!==2)throw Error('PREVIEW_ARTICLE_FAILED_'+width+' '+JSON.stringify(await ev(`({hidden:document.querySelector('#articlePage')?.hidden,photos:document.querySelectorAll('.abody-pic img').length,heading:document.title})`)));
   const ratio=info.photo.width/info.photo.height;
   if(Math.abs(ratio-1638/2048)>.025||info.natural[0]!==1638||info.natural[1]!==2048)throw Error('PHOTO_ORIGINAL_CROP_ERROR_'+width+' '+JSON.stringify(info));
   const pageRatio=info.img.width/info.photo.width;
   if(pageRatio>1.025)throw Error('PHOTO_IS_ZOOMED_'+width+' '+pageRatio);
   if(!info.title.includes('Ella Langley'))throw Error('WRONG_ARTICLE_LOADED');
   const file=(label,x,y,w,h)=>c('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x,y,width:w,height:h,scale:1}}).then(v=>{
    fs.writeFileSync('/tmp/ella-preview/'+label+'-'+width+'.png',Buffer.from(v.data,'base64'));
    console.log('ELLA_PREVIEW_SCREENSHOT '+label+' viewport='+width+' bytes='+Buffer.from(v.data,'base64').length);
   });
   await file('photo',Math.max(0,Math.floor(info.photo.x)),Math.floor(info.photo.y),Math.ceil(info.photo.width),Math.ceil(info.photo.height));
   const begin=Math.max(0,Math.floor(info.ending[0].top-35));const end=Math.ceil(info.ending.at(-1).bottom+30);
   const textWidth=width<700?width-14:Math.min(width-60,940);
   await file('ending',width<700?7:Math.floor((width-textWidth)/2),begin,textWidth,end-begin);
   console.log('ELLA_PREVIEW_PASS viewport='+width+' photo_aspect='+ratio.toFixed(5)+' natural='+info.natural.join('x')+' original_unzoomed=true last_paragraphs=2');
  }
 }finally{ws?.close();chrome.kill('SIGTERM')}
})().catch(e=>{console.error('ELLA_PRIVATE_PREVIEW_FAILED '+e.message);process.exitCode=1});