import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";

const page=readFileSync(new URL("../public/index.html",import.meta.url),"utf8");
const begin=page.indexOf("function syncRail(sel){");
const end=page.indexOf('wireRail("#newsGrid"',begin);
assert.ok(begin>=0 && end>begin,"extract actual production desktop carousel functions");
const source=page.slice(begin,end);

function rig(){
  let time=0,nextRaf=0,raf=new Map();
  const mutationObservers=[],resizeObservers=[],winHandlers={};
  const list=()=>{const values=new Set();return {
    add:x=>values.add(x),remove:x=>values.delete(x),has:x=>values.has(x),
    toggle:(x,on)=>{if(on)values.add(x);else values.delete(x);}
  }};
  const createRail=id=>{
    const handlers={};
    const prev={classList:list(),handlers:{},style:{},setPointerCapture(){},addEventListener(n,cb){(this.handlers[n]??=[]).push(cb)}};
    const next={classList:list(),handlers:{},style:{},setPointerCapture(){},addEventListener(n,cb){(this.handlers[n]??=[]).push(cb)}};
    let scroll=0,reads=0,scrollWidth=9000,width=400;
    const rail={
      id,classList:list(),style:{},handlers,
      parentElement:{querySelector:s=>s.includes(".prev")?prev:next,classList:list()},
      firstElementChild:{getBoundingClientRect:()=>({width:243})},
      addEventListener(name,handler){(handlers[name]??=[]).push(handler)},
      emit(name,event){for(const handler of handlers[name]||[])handler(event)},
      scrollBy(args){this.steps.push(args);this.scrollLeft+=args.left;this.emit("scroll",{})},
      steps:[],
      get scrollWidth(){reads++;return scrollWidth},
      set scrollWidth(value){scrollWidth=value},
      get clientWidth(){return width},
      set clientWidth(value){width=value},
      get scrollLeft(){return scroll},
      set scrollLeft(value){scroll=Math.max(0,Math.min(scrollWidth-width,Number(value)||0));}
    };
    return {rail,prev,next,reads:()=>reads};
  };
  const a=createRail("#newsGrid"),b=createRail("#relGrid");
  const selectors=new Map([
    ["#newsGrid",a.rail],["#relGrid",b.rail],
    ["#newsPrev",a.prev],["#newsNext",a.next],
    ["#relPrev",b.prev],["#relNext",b.next]
  ]);
  class MutationObserver{constructor(cb){this.cb=cb;mutationObservers.push(this)}observe(target){this.target=target}}
  class ResizeObserver{constructor(cb){this.cb=cb;resizeObservers.push(this)}observe(target){this.target=target}}
  const window={addEventListener(name,cb){(winHandlers[name]??=[]).push(cb)}};
  const document={addEventListener(){},elementFromPoint(){return null}};
  const sandbox={
    $:selector=>selectors.get(selector),
    window,document,MutationObserver,ResizeObserver,
    performance:{now:()=>time},
    requestAnimationFrame:cb=>{const id=++nextRaf;raf.set(id,cb);return id},
    cancelAnimationFrame:id=>raf.delete(id),
    setTimeout(){return 0},
    console
  };
  const runtime=runInNewContext(source+"\n;({syncRail,wireRail})",sandbox);
  runtime.wireRail("#newsGrid","#newsPrev","#newsNext");
  runtime.wireRail("#relGrid","#relPrev","#relNext");
  const frame=dt=>{
    time+=dt;const current=[...raf.values()];raf.clear();
    for(const cb of current)cb(time);
  };
  const press=(which,ms,dt=1000/60)=>{
    const e={button:0,pointerId:1,preventDefault(){}};
    which.next.handlers.pointerdown[0](e);
    while(time+dt<=ms+0.0001)frame(dt);
    which.next.handlers.pointerup[0]({pointerId:1});
  };
  return {runtime,a,b,raf,mutationObservers,resizeObservers,winHandlers,frame,
    press,time:()=>time};
}

test("News and Releases install exactly one scroll handler and mutation observer each",()=>{
  const env=rig();
  for(const {rail} of [env.a,env.b])assert.equal(rail.handlers.scroll.length,1);
  assert.equal(env.mutationObservers.length,2);
  assert.equal(env.resizeObservers.length,2);
  assert.equal(env.winHandlers.resize.length,2);
});

test("News and Releases switch on the stationary viewport clip only during scrolling",()=>{
  const env=rig();
  for(const {rail,prev} of [env.a,env.b]){
    assert.equal(rail.parentElement.classList.has("rail-scrolled"),false);
    assert.equal(prev.classList.has("ok"),false);
    rail.scrollLeft=100;
    rail.emit("scroll",{});
    env.frame(1000/60);
    assert.equal(rail.parentElement.classList.has("rail-scrolled"),true);
    assert.equal(prev.classList.has("ok"),true);
    rail.scrollLeft=0;
    rail.emit("scroll",{});
    env.frame(1000/60);
    assert.equal(rail.parentElement.classList.has("rail-scrolled"),false);
    assert.equal(prev.classList.has("ok"),false);
  }
});

