import assert from 'node:assert/strict';
import fs from 'node:fs';
import {test} from 'node:test';

const app=fs.readFileSync(new URL('../public/concerts-app.js',import.meta.url),'utf8');

test('Buy Tickets keeps its label unscaled and becomes 12px while pressed',()=>{
  assert.match(app,/\.buy\{[^}]*font-size:13px/);
  assert.match(app,/\.buy\.press\{font-size:12px\}/);
  assert.match(app,/\.buy\.press::before\{transform:scale\(\.92\)/);
  assert.doesNotMatch(app,/\.buy\.press\{[^}]*transform:/);
});

test('Ticketmaster rate limiting is distinguishable from an unavailable map',()=>{
  assert.match(app,/ticketmaster_temporarily_limited/);
  assert.match(app,/Please try again shortly/);
});

test('the initial world map renders static major-city hubs without a Worker scan',()=>{
  assert.match(app,/let hotspots=\[/);
  assert.doesNotMatch(app,/map\.on\("load",\(\)=>\{[\s\S]*?loadHotspots\(\);/);
  assert.doesNotMatch(app,/prefetchPopular\(popularArtists\);/);
});
