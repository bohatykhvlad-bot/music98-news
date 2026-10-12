import fs from 'node:fs/promises';

const origin='https://music98.news';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const localIndex=await fs.readFile(new URL('../public/index.html',import.meta.url),'utf8');
const localApp=await fs.readFile(new URL('../public/discover-app.js',import.meta.url),'utf8');
const expected={
 centered:localIndex.includes('#tab-discover .discover-layout{width:min(100%,470px)'),
 heading:localIndex.includes('What should I listen to?'),
 subtitle:localIndex.includes('An easy way to find a new album.'),
 noLegacyGrid:!localIndex.includes('grid-template-columns:minmax(0,1fr) 660px'),
 button:localIndex.includes('>Find an album</button>'),
 appLabels:localApp.includes('"Find another album"')&&localApp.includes('"Find an album"'),
 noCache:localApp.includes('cache: "no-cache"'),
 nativeTab:localIndex.includes('id="tab-discover"'),
 nativeApple:localIndex.includes('render: albumId => appleEmbed(albumId)')
};
if(Object.values(expected).some(v=>!v)){
 console.error('DISCOVER_REPOSITORY_EXPECTED_FAIL',JSON.stringify(expected));
 process.exit(1);
}
async function fetchText(path){
 const u=origin+path+(path.includes('?')?'&':'?')+'audit='+Date.now();
 const r=await fetch(u,{redirect:'manual',signal:AbortSignal.timeout(15000),headers:{accept:'text/html,application/json,*/*','cache-control':'no-cache'}});
 return {status:r.status,body:await r.text()};
}
function validate(page,app,catalogText){
 const result={pageStatus:page.status,appStatus:app.status,catalogStatus:catalogText.status};
 result.centered=page.body.includes('#tab-discover .discover-layout{width:min(100%,470px)');
 result.heading=page.body.includes('What should I listen to?');
 result.subtitle=page.body.includes('An easy way to find a new album.');
 result.noLegacyGrid=!page.body.includes('grid-template-columns:minmax(0,1fr) 660px');
 result.nativeTab=page.body.includes('id="tab-discover"');
 result.nativeApple=page.body.includes('render: albumId => appleEmbed(albumId)');
 result.appLabels=app.body.includes('"Find another album"')&&app.body.includes('"Find an album"');
 result.noCache=app.body.includes('cache: "no-cache"');
 try{
  const c=JSON.parse(catalogText.body);
  result.schema=c.schema;result.artistCount=c.artists?.length||0;
  result.playableCount=c.artists?.filter(a=>a.albums?.length).length||0;
  result.albumCount=c.artists?.reduce((n,a)=>n+(a.albums?.length||0),0)||0;
  result.isSample=c.isSample;result.updatedAt=c.updatedAt;
 }catch(e){result.catalogParseError=String(e)}
 result.ok=page.status===200&&app.status===200&&catalogText.status===200&&result.centered&&result.heading&&result.subtitle&&result.noLegacyGrid&&result.nativeTab&&result.nativeApple&&result.appLabels&&result.noCache&&result.schema===2&&result.artistCount===500&&result.playableCount===500&&result.isSample===false;
 return result;
}
let last;
for(let attempt=1;attempt<=8;attempt++){
 try{
  const [page,app,catalog]=await Promise.all([fetchText('/discover'),fetchText('/discover-app.js'),fetchText('/data/discover-albums.json')]);
  last=validate(page,app,catalog);
  console.log('DISCOVER_LIVE_ATTEMPT',JSON.stringify({attempt,...last}));
  if(last.ok){console.log('DISCOVER_LIVE_AUDIT PASS');process.exit(0)}
 }catch(e){
  last={error:String(e)};
  console.warn('DISCOVER_LIVE_RETRY',JSON.stringify({attempt,...last}));
 }
 if(attempt<8)await sleep(12000);
}
console.error('DISCOVER_LIVE_AUDIT FAIL',JSON.stringify(last));
process.exit(1);
