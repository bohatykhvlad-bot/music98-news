"use strict";

const CONCERTS_CSS="\n:host{\n  --bg:#fff;--bg2:#f4f6f7;--card:#fff;--card2:#edf1f2;--line:#e2e8ea;--text:#15181a;--muted:#5c6a70;\n  --muted2:#8a969b;--accent:#00fdfb;--shadow:0 12px 34px rgba(15,45,55,.10);--r:16px;\n  --font:\"Pretendard\",Pretendard,-apple-system,BlinkMacSystemFont,\"Segoe UI\",Roboto,\"Helvetica Neue\",Arial,sans-serif;\n}\n*{box-sizing:border-box}\nhtml{overflow-x:clip}\nbody{margin:0;padding-top:70px;background:var(--bg);color:var(--text);font-family:var(--font);line-height:1.45;-webkit-font-smoothing:antialiased}\nbutton,input,select{font:inherit}\na{color:inherit}\n.topbar{position:fixed;inset:0 0 auto;z-index:20;background:rgba(255,255,255,.82);border-bottom:1px solid rgba(226,232,234,.85);backdrop-filter:blur(14px) saturate(170%);-webkit-backdrop-filter:blur(14px) saturate(170%)}\n.topbar-in{max-width:1180px;margin:auto;height:68px;padding:0 20px;display:grid;grid-template-columns:1fr auto 1fr;gap:16px;align-items:center}\n.brand{display:flex;align-items:center;gap:10px;text-decoration:none;font-weight:700;font-size:20px;letter-spacing:-.015em}\n.brand img{width:40px;height:40px;border-radius:50%}\n.nav{justify-self:center;display:flex;align-items:center;height:40px;gap:6px;background:rgba(255,255,255,.55);border:1px solid rgba(15,60,64,.14);padding:4px;border-radius:999px}\n.nav-btn{border:0;background:transparent;color:var(--muted);font-size:14px;font-weight:600;text-decoration:none;padding:0 18px;height:32px;display:inline-flex;align-items:center;justify-content:center;white-space:nowrap;line-height:1;text-box:trim-both cap alphabetic;border-radius:999px;cursor:pointer;transition:.18s;-webkit-tap-highlight-color:transparent;-webkit-touch-callout:none;position:relative;top:.5px}\n.nav-btn:hover{color:var(--text)}\n.nav-btn.active{background:var(--accent);color:#03282b}\n.topfill{justify-self:end;color:var(--muted);font-size:13px}\n.wrap{max-width:1180px;margin:0 auto;padding:22px 20px 50px}\n.hero{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:18px}\n.hero h1{font-size:clamp(30px,4vw,44px);line-height:1.05;letter-spacing:-.04em;margin:0 0 8px}\n.hero p{margin:0;color:var(--muted);font-size:15px}\n.controls{display:grid;grid-template-columns:minmax(260px,1fr) auto auto;gap:10px;margin:18px 0}\n.search-wrap{position:relative}\n.city-input{width:100%;height:43px;border:1px solid var(--line);border-radius:999px;background:var(--bg2);padding:0 16px 0 41px;outline:none;color:var(--text);font-size:14px}\n.city-input:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(0,253,251,.15)}\n.search-icon{position:absolute;left:15px;top:50%;transform:translateY(-50%);width:16px;height:16px;color:var(--muted2);pointer-events:none}\n.suggestions{position:absolute;z-index:30;top:49px;left:0;right:0;background:#fff;border:1px solid var(--line);border-radius:14px;box-shadow:var(--shadow);overflow:hidden}\n.suggestion{width:100%;border:0;background:#fff;text-align:left;padding:11px 14px;cursor:pointer;color:var(--text)}\n.suggestion:hover,.suggestion:focus{background:var(--bg2);outline:none}\n.action,.radius-trigger{height:43px;border:1px solid var(--line);border-radius:999px;background:var(--bg2);padding:0 18px;color:var(--text);font-size:14px;font-weight:600;white-space:nowrap;font-family:var(--font)}\n.action{cursor:pointer}\n.action:hover,.radius-trigger:hover{border-color:var(--accent)}\n.radius-menu{position:relative;min-width:108px}\n.radius-trigger{width:100%;min-width:108px;display:flex;align-items:center;justify-content:space-between;gap:12px;cursor:pointer;outline:none}\n.radius-chevron{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;transition:transform .18s ease}\n.radius-menu.open .radius-chevron{transform:rotate(180deg)}\n.radius-options{position:absolute;z-index:40;top:calc(100% + 7px);right:0;min-width:100%;padding:5px;background:#fff;border:1px solid var(--line);border-radius:18px;box-shadow:0 12px 30px rgba(15,45,55,.13);opacity:0;visibility:hidden;pointer-events:none;transform:translateY(-5px) scale(.985);transform-origin:top right;transition:opacity .14s ease,transform .16s ease,visibility .16s}\n.radius-menu.open .radius-options{opacity:1;visibility:visible;pointer-events:auto;transform:translateY(0) scale(1)}\n.radius-option{width:100%;height:34px;display:flex;align-items:center;justify-content:flex-start;border:0;border-radius:999px;background:transparent;padding:0 13px;color:var(--text);font:600 13.5px/1 var(--font);cursor:pointer;white-space:nowrap}\n.radius-option:hover{background:var(--bg2)}\n.radius-option.active{background:var(--accent);color:#03282b}\n.layout{display:grid;grid-template-columns:minmax(0,1fr) 370px;gap:16px;align-items:start}\n.map-shell{position:relative;height:420px;min-height:0;border:1px solid var(--line);border-radius:var(--r);overflow:hidden;background:var(--card2);box-shadow:var(--shadow)}\n#map{position:absolute;inset:0}\n.map-status{position:absolute;z-index:5;left:14px;top:14px;max-width:min(560px,calc(100% - 28px));padding:8px 12px;border:1px solid rgba(255,255,255,.84);background:rgba(255,255,255,.92);border-radius:999px;box-shadow:0 5px 18px rgba(15,45,55,.10);font-size:12.5px;color:#425158;backdrop-filter:blur(8px)}\n.map-status:empty{display:none}\n.side{border:1px solid var(--line);border-radius:var(--r);background:#fff;padding:13px;height:420px;min-height:0;display:flex;flex-direction:column;box-shadow:var(--shadow);overflow:hidden}\n.side-tabs{\n  width:max-content;max-width:100%;display:flex;align-items:center;gap:6px;\n  height:40px;padding:4px;background:rgba(255,255,255,.55);\n  border:1px solid rgba(15,60,64,.14);border-radius:999px;margin:0 auto 10px;\n  position:relative;top:auto;z-index:5;flex:0 0 auto\n}\n.side-tab{\n  width:auto;min-width:auto;height:32px;padding:0 18px;border:0;border-radius:999px;\n  background:transparent;color:var(--muted);font-size:14px;font-weight:600;\n  line-height:1;text-box:trim-both cap alphabetic;white-space:nowrap;cursor:pointer;\n  transition:background .16s ease,color .16s ease,transform .12s ease\n}\n.side-tab:hover{color:var(--text)}\n.side-tab.active{background:var(--accent);color:#03282b}\n.side-sub{font-size:12.5px;color:var(--muted);margin:0 4px 10px;line-height:1.4;flex:0 0 auto}\n.tours{display:flex;flex-direction:column;gap:6px;flex:1 1 auto;min-height:0;overflow-y:auto;overflow-x:hidden;scrollbar-width:thin;scrollbar-gutter:stable;padding-right:3px;overscroll-behavior:contain}\n.tour-card{\n  flex:0 0 auto;min-height:62px;\n  border:1px solid transparent;border-radius:24px;overflow:hidden;background:transparent;\n  transition:background .2s ease,border-color .2s ease,box-shadow .2s ease\n}\n.tour-card.open{\n  background:var(--bg2);border-color:var(--line);box-shadow:0 6px 18px rgba(15,45,55,.06)\n}\n.tour-row{\n  width:100%;min-height:62px;display:grid;grid-template-columns:24px 48px minmax(0,1fr) 18px;gap:8px;align-items:center;\n  border:0;background:transparent;border-radius:999px;padding:7px 8px;text-align:left;cursor:pointer;color:var(--text);\n  transition:background .16s ease,transform .12s cubic-bezier(.3,.7,.4,1)\n}\n.tour-row:hover{background:var(--bg2)}\n.tour-card.open .tour-row{background:#fff}\n.tour-rank{font-weight:800;font-size:11.5px;color:#879398;text-align:center;font-variant-numeric:tabular-nums}\n.tour-art{width:48px;height:48px;padding:2px;border-radius:12px;border:1px solid var(--line);background:#fff;overflow:hidden;transition:.16s}\n.tour-art img{width:100%;height:100%;display:block;object-fit:cover;border-radius:9px;background:var(--card2)}\n.tour-card.open .tour-art{background:var(--accent);border-color:var(--accent)}\n.tour-copy{min-width:0}\n.tour-name{display:block;font-size:15px;font-weight:800;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:-.015em;text-rendering:geometricPrecision}\n.tour-meta{display:block;font-size:12px;color:var(--muted);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-rendering:geometricPrecision}\n.tour-chevron{width:18px;height:18px;display:grid;place-items:center;color:var(--muted);transition:transform .18s ease}\n.tour-chevron svg{width:14px;height:14px}\n.tour-card.open .tour-chevron{transform:rotate(90deg)}\n.tour-events{\n  max-height:0;opacity:0;overflow:hidden;pointer-events:none;\n  padding:0 9px 0 80px;\n  transition:max-height .28s cubic-bezier(.3,.7,.4,1),opacity .18s ease,padding .28s cubic-bezier(.3,.7,.4,1)\n}\n.tour-card.open .tour-events{\n  max-height:4800px;opacity:1;pointer-events:auto;padding:2px 9px 10px 80px\n}\n.tour-loading,.tour-none{font-size:11.5px;color:var(--muted);padding:7px 2px 9px}\n.event-link{\n  width:100%;display:grid;grid-template-columns:54px minmax(0,1fr);gap:8px;border:0;\n  background:rgba(255,255,255,.72);color:inherit;text-align:left;cursor:pointer;text-decoration:none;\n  padding:9px 10px;border-radius:14px;margin:4px 0\n}\n.event-link:hover{background:#fff}\n.event-date{font-size:11.5px;font-weight:800;color:var(--text);text-transform:uppercase;line-height:1.25;text-rendering:geometricPrecision}\n.event-place{min-width:0}\n.event-city{display:block;font-size:12.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-rendering:geometricPrecision}\n.event-venue{display:block;font-size:11px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;text-rendering:geometricPrecision}\n.side-empty{font-size:12.5px;color:var(--muted);padding:12px 5px}\n.disclosure{margin-top:8px;padding:10px 4px 2px;font-size:10.5px;color:#7a878c;line-height:1.4;flex:0 0 auto}\n.mapboxgl-popup{max-width:286px!important}\n.mapboxgl-popup-content{width:286px;max-width:calc(100vw - 34px);padding:0;border-radius:15px;overflow:hidden;box-shadow:0 14px 38px rgba(15,45,55,.2);font-family:var(--font)}\n.pop-img{display:block;width:100%;height:142px;object-fit:cover;background:#eef2f3}\n.pop-body{padding:13px}\n.pop-title{font-size:16px;font-weight:800;line-height:1.18;margin:0 26px 6px 0}\n.pop-meta{font-size:12.5px;color:#56656b;margin:3px 0}\n.buy{width:max-content;max-width:100%;display:flex;align-items:center;justify-content:center;height:34px;margin:11px auto 0;padding:0 18px;border-radius:999px;background:var(--accent);color:#03282b;text-decoration:none;font-family:var(--font);font-size:13px;font-weight:700;line-height:34px;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;transform:none}\n.affiliate-note{margin:6px 0 0;text-align:center;font-size:9.5px;line-height:1.25;color:#7a878c}\n.mapboxgl-popup-close-button{font-size:20px;padding:5px 8px;color:#344}\n.mapboxgl-ctrl-group{border-radius:11px!important;overflow:hidden}\n.action,.radius-trigger,.side-tab,.tour-row,.event-link,.suggestion,.mapboxgl-ctrl button{\n  transition:transform .12s cubic-bezier(.3,.7,.4,1),background .16s ease,border-color .16s ease,box-shadow .16s ease;\n}\n.action:active,.radius-trigger:active,.side-tab:active,.tour-row:active,.event-link:active,.suggestion:active,.mapboxgl-ctrl button:active{\n  transform:scale(.965);\n}\n.buy{transition:background .14s ease,box-shadow .14s ease}\n.buy:hover{box-shadow:0 4px 12px rgba(0,253,251,.22)}\n.buy:active{background:#00e9e7}\n@media(prefers-reduced-motion:reduce){\n  .action,.radius-trigger,.side-tab,.tour-row,.event-link,.buy,.suggestion,.mapboxgl-ctrl button{transition:none}\n}\n@media(max-width:900px){\n  .layout{grid-template-columns:1fr}\n  .map-shell{height:420px}\n  .side{height:auto;max-height:620px}\n  .topfill{display:none}\n}\n@media(max-width:700px){\n  body{padding-top:126px}\n  .topbar-in{height:auto;min-height:118px;padding:8px 14px;display:flex;flex-wrap:wrap;gap:8px}\n  .brand{font-size:17px}\n  .brand img{width:32px;height:32px}\n  .nav{order:3;width:100%;height:48px;gap:4px;padding:4px;justify-content:stretch;background:rgba(255,255,255,.55);border:1px solid rgba(15,60,64,.14)}\n  .nav-btn{flex:1;height:40px;padding:0 8px;font-size:13px;justify-content:center}\n  .wrap{padding:18px 14px 36px}\n  .hero{align-items:flex-start;flex-direction:column}\n  .controls{grid-template-columns:1fr 1fr}\n  .search-wrap{grid-column:1/-1}\n  .action,.radius-menu,.radius-trigger{width:100%}.action,.radius-trigger{padding:0 14px}\n  .map-shell{height:52vh;min-height:360px;max-height:460px;border-radius:15px}\n  .side{border-radius:15px;max-height:none}\n  .tour-events{padding-left:72px}\n}\n\n:host{display:block;width:100%;font-family:var(--font);color:var(--text);-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}\n.wrap{padding:0 0 18px;max-width:none}\n.hero{margin:0 0 18px;align-items:center}\n.hero h1{font-size:clamp(26px,4vw,38px);line-height:1.15;letter-spacing:-.03em;margin:0}\n.hero p{font-size:15px}\n\n.tour-more{height:32px;padding:0 16px;margin:8px auto 2px;display:flex;align-items:center;justify-content:center;border:1px solid var(--line);border-radius:999px;background:#fff;color:var(--text);font-size:12.5px;font-weight:600;line-height:1;text-box:trim-both cap alphabetic;cursor:pointer;transition:transform .12s cubic-bezier(.3,.7,.4,1),border-color .16s ease,background .16s ease}.tour-more:hover{border-color:rgba(0,253,251,.7);background:#fff}.tour-more:active{transform:scale(.96)}\n";
const CONCERTS_HTML="<main class=\"wrap\">\n  <section class=\"hero\">\n    <div>\n      <h1>Concerts Near You</h1>\n      \n    </div>\n  </section>\n\n  <div class=\"controls\">\n    <div class=\"search-wrap\">\n      <svg class=\"search-icon\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.1\" stroke-linecap=\"round\"><circle cx=\"11\" cy=\"11\" r=\"7\"/><path d=\"m20 20-3.5-3.5\"/></svg>\n      <input class=\"city-input\" id=\"citySearch\" type=\"search\" autocomplete=\"off\" placeholder=\"Search any city...\" aria-label=\"Search city\">\n      <div class=\"suggestions\" id=\"suggestions\" hidden></div>\n    </div>\n    <button class=\"action\" id=\"locateBtn\" type=\"button\">Use my location</button>\n    <div class=\"radius-menu\" id=\"radiusMenu\">\n      <input id=\"radius\" type=\"hidden\" value=\"100\">\n      <button class=\"radius-trigger\" id=\"radiusTrigger\" type=\"button\" aria-haspopup=\"listbox\" aria-expanded=\"false\">\n        <span id=\"radiusLabel\">100 km</span>\n        <svg class=\"radius-chevron\" viewBox=\"0 0 20 20\" aria-hidden=\"true\"><path d=\"m6 8 4 4 4-4\"/></svg>\n      </button>\n      <div class=\"radius-options\" id=\"radiusOptions\" role=\"listbox\" aria-label=\"Search radius\">\n        <button class=\"radius-option\" type=\"button\" role=\"option\" data-value=\"25\" aria-selected=\"false\">25 km</button>\n        <button class=\"radius-option\" type=\"button\" role=\"option\" data-value=\"50\" aria-selected=\"false\">50 km</button>\n        <button class=\"radius-option active\" type=\"button\" role=\"option\" data-value=\"100\" aria-selected=\"true\">100 km</button>\n        <button class=\"radius-option\" type=\"button\" role=\"option\" data-value=\"250\" aria-selected=\"false\">250 km</button>\n      </div>\n    </div>\n  </div>\n\n  <div class=\"layout\">\n    <section class=\"map-shell\" aria-label=\"Concert map\">\n      <div id=\"map\"></div>\n      <div class=\"map-status\" id=\"status\">Search for a city or use your location to find concerts.</div>\n    </section>\n    <aside class=\"side\">\n      <div class=\"side-tabs\" role=\"tablist\" aria-label=\"Concert discovery\">\n        <button class=\"side-tab\" id=\"nearTab\" type=\"button\" role=\"tab\" aria-selected=\"false\">Near me</button>\n        <button class=\"side-tab active\" id=\"popularTab\" type=\"button\" role=\"tab\" aria-selected=\"true\">Popular</button>\n      </div>\n      <p class=\"side-sub\" id=\"sideSub\">Popular artists with upcoming Ticketmaster shows.</p>\n      <div class=\"tours\" id=\"tours\"></div>\n      <div class=\"side-empty\" id=\"sideEmpty\">Loading popular artists...</div>\n      <p class=\"disclosure\">Ticketing by Ticketmaster.</p>\n    </aside>\n  </div>\n</main>";

