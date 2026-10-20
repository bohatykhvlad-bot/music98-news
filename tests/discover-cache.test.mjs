import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker.js';

test('Discover scripts are reloaded from the deployed asset rather than a stale browser/CDN cache',async()=>{
  for(const path of ['/discover-ambient.js?v=old','/discover-palette.js','/discover-app.js']){
    let fetched;
    const request=new Request('https://music98.news'+path);
    const response=await worker.fetch(request,{ASSETS:{async fetch(assetRequest){
      fetched=assetRequest.url;
      return new Response('current deployed script',{headers:{
        'Content-Type':'application/javascript','Cache-Control':'public, max-age=3600'
      }});
    }}},{});
    assert.equal(fetched,request.url);
    assert.equal(await response.text(),'current deployed script');
    assert.match(response.headers.get('cache-control'),/no-store/);
    assert.equal(response.headers.get('cdn-cache-control'),'no-store');
    assert.equal(response.headers.get('cloudflare-cdn-cache-control'),'no-store');
  }
});
