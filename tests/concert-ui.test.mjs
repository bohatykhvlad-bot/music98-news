import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

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

test("Buy Tickets only fills cyan on hover and has no press animation",()=>{
  assert.match(app,/\.buy:hover::before\{background:var\(--accent\);border-color:var\(--accent\)\}/);
  assert.match(app,/\.buy:active,\.buy\.press\{transform:none\}/);
  assert.doesNotMatch(app,/\.buy\.press\{transform:scale/);
});

test("concert popup keeps fixed geometry and disappears below city zoom",()=>{
  assert.match(app,/const POPUP_CITY_MIN_ZOOM=6\.2/);
  assert.doesNotMatch(app,/function popupLerp/);
  assert.doesNotMatch(app,/const t=Math\.max\(0,Math\.min\(1,\(z-2\.3\)/);
  assert.match(app,/const width=singleEvent\?\(window\.matchMedia\("\(max-width:700px\)"\)\.matches\?"300px":"340px"\):"286px"/);
  assert.match(app,/popup\.setMaxWidth\(width\)/);
  assert.match(app,/new mapboxgl\.Popup\(\{offset:16,closeButton:true,maxWidth:"286px",focusAfterOpen:false\}\)/);
  assert.match(app,/const popupMaxWidth=window\.matchMedia\("\(max-width:700px\)"\)\.matches\?"300px":"340px"/);
  assert.match(app,/new mapboxgl\.Popup\(\{offset:16,closeButton:true,maxWidth:popupMaxWidth,focusAfterOpen:false\}\)/);
  assert.match(app,/map\.on\("zoom",\(\)=>\{\n  applyMapMode\(\);\n  if\(!popup\) return;\n  if\(map\.getZoom\(\)<POPUP_CITY_MIN_ZOOM\)\{ closePopup\(\); return; \}/);
  assert.match(app,/function showPopup\(e\)\{\n  if\(map\.getZoom\(\)<POPUP_CITY_MIN_ZOOM\) return;/);
  assert.match(app,/function showVenuePopup\(events\)\{\n  if\(!events\?\.length \|\| map\.getZoom\(\)<POPUP_CITY_MIN_ZOOM\) return;/);
});

test("Popular UI renders strict confirmed cache immediately without an explanatory banner",()=>{
  assert.match(app,/music98:concert-popular:v11/);
  assert.match(app,/cached\?\.version==="popular-v4"/);
  assert.match(app,/ticketmaster_event_payload_gt_0/);
  assert.match(app,/cached\.artists\.length>=30/);
  assert.match(app,/mode:"popular",v:"popular-v11"/);
  assert.match(app,/cached\?\.algorithm===POPULAR_ALGORITHM/);
  assert.match(app,/cached\?\.source==="spotify_monthly_listeners"/);
  assert.match(app,/sideSub\.textContent="";/);
  assert.doesNotMatch(app,/Popular artists with confirmed upcoming Ticketmaster shows\./);
});

test("map uses only the daily verified market snapshot",()=>{
  assert.doesNotMatch(app,/STATIC_GLOBAL_MARKETS/);
  assert.doesNotMatch(app,/STATIC_US_STATE_CAPITALS/);
  assert.match(app,/const MARKET_CACHE_KEY="music98:concert-markets:v7"/);
  assert.match(app,/mode:"markets",v:"concert-markets-v7"/);
  assert.match(app,/loadMarkets\(\);/);
  assert.match(app,/overview:\(h\.verified\|\|h\.pinned/);
});

test("map has no custom minus or floating map status and native zoom-out resets filters",()=>{
  assert.equal(app.includes("resetMapBtn"),false);
  assert.equal(app.includes("map-status"),false);
  assert.match(app,/function setStatus\(message\)\{ sideStatus\.textContent=/);
  assert.match(app,/\.mapboxgl-ctrl-zoom-out/);
  assert.match(app,/btn\.addEventListener\("click",resetMapFilters\)/);
  assert.equal(app.includes("radiusEl"),false);
});
test("map stays flat inside the one shared Concerts card",()=>{
  const css=JSON.parse(app.match(/^const CONCERTS_CSS=("(?:\\.|[^"\\])*");/m)[1]);
  const html=JSON.parse(app.match(/^const CONCERTS_HTML=("(?:\\.|[^"\\])*");/m)[1]);
  assert.match(css,/\.concerts-card\{[^}]*padding:16px;background:#fff;[^}]*box-shadow:var\(--shadow\)/);
  assert.match(css,/\.map-shell\{[^}]*background:#fff;box-shadow:none/);
  assert.match(html,/<div class="concerts-card">\s*<div class="controls">/);
  assert.match(html,/<div class="layout">\s*<section class="map-shell"/);
  assert.match(css,/#map\{position:absolute;inset:0;width:100%;height:100%;overflow:hidden;background:#fff\}/);
  assert.match(css,/#map \.mapboxgl-canvas\{[^}]*inset:0!important;[^}]*width:100%!important;height:100%!important/);
});

test("More button is optically centered inside the expanded event block",()=>{
  assert.match(app,/\.tour-card\.open \.tour-events\{[^}]*padding:2px 9px 10px/);
  assert.match(app,/\.event-link\{[^}]*margin:4px 0/);
  assert.match(app,/\.tour-more\{[^}]*margin:12px auto 2px/);
  const encoded=app.match(/^const CONCERTS_CSS=("(?:\\.|[^"\\])*");/m);
  assert.ok(encoded,"concert stylesheet must be present");
  const css=JSON.parse(encoded[1]);
  assert.match(css,/\.tour-events\{[^}]*transition:max-height \.28s cubic-bezier\(\.3,\.7,\.4,1\),opacity \.18s ease/);
  assert.doesNotMatch(css,/padding \.28s cubic-bezier/);
});

test("Buy Tickets uses the shared site press binder",()=>{
  assert.match(app,/typeof window\.music98PillPress==="function"/);
  assert.doesNotMatch(app,/a\.addEventListener\("pointerdown"/);
});


test("concert snapshot requests bypass browser cache and Popular never renders a partial list",()=>{
  assert.match(app,/cache:"no-store"/);
  assert.match(app,/signal:controller\.signal/);
  assert.match(app,/cached\.artists\.length>=30/);
  assert.match(app,/Array\.isArray\(data\.artists\) && data\.artists\.length>=30/);
  assert.match(app,/popularArtists=data\.artists\.slice\(0,30\)/);
  assert.match(app,/if\(popularArtists\.length>=30\)/);
  assert.match(app,/sideEmpty\.textContent=data\?\.warming \? "Updating popular artists\.\.\."/);
});


test("concert pills match top-nav timing and use equal-width segments",()=>{
  assert.match(app,/\.side-tabs\{\\n  width:244px;max-width:100%;display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(app,/\.side-tab\{\\n  width:100%;min-width:0;max-width:none/);
  assert.match(app,/\.side-tab\{[\s\S]*?transition:\.18s;/);
  assert.match(app,/\.side-tab\{[\s\S]*?display:inline-flex;align-items:center;justify-content:center;text-align:center;text-indent:var\(--ink-x,0px\);line-height:1;text-box:trim-both cap alphabetic/);
  assert.match(app,/function pillInkShift\(el\)/);
  assert.match(app,/Math\.round\(raw\)/);
  assert.match(app,/\.search-area-btn:active,\.side-tab:active,\.map-mode-btn:active\{transform:none\}/);
  assert.match(app,/\.map-tool-btn:active\{transform:none!important\}/);
  assert.doesNotMatch(app,/\.side-tab:active[^}]*scale\(/);
  assert.doesNotMatch(app,/\.map-mode-btn:active[^}]*scale\(/);
  assert.doesNotMatch(app,/\.search-area-btn\{[^}]*translate:-50%/);
  assert.match(app,/getImageData\(/);
  assert.match(app,/\.tour-more\{[^}]*display:grid;place-items:center;text-align:center/);
  assert.match(app,/\.map-mode-btn\{[^}]*display:grid;place-items:center;text-align:center/);
  assert.match(app,/\.side-tabs\{[\s\S]*?margin:0 0 10px/);
  assert.match(app,/\.map-mode-switch\{[^}]*display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(app,/\.map-mode-btn\{width:100%;[^}]*transition:background \.18s ease,border-color \.18s ease,color \.18s ease/);
  assert.match(app,/@media\(hover:hover\) and \(pointer:fine\)\{\.nav-btn:hover:not\(\.active\)\{background:var\(--bg2\);color:var\(--text\)\}\}/);
  assert.doesNotMatch(app,/\.nav-btn:active\{[^}]*transform:/);
  assert.match(app,/\.nav-btn\{width:100%;[^}]*transition:\.18s;[^}]*top:\.5px/);
  assert.match(app,/@media\(max-width:700px\)\{[\s\S]*?\.nav-btn\{flex:1;height:38px;padding:0 8px;font-size:13px;justify-content:center;top:0\}/);
});
test("artist subtitle shares the exact left edge with artist name",()=>{
  assert.match(app,/\.tour-copy\{[^}]*width:100%;padding:0;margin:0;display:grid/);
  assert.match(app,/\.tour-name\{[^}]*width:100%;margin:0;padding:0;text-indent:0;text-align:left/);
  assert.match(app,/\.tour-meta\{[^}]*width:100%;margin:3px 0 0;padding:0;text-indent:0;text-align:left/);
});

test("warming verified market pins merge with the last complete map",()=>{
  assert.match(app,/data\.complete===false[\s\S]*mergeHotspots\(\[\.\.\.\(hotspots\|\|\[\]\),\.\.\.data\.markets\]\)/);
  assert.match(app,/if\(data\.complete!==false\) writeMarketCache\(data\)/);
});


test("artist mode hides global markets and keeps only artist markers at every zoom",()=>{
  assert.match(app,/\["artist-points","artist-hit"\]\.forEach\(id=>setLayerVisible\(id,artist\)\)/);
  assert.match(app,/\["clusters","cluster-hit","event-points","event-hit","event-labels"\]\.forEach\(id=>setLayerVisible\(id,showArea\)\)/);
  assert.match(app,/const overviewZoom=map\.getZoom\(\)<4\.7/);
  assert.match(app,/const showHubs=activeMode==="popular" \|\| \(area && overviewZoom\)/);
  assert.match(app,/const showArea=area && !overviewZoom/);
  assert.doesNotMatch(app,/artist && !overviewZoom/);
});

test("verified market marker layer is zoom-stable for Rome and every other country",()=>{
  assert.match(app,/id:"capital-points",type:"symbol",source:"hubs",minzoom:0,maxzoom:18/);
  assert.doesNotMatch(app,/id:"capital-points"[^\n]*filter:/);
  assert.match(app,/id:"city-major-points"[\s\S]*?layout:\{"visibility":"none"/);
  assert.match(app,/id:"city-mid-points"[\s\S]*?layout:\{"visibility":"none"/);
  assert.match(app,/id:"city-all-points"[\s\S]*?layout:\{"visibility":"none"/);
  assert.match(app,/\["city-major-points","city-mid-points","city-all-points"\]\.forEach\(id=>setLayerVisible\(id,false\)\)/);
});


test("More only fills cyan on hover and has no press animation", async () => {
  const fs = await import("node:fs");
  const app = fs.readFileSync(new URL("../public/concerts-app.js", import.meta.url), "utf8");
  assert.match(app,/\.tour-more:hover\{background:var\(--accent\);border-color:var\(--accent\);color:#03282b\}/);
  assert.match(app,/\.tour-more:active\{transform:none\}/);
  assert.doesNotMatch(app,/\.tour-more:active\{transform:scale/);
});


test("Popular warming state polls only the precomputed KV snapshot",()=>{
  assert.match(app,/function schedulePopularWarmRetry\(\)/);
  assert.match(app,/loadPopular\(true\)/);
  assert.match(app,/if\(data\?\.warming\) schedulePopularWarmRetry\(\)/);
  assert.match(app,/POPULAR_ALGORITHM="rank-ordered-event-query-v2"/);
  assert.match(app,/mode:"popular",v:"popular-v11"/);
});


test("map mode toggle has no duplicate outer capsule and no resting compositor transform",()=>{
  assert.match(app,/\.map-mode-switch\{[^}]*border:0;[^}]*background:transparent;box-shadow:none/);
  assert.match(app,/\.map-mode-btn\{[^}]*border:1px solid var\(--line\);[^}]*background-color:#fff/);
  assert.match(app,/\.map-mode-btn\.active\{background-color:var\(--accent\);border-color:var\(--accent\);color:#03282b\}/);
  assert.match(app,/\.map-mode-btn:active\{transform:none\}/);
  assert.doesNotMatch(app,/\.radius-trigger,\.radius-option,\.search-area-btn,\.side-tab,\.map-mode-btn\{/);
});


test("map interface pills stay on the normal text raster in their resting state",()=>{
  assert.equal(app.includes(".action{"),false);
  assert.equal(app.includes(".radius-trigger{"),false);
  assert.equal(app.includes(".radius-option{"),false);
  assert.doesNotMatch(app,/\.search-area-btn,\.side-tab\{[^}]*will-change:transform/);
  assert.doesNotMatch(app,/\.search-area-btn,\.side-tab\{[^}]*backface-visibility:hidden/);
  assert.doesNotMatch(app,/\.search-area-btn,\.side-tab\{[^}]*transform:translateZ/);
  assert.doesNotMatch(app,/\.map-mode-btn\{[^}]*will-change:transform/);
});

test("inactive map toggles use the shared gray hover highlight",()=>{
  assert.match(app,/\.side-tab:hover:not\(\.active\)\{background:var\(--bg2\);color:var\(--text\)\}/);
  assert.match(app,/\.map-mode-btn\{[^}]*background-color:#fff/);
  assert.match(app,/\.map-mode-btn:hover:not\(\.active\)\{background-color:var\(--bg2\);color:var\(--text\)\}/);
  assert.match(app,/\.side-tab\.active\{background:var\(--accent\);color:#03282b\}/);
  assert.match(app,/\.map-mode-btn\.active\{background-color:var\(--accent\);border-color:var\(--accent\);color:#03282b\}/);
});


test("manually moving the map offers Search this area from Popular, Near me and expanded artist",()=>{
  const move=app.slice(app.indexOf('map.on("moveend",()=>{'),app.indexOf('function resizeMapStable()'));
  assert.match(move,/!\["popular","nearby","artist","artist-area"\]\.includes\(activeMode\)/);
  assert.match(move,/mode:activeMode==="artist" \? "artist-area" : activeMode/);
  assert.match(move,/searchAreaBtn\.hidden=false/);
  const click=app.slice(app.indexOf('searchAreaBtn.addEventListener("click",()=>{'),app.indexOf('search.addEventListener("input",()=>{'));
  assert.match(click,/pending\.mode==="artist-area" && artistContext/);
  assert.match(click,/loadArea\(pending\.lat,pending\.lng,"Map area",\{fit:false,radius:pending\.radius,force:true\}\)/);
});

test("mobile Search this area stays at the top right and clears artist mode tabs",()=>{
  assert.match(app,/@media\(max-width:700px\)\{[\s\S]*?\.search-area-btn\{left:auto;right:10px;top:10px;bottom:auto;margin-inline:0;height:40px\}/);
  assert.match(app,/\.map-shell\.artist-context \.search-area-btn\{top:60px\}/);
  assert.doesNotMatch(app,/@media\(max-width:700px\)\{[\s\S]*?\.search-area-btn\{bottom:60px/);
});


test("direct /concerts is worker-first, no-store and rewrites index metadata without deleting legacy asset", async()=>{
  const fs=await import("node:fs");
  const worker=fs.readFileSync(new URL("../worker.js",import.meta.url),"utf8");
  const wrangler=fs.readFileSync(new URL("../wrangler.toml",import.meta.url),"utf8");
  const headers=fs.readFileSync(new URL("../public/_headers",import.meta.url),"utf8");
  const legacy=fs.readFileSync(new URL("../public/concerts.html",import.meta.url),"utf8");
  assert.match(wrangler,/run_worker_first = \[[^\]]*"\/concerts"[^\]]*"\/concerts-app\.js"/);
  assert.match(worker,/path === "\/concerts"[\s\S]*serveConcertsShell\(request, env\)/);
  assert.match(worker,/X-M98-Concerts-Shell","index"/);
  assert.match(worker,/Concerts Near You - music98\.news/);
  assert.match(worker,/https:\/\/music98\.news\/concerts/);
  assert.match(headers,/\/concerts\n  Cache-Control: no-store/);
  assert.ok(legacy.includes("Concerts Near You - music98.news"));
});


test("mobile initial map opens at world overview while desktop camera stays unchanged",()=>{
  assert.match(app,/const compactWorldView=window\.matchMedia\("\(max-width:700px\)"\)\.matches/);
  assert.match(app,/center:compactWorldView \? \[5,18\] : \[8,27\]/);
  assert.match(app,/zoom:compactWorldView \? 0 : 1\.55/);
});
test("Belfast is not mapped to the dead ND pseudo-country",()=>{
  assert.doesNotMatch(app,/ND:\["belfast"\]/);
});
test("popup retains the exact event artwork and has only Buy Tickets",()=>{
  const section=app.slice(app.indexOf("function popupContent(e){"),app.indexOf("\nfunction eventsAtSameVenue("));
  assert.ok(section.includes('applyConcertArt(img,originalArt,"event")'));
  assert.match(section,/grid\.append\(img,main\)/);
  assert.doesNotMatch(section,/popupImage/);
  assert.match(section,/label\.textContent="Buy Tickets"/);
  assert.doesNotMatch(section,/ticketOptions|ticket-alt|alternatives\.forEach/);
  const encoded=app.match(/^const CONCERTS_CSS=("(?:\\.|[^"\\])*");/m);
  const css=JSON.parse(encoded[1]);
  assert.doesNotMatch(css,/\.ticket-alt/);
});

test("concert popup dynamically assembles full photo and event details, including mobile",()=>{
  // Execute the real popup factory, not just a source-code substring check.
  // The previous regression left escaped \\n in a // comment, swallowing
  // grid.append(img,main) and body.appendChild(grid) while text tests passed.
  const start=app.indexOf("function popupContent(e){");
  const end=app.indexOf("\nfunction eventsAtSameVenue(",start);
  assert.ok(start>=0&&end>start);
  const factory=app.slice(start,end);
  assert.match(factory,/\/\/ Presentation-only photo:[^\n]*\n\s+grid\.append\(img,main\);\n\s+body\.appendChild\(grid\);/);
  const constructed=[];
  const doc={createElement(tag){
    const node={tag,className:"",children:[],dataset:{},textContent:"",
      append(...children){this.children.push(...children);},
      appendChild(child){this.children.push(child);return child;}};
    constructed.push(node);return node;
  }};
  const artCalls=[];
  const fn=runInNewContext(factory+"\npopupContent",{
    document:doc,
    applyConcertArt:(img,original,preset)=>artCalls.push({img,original,preset}),
    fmtDate:()=>"24 Oct 2026",
    locationLine:()=>"Austin, Texas, USA",
    queuePillInkCenter:()=>{},
    window:{music98PillPress:null}
  });
  for(const url of ["https://tickets.example/event",null]){
    const before=artCalls.length;
    const result=fn({artist:"Formula 1",venue:"Levi's Stadium",image:"https://photos.example/original.jpg",url,time:"08:00"});
    assert.equal(result.className,"pop-card");
    assert.equal(result.children.length,1);
    const body=result.children[0];
    assert.equal(body.className,"pop-body");
    assert.equal(body.children.length,url?2:1);
    const grid=body.children[0];
    assert.equal(grid.className,"pop-grid");
    assert.equal(grid.children.length,2);
    const [img,main]=grid.children;
    assert.equal(img.className,"pop-thumb");
    assert.equal(img.width,138);
    assert.equal(img.height,138);
    assert.equal(main.className,"pop-main");
    assert.deepEqual(main.children.map(c=>c.className),["pop-title","pop-meta","pop-meta pop-venue","pop-meta pop-location"]);
    assert.deepEqual(main.children.map(c=>c.textContent),["Formula 1","24 Oct 2026 · 08:00","Levi's Stadium","Austin, Texas, USA"]);
    assert.equal(artCalls.length,before+1);
    assert.equal(artCalls[before].preset,"event");
    assert.equal(artCalls[before].original,"https://photos.example/original.jpg");
    if(url){
      const actions=body.children[1];
      assert.equal(actions.className,"pop-actions");
      assert.equal(actions.children[0].className,"buy");
      assert.equal(actions.children[0].href,url);
      assert.equal(actions.children[0].children[0].textContent,"Buy Tickets");
    }
  }
  const css=JSON.parse(app.match(/^const CONCERTS_CSS=("(?:\\.|[^"\\])*");/m)[1]);
  assert.match(css,/\.pop-card \.pop-grid\{display:grid;grid-template-columns:138px minmax\(0,1fr\)/);
  assert.match(css,/\.pop-card \.pop-thumb\{display:block;width:138px;height:138px;aspect-ratio:1/);
  assert.match(css,/@media\(max-width:640px\)\{\s*\.pop-card \.pop-body\{padding:12px 12px 14px\}\s*\.pop-card \.pop-grid\{grid-template-columns:100px minmax\(0,1fr\)/);
  assert.match(css,/\.pop-card \.pop-thumb\{width:100px;height:100px;border-radius:10px\}/);
  assert.match(app,/singleEvent\?\(window\.matchMedia\("\(max-width:700px\)"\)\.matches\?"300px":"340px"\)/);
});

test("concert controls keep only search and Popular/Near me",()=>{
  assert.equal(app.includes("locateBtn"),false);
  assert.equal(app.includes("radiusMenu"),false);
  const popularAt=app.indexOf("popularTab");
  const nearAt=app.indexOf("nearTab");
  assert.ok(popularAt>=0 && nearAt>popularAt);
  assert.match(app,/\.side-tabs\{[\s\S]*pointer-events:auto/);
  assert.match(app,/\.side-tab\{[\s\S]*display:inline-flex;align-items:center;justify-content:center[\s\S]*text-box:trim-both cap alphabetic/);
});

test("Near me uses resilient current-position fallbacks",()=>{
  assert.match(app,/nearTab\.addEventListener\("click",requestLocation\)/);
  assert.match(app,/window\.isSecureContext/);
  assert.match(app,/enableHighAccuracy:false,timeout:12000,maximumAge:120000/);
  assert.match(app,/enableHighAccuracy:true,timeout:18000,maximumAge:0/);
  assert.match(app,/navigator\.geolocation\.watchPosition/);
  assert.match(app,/DEFAULT_RADIUS_KM=100/);
  assert.doesNotMatch(app,/navigator\.permissions/);
});

test("verified market clicks reuse geographic verification scope",()=>{
  assert.match(app,/radiusKm:Number\(h\.radiusKm\|\|0\)/);
  assert.match(app,/Number\(f\.properties\?\.tier\)===2\?45:60/);
  assert.doesNotMatch(app,/await getPayload\(\{city:opts\.city/);
  assert.match(app,/stateCode:opts\.stateCode\|\|\"\"/);
});

test("venue popup groups strict venue identity, never coordinate proximity",()=>{
  assert.match(app,/if\(tid && eid\) return eid===tid/);
  assert.doesNotMatch(app,/sameCoords=.*0\.0008/);
});

test("visible concert clicks retain existing zoom and reject stale low-zoom callbacks",()=>{
  const source=app.slice(app.indexOf("function focusEventGroupOnMap(events){"),app.indexOf("\nfunction stabilizeArtistCoordinates(",app.indexOf("function focusEventGroupOnMap(events){")));
  const events=[{lat:29.42,lng:-98.49}];
  const actions=[];
  const runAtZoom=(zoom,mode="nearby")=>{
    const calls=[];
    const ctx={
      map:{getZoom:()=>zoom,easeTo:opts=>calls.push({type:"move",opts})},
      POPUP_CITY_MIN_ZOOM:6.2,activeMode:mode,areaRequestSeq:7,userMoving:false,
      showPopup:e=>calls.push({type:"show",event:e}),
      showVenuePopup:e=>calls.push({type:"venue",events:e}),
      setTimeout:fn=>calls.push({type:"scheduled",fn})
    };
    const fn=runInNewContext(source+"\nfocusEventGroupOnMap",ctx);
    fn(events);
    return {calls,ctx};
  };
  const close=runAtZoom(12.4);
  assert.deepEqual(close.calls.map(c=>c.type),["show"],"high zoom cannot recenter or zoom out");
  const far=runAtZoom(4);
  assert.equal(far.calls[0].opts.zoom,6.3);
  far.calls[1].fn();
  assert.deepEqual(far.calls.map(c=>c.type),["move","scheduled","show"]);
  const stale=runAtZoom(4);
  stale.ctx.areaRequestSeq=8;
  stale.calls[1].fn();
  assert.equal(stale.calls.length,2,"old callback must not reopen a popup");
  assert.match(app,/focusEventGroupOnMap\(group\)/);
  assert.match(app,/b\.addEventListener\("click",\(\)=>focusEventOnMap\(ev\)\)/);
});

test("map popup stays above the desktop Search this area pill with a 14px gap",()=>{
  const source=app.slice(app.indexOf("function popupPanShift("),app.indexOf("\nfunction ensurePopupFullyVisible("));
  const shift=runInNewContext(source+"\npopupPanShift");
  const map={left:0,right:800,top:0,bottom:420,width:800,height:420};
  const pill={left:320,right:480,top:368,bottom:404,width:160,height:36};
  const popup={left:260,right:600,top:142,bottom:420,width:340,height:278};
  const p=shift(map,popup,pill);
  assert.equal(p.shiftY,368-14-420);
  assert.equal(popup.bottom+p.shiftY, pill.top-14);
  assert.equal(p.shiftX,-30,"nearly centered popup aligns to pill without zoom");
  const unclipped=shift(map,{left:330,right:670,top:30,bottom:310,width:340,height:280},pill);
  assert.equal(unclipped.shiftY,0,"already visible popups should not pan");
  const phoneMap={left:0,right:390,top:0,bottom:360,width:390,height:360};
  const phonePill={left:240,right:380,top:10,bottom:50,width:140,height:40};
  const phonePopup={left:100,right:380,top:10,bottom:250,width:280,height:240};
  const mobile=shift(phoneMap,phonePopup,phonePill);
  assert.equal(phonePopup.top+mobile.shiftY,64,"mobile popup clears the top-right pill");
  assert.match(app,/map\.easeTo\(\{center:newCenter,duration:280\}\)/,"visibility pan never changes zoom");
});

test("artist dates have TTL, partial-result feedback and stale-response guard",()=>{
  assert.match(app,/ARTIST_EVENT_CACHE_MS=5\*60\*1000/);
  assert.match(app,/Date\.now\(\)-cached\.at<ARTIST_EVENT_CACHE_MS/);
  assert.match(app,/partial:!!payload\?\.partial/);
  assert.match(app,/requestId!==areaRequestSeq \|\| expandedKey!==key \|\| activeMode!==\"artist\"/);
  assert.match(app,/Showing \"\+events\.length\+\" loaded dates of \"\+result\.total/);
});

test("concert feedback and keyboard focus stay in the results panel",()=>{
  assert.ok(app.includes("sideStatus"));
  assert.ok(app.includes("aria-live"));
  assert.match(app,/function setStatus\(message\)\{ sideStatus\.textContent=/);
  assert.match(app,/:focus-visible/);
  assert.match(app,/row\.setAttribute\("aria-expanded","false"\)/);
});
test("local search suggestions render before remote requests finish",()=>{
  assert.match(app,/if\(localArtists\.length \|\| localHubs\.length\) renderSuggestions\(\[\],localArtists,localHubs\)/);
  assert.match(app,/setTimeout\(\(\)=>controller\.abort\(\),8000\)/);
  assert.match(app,/setTimeout\(\(\)=>controller\.abort\(\),15000\)/);
});

test("map failure cannot block Popular/data boot",()=>{
  assert.match(app,/function createMapFallback\(container\)/);
  assert.match(app,/function bootConcertData\(\)/);
  assert.match(app,/bootConcertData\(\);/);
  assert.ok(app.includes("mapFallback"));
  assert.doesNotMatch(app,/querySelector\("#status"\)/);
});
test("partial area loads are labeled instead of looking complete",()=>{
  assert.match(app,/data\.partial && total>events\.length/);
  assert.ok(app.includes("Showing the soonest upcoming concerts in this area."));
  assert.doesNotMatch(app,/loaded concerts of/);
});

test("map failure offers an explicit retry without replacing fallback controls",()=>{
  assert.ok(app.includes("Retry map"));
  assert.match(app,/querySelector\("#mapRetry"\)\?\.addEventListener\("click",\(\)=>location\.reload\(\)\)/);
  assert.ok(app.includes("mapFallbackText"));
});

test("new search input aborts obsolete geocoding while keeping local matches immediate",()=>{
  assert.match(app,/let suggestGeocodeAbort=null/);
  assert.match(app,/suggestGeocodeAbort\?\.abort\(\)/);
  assert.match(app,/geocode\(q,true,geocodeAbort\.signal\)/);
  assert.match(app,/externalSignal\.addEventListener\("abort",abort/);
});

test("coordinate-less real concerts are repaired for the map and never become surprise external clicks",()=>{
  assert.match(app,/function toGeoJSON\(events\)[\s\S]*Number\.isFinite\(lat\)&&Number\.isFinite\(lng\)/);
  assert.match(app,/async function hydrateArtistMapCoordinates\(events\)/);
  assert.match(app,/if\(validMapEvents\(\[e\]\)\.length\)/);
  assert.doesNotMatch(app,/window\.open\(e\.url,\"_blank\",\"noopener\"\)/);
  assert.match(app,/return !mappable \|\| distanceKm/);
});



test("Search this area uses cyan hover fill and never transforms its text",()=>{
  assert.match(app,/\.search-area-btn:hover\{background:var\(--accent\);border-color:var\(--accent\);color:#03282b\}/);
  assert.match(app,/\.search-area-btn\{[^}]*text-indent:var\(--ink-x,0px\);transform:none;transition:background \.18s ease,border-color \.18s ease,color \.18s ease/);
  assert.doesNotMatch(app,/\.search-area-btn\{[^}]*transition:transform/);
  assert.match(app,/\.side-tab,\.map-mode-btn,\.search-area-btn,\.tour-more,\.buy-label/);
});

test("Near me clears Popular rows and shows one status when location is denied",()=>{
  assert.match(app,/async function requestLocation\(\)[\s\S]*nearbyEvents=\[\];[\s\S]*toursEl\.textContent="";[\s\S]*sideEmpty\.textContent="Getting your location\.\.\.";[\s\S]*setEventData\(\[\],0\)/);
  assert.match(app,/if\(!position\)\{[\s\S]*sideSub\.textContent=locationErrorText\(lastError\);[\s\S]*sideEmpty\.hidden=true;[\s\S]*setEventData\(\[\],0\)/);
});

test("artist events recover missing city coordinates for map markers and never auto-open Ticketmaster",()=>{
  assert.match(app,/async function hydrateArtistMapCoordinates\(events\)/);
  assert.match(app,/hotspotPointForEvent\(sample\) \|\| artistLocationCache\.get\(key\)/);
  assert.match(app,/await geocode\(query,false\)/);
  assert.match(app,/events=await hydrateArtistMapCoordinates\(events\)/);
  assert.doesNotMatch(app,/window\.open\(e\.url/);
  assert.match(app,/setStatus\("Map location is unavailable for this venue\."\)/);
});

test("failed area loads clear stale event markers",()=>{
  assert.match(app,/catch\(err\)\{[\s\S]*nearbyEvents=\[\];[\s\S]*nearbyTotal=0;[\s\S]*setEventData\(\[\],0\)/);
});


test("map and sidebar remain flat inside one elevated white card",()=>{
  const css=JSON.parse(app.match(/^const CONCERTS_CSS=("(?:\\.|[^"\\])*");/m)[1]);
  const html=JSON.parse(app.match(/^const CONCERTS_HTML=("(?:\\.|[^"\\])*");/m)[1]);
  assert.match(css,/\.concerts-card\{[^}]*box-shadow:var\(--shadow\)/);
  assert.match(css,/\.map-shell\{[^}]*box-shadow:none/);
  assert.match(css,/\.side\{[^}]*box-shadow:none;overflow:hidden/);
  assert.equal((html.match(/class="concerts-card"/g)||[]).length,1);
  assert.doesNotMatch(html,/class="panel-card"/);
  assert.match(html,/<\/section>\s*<aside class="side">/);
  assert.match(css,/\.map-shell\{[^}]*border:0/);
  assert.match(css,/\.side\{border:0/);
  assert.match(css,/\.tour-card\.open\{[^}]*box-shadow:none/);
  assert.match(css,/\.disclosure\{margin:0;height:12px;padding:0 4px 0 17px;display:flex;align-items:flex-end[^}]*top:2px/);
});

test("Concert status, ranking and Ticketmaster disclosure share the left alignment",()=>{
  const encoded=app.match(/^const CONCERTS_CSS=("(?:\\.|[^"\\])*");/m);
  assert.ok(encoded);
  const css=JSON.parse(encoded[1]);
  const status=css.match(/\.side-status\{[^}]*margin:0 4px 8px (\d+)px/);
  const disclosure=css.match(/\.disclosure\{[^}]*padding:0 4px 0 (\d+)px/);
  assert.ok(status && disclosure,"aligned status and disclosure CSS are required");
  assert.equal(Number(status[1]),Number(disclosure[1]));
  assert.equal(Number(status[1]),17);
  assert.match(css,/\.tour-row\{[^}]*grid-template-columns:24px 56px minmax\(0,1fr\) 18px;gap:8px;align-items:center;/);
  assert.match(css,/\.tour-rank\{font-weight:800;font-size:11\.5px/);
});

test("expanded artist view shows one summary line, not a duplicate subtitle",()=>{
  assert.doesNotMatch(app,/sideSub\.textContent="Upcoming concerts for "/);
  assert.match(app,/sideSub\.textContent="";[\s\S]*setStatus\(result\.partial/);
  assert.match(app,/events\.length\+" upcoming concerts · "\+item\.name/);
});


test("flat Concerts sidebar keeps unchanged rank and footer alignment",()=>{
  const css=JSON.parse(app.match(/^const CONCERTS_CSS=("(?:\\.|[^"\\])*");/m)[1]);
  assert.match(css,/\\.tours\\{[^}]*scrollbar-gutter:stable;margin:0;padding:0 0 6px 0;overscroll-behavior:contain\\}/);
  assert.doesNotMatch(css,/\\.tours\\{[^}]*margin:-\\d+px/);
  assert.match(css,/\\.side\\{[^}]*padding:13px 13px 4px;height:420px/);
  assert.match(css,/\\.side-sub\\{[^}]*margin:0 4px 10px 17px/);
  assert.match(css,/\\.side-status\\{[^}]*margin:0 4px 8px 17px/);
  assert.match(css,/\\.side-empty\\{[^}]*padding:12px 5px 12px 17px/);
  assert.match(css,/\\.disclosure\\{[^}]*margin:0;height:12px;padding:0 4px 0 17px/);
  assert.match(css,/\\.tour-card\\.open\\{\\s*background:#fff;box-shadow:none/);
  assert.match(css,/\\.tour-events\\{[^}]*padding:0 9px;background:#fff/);
  assert.match(css,/\\.tour-card\\.open \\.tour-events\\{[^}]*padding:2px 9px 10px/);
  assert.match(css,/\\.event-link\\{[^}]*width:100%;[^}]*margin:4px 0/);
  assert.match(css,/@media\\(max-width:700px\\)\\{[\\s\\S]*?\\.tours\\{overflow:visible;margin:0;padding:0;scrollbar-gutter:auto\\}/);
});
test("Concerts page retains consistent desktop and mobile alignment",()=>{
  const css=JSON.parse(app.match(/^const CONCERTS_CSS=("(?:\\.|[^"\\])*");/m)[1]);
  assert.match(css,/\.layout\{display:grid;grid-template-columns:minmax\(0,1fr\) 370px;gap:16px/);
  assert.match(css,/\.map-shell\{[^}]*height:420px;[^}]*border-radius:var\(--r\)/);
  assert.match(css,/\.side\{[^}]*border-radius:var\(--r\)/);
  assert.match(css,/\.side-tabs\{[^}]*align-self:center/);
  assert.match(css,/\.map-mode-switch\{[^}]*left:14px;top:14px/);
  assert.match(css,/@media\(max-width:900px\)\{\s*\.layout\{grid-template-columns:1fr\}/);
  assert.match(css,/@media\(max-width:700px\)\{[\s\S]*?\.wrap\{padding:18px 14px 36px\}/);
  assert.match(css,/@media\(max-width:700px\)\{[\s\S]*?\.map-mode-switch\{left:10px;top:10px/);
  assert.match(css,/@media\(max-width:700px\)\{[\s\S]*?\.search-area-btn\{left:auto;right:10px;top:10px/);
  assert.match(css,/@media\(max-width:640px\)\{\s*\.tour-row\{height:62px;min-height:62px/);
});
test("gray concert artist header never changes dimensions between hover and expanded states",()=>{
  const css=JSON.parse(app.match(/^const CONCERTS_CSS=("(?:\\.|[^"\\])*");/m)[1]);
  assert.match(css,/--event-radius:14px/);
  assert.match(css,/\.tour-card\{[^}]*border:0;border-radius:var\(--event-radius\);overflow:hidden;background:transparent/);
  assert.match(css,/\.tour-card\{[^}]*transition:box-shadow \.2s ease/);
  assert.match(css,/\.tour-card\.open\{\s*background:#fff;box-shadow:var\(--shadow\)/);
  assert.match(css,/\.tour-row\{\s*width:100%;height:70px;min-height:70px;display:grid;/);
  assert.match(css,/\.tour-row\{[^}]*border:0;background:transparent;border-radius:var\(--event-radius\);padding:7px 8px/);
  assert.match(css,/@media\(max-width:640px\)\{[^}]*\.tour-row\{height:62px;min-height:62px;grid-template-columns:24px 44px/);
  assert.match(css,/\.tour-card:hover:not\(\.open\) \.tour-row\{background:var\(--bg2\)\}/);
  const opened=css.match(/\.tour-card\.open \.tour-row\{([^}]*)\}/);
  assert.ok(opened,"expanded header rules must exist");
  assert.equal(opened[1],"background:var(--bg2);border-radius:var(--event-radius) var(--event-radius) 0 0");
  assert.doesNotMatch(opened[1],/(?:width|height|padding|margin|border-width|transform|scale):/);
  assert.match(css,/\.tour-events\{[^}]*transition:max-height \.28s cubic-bezier\(\.3,\.7,\.4,1\),opacity \.18s ease/);
  assert.match(css,/\.tour-card\.open \.tour-events\{[^}]*max-height:4800px;opacity:1;pointer-events:auto;padding:2px 9px 10px/);
  assert.doesNotMatch(css,/\.tour-card\.open \.tour-events\{[^}]*margin-top|\.tour-card\.open \.tour-events\{[^}]*box-shadow/);
});
test("concert artist artwork matches chart dimensions and expanded accent border",()=>{
  const chart=readFileSync(new URL("../public/index.html",import.meta.url),"utf8");
  const encoded=app.match(/^const CONCERTS_CSS=("(?:\\.|[^"\\])*");/m);
  assert.ok(encoded,"concert styles must remain available");
  const css=JSON.parse(encoded[1]);

  assert.match(chart,/\.artwrap\{[^}]*width:56px;height:56px;padding:2px/);
  assert.match(css,/\.tour-row\{[^}]*grid-template-columns:24px 56px/);
  assert.match(css,/\.tour-art\{width:56px;height:56px;padding:2px;border-radius:12px;border:0;background:transparent/);
  assert.match(css,/\.tour-art img\{[^}]*border-radius:10px/);
  assert.match(chart,/\.chart-row\.playing \.artwrap\{background:var\(--accent\)/);
  assert.match(css,/\.tour-card\.open \.tour-art\{background:var\(--accent\)\}/);

  assert.match(chart,/\.artwrap\{grid-area:art;width:44px;height:44px;padding:2px/);
  assert.match(css,/@media\(max-width:640px\)\{[^}]*\.tour-row\{height:62px;min-height:62px;grid-template-columns:24px 44px/);
  assert.match(css,/\.tour-art\{width:44px;height:44px;border-radius:10px\}/);
  assert.match(css,/\.tour-art img\{border-radius:8px\}/);

  assert.match(app,/card\.classList\.add\("open"\)/);
  assert.match(app,/el\.classList\.remove\("open"\)/);
});

test("single-event popup follows content height without dead space and centers Buy Tickets",()=>{
  const encoded=app.match(/^const CONCERTS_CSS=("(?:\\.|[^"\\])*");/m);
  assert.ok(encoded,"concert stylesheet is available");
  const css=JSON.parse(encoded[1]);
  const single=app.slice(app.indexOf("function popupContent(e){"),app.indexOf("\nfunction eventsAtSameVenue("));
  const venue=app.slice(app.indexOf("function venuePopupContent(events){"),app.indexOf("\nfunction snapPopup("));

  assert.match(single,/root\.className="pop-card"/);
  assert.match(single,/img\.className="pop-thumb"/);
  assert.match(single,/main\.append\(title,date\)/);
  assert.match(single,/venue\.className="pop-meta pop-venue"/);
  assert.match(single,/location\.className="pop-meta pop-location"/);
  assert.match(single,/grid\.append\(img,main\)/);
  assert.match(single,/body\.appendChild\(grid\)/);
  assert.match(single,/actions\.className="pop-actions"/);
  assert.match(single,/body\.appendChild\(actions\)/);
  assert.doesNotMatch(single,/main\.appendChild\(actions\)/);
  assert.doesNotMatch(single,/ticketOptions|ticket-alt/);
  assert.match(venue,/root\.appendChild\(body\)/);
  assert.doesNotMatch(venue,/pop-card|pop-grid/);

  assert.match(css,/\.pop-card\{width:100%;height:auto;background:#fff\}/);
  assert.match(css,/\.pop-card \.pop-body\{padding:14px 14px 16px\}/);
  assert.match(css,/\.pop-card \.pop-grid\{display:grid;grid-template-columns:138px minmax\(0,1fr\);gap:12px;align-items:start\}/);
  assert.match(css,/\.pop-card \.pop-thumb\{[^}]*width:138px;height:138px;aspect-ratio:1;object-fit:cover;object-position:50% 18%/);
  assert.match(css,/\.pop-card \.pop-actions\{[^}]*justify-content:center;margin-top:12px;padding:0/);
  assert.match(css,/\.pop-card \.pop-actions \.buy\{width:min\(150px,100%\);margin:0\}/);
  assert.doesNotMatch(css,/\.pop-card\{[^}]*aspect-ratio:1/);
  assert.doesNotMatch(css,/\.pop-card \.pop-grid\{[^}]*min-height/);
  assert.match(css,/@media\(max-width:640px\)\{[\s\S]*?\.pop-card \.pop-grid\{grid-template-columns:100px minmax\(0,1fr\);gap:10px\}/);
  assert.match(css,/\.pop-card \.pop-actions\{margin-top:10px\}/);
  assert.match(css,/\.mapboxgl-popup\{max-width:min\(var\(--pop-w,286px\),calc\(100vw - 44px\)\)!important/);
});

test("both concert popups use comma-separated locations without repeated city or country",async()=>{
  const {runInNewContext}=await import("node:vm");
  const from=app.indexOf("function locationLine(e){");
  const to=app.indexOf("\nfunction artistKey(",from);
  assert.ok(from>=0 && to>from,"shared location helper must exist");
  const locationLine=runInNewContext(app.slice(from,to)+"\nlocationLine");
  const singapore={venue:"National Stadium",city:"Singapore",state:" Singapore ",country:"SINGAPORE"};
  assert.equal(locationLine(singapore),"Singapore");
  assert.equal(locationLine({city:"Portland",state:"Oregon",country:"United States Of America"}),"Portland, Oregon, USA");
  assert.equal(locationLine({city:"London",state:"",country:"United Kingdom"}),"London, United Kingdom");
  assert.equal(locationLine({city:"Santa Clara",state:"California",country:"United States of America",countryCode:"US"}),"Santa Clara, California, USA");
  assert.equal(locationLine({city:"Toronto",state:"Ontario",country:"Canada",countryCode:"CA"}),"Toronto, Ontario, Canada");
  assert.equal(locationLine({city:" New  York ",state:"new york",country:"United States"}),"New York, USA");
  assert.match(app,/location\.textContent=address/);
  assert.match(app,/place\.textContent=locationLine\(first\)/);
});


test("all concert thumbnails use original photo, browser smoothing and never Cloudflare",async()=>{
  const {runInNewContext}=await import("node:vm");
  const from=app.indexOf("function applyConcertArt(img,original,preset){");
  const to=app.indexOf("\nfunction popupContent(e){",from);
  assert.ok(from>0&&to>from);
  assert.doesNotMatch(app,/cdn-cgi\/image|concertArtResizeProbe|CONCERT_ART_PRESETS|optimizedConcertImageUrl/);
  let rendered=[];
  const apply=runInNewContext(
    "function browserResampleConcertArt(img,preset){ rendered.push([img,preset]); }\n"+
    app.slice(from,to)+"\n({applyConcertArt})",
    {rendered}
  ).applyConcertArt;
  let src="";
  const el={draggable:true,onload:null,onerror:null,set src(x){src=x;},get src(){return src;}};
  const origin="https://s1.ticketm.net/actual/full-photo.jpg";
  apply(el,origin,"event");
  assert.equal(el.src,origin);
  assert.equal(el.draggable,false);
  el.onload();
  assert.equal(rendered.length,1);
  assert.equal(rendered[0][1],"event");
  assert.equal(rendered[0][0],el);
  assert.equal(el.onload,null);
  el.onerror();
  assert.equal(el.src,"/logo.png");
  assert.match(app,/applyConcertArt\(img,item\.image\|\|"\/logo\.png","icon"\)/);
  assert.match(app,/applyConcertArt\(img,originalArt,"event"\)/);
});

test("popup concert photograph is presentation only without links or zoom cursor",()=>{
  const css=JSON.parse(app.match(/^const CONCERTS_CSS=("(?:\\.|[^"\\])*");/m)[1]);
  const popup=app.slice(app.indexOf("function popupContent(e){"),app.indexOf("\nfunction venuePopupContent(",app.indexOf("function popupContent(e){")));
  assert.match(popup,/grid\.append\(img,main\)/);
  assert.doesNotMatch(popup,/full\.href|eventImageUrl|dragstart|pop-art-link/);
  assert.doesNotMatch(css,/pop-art-link|cursor:zoom-in/);
  const from=app.indexOf("function browserResampleConcertArt(");
  const to=app.indexOf("\nfunction applyConcertArt(",from);
  const body=app.slice(from,to);
  assert.match(body,/prectx\.imageSmoothingQuality="high"/);
  assert.match(body,/ctx\.imageSmoothingQuality="high"/);
  assert.match(body,/img\.replaceWith\(visible\)/);
  assert.match(body,/visible\.draggable=false/);
});

test("Concerts displays only one error, empty, or loading explanation with aligned text",()=>{
  const css=JSON.parse(app.match(/^const CONCERTS_CSS=("(?:\\.|[^"\\])*");/m)[1]);
  assert.match(css,/\.side-sub\{[^}]*margin:0 4px 10px 17px/);
  assert.match(css,/\.side-status\{[^}]*margin:0 4px 8px 17px/);
  assert.match(css,/\.side-empty\{[^}]*padding:12px 5px 12px 17px/);
  assert.match(css,/\.disclosure\{[^}]*padding:0 4px 0 17px/);
  assert.match(app,/function setStatus\(message\)\{ sideStatus\.textContent=[^;]*; if\(sideStatus\.textContent\) sideSub\.textContent=""; \}/);
  assert.doesNotMatch(app,/sideEmpty\.textContent="Location unavailable\."/);
  const area=app.slice(app.indexOf("async function loadArea("),app.indexOf("\nfunction geoPositionOnce("));
  assert.match(area,/sideEmpty\.hidden=true;[\s\S]*setStatus\("Loading concerts\.\.\."\)/);
  assert.match(area,/setStatus\(events\.length \? "Ranked by number of upcoming concerts" : ""\)/);
  assert.match(area,/catch\(err\)\{[\s\S]*sideEmpty\.hidden=true;[\s\S]*setStatus\(err\.message/);
  assert.doesNotMatch(app,/No Ticketmaster concerts found ·/);
});

test("Near me has one correctly ranked, aligned summary rather than a duplicate heading",()=>{
  const css=JSON.parse(app.match(/^const CONCERTS_CSS=("(?:\\.|[^"\\])*");/m)[1]);
  assert.doesNotMatch(css,/\/\/ Align description/);
  assert.match(css,/\.side-status\{font-size:13\.5px;color:var\(--muted\);margin:0 4px 8px 17px/);
  assert.match(css,/\.disclosure\{[^}]*padding:0 4px 0 17px/);
  assert.doesNotMatch(app,/Artists with the most upcoming events in this area\./);
  assert.doesNotMatch(app,/Artists with upcoming events in /);
  assert.match(app,/sideSub\.textContent="";\s*renderArtists\(groupedNearby\(nearbyEvents\),"nearby"\)/);
  assert.match(app,/setStatus\(events\.length \? "Ranked by number of upcoming concerts"/);
  assert.match(app,/setStatus\(nearbyEvents\.length \? "Ranked by number of upcoming concerts"/);
});

test("placeholder attractions can never reach the artist renderer, including stale caches",()=>{
  const render=app.slice(app.indexOf("function renderArtists(items,mode){"),app.indexOf("\nfunction restoreModeMap("));
  assert.match(render,/const visibleItems=\(items\|\|\[\]\)\.filter\(item=>!isPlaceholderConcertArtist\(item\?\.name\)\)/);
  assert.match(render,/visibleItems\.forEach\(\(item,index\)=>/);
  assert.doesNotMatch(render,/items\.forEach\(\(item,index\)=>/);
});
test("Near me never ranks placeholder attractions or puts their concerts on the map",()=>{
  const start=app.indexOf("function isPlaceholderConcertArtist(name){");
  const end=app.indexOf("\nfunction setTourBoxHeight(",start);
  assert.ok(start>0 && end>start);
  const {isPlaceholderConcertArtist,groupedNearby}=runInNewContext(app.slice(start,end)+"\n({isPlaceholderConcertArtist,groupedNearby})");
  assert.ok(isPlaceholderConcertArtist("TEST ARTIST"));
  assert.ok(isPlaceholderConcertArtist(" Live   Music "));
  assert.ok(!isPlaceholderConcertArtist("Bruno Mars"));
  const events=[{artist:"Live music",attractionId:"one",date:"2026-12-01"},
    {artist:"Test artist",attractionId:"two",date:"2026-12-01"},
    {artist:"Bruno Mars",attractionId:"three",date:"2026-12-01"}];
  assert.equal(groupedNearby(events).length,1);
  assert.equal(groupedNearby(events)[0].name,"Bruno Mars");
  assert.match(app,/events=events\.filter\(e=>!isPlaceholderConcertArtist\(e\.artist\)/);
});

test("Near me lists up to 30 artists and description/status share rank alignment",()=>{
  const grouped=app.slice(app.indexOf("function groupedNearby(events){"),app.indexOf("\nfunction setTourBoxHeight("));
  assert.match(grouped,/\.sort\(\(a,b\)=>b\.count-a\.count/);
  assert.match(grouped,/\.slice\(0,30\)/);
  const stylesheet=JSON.parse(app.match(/^const CONCERTS_CSS=("(?:\\.|[^"\\])*");/m)[1]);
  const desc=stylesheet.match(/\.side-sub\{[^}]*margin:0 4px 10px (\d+)px/);
  const status=stylesheet.match(/\.side-status\{[^}]*margin:0 4px 8px (\d+)px/);
  const disclosure=stylesheet.match(/\.disclosure\{[^}]*padding:0 4px 0 (\d+)px/);
  assert.equal(desc?.[1],"17");
  assert.equal(status?.[1],desc?.[1]);
  assert.equal(disclosure?.[1],desc?.[1]);
  const area=app.slice(app.indexOf("async function loadArea("),app.indexOf("\nfunction geoPositionOnce("));
  assert.match(area,/setStatus\(events\.length \? "Ranked by number of upcoming concerts"/);
  assert.doesNotMatch(area,/loaded concerts of/);
});
