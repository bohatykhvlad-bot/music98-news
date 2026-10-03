"use strict";
/* Identical scroll-state transitions to the main header, without site search. */
const topbar = document.querySelector(".topbar");
let hpRaf = 0;
let hpAway = false;
let hpReady = false;
let meltTimer = 0;
function setHeaderAway(away){
  if(hpReady && away === hpAway) return;
  clearTimeout(meltTimer);
  if(!hpReady){
    topbar.classList.toggle("is-away", away);
    topbar.classList.remove("is-melting");
    hpAway = away;
    hpReady = true;
    return;
  }
  if(away){
    topbar.classList.remove("is-melting");
    topbar.classList.add("is-away");
    hpAway = true;
    return;
  }
  topbar.classList.add("is-melting");
  hpAway = false;
  requestAnimationFrame(()=>{
    requestAnimationFrame(()=>{
      if(hpAway) return;
      topbar.classList.remove("is-away");
    });
  });
  meltTimer = setTimeout(()=>{
    if(!hpAway) topbar.classList.remove("is-melting");
  }, 520);
}
function onScroll(){
  if(hpRaf) return;
  hpRaf = requestAnimationFrame(()=>{
    hpRaf = 0;
    const y = window.scrollY || document.documentElement.scrollTop || 0;
    let away = hpAway;
    if(away){
      if(y <= 1) away = false;
    }else if(y > 12){
      away = true;
    }
    setHeaderAway(away);
  });
}
function syncHeaderPad(){
  if(!topbar) return;
  document.documentElement.style.setProperty("--header-h", Math.ceil(topbar.getBoundingClientRect().height)+"px");
}
window.addEventListener("scroll", onScroll, {passive:true});
window.addEventListener("resize", ()=>{ onScroll(); syncHeaderPad(); });
window.addEventListener("orientationchange", ()=>{ onScroll(); syncHeaderPad(); });
onScroll();
syncHeaderPad();
setTimeout(syncHeaderPad, 50);

