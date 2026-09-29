import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app=readFileSync(new URL("../public/concerts-app.js",import.meta.url),"utf8");

test("map popup and right-side event rows use the same typography tokens",()=>{
  // The map no longer uses a compensating CSS zoom. Both lists inherit the
  // exact same custom properties, which removes geometry drift and rounding.
  assert.match(app,/--event-date-size:11\.5px/);
  assert.match(app,/--event-main-size:12\.5px/);
  assert.match(app,/--event-sub-size:11px/);
  assert.doesNotMatch(app,/zoom:calc\(1 \/ \.96\)/);
  assert.doesNotMatch(app,/--event-date-size:11\.04px/);
  assert.match(app,/\.event-date\{font-size:var\(--event-date-size\)/);
  assert.match(app,/\.venue-event-date\{font-size:var\(--event-date-size\)/);
  assert.match(app,/\.event-city\{display:block;font-size:var\(--event-main-size\)/);
  assert.match(app,/\.venue-event-name\{display:block;font-size:var\(--event-main-size\)/);
});

test("Buy Tickets uses the shared crisp pill press helper",()=>{
  assert.match(app,/a\.dataset\.m98Press=""; a\.dataset\.m98PressMode="pill"/);
  assert.match(app,/label\.className="buy-label m98-press-label"/);
  assert.match(app,/--m98-press-scale:\.92;--m98-press-font:13px;--m98-press-font-pressed:12px/);
  assert.match(app,/window\.Music98Press\?\.install\(this\.shadowRoot\)/);
  assert.doesNotMatch(app,/\.buy\.press/);
  assert.doesNotMatch(app,/a\.addEventListener\("pointerdown"/);
});

test("concert popup keeps fixed geometry, hubs return on zoom-out, and popup disappears",()=>{
  assert.match(app,/const POPUP_CITY_MIN_ZOOM=6\.2/);
  assert.doesNotMatch(app,/function popupLerp/);
  assert.match(app,/popup\.setMaxWidth\("286px"\)/);
  assert.match(app,/map\.on\("zoom",\(\)=>\{\n  applyMapMode\(\);\n  if\(!popup\) return;/);
  assert.match(app,/if\(map\.getZoom\(\)<POPUP_CITY_MIN_ZOOM\)\{ closePopup\(\); return; \}/);
  assert.match(app,/const showHubs=popular \|\| overview/);
  assert.match(app,/function showPopup\(e\)\{\n  if\(map\.getZoom\(\)<POPUP_CITY_MIN_ZOOM\) return;/);
});

test("More button stays centered and uses the shared press scale",()=>{
  assert.match(app,/\.tour-more\{width:fit-content;max-width:100%;[^}]*margin:5px auto 5px;[^}]*--m98-press-scale:\.96/);
  assert.doesNotMatch(app,/\.tour-more:active\{[^}]*transform:/);
});

test("Popular UI requires a complete Ticketmaster-eligible Top 30 before browser caching",()=>{
  assert.match(app,/Top 30 popular artists with upcoming Ticketmaster shows\./);
  assert.match(app,/music98:concert-popular:v6/);
  assert.match(app,/cached\?\.version==="popular-v4"/);
  assert.match(app,/ticketmaster_event_payload_gt_0/);
  assert.match(app,/cached\.artists\.length>=30/);
  assert.match(app,/cached\.artists\.every\(a=>a\?\.eventConfirmed===true && Number\(a\?\.shows\|\|0\)>0\)/);
  assert.match(app,/mode:"popular",v:"popular-v6"/);
});

test("map loading status is hidden while real statuses remain available",()=>{
  assert.match(app,/\^loading concerts\?\(\?: data\)\?\/i/);
});

test("world map uses permanent static hubs without a hotspot API read on load",()=>{
  assert.match(app,/const STATIC_HUBS=\[/);
  for(const name of ["Paris","Vienna","Kyiv","Dubai","Tokyo","Sacramento","Austin","Boston","Washington"]){
    assert.equal(app.includes('["'+name+'"'),true,name+" must be preloaded");
  }
  assert.match(app,/static:permanent\?1:0/);
  assert.match(app,/overview:\(permanent\|\|capital\|\|outsideMajor\|\|fallback\.has\(h\)\)\?1:0/);
  assert.doesNotMatch(app,/map\.on\("load",\(\)=>\{[\s\S]{0,300}loadHotspots\(\)/);
});

test("map exposes one reset control and removes legacy Overview/Fit controls",()=>{
  assert.match(app,/id=\\"resetMapBtn\\"[^>]*>−<\/button>/);
  assert.doesNotMatch(app,/id=\\"overviewBtn\\"/);
  assert.doesNotMatch(app,/id=\\"fitBtn\\"/);
  assert.match(app,/resetMapBtn\.addEventListener\("click"/);
  assert.match(app,/areaRequestSeq\+\+/);
  assert.match(app,/expandedKey=""/);
  assert.match(app,/radiusEl\.value="100"/);
  assert.match(app,/lastArea=null/);
  assert.match(app,/map\.easeTo\(\{center:\[12,39\],zoom:2\.15/);
});

test("Popular can reach 30 from only web-verified Ticketmaster supplements without prefetch",()=>{
  for(const name of ["Teddy Swims","Chris Stapleton","Twenty One Pilots","Luke Combs","Benson Boone"]){
    assert.equal(app.includes('name:"'+name+'"'),true,name+" supplement missing");
  }
  assert.match(app,/webVerified:true/);
  assert.match(app,/return out\.slice\(0,30\)\.map/);
  assert.doesNotMatch(app,/prefetchPopular\(popularArtists\)/);
});
