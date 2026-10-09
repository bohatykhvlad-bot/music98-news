import fs from 'node:fs/promises';

const origin='https://music98.news';
const stamp=Date.now();
const pages=['/', '/discover', '/releases', '/chart', '/data/discover-albums.json', '/discover-app.js'];
const checks=[];
const home=await fs.readFile(new URL('../public/index.html', import.meta.url), 'utf8');
const expected={
  darkArtist: home.includes('#tab-discover .discover-artist{font-size:17px;font-weight:600;color:var(--text)'),
  darkMeta: home.includes('font-size:13px;color:var(--text);margin:5px 0 0}'),
  siteButton: home.includes('#tab-discover #discoverFind{color:var(--text);'),
  noDuplicate: !((await fs.readFile(new URL('../public/discover-app.js', import.meta.url), 'utf8')).includes('status.textContent = album.artist +')),
  nativeTab:home.includes('id="tab-discover"')
};
console.log('REPOSITORY_EXPECTED',JSON.stringify(expected));
for(const path of pages){
 try{
  const u=origin+path+(path.includes('?')?'&':'?')+'audit='+stamp;
  const started=Date.now();
  const r=await fetch(u,{redirect:'manual',signal:AbortSignal.timeout(12000),headers:{'accept':'text/html,application/json,*/*'}});
  const body=await r.text();
  const result={path,status:r.status,ms:Date.now()-started,contentType:r.headers.get('content-type'),location:r.headers.get('location'),bytes:body.length,cache:r.headers.get('cf-cache-status'),age:r.headers.get('age')};
  if(path==='/data/discover-albums.json'){
   try{
    const j=JSON.parse(body);result.rankCount=j.rankingCount;result.artistCount=j.artists?.length;
    result.playableCount=j.artists?.filter(x=>x.albums?.length).length;
    result.albumCount=j.artists?.reduce((n,x)=>n+(x.albums?.length||0),0);
    result.updatedAt=j.updatedAt;result.isSample=j.isSample;
   }catch(e){result.parseError=String(e).slice(0,120)}
  }else if(path==='/discover-app.js'){
   result.noDuplicate=!body.includes('status.textContent = album.artist +');
   result.containsCachedFetcher=body.includes('/data/discover-albums.json');
  }else{
   result.containsDiscover=body.includes('id="tab-discover"');
   result.darkArtist=body.includes('#tab-discover .discover-artist{font-size:17px;font-weight:600;color:var(--text)');
   result.darkButton=body.includes('#tab-discover #discoverFind{color:var(--text)');
   result.correctRouteStartup=body.includes('if(initialSectionPath || initialSectionHash){');
   result.appleNative=body.includes('render: albumId => appleEmbed(albumId)');
  }
  checks.push(result);
  console.log('LIVE_RESULT',JSON.stringify(result));
 }catch(e){
  const x={path,error:String(e)};checks.push(x);console.log('LIVE_ERROR',JSON.stringify(x));
 }
}
const stale=checks.some(x=>x.path==='/discover'&& (!x.darkArtist||!x.darkButton||!x.correctRouteStartup));
const repoMismatch=Object.values(expected).some(x=>!x);
console.log('DISCOVER_LIVE_AUDIT',JSON.stringify({stale,repoMismatch,checks:checks.length,runDate:new Date().toISOString()}));
// Diagnostics remain successful to avoid failing unrelated deployments while
// Cloudflare rolls out an updated build. The output is authoritative.
