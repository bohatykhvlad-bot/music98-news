import test from 'node:test';
import assert from 'node:assert/strict';
import '../public/discover-palette.js';

const {extract,ambient}=globalThis.music98DiscoverPalette;
const pixels=(...blocks)=>new Uint8ClampedArray(blocks.flatMap(([rgb,count])=>Array.from({length:count},()=>[...rgb,255]).flat()));
const close=(a,b)=>Math.abs(a-b)<1e-6;

test('solid warm and vivid covers retain their colours without a cyan cast',()=>{
  for(const rgb of [[255,100,0],[138,206,0],[238,143,186],[10,23,58],[246,240,218]]){
    const result=extract(pixels([rgb,2304]));
    result.colours.forEach(c=>c.forEach((v,i)=>assert.ok(close(v,rgb[i]/255))));
    assert.deepEqual(result.mix,[0,0]);
  }
});

test('black, white and grey covers stay neutral, including broad tonal gradients',()=>{
  const covers=[pixels([[0,0,0],100]),pixels([[255,255,255],100]),
    pixels(...Array.from({length:256},(_,v)=>[[v,v,v],8]))];
  for(const cover of covers){
    const result=extract(cover);
    result.colours.forEach(([r,g,b])=>assert.ok(close(r,g)&&close(g,b)));
  }
});

test('a tiny saturated detail cannot replace a mostly neutral cover',()=>{
  const result=extract(pixels([[80,80,80],990],[[255,0,20],10]));
  result.colours.forEach(([r,g,b])=>assert.ok(close(r,g)&&close(g,b)));
  assert.deepEqual(result.mix,[0,0]);
});

test('meaningful accent colours keep their cover proportion instead of taking half the background',()=>{
  const result=extract(pixels([[80,80,80],900],[[255,30,0],100]));
  assert.ok(close(result.mix[0],.1));
  assert.ok(result.colours[1][0]>.99&&result.colours[1][1]<.13);
  assert.equal(result.mix[1],0);
});

test('vivid covers get more colour presence than muted covers, without amplifying tiny accents',()=>{
  const vivid=extract(pixels([[138,206,0],1000]));
  const muted=extract(pixels([[135,145,130],1000]));
  const tiny=extract(pixels([[135,145,130],990],[[138,206,0],10]));
  assert.ok(vivid.strength>muted.strength+.2);
  assert.ok(Math.abs(tiny.strength-muted.strength)<.02);
});

test('a broad vivid secondary area remains visible beside dark shadows and pale highlights',()=>{
  const result=extract(pixels([[18,18,41],400],[[200,188,178],320],[[32,133,210],280]));
  assert.ok(result.colours[1][2]>.8&&result.colours[1][0]<.15,'Blue belongs in the main blend');
  assert.ok(close(result.mix[0],280/680),'Colour coverage is preserved');
});

test('transparent pixels do not supply colours and empty images use a neutral fallback',()=>{
  const image=new Uint8ClampedArray([...pixels([[240,95,0],100]),...Array(900).fill([0,255,255,0]).flat()]);
  const result=extract(image);
  assert.ok(close(result.colours[0][0],240/255)&&close(result.colours[0][2],0));
  extract(new Uint8ClampedArray(16)).colours.forEach(([r,g,b])=>assert.ok(close(r,g)&&close(g,b)));
});

test('pale and white covers have visible depth when composited onto white',()=>{
  for(const rgb of [[255,255,255],[246,248,253],[212,232,234],[195,195,195]]){
    const cover=extract(pixels([rgb,100]));
    const original=structuredClone(cover);
    const result=ambient(cover);
    // Even at 30% texture opacity, the tone must remain visibly below white.
    const composite=result.colours[0].map(v=>1-.3*(1-v));
    assert.ok(composite.reduce((a,b)=>a+b)/3<.92);
    assert.ok(result.strength>=1);
    assert.deepEqual(cover,original,'Original palette is not mutated');
  }
});

test('deeper tones preserve neutral greys, pastel hue and vivid cover colours',()=>{
  let previous=-1;
  for(const value of [0,80,160,195,220,255]){
    const [r,g,b]=ambient(extract(pixels([[value,value,value],100]))).colours[0];
    assert.ok(close(r,g)&&close(g,b),'Grey cannot gain a colour cast');
    assert.ok(r>previous,'Lightness ordering must remain intact');previous=r;
  }
  for(const rgb of [[212,232,234],[238,198,218],[246,240,218]]){
    const tone=ambient(extract(pixels([rgb,100]))).colours[0];
    for(let i=0;i<3;i++)for(let j=i+1;j<3;j++){
      assert.equal(Math.sign(tone[i]-tone[j]),Math.sign(rgb[i]-rgb[j]));
    }
  }
  for(const rgb of [[255,100,0],[138,206,0],[32,133,210]]){
    const cover=extract(pixels([rgb,100])),tone=ambient(cover);
    tone.colours[0].forEach((v,i)=>assert.ok(close(v,cover.colours[0][i])));
  }
});