test("60Hz and 120Hz held arrows preserve press duration and nearly identical inertia",()=>{
  const samples=[];
  for(const hz of [60,120]){
    const env=rig(),{rail,next}=env.a;
    const dt=1000/hz;
    env.press(env.a,600,dt);
    const atRelease=rail.scrollLeft;
    assert.ok(atRelease>20,"holding the arrow must move the rail");
    assert.equal(rail.steps.length,0,"long hold must NOT fire a full extra step on release");
    for(let i=0;i<hz*0.55;i++)env.frame(dt);
    const after=rail.scrollLeft;
    assert.ok(after>atRelease,"arrow inertia must continue after long release");
    assert.ok(!next.classList.has("hold"),"arrow hover/hold tint must never latch");
    samples.push({hz,atRelease,after,distance:after-atRelease});
  }
  const [a,b]=samples;
  assert.ok(Math.abs(a.atRelease-b.atRelease)/a.atRelease<0.08,JSON.stringify(samples));
  assert.ok(Math.abs(a.distance-b.distance)/a.distance<0.08,JSON.stringify(samples));
});

test("brief arrow tap steps one card; cancelled press never triggers a step",()=>{
  const env=rig(),{rail,next}=env.a;
  next.handlers.pointerdown[0]({button:0,pointerId:2,preventDefault(){}});
  env.frame(1000/60);
  next.handlers.pointerup[0]({pointerId:2});
  assert.equal(rail.steps.length,1);
  assert.equal(rail.steps[0].behavior,"smooth");
  assert.equal(rail.steps[0].left,261);
  next.handlers.pointerdown[0]({button:0,pointerId:3,preventDefault(){}});
  next.handlers.pointercancel[0]({pointerId:3});
  assert.equal(rail.steps.length,1);
});

test("scroll events avoid layout width reads and coalesce to a single frame",()=>{
  const env=rig(),{rail,reads}=env.a;
  const initial=reads();
  assert.ok(initial>=1);
  for(let i=0;i<100;i++){rail.scrollLeft+=2;rail.emit("scroll",{})}
  assert.equal(reads(),initial,"scrolling must not force any scrollWidth measurement");
  env.frame(1000/60);
  assert.equal(reads(),initial,"scheduled scroll indicator refresh also uses cached extent");
  const newsMutation=env.mutationObservers.find(x=>x.target===rail);
  const newsResize=env.resizeObservers.find(x=>x.target===rail);
  newsMutation.cb();
  newsResize.cb();
  env.frame(1000/60);
  assert.equal(reads(),initial+1,"DOM/resize invalidations must share one layout measurement");
});

test("hidden Releases never caches an invalid negative max on tab switches",()=>{
  const env=rig(),{rail}=env.b;
  rail.clientWidth=0;
  env.runtime.syncRail("#relGrid");
  assert.equal(rail._max,null);
  rail.clientWidth=400;
  env.runtime.syncRail("#relGrid");
  assert.ok(rail._max>0);
  assert.equal(env.b.next.classList.has("ok"),true);
});

test("mouse drag retains lifted card and seamless momentum in both sections",()=>{
  for(const which of ["a","b"]){
    const env=rig(),{rail}=env[which];
    const card={
      classList:(()=>{const names=new Set();return {
        add:x=>names.add(x),remove:x=>names.delete(x),has:x=>names.has(x)
      }})(),
      style:{},
      closest:selector=>selector.includes(".card")?card:null
    };
    rail.emit("pointerdown",{target:card,button:0,pointerId:4,pointerType:"mouse",clientX:200});
    assert.ok(rail.classList.has("dragging"));
    assert.ok(card.classList.has("grab"));
    assert.equal(card.style.transform,"translateY(-4px)");
    rail.emit("pointermove",{pointerId:4,clientX:160});
    env.frame(1000/60);
    assert.ok(rail.scrollLeft>=39 && rail.scrollLeft<=41);
    rail.emit("pointerup",{pointerId:4});
    assert.equal(rail.classList.has("dragging"),false);
    assert.equal(card.classList.has("grab"),true,"lift survives the release");
    const released=rail.scrollLeft;
    env.frame(1000/60);
    assert.ok(rail.scrollLeft>released,"mouse momentum continues smoothly");
  }
});

test("desktop lift, band, glass arrows, and distinct mobile stacking are unchanged",()=>{
  assert.match(page,/\.rail-btn\{[^}]*backdrop-filter:blur\(12px\) saturate\(180%\)/);
  assert.match(source,/const rubberMag = over =>/);
  assert.match(source,/return 22 \* Math\.tanh\(Math\.abs\(over\) \/ 220\)/);
  assert.match(source,/const dur = 624/);
  assert.match(source,/drag\.grabCard\.style\.transform = "translateY\(-4px\)"/);
  assert.match(page,/@media \(max-width:640px\)[\s\S]*?\.rail\{grid-auto-columns:auto;grid-auto-flow:row;grid-template-columns:1fr/);
  assert.doesNotMatch(source,/new MutationObserver\(\(\)=> syncRail/);
});
