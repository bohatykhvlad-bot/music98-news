import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const start=html.indexOf('function warmRailCovers(rail){');
const end=html.indexOf('function syncRail(sel){',start);
assert.ok(start>0&&end>start,'Expected a dedicated image preloader immediately before syncRail');
const makeWarm=new Function('window',html.slice(start,end)+';return warmRailCovers;');

function fixture(mobile=false){
 const pics=Array.from({length:30},()=>({
  loading:'lazy',
  _railDecoding:false,
  decodeCalled:0,
  decode(){this.decodeCalled++;return Promise.resolve()}
 }));
 const cards=pics.map(img=>({querySelector:s=>s==='img.js-cover'?img:null,getBoundingClientRect:()=>({width:250})}));
 const rail={clientWidth:900,scrollLeft:0,children:cards,firstElementChild:cards[0]};
 const warm=makeWarm({matchMedia:()=>({matches:mobile})});
 return {pics,rail,warm};
}

test('first render warms more than two viewports, but not the entire article archive',()=>{
 const {pics,rail,warm}=fixture();
 warm(rail);
 const eager=pics.filter(x=>x.loading==='eager').length;
 assert.equal(eager,9,'900px viewport / 268px card, 2.6x runway is nine cards');
 assert.equal(pics.slice(9).every(x=>x.loading==='lazy'),true);
 assert.equal(pics.slice(0,9).every(x=>x.decodeCalled===1),true);
});
test('gliding to the right warms newly approaching cards without restarting earlier ones',()=>{
 const {pics,rail,warm}=fixture();
 warm(rail);
 rail.scrollLeft=700;
 warm(rail);
 assert.equal(pics.filter(x=>x.loading==='eager').length,12);
 assert.equal(pics.slice(0,9).every(x=>x.decodeCalled===1),true);
 assert.equal(pics.slice(9,12).every(x=>x.decodeCalled===1),true);
});
test('mobile column keeps native lazy-loading and avoids network waterfall',()=>{
 const {pics,rail,warm}=fixture(true);
 warm(rail);
 assert.equal(pics.filter(x=>x.loading==='eager').length,0);
 assert.equal(pics.filter(x=>x.decodeCalled).length,0);
});
test('prewarming is wired to scrolling and both rail renders',()=>{
 assert.match(html,/rail\.addEventListener\("scroll", \(\)=>\{schedule\(\);if\(typeof warmRailCovers==="function"\)warmRailCovers\(rail\);\}/);
 assert.match(html,/rail\._refreshRail\(\);\s*if\(typeof warmRailCovers==="function"\)warmRailCovers\(rail\)/);
 assert.match(html,/\$\("#newsGrid"\)\._coverWarmNext=0/);
 assert.match(html,/\$\("#relGrid"\)\._coverWarmNext=0/);
});