function ensureMapbox(){
  if(window.mapboxgl) return Promise.resolve(window.mapboxgl);
  if(window.__music98MapboxPromise) return window.__music98MapboxPromise;
  window.__music98MapboxPromise=new Promise((resolve,reject)=>{
    const s=document.createElement("script");
    s.src="https://api.mapbox.com/mapbox-gl-js/v3.15.0/mapbox-gl.js";
    s.onload=()=>resolve(window.mapboxgl);
    s.onerror=()=>reject(new Error("mapbox_load_failed"));
    document.head.appendChild(s);
  });
  return window.__music98MapboxPromise;
}

function initConcerts(root,host){

const MAPBOX_TOKEN = "pk.eyJ1IjoibXVzaWM5OCIsImEiOiJjbXVsaWM1M2kxbm4xMnpxeW83bWR5aHg5In0.8Y56YcxjJ3kpa5g51Yl3aw";
mapboxgl.accessToken = MAPBOX_TOKEN;

let hotspots=[];

const map = new mapboxgl.Map({
  container:root.querySelector("#map"),
  style:"mapbox://styles/mapbox/streets-v12",
  projection:"mercator",
  center:[0,22],
  zoom:1.55,
  attributionControl:true
});
map.addControl(new mapboxgl.NavigationControl({showCompass:false}),"bottom-right");

const $ = (s)=>root.querySelector(s);
const statusEl=$("#status"), toursEl=$("#tours"), sideEmpty=$("#sideEmpty");
const sideSub=$("#sideSub"), search=$("#citySearch"), suggestions=$("#suggestions"), radiusEl=$("#radius");
const radiusMenu=$("#radiusMenu"), radiusTrigger=$("#radiusTrigger"), radiusLabel=$("#radiusLabel"), radiusOptions=$("#radiusOptions");
const nearTab=$("#nearTab"), popularTab=$("#popularTab");

let currentEvents=[];
let nearbyEvents=[];
let nearbyTotal=0;
let currentTotal=0;
let popularEvents=[];
let popularArtists=[];
let lastArea=null;
let activeMode="popular";
let suggestTimer=0;
let moveTimer=0;
let popup=null;
let userMoving=false;
let expandedKey="";
const artistEventCache=new Map();

function setStatus(s){ statusEl.textContent=s||""; }
function fmtDate(e){
  if(!e.date) return "Date TBA";
  const d=new Date(e.date+"T12:00:00");
  return new Intl.DateTimeFormat(undefined,{month:"short",day:"numeric",year:"numeric"}).format(d);
}
function shortDate(e){
  if(!e.date) return "TBA";
  const d=new Date(e.date+"T12:00:00");
  return new Intl.DateTimeFormat("en",{month:"short",day:"numeric"}).format(d).toUpperCase();
}
function placeLine(e){ return [e.venue,e.city,e.state,e.country].filter(Boolean).join(" · "); }
function artistKey(a){ return String(a.id||a.attractionId||a.name||"").toLowerCase(); }

function setMode(mode){
  activeMode=mode;
  const near=mode==="nearby";
  nearTab.classList.toggle("active",near);
  popularTab.classList.toggle("active",!near);
  nearTab.setAttribute("aria-selected",near?"true":"false");
  popularTab.setAttribute("aria-selected",near?"false":"true");
}

function toGeoJSON(events){
  return {
    type:"FeatureCollection",
    features:events.map(e=>({
      type:"Feature",
      geometry:{type:"Point",coordinates:[e.lng,e.lat]},
      properties:{id:e.id,artist:e.artist,name:e.name,label:shortDate(e)+"\n"+e.artist}
    }))
  };
}

function hubsGeoJSON(){
  return {
    type:"FeatureCollection",
    features:hotspots.map(h=>({
      type:"Feature",
      geometry:{type:"Point",coordinates:[h.lng,h.lat]},
      properties:{name:h.city,countryCode:h.countryCode||"",count:h.count||0}
    }))
  };
}

function setEventData(events,total=null){
  currentEvents=events||[];
  currentTotal=Number(total==null ? currentEvents.length : total) || 0;
  const src=map.getSource("events");
  if(src) src.setData(toGeoJSON(currentEvents));

  if(map.getLayer("cluster-count")){
    const complete=currentTotal<=currentEvents.length;
    map.setLayoutProperty("cluster-count","visibility",complete?"visible":"none");
  }
}

function addLayers(){
  if(map.getSource("events")) return;

  map.addSource("hubs",{type:"geojson",data:hubsGeoJSON()});
  map.addLayer({
    id:"hub-points",type:"circle",source:"hubs",maxzoom:7,
    paint:{
      "circle-color":"#00fdfb",
      "circle-radius":["interpolate",["linear"],["zoom"],1.2,2.5,2.5,3,4,4.5,5.5,6.2,7,7.5],
      "circle-opacity":.96,"circle-stroke-width":0
    }
  });
  map.addLayer({
    id:"hub-labels",type:"symbol",source:"hubs",minzoom:3.7,maxzoom:5.8,
    layout:{
      "text-field":["get","name"],"text-size":11,"text-font":["Open Sans Semibold","Arial Unicode MS Bold"],
      "text-offset":[0,1.15],"text-anchor":"top","text-allow-overlap":false
    },
    paint:{"text-color":"#15181a","text-halo-color":"#ffffff","text-halo-width":1.5}
  });

  map.addSource("events",{type:"geojson",data:toGeoJSON([]),cluster:true,clusterMaxZoom:11,clusterRadius:48});
  map.addLayer({id:"clusters",type:"circle",source:"events",filter:["has","point_count"],paint:{
    "circle-color":"#00fdfb","circle-radius":["interpolate",["linear"],["zoom"],1.2,2.5,3,3.5,4.8,7,6,10,7,12],
    "circle-stroke-color":"rgba(255,255,255,.98)","circle-stroke-width":["interpolate",["linear"],["zoom"],1.2,0,4.8,1,6,2],
    "circle-opacity":.96,"circle-blur":0
  }});
  map.addLayer({id:"cluster-count",type:"symbol",source:"events",minzoom:4.8,filter:["has","point_count"],layout:{
    "text-field":["get","point_count_abbreviated"],
    "text-size":10.5,
    "text-anchor":"center",
    "text-offset":[0,0],
    "text-allow-overlap":true,
    "text-ignore-placement":true
  },paint:{
    "text-color":"#03282b",
    "text-halo-width":0
  }});
  map.addLayer({id:"event-points",type:"circle",source:"events",minzoom:5,filter:["!",["has","point_count"]],paint:{
    "circle-color":"#00fdfb","circle-radius":["interpolate",["linear"],["zoom"],5,5,8,7.5,12,9],"circle-opacity":.98,"circle-stroke-width":0
  }});
  map.addLayer({id:"event-labels",type:"symbol",source:"events",minzoom:7.2,filter:["!",["has","point_count"]],layout:{
    "text-field":["get","label"],"text-size":11,"text-font":["Open Sans Semibold","Arial Unicode MS Bold"],
    "text-offset":[0,1.35],"text-anchor":"top","text-max-width":14,"text-allow-overlap":false
  },paint:{"text-color":"#15181a","text-halo-color":"#ffffff","text-halo-width":1.5}});

  map.on("click","hub-points",handleHubClick);
  map.on("click","hub-labels",handleHubClick);

  map.on("click","clusters",async e=>{
    const f=map.queryRenderedFeatures(e.point,{layers:["clusters"]})[0];
    if(!f||!map.getSource("events")) return;
    try{
      const z=await map.getSource("events").getClusterExpansionZoom(f.properties.cluster_id);
      userMoving=false;
      map.easeTo({center:f.geometry.coordinates,zoom:Math.min(Number(z)||map.getZoom()+2,14),duration:500});
    }catch(err){ console.error(err); }
  });

  map.on("click","event-points",e=>{
    const id=String(e.features?.[0]?.properties?.id||"");
    const ev=currentEvents.find(x=>x.id===id);
    if(ev) showPopup(ev);
  });

  ["hub-points","hub-labels","clusters","event-points"].forEach(layer=>{
    map.on("mouseenter",layer,()=>map.getCanvas().style.cursor="pointer");
    map.on("mouseleave",layer,()=>map.getCanvas().style.cursor="");
  });
}

function handleHubClick(e){
  const f=e.features?.[0];
  if(!f) return;
  const [lng,lat]=f.geometry.coordinates;
  const name=String(f.properties?.name||"Selected city");
  const count=Number(f.properties?.count||0);
  userMoving=false;
  map.flyTo({center:[lng,lat],zoom:8.5,duration:650});
  loadArea(lat,lng,name,{fit:false,radius:45});
}

function popupContent(e){
  const root=document.createElement("div");
  if(e.image){
    const img=document.createElement("img");
    img.className="pop-img"; img.src=e.image; img.alt=""; img.loading="eager"; img.decoding="async"; img.width=286; img.height=142;
    root.appendChild(img);
  }
  const body=document.createElement("div"); body.className="pop-body";
  const title=document.createElement("div"); title.className="pop-title"; title.textContent=e.artist||e.name;
  body.appendChild(title);
  const date=document.createElement("div"); date.className="pop-meta"; date.textContent=fmtDate(e)+(e.time?" · "+e.time.slice(0,5):"");
  body.appendChild(date);
  const place=document.createElement("div"); place.className="pop-meta"; place.textContent=placeLine(e);
  body.appendChild(place);
  if(e.url){
    const a=document.createElement("a"); a.className="buy"; a.href=e.url; a.target="_blank"; a.rel="sponsored noopener";
    a.textContent="Buy Tickets"; body.appendChild(a);
    const note=document.createElement("div"); note.className="affiliate-note"; note.textContent="We may earn a commission.";
    body.appendChild(note);
  }
  root.appendChild(body);
  return root;
}

function ensurePopupFullyVisible(){
  if(!popup) return;
  const el=popup.getElement ? popup.getElement() : map.getContainer().querySelector(".mapboxgl-popup");
  if(!el) return;

  const mapRect=map.getContainer().getBoundingClientRect();
  const popRect=el.getBoundingClientRect();
  const margin=16;

  let shiftX=0, shiftY=0;
  const leftLimit=mapRect.left+margin;
  const rightLimit=mapRect.right-margin;
  const topLimit=mapRect.top+margin;
  const bottomLimit=mapRect.bottom-margin;

  if(popRect.left<leftLimit) shiftX=leftLimit-popRect.left;
  else if(popRect.right>rightLimit) shiftX=-(popRect.right-rightLimit);

  if(popRect.top<topLimit) shiftY=topLimit-popRect.top;
  else if(popRect.bottom>bottomLimit) shiftY=-(popRect.bottom-bottomLimit);

  if(Math.abs(shiftX)<1 && Math.abs(shiftY)<1) return;

  const centerPoint=[mapRect.width/2-shiftX,mapRect.height/2-shiftY];
  const newCenter=map.unproject(centerPoint);
  userMoving=false;
  map.easeTo({center:newCenter,duration:280});
}

function showPopup(e){
  if(popup) popup.remove();
  popup=new mapboxgl.Popup({offset:16,closeButton:true,maxWidth:"286px",focusAfterOpen:false})
    .setLngLat([e.lng,e.lat]).setDOMContent(popupContent(e)).addTo(map);

  requestAnimationFrame(()=>requestAnimationFrame(ensurePopupFullyVisible));
  setTimeout(ensurePopupFullyVisible,80);
}

function focusEventOnMap(e){
  if(!e || !Number.isFinite(Number(e.lat)) || !Number.isFinite(Number(e.lng))) return;
  userMoving=false;
  const targetZoom=Math.max(map.getZoom(),9.6);
  map.easeTo({center:[Number(e.lng),Number(e.lat)],zoom:Math.min(targetZoom,12),duration:430});
  setTimeout(()=>{
    if(map.getZoom()>=7) showPopup(e);
  },455);
}

function fitEvents(events){
  if(!events.length) return;
  if(events.length===1){ map.flyTo({center:[events[0].lng,events[0].lat],zoom:10.5,duration:650}); return; }
  const b=new mapboxgl.LngLatBounds();
  events.forEach(e=>b.extend([e.lng,e.lat]));
  map.fitBounds(b,{padding:{top:65,bottom:65,left:65,right:65},maxZoom:10.5,duration:750});
}

function groupedNearby(events){
  const groups=new Map();
  for(const e of events){
    const key=(e.attractionId||e.artist).toLowerCase();
    if(!key) continue;
    const g=groups.get(key)||{
      id:e.attractionId||"",name:e.artist,image:e.artistImage||e.image||"",
      count:0,first:e.date||"9999-99-99",events:[]
    };
    g.count++;
    g.events.push(e);
    if((e.date||"9999-99-99")<g.first) g.first=e.date;
    if(!g.image) g.image=e.artistImage||e.image||"";
    groups.set(key,g);
  }
  return [...groups.values()]
    .sort((a,b)=>b.count-a.count||a.first.localeCompare(b.first)||a.name.localeCompare(b.name))
    .slice(0,10)
    .map((g,i)=>({...g,rank:i+1,shows:g.count}));
}

function renderEventList(box,events){
  box.textContent="";
  const sorted=events.slice().sort((a,b)=>String(a.date||"9999").localeCompare(String(b.date||"9999")));
  if(!sorted.length){
    const n=document.createElement("div"); n.className="tour-none"; n.textContent="No upcoming dates found.";
    box.appendChild(n); return;
  }

  let shown=0;
  let more=null;

  const draw=()=>{
    const next=Math.min(sorted.length,shown+10);
    for(let i=shown;i<next;i++){
      const e=sorted[i];
      const b=document.createElement("button"); b.type="button"; b.className="event-link";
      const d=document.createElement("span"); d.className="event-date"; d.textContent=shortDate(e);
      const p=document.createElement("span"); p.className="event-place";
      const city=document.createElement("span"); city.className="event-city"; city.textContent=[e.city,e.countryCode].filter(Boolean).join(", ")||"Venue TBA";
      const venue=document.createElement("span"); venue.className="event-venue"; venue.textContent=e.venue||e.name||"";
      p.append(city,venue); b.append(d,p);
      b.addEventListener("click",()=>focusEventOnMap(e));
      if(more) box.insertBefore(b,more); else box.appendChild(b);
    }
    shown=next;
    if(more && shown>=sorted.length){
      more.remove();
      more=null;
    }
  };

  if(sorted.length>10){
    more=document.createElement("button");
    more.type="button";
    more.className="tour-more";
    more.textContent="More";
    more.addEventListener("click",()=>{
      draw();
    });
    box.appendChild(more);
  }

  draw();
}

async function eventsForArtist(item,mode){
  if(mode==="nearby" && Array.isArray(item.events)) return item.events;
  const key=item.id ? "id:"+item.id : "name:"+String(item.name||"").toLowerCase();
  if(artistEventCache.has(key)) return artistEventCache.get(key);
  const params=item.id ? {attractionId:item.id} : {artist:item.name};
  const events=await getEvents(params);
  artistEventCache.set(key,events);
  return events;
}

function prefetchArtist(item){
  const key=item.id ? "id:"+item.id : "name:"+String(item.name||"").toLowerCase();
  if(!key || artistEventCache.has(key)) return;
  eventsForArtist(item,"popular").catch(()=>{});
}

function prefetchPopular(items){
  const work=()=>items.slice(0,4).forEach(prefetchArtist);
  if("requestIdleCallback" in window) requestIdleCallback(work,{timeout:1200});
  else setTimeout(work,220);
}

async function toggleArtist(item,card,mode){
  const key=artistKey(item);
  const box=card.querySelector(".tour-events");
  const opening=expandedKey!==key;
  root.querySelectorAll(".tour-card.open").forEach(el=>{
    el.classList.remove("open");
  });

  if(!opening){
    expandedKey="";
    restoreModeMap();
    return;
  }

  expandedKey=key;
  card.classList.add("open");
  box.textContent="";
  const loading=document.createElement("div"); loading.className="tour-loading"; loading.textContent="Loading dates...";
  box.appendChild(loading);

  try{
    const events=await eventsForArtist(item,mode);
    if(expandedKey!==key) return;
    renderEventList(box,events);
    setTimeout(()=>card.scrollIntoView({block:"nearest",behavior:"smooth"}),30);
    if(events.length){
      setEventData(events);
      fitEvents(events);
      setStatus(events.length+" upcoming concerts · "+item.name);
    }
  }catch(err){
    console.error(err);
    box.textContent="";
    const n=document.createElement("div"); n.className="tour-none"; n.textContent="Could not load tour dates.";
    box.appendChild(n);
  }
}

function renderArtists(items,mode){
  expandedKey="";
  toursEl.textContent="";
  sideEmpty.hidden=!!items.length;
  if(!items.length){
    sideEmpty.textContent=mode==="popular" ? "No popular artists are available right now." : "No artists found in this area.";
    return;
  }

  items.forEach((item,index)=>{
    const card=document.createElement("div"); card.className="tour-card";
    const row=document.createElement("button"); row.type="button"; row.className="tour-row";

    const rank=document.createElement("span"); rank.className="tour-rank"; rank.textContent=String(item.rank||index+1);

    const art=document.createElement("span"); art.className="tour-art";
    const img=document.createElement("img"); img.src=item.image||"/logo.png"; img.alt=""; img.loading="lazy";
    img.addEventListener("error",()=>{ img.src="/logo.png"; },{once:true});
    art.appendChild(img);

    const copy=document.createElement("span"); copy.className="tour-copy";
    const name=document.createElement("span"); name.className="tour-name"; name.textContent=item.name||"Artist";
    const meta=document.createElement("span"); meta.className="tour-meta";
    const shows=Number(item.shows||item.count||0);
    meta.textContent=mode==="popular"
      ? "Upcoming shows"
      : (shows+" nearby "+(shows===1?"show":"shows"));
    copy.append(name,meta);

    const chev=document.createElement("span"); chev.className="tour-chevron";
    chev.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>';

    row.append(rank,art,copy,chev);
    const box=document.createElement("div"); box.className="tour-events";
    row.addEventListener("click",()=>toggleArtist(item,card,mode));
    if(mode==="popular"){
      row.addEventListener("pointerenter",()=>prefetchArtist(item),{once:true});
      row.addEventListener("focus",()=>prefetchArtist(item),{once:true});
    }
    card.append(row,box); toursEl.appendChild(card);
  });
}

function restoreModeMap(){
  if(activeMode==="popular"){
    setEventData(popularEvents);
    setStatus(popularEvents.length ? "Popular Ticketmaster artists · worldwide" : "");
  }else{
    setEventData(nearbyEvents,nearbyTotal);
    const label=lastArea?.label||"Selected area";
    setStatus(nearbyTotal ? nearbyTotal+" concerts · "+label : "No Ticketmaster concerts found · "+label);
  }
}

async function getPayload(params){
  const u=new URL("/api/concerts",location.origin);
  Object.entries(params).forEach(([k,v])=>{ if(v!==""&&v!=null) u.searchParams.set(k,v); });
  const r=await fetch(u,{headers:{"Accept":"application/json"}});
  const j=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(j.error||"concerts_unavailable");
  return j;
}
async function getEvents(params){ return (await getPayload(params)).events||[]; }

function mergeHotspots(rows){
  const byKey=new Map();
  for(const h of rows){
    const key=(String(h.city||"")+"|"+String(h.countryCode||"")).toLowerCase();
    const prev=byKey.get(key);
    if(!prev || Number(h.count||0)>Number(prev.count||0)) byKey.set(key,h);
  }
  return [...byKey.values()].sort((a,b)=>Number(b.count||0)-Number(a.count||0)||String(a.city||"").localeCompare(String(b.city||"")));
}

async function loadHotspots(){
  hotspots=[];
  const regions=[
    "na_west","na_east","latam_north","latam_south",
    "eu_west","eu_central","eu_east","mena","africa",
    "south_asia","east_asia","se_asia","oceania"
  ];

  for(let i=0;i<regions.length;i+=3){
    const batch=regions.slice(i,i+3);
    const results=await Promise.allSettled(batch.map(region=>getPayload({mode:"hotspots",region,v:"hotspots-v13"})));
    for(const result of results){
      if(result.status==="fulfilled") hotspots=mergeHotspots(hotspots.concat(result.value.hotspots||[]));
      else console.error(result.reason);
    }
    const src=map.getSource("hubs");
    if(src) src.setData(hubsGeoJSON());
  }
}

async function loadPopular(force=false){
  setMode("popular");
  sideSub.textContent="Popular artists with upcoming Ticketmaster shows.";
  sideEmpty.hidden=false;
  sideEmpty.textContent="Loading popular artists...";
  if(popularArtists.length && !force){
    renderArtists(popularArtists,"popular");
    setEventData(popularEvents);
    setStatus("Popular artists");
    return;
  }
  try{
    const data=await getPayload({mode:"popular",v:"popular-v13"});
    popularArtists=data.artists||[];
    popularEvents=[];
    renderArtists(popularArtists,"popular");
    prefetchPopular(popularArtists);
    setEventData([]);
    setStatus(popularArtists.length ? "Popular artists" : "Popular concerts are unavailable right now.");
  }catch(err){
    console.error(err);
    toursEl.textContent="";
    sideEmpty.hidden=false;
    sideEmpty.textContent="Could not load popular artists right now.";
    setStatus("Could not load popular concerts right now.");
  }
}

async function loadArea(lat,lng,label,opts={}){
  setMode("nearby");
  sideSub.textContent="Artists with the most upcoming events in this area.";
  setStatus("Loading concerts...");
  try{
    const searchRadius=Math.max(5,Math.min(500,Number(opts.radius ?? radiusEl.value)||100));
    const data=await getPayload({lat,lng,radius:searchRadius});
    const events=data.events||[];
    const total=Number(data.page?.totalElements ?? events.length) || events.length;

    nearbyEvents=events;
    nearbyTotal=total;
    lastArea={lat,lng,label,radius:searchRadius};

    renderArtists(groupedNearby(events),"nearby");
    setEventData(events,total);
    if(opts.fit) fitEvents(events);
    setStatus(total ? total+" concerts · "+label : "No Ticketmaster concerts found · "+label);
  }catch(err){
    console.error(err);
    toursEl.textContent="";
    sideEmpty.hidden=false;
    sideEmpty.textContent="Could not load concerts in this area.";
    setStatus(err.message==="ticketmaster_key_missing" ? "Concert search is being connected. Please try again shortly." : "Could not load concerts right now.");
  }
}

function requestLocation(){
  if(!navigator.geolocation){
    setStatus("Location is not available in this browser.");
    return;
  }
  setStatus("Getting your location...");
  navigator.geolocation.getCurrentPosition(
    p=>{
      userMoving=false;
      map.flyTo({center:[p.coords.longitude,p.coords.latitude],zoom:9,duration:650});
      loadArea(p.coords.latitude,p.coords.longitude,"Near you",{fit:false});
    },
    ()=>setStatus("Location permission was not granted. Search for a city instead."),
    {enableHighAccuracy:false,timeout:12000,maximumAge:600000}
  );
}

function featureLabel(f){
  return f?.properties?.full_address || f?.properties?.name_preferred || f?.properties?.name || "";
}
async function geocode(q,autocomplete=true){
  const u=new URL("https://api.mapbox.com/search/geocode/v6/forward");
  u.searchParams.set("q",q); u.searchParams.set("access_token",MAPBOX_TOKEN);
  u.searchParams.set("types","place,locality,region,country"); u.searchParams.set("limit","5");
  u.searchParams.set("autocomplete",autocomplete?"true":"false");
  const r=await fetch(u); if(!r.ok) throw new Error("geocode_failed");
  return (await r.json()).features||[];
}
async function selectFeature(f){
  const coords=f?.geometry?.coordinates;
  if(!coords||coords.length<2) return;
  const label=featureLabel(f)||search.value.trim()||"Selected area";
  search.value=label; suggestions.hidden=true;
  userMoving=false;
  map.flyTo({center:[coords[0],coords[1]],zoom:9,duration:650});
  await loadArea(coords[1],coords[0],label,{fit:false});
}
function renderSuggestions(features){
  suggestions.textContent="";
  if(!features.length){ suggestions.hidden=true; return; }
  features.forEach(f=>{
    const b=document.createElement("button"); b.className="suggestion"; b.type="button";
    b.textContent=featureLabel(f); b.addEventListener("click",()=>selectFeature(f)); suggestions.appendChild(b);
  });
  suggestions.hidden=false;
}

nearTab.addEventListener("click",()=>{
  if(lastArea){
    setMode("nearby");
    sideSub.textContent="Artists with the most upcoming events in this area.";
    renderArtists(groupedNearby(nearbyEvents),"nearby");
    setEventData(nearbyEvents,nearbyTotal);
    restoreModeMap();
  }else{
    requestLocation();
  }
});
popularTab.addEventListener("click",()=>loadPopular());

search.addEventListener("input",()=>{
  clearTimeout(suggestTimer);
  const q=search.value.trim();
  if(q.length<2){ suggestions.hidden=true; return; }
  suggestTimer=setTimeout(async()=>{
    try{ renderSuggestions(await geocode(q,true)); }catch{ suggestions.hidden=true; }
  },260);
});
search.addEventListener("keydown",async e=>{
  if(e.key!=="Enter") return;
  e.preventDefault();
  const q=search.value.trim(); if(!q) return;
  try{ const f=await geocode(q,false); if(f[0]) selectFeature(f[0]); else setStatus("City not found."); }
  catch{ setStatus("Could not search that location."); }
});
root.addEventListener("click",e=>{ if(!e.target.closest(".search-wrap")) suggestions.hidden=true; });

$("#locateBtn").addEventListener("click",requestLocation);

function closeRadiusMenu(){
  radiusMenu.classList.remove("open");
  radiusTrigger.setAttribute("aria-expanded","false");
}
function openRadiusMenu(){
  radiusMenu.classList.add("open");
  radiusTrigger.setAttribute("aria-expanded","true");
}
radiusTrigger.addEventListener("click",e=>{
  e.stopPropagation();
  radiusMenu.classList.contains("open") ? closeRadiusMenu() : openRadiusMenu();
});
radiusOptions.querySelectorAll(".radius-option").forEach(option=>{
  option.addEventListener("click",()=>{
    const value=String(option.dataset.value||"100");
    radiusEl.value=value;
    radiusLabel.textContent=value+" km";
    radiusOptions.querySelectorAll(".radius-option").forEach(btn=>{
      const active=btn===option;
      btn.classList.toggle("active",active);
      btn.setAttribute("aria-selected",active?"true":"false");
    });
    closeRadiusMenu();
    radiusEl.dispatchEvent(new Event("change"));
  });
});
root.addEventListener("click",e=>{ if(!e.target.closest(".radius-menu")) closeRadiusMenu(); });
root.addEventListener("keydown",e=>{ if(e.key==="Escape") closeRadiusMenu(); });

radiusEl.addEventListener("change",()=>{
  if(lastArea) loadArea(lastArea.lat,lastArea.lng,lastArea.label,{fit:false,radius:Number(radiusEl.value)});
  else if(map.getZoom()>=4){
    const c=map.getCenter(); loadArea(c.lat,c.lng,"Map area",{fit:false,radius:Number(radiusEl.value)});
  }
});

function distanceKm(lat1,lng1,lat2,lng2){
  const r=6371,toRad=d=>d*Math.PI/180;
  const p1=toRad(lat1),p2=toRad(lat2),dp=toRad(lat2-lat1),dl=toRad(lng2-lng1);
  const h=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
  return 2*r*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
}
function visibleRadiusKm(){
  const c=map.getCenter(),b=map.getBounds();
  const horizontal=distanceKm(c.lat,c.lng,c.lat,b.getEast());
  const vertical=distanceKm(c.lat,c.lng,b.getNorth(),c.lng);
  return Math.round(Math.max(5,Math.min(500,Math.max(horizontal,vertical))));
}

map.on("movestart",e=>{ if(e.originalEvent) userMoving=true; });
map.on("zoomend",()=>{
  if(!popup || !map.getLayer("clusters")) return;
  const clusters=map.queryRenderedFeatures({layers:["clusters"]});
  if(map.getZoom()<7 || clusters.length){
    popup.remove();
    popup=null;
  }
});
map.on("moveend",()=>{
  if(!userMoving) return;
  userMoving=false;
  if(map.getZoom()<4) return;
  clearTimeout(moveTimer);
  moveTimer=setTimeout(()=>{
    const c=map.getCenter();
    loadArea(c.lat,c.lng,"Map area",{fit:false,radius:visibleRadiusKm()});
  },360);
});

map.on("load",()=>{
  addLayers();
  loadHotspots();
  loadPopular();
});

host._concertMap = map;
host.resizeConcertMap = ()=>{ try{ map.resize(); }catch(e){} };

}

