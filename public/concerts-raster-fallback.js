/* WebGL-independent backup map, loaded only if the main GL constructor fails. */
(function(){
"use strict";
function library(){
  if(window.L?.map)return Promise.resolve(window.L);
  if(window.__music98LeafletPromise)return window.__music98LeafletPromise;
  function attempt(url){
    return new Promise((resolve,reject)=>{
      const script=document.createElement("script");
      let done=false;
      const t=setTimeout(()=>end(new Error("raster_library_timeout")),10000);
      function end(error){
        if(done)return;
        done=true;clearTimeout(t);
        script.onload=script.onerror=null;
        if(error){script.remove();reject(error);}
        else if(window.L?.map)resolve(window.L);
        else reject(new Error("raster_library_missing"));
      }
      script.onload=()=>end();
      script.onerror=()=>end(new Error("raster_library_download_failed"));
      script.src=url;document.head.appendChild(script);
    });
  }
  window.__music98LeafletPromise=attempt("https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js")
    .catch(()=>attempt("https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js"))
    .catch(e=>{window.__music98LeafletPromise=null;throw e;});
  return window.__music98LeafletPromise;
}
function validFeature(f){
  const coords=f?.geometry?.coordinates;
  return Array.isArray(coords)&&coords.length>1
    &&Number.isFinite(Number(coords[0]))&&Number.isFinite(Number(coords[1]))
    &&Math.abs(coords[0])<=180&&Math.abs(coords[1])<=90;
}
window.music98InitRasterConcerts=async function(config){
  const root=config.root,container=root.querySelector("#map"),fallback=root.querySelector("#mapFallback");
  if(!container)throw Error("raster_container_missing");
  const css=document.createElement("link");
  css.rel="stylesheet";css.href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css";
  root.appendChild(css);
  const styles=document.createElement("style");
  styles.textContent=[
    "#map .leaflet-container{width:100%;height:100%;background:#eaf5f8;font-family:var(--font)}",
    "#map .leaflet-control-attribution{font-size:10px}",
    "#map .leaflet-control-zoom a{color:#15181a}",
    "#map .m98-raster-icon{border:0;background:transparent}",
    "#map .m98-raster-dot{display:block;width:15px;height:15px;background:#00fdfb;border:2px solid #fff;box-shadow:0 1px 6px rgba(0,45,50,.24);border-radius:50%}",
    "#map .m98-raster-popup{font:500 13px/1.4 var(--font);max-width:240px}",
    "#map .m98-raster-popup strong{display:block;margin-bottom:4px;font-size:14px}",
    "#map .m98-raster-popup a{display:inline-block;margin-top:7px;text-decoration:underline}"
  ].join("\n");
  root.appendChild(styles);
  const L=await library();
  const map=L.map(container,{zoomControl:true,attributionControl:true,preferCanvas:false,minZoom:1,maxZoom:16,worldCopyJump:false});
  map.setView(config.mobile?[18,5]:[27,8],config.mobile?1:2);
  const token=config.token;
  if(!/^pk\.[A-Za-z0-9._-]+$/.test(token))throw Error("mapbox_public_token_missing");
  let tilesErrored=false,ready=false;
  const tiles=L.tileLayer(
    "https://api.mapbox.com/styles/v1/mapbox/light-v11/tiles/256/{z}/{x}/{y}@2x?access_token="+encodeURIComponent(token),
    {tileSize:256,maxZoom:16,maxNativeZoom:16,attribution:'© <a href="https://www.mapbox.com/about/maps/" target="_blank" rel="noopener">Mapbox</a> © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'}
  );
  tiles.on("tileload",()=>{
    if(!ready){ready=true;fallback.hidden=true;config.onReady?.();}
  });
  tiles.on("tileerror",()=>{
    if(tilesErrored)return;
    tilesErrored=true;
    config.onWarning?.("The alternative map could not download its background. Check whether your browser blocks api.mapbox.com.");
  });
  tiles.addTo(map);
  const dot=L.divIcon({className:"m98-raster-icon",html:'<span class="m98-raster-dot"></span>',iconSize:[17,17],iconAnchor:[8,8]});
  const group=L.layerGroup().addTo(map);
  const sources={hubs:[],events:[],"artist-events":[]};
  let mode="popular";
  const render=()=>{
    group.clearLayers();
    let key="hubs";
    if(mode==="artist")key="artist-events";
    else if((mode==="nearby"||mode==="artist-area")&&map.getZoom()>=5)key="events";
    for(const feature of sources[key]||[]){
      if(!validFeature(feature))continue;
      const [lng,lat]=feature.geometry.coordinates;
      const p=feature.properties||{};
      const item=L.marker([lat,lng],{icon:dot,keyboard:true}).addTo(group);
      const label=key==="hubs"?[p.name,p.stateCode,p.countryCode].filter(Boolean).join(", "):String(p.artist||p.name||"Concert");
      item.bindTooltip(label,{direction:"top",opacity:.96});
      item.on("click",()=>{
        if(key==="hubs")config.onCity?.({lat,lng,city:p.name,stateCode:p.stateCode,countryCode:p.countryCode,radiusKm:p.radiusKm,tier:p.tier});
        else config.onEvent?.(String(p.id||""),key);
      });
    }
    config.onRender?.({count:group.getLayers().length,source:key});
  };
  map.on("zoomend",render);
  const api={
    setSource(id,data){
      if(!Object.prototype.hasOwnProperty.call(sources,id))return;
      sources[id]=Array.isArray(data?.features)?data.features:[];
      render();
    },
    setMode(next){mode=next;render();},
    flyTo({center,zoom}){if(center?.length===2)map.flyTo([center[1],center[0]],zoom??map.getZoom(),{animate:true,duration:.45});},
    fitBounds(bounds,opts={}){
      if(bounds?.length===2)map.fitBounds([[bounds[0][1],bounds[0][0]],[bounds[1][1],bounds[1][0]]],{padding:[20,20],...opts});
    },
    resize(){map.invalidateSize(false);},
    getZoom(){return map.getZoom();},
    getCenter(){const c=map.getCenter();return {lat:c.lat,lng:c.lng};},
    openEventPopup(e){
      if(!Number.isFinite(Number(e?.lat))||!Number.isFinite(Number(e?.lng)))return;
      const div=document.createElement("div");div.className="m98-raster-popup";
      const h=document.createElement("strong");h.textContent=e.artist||e.name||"Concert";
      const info=document.createElement("div");info.textContent=[e.date,e.venue,e.city].filter(Boolean).join(" · ");
      div.append(h,info);
      if(/^https:\/\//.test(e.url||"")){
        const a=document.createElement("a");a.href=e.url;a.target="_blank";a.rel="sponsored noopener noreferrer";a.textContent="Buy Tickets";
        div.appendChild(a);
      }
      L.popup({autoPan:true,maxWidth:260}).setLatLng([e.lat,e.lng]).setContent(div).openOn(map);
    },
    remove(){map.remove();}
  };
  config.onReadyApi?.(api);
  render();
  requestAnimationFrame(()=>map.invalidateSize(false));
  setTimeout(()=>{if(!ready)config.onWarning?.("The alternative map is waiting for background tiles. Check access to api.mapbox.com.");},12000);
  return api;
};
})();