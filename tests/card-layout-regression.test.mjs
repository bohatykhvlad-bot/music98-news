import assert from 'node:assert/strict';
import fs from 'node:fs';
import {test} from 'node:test';

const page=fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8');

test('news and release cards retain square covers',()=>{
  assert.match(page,/\.card \.cover\{position:relative;aspect-ratio:1\/1/);
});

test('desktop tabs share the existing taller News card silhouette',()=>{
  assert.match(page,/@media \(min-width:641px\)\{\s*#newsGrid \.card,#relGrid \.card\{height:496px\}/);
  assert.match(page,/#newsGrid \.card p,#relGrid \.card p\{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:5;overflow:hidden\}/);
});

test('mobile text equalization remains mobile-only',()=>{
  assert.match(page,/window\.matchMedia\("\(max-width: 640px\)"\)\.matches/);
  assert.match(page,/if\(!window\.matchMedia\("\(max-width: 640px\)"\)\.matches \|\| !cards\.length\)/);
  assert.doesNotMatch(page,/const bodyHeight = card =>/);
});
