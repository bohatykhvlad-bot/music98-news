(function(){
"use strict";
const MAPBOX_TOKEN = "pk.eyJ1IjoibXVzaWM5OCIsImEiOiJjbXVsaWM1M2kxbm4xMnpxeW83bWR5aHg5In0.8Y56YcxjJ3kpa5g51Yl3aw";
let map = null;
function ensureMap(){
  if(map){
    requestAnimationFrame(()=>map.resize());
    setTimeout(()=>map.resize(),80);
    return map;
  }
  if(typeof mapboxgl === "undefined") return null;
  mapboxgl.accessToken = MAPBOX_TOKEN;
  map = new mapboxgl.Map({
    container:"concertMap",
    style:"mapbox://styles/mapbox/streets-v12",
    projection:"mercator",
    center:[0,22],
    zoom:1.55,
    attributionControl:true
  });
  map.addControl(new mapboxgl.NavigationControl({showCompass:false}),"bottom-right");
  map.on("load",()=>{
    addLayers();
    requestAnimationFrame(()=>map.resize());
    setTimeout(()=>map.resize(),120);
  });
  map.on("moveend",()=>scheduleViewportLoad());
  return map;
}
window.ensureConcertsMap = ensureMap;
const statusEl=$("#concertStatus"), toursEl=$("#concertTours"), sideEmpty=$("#concertSideEmpty");
const sideTitle=$("#concertSideTitle"), sideSub=$("#concertSideSub"), resetArtist=$("#concertResetArtist");
const search=$("#concertCitySearch"), suggestions=$("#concertSuggestions"), radiusEl=$("#concertRadius");
let currentEvents=[];
let lastArea=null;
let suggestTimer=0;
let popup=null;
let viewportTimer=0;
let suppressViewportLoad=0;
let viewportRequestSeq=0;

function escText(v){ return String(v==null?"":v); }
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

function scheduleViewportLoad(){
  if(!map || suppressViewportLoad) return;
  clearTimeout(viewportTimer);
  viewportTimer=setTimeout(async()=>{
    if(!map || suppressViewportLoad || !document.querySelector("#tab-concerts.active")) return;
    const center=map.getCenter();
    const seq=++viewportRequestSeq;
    setStatus("Loading concerts in this area...");
    try{
      const events=await getEvents({lat:center.lat,lng:center.lng,radius:radiusEl.value});
      if(seq!==viewportRequestSeq) return;
      lastArea={lat:center.lat,lng:center.lng,label:"Map area"};
      sideTitle.textContent="Popular nearby";
      sideSub.textContent="Artists with the most upcoming events in this map area.";
      resetArtist.hidden=true;
      renderTours(events);
      applyEvents(events,"Map area",false);
    }catch(err){
      console.error(err);
      if(seq===viewportRequestSeq) setStatus("Could not load concerts in this area.");
    }
  },420);
}

function toGeoJSON(events){
  return {
    type:"FeatureCollection",
    features:events.map(e=>({
      type:"Feature",
      geometry:{type:"Point",coordinates:[e.lng,e.lat]},
      properties:{
        id:e.id,
        artist:e.artist,
        name:e.name,
        label:shortDate(e)+"\n"+e.artist
      }
    }))
  };
}
function addLayers(){
  if(map.getSource("events")) return;
  map.addSource("events",{type:"geojson",data:toGeoJSON([]),cluster:true,clusterMaxZoom:11,clusterRadius:48});
  map.addLayer({id:"clusters",type:"circle",source:"events",filter:["has","point_count"],paint:{
    "circle-color":"#15181a","circle-radius":["step",["get","point_count"],18,20,22,50,27],
    "circle-stroke-color":"#ffffff","circle-stroke-width":2
  }});
  map.addLayer({id:"cluster-count",type:"symbol",source:"events",filter:["has","point_count"],layout:{
    "text-field":["get","point_count_abbreviated"],"text-size":12
  },paint:{"text-color":"#ffffff"}});
  map.addLayer({id:"event-points",type:"circle",source:"events",filter:["!",["has","point_count"]],paint:{
    "circle-color":"#00fdfb","circle-radius":8,"circle-stroke-color":"#15181a","circle-stroke-width":2
  }});
  map.addLayer({id:"event-labels",type:"symbol",source:"events",minzoom:7.2,filter:["!",["has","point_count"]],layout:{
    "text-field":["get","label"],"text-size":11,"text-font":["Open Sans Semibold","Arial Unicode MS Bold"],
    "text-offset":[0,1.35],"text-anchor":"top","text-max-width":14,"text-allow-overlap":false
  },paint:{"text-color":"#15181a","text-halo-color":"#ffffff","text-halo-width":1.5}});
  map.on("click","clusters",async e=>{
    const f=map.queryRenderedFeatures(e.point,{layers:["clusters"]})[0];
    if(!f) return;
    const z=await map.getSource("events").getClusterExpansionZoom(f.properties.cluster_id);
    map.easeTo({center:f.geometry.coordinates,zoom:z});
  });
  map.on("click","event-points",e=>{
    const id=String(e.features?.[0]?.properties?.id||"");
    const ev=currentEvents.find(x=>x.id===id);
    if(ev) showPopup(ev);
  });
  map.on("mouseenter","clusters",()=>map.getCanvas().style.cursor="pointer");
  map.on("mouseleave","clusters",()=>map.getCanvas().style.cursor="");
  map.on("mouseenter","event-points",()=>map.getCanvas().style.cursor="pointer");
  map.on("mouseleave","event-points",()=>map.getCanvas().style.cursor="");
}
function popupContent(e){
  const root=document.createElement("div");
  if(e.image){
    const img=document.createElement("img");
    img.className="concert-pop-img"; img.src=e.image; img.alt=""; img.loading="lazy";
    root.appendChild(img);
  }
  const body=document.createElement("div"); body.className="concert-pop-body";
  const title=document.createElement("div"); title.className="concert-pop-title"; title.textContent=e.artist||e.name;
  body.appendChild(title);
  const date=document.createElement("div"); date.className="concert-pop-meta"; date.textContent=fmtDate(e)+(e.time?" · "+e.time.slice(0,5):"");
  body.appendChild(date);
  const place=document.createElement("div"); place.className="concert-pop-meta"; place.textContent=placeLine(e);
  body.appendChild(place);
  if(e.url){
    const a=document.createElement("a"); a.className="concert-buy"; a.href=e.url; a.target="_blank"; a.rel="sponsored noopener";
    a.textContent="Buy Tickets"; body.appendChild(a);
  }
  root.appendChild(body);
  return root;
}
function showPopup(e){
  if(!ensureMap()) return;
  if(popup) popup.remove();
  popup=new mapboxgl.Popup({offset:14,closeButton:true,maxWidth:"310px"})
    .setLngLat([e.lng,e.lat]).setDOMContent(popupContent(e)).addTo(map);
}
function fitEvents(events){
  if(!ensureMap() || !events.length) return;
  if(events.length===1){ map.flyTo({center:[events[0].lng,events[0].lat],zoom:11}); return; }
  const b=new mapboxgl.LngLatBounds();
  events.forEach(e=>b.extend([e.lng,e.lat]));
  map.fitBounds(b,{padding:{top:70,bottom:70,left:70,right:70},maxZoom:11,duration:850});
}
function renderTours(events){
  const groups=new Map();
  for(const e of events){
    const key=(e.attractionId||e.artist).toLowerCase();
    if(!key) continue;
    const g=groups.get(key)||{name:e.artist,count:0,first:e.date||"9999-99-99"};
    g.count++; if((e.date||"9999-99-99")<g.first) g.first=e.date; groups.set(key,g);
  }
  const top=[...groups.values()].sort((a,b)=>b.count-a.count||a.first.localeCompare(b.first)||a.name.localeCompare(b.name)).slice(0,10);
  toursEl.textContent="";
  sideEmpty.hidden=!!top.length;
  if(!top.length){ sideEmpty.textContent="No artists found for this search."; return; }
  top.forEach((g,i)=>{
    const b=document.createElement("button"); b.type="button"; b.className="concert-tour";
    const r=document.createElement("span"); r.className="concert-tour-rank"; r.textContent=String(i+1);
    const n=document.createElement("span"); n.className="concert-tour-name"; n.textContent=g.name;
    const c=document.createElement("span"); c.className="concert-tour-count"; c.textContent=g.count+" "+(g.count===1?"show":"shows");
    b.append(r,n,c);
    b.addEventListener("click",()=>loadArtist(g.name));
    toursEl.appendChild(b);
  });
}
function applyEvents(events,modeLabel,fit=true){
  currentEvents=events;
  ensureMap();
  if(map.getSource("events")) map.getSource("events").setData(toGeoJSON(events));
  else map.once("load",()=>map.getSource("events")?.setData(toGeoJSON(events)));
  if(fit){
    suppressViewportLoad++;
    fitEvents(events);
    setTimeout(()=>{ suppressViewportLoad=Math.max(0,suppressViewportLoad-1); },1000);
  }
  setStatus(events.length ? (events.length+" concerts · "+modeLabel) : ("No Ticketmaster concerts found · "+modeLabel));
}
async function getEvents(params){
  const u=new URL("/api/concerts",location.origin);
  Object.entries(params).forEach(([k,v])=>{ if(v!==""&&v!=null) u.searchParams.set(k,v); });
  const r=await fetch(u,{headers:{"Accept":"application/json"}});
  const j=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(j.error||"concerts_unavailable");
  return j.events||[];
}
async function loadArea(lat,lng,label){
  const radius=radiusEl.value;
  setStatus("Loading concerts...");
  try{
    const events=await getEvents({lat,lng,radius});
    lastArea={lat,lng,label};
    sideTitle.textContent="Popular nearby";
    sideSub.textContent="Artists with the most upcoming events in this search.";
    resetArtist.hidden=true;
    renderTours(events);
    applyEvents(events,label);
  }catch(err){
    console.error(err);
    setStatus(err.message==="ticketmaster_key_missing" ? "Concert search is being connected. Please try again shortly." : "Could not load concerts right now.");
  }
}
async function loadArtist(name){
  setStatus("Loading "+name+" tour dates...");
  sideTitle.textContent=name;
  sideSub.textContent="Upcoming Ticketmaster dates currently available worldwide.";
  resetArtist.hidden=!lastArea;
  try{
    const events=await getEvents({artist:name});
    toursEl.textContent="";
    sideEmpty.hidden=false;
    sideEmpty.textContent=events.length ? (events.length+" upcoming dates shown on the map.") : "No upcoming dates found.";
    applyEvents(events,name+" · worldwide");
  }catch(err){
    console.error(err); setStatus("Could not load tour dates right now.");
  }
}
resetArtist.addEventListener("click",()=>{ if(lastArea) loadArea(lastArea.lat,lastArea.lng,lastArea.label); });
radiusEl.addEventListener("change",()=>{
  if(map){
    const c=map.getCenter();
    loadArea(c.lat,c.lng,lastArea?.label||"Map area");
  }else if(lastArea) loadArea(lastArea.lat,lastArea.lng,lastArea.label);
});

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
  const m=ensureMap();
  if(m){
    suppressViewportLoad++;
    m.flyTo({center:[coords[0],coords[1]],zoom:9,duration:700});
    setTimeout(()=>{ suppressViewportLoad=Math.max(0,suppressViewportLoad-1); },900);
  }
  await loadArea(coords[1],coords[0],label);
}
function renderSuggestions(features){
  suggestions.textContent="";
  if(!features.length){ suggestions.hidden=true; return; }
  features.forEach(f=>{
    const b=document.createElement("button"); b.className="concert-suggestion"; b.type="button";
    b.textContent=featureLabel(f); b.addEventListener("click",()=>selectFeature(f)); suggestions.appendChild(b);
  });
  suggestions.hidden=false;
}
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
document.addEventListener("click",e=>{ if(!e.target.closest(".concert-search-wrap")) suggestions.hidden=true; });

$("#concertLocateBtn").addEventListener("click",()=>{
  if(!navigator.geolocation){ setStatus("Location is not available in this browser."); return; }
  setStatus("Getting your location...");
  navigator.geolocation.getCurrentPosition(
    p=>loadArea(p.coords.latitude,p.coords.longitude,"Near you"),
    ()=>setStatus("Location permission was not granted. Search for a city instead."),
    {enableHighAccuracy:false,timeout:12000,maximumAge:600000}
  );
});
window.addEventListener("resize",()=>{ if(map) requestAnimationFrame(()=>map.resize()); });
if(document.querySelector("#tab-concerts.active")) ensureMap();
})();