class Music98Concerts extends HTMLElement{
  constructor(){
    super();
    this._started=false;
    this.attachShadow({mode:"open"});
  }
  connectedCallback(){
    if(!this.shadowRoot.innerHTML){
      const mapCss=document.createElement("link");
      mapCss.rel="stylesheet";
      mapCss.href="https://api.mapbox.com/mapbox-gl-js/v3.15.0/mapbox-gl.css";
      const style=document.createElement("style");
      style.textContent=CONCERTS_CSS;
      const shell=document.createElement("div");
      shell.innerHTML=CONCERTS_HTML;
      this.shadowRoot.append(mapCss,style,...shell.childNodes);
    }

    const start=()=>{
      if(this._started) {
        if(this.resizeConcertMap) requestAnimationFrame(()=>this.resizeConcertMap());
        return;
      }
      this._started=true;
      ensureMapbox().then(()=>initConcerts(this.shadowRoot,this)).catch(err=>{
        console.error(err);
        const st=this.shadowRoot.querySelector("#status");
        if(st) st.textContent="Could not load the concert map.";
      });
    };

    const visible=()=>{
      const r=this.getBoundingClientRect();
      return r.width>0 && r.height>0;
    };

    if(visible()) start();

    this._observer=new IntersectionObserver(entries=>{
      if(entries.some(e=>e.isIntersecting)){
        start();
        setTimeout(()=>{ if(this.resizeConcertMap) this.resizeConcertMap(); },60);
      }
    },{threshold:0.01});
    this._observer.observe(this);
  }
  disconnectedCallback(){
    if(this._observer) this._observer.disconnect();
  }
}
if(!customElements.get("music98-concerts")) customElements.define("music98-concerts",Music98Concerts);
