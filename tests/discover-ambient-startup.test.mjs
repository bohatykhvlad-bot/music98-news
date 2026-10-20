import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source=readFileSync("public/discover-ambient.js","utf8");
const html=readFileSync("public/index.html","utf8");

test("Discover HTML references a fresh ambient asset revision",()=>{
  assert.match(html,/\/discover-ambient\.js\?v=20261020-settle01/);
});

test("Discover's animated background appears despite continuous mobile layout jitter",()=>{
  let time=16,tick=0,id=0,draws=0;
  const scheduled=new Map();
  const raf=fn=>{const n=++id;scheduled.set(n,fn);return n;};
  const cancel=n=>scheduled.delete(n);
  const mockContext=()=>({
    createRadialGradient(){return {addColorStop(){}};},
    fillRect(){},clearRect(){},setTransform(){},save(){},restore(){},
    translate(){},scale(){},beginPath(){},roundRect(){},ellipse(){},stroke(){},
    drawImage(){draws++;},
  });
  const canvas={
    width:0,height:0,style:{},addEventListener(){},
    getContext(type){return type==="2d"?mockContext():null;},
  };
  const classes=new Set();
  const bodyClasses={
    contains:name=>classes.has(name),
    add:name=>classes.add(name),
    remove:name=>classes.delete(name),
    toggle(name,on){if(on)classes.add(name);else classes.delete(name);},
  };
  const panel={
    classList:{contains:name=>name==="active"},addEventListener(){},
    getBoundingClientRect(){return {bottom:700,height:600};},
  };
  const stage={
    getBoundingClientRect(){return {left:200,top:180,width:660,height:450};},
  };
  const doc={
    hidden:false,body:{classList:bodyClasses},
    documentElement:{clientWidth:1200},
    getElementById(id){return {
      discoverAmbient:canvas,"tab-discover":panel,discoverPlayerStage:stage
    }[id]??null;},
    querySelector(selector){
      if(selector===".subscribe")return {getBoundingClientRect(){return {top:800+(tick%2)};}};
      return null;
    },
    createElement(){return {width:0,height:0,getContext(){return mockContext();}};},
    addEventListener(){},
  };
  const win={
    addEventListener(){},document:doc,
    ResizeObserver:class {constructor(cb){this.cb=cb;}observe(){}},
  };
  const ctx={
    window:win,document:doc,matchMedia:()=>({matches:false,addEventListener(){}}),
    requestAnimationFrame:raf,cancelAnimationFrame:cancel,
    performance:{now:()=>time},scrollY:0,scrollX:0,innerWidth:1200,
    innerHeight:900,devicePixelRatio:1,
    addEventListener(){},
  };
  vm.runInNewContext(source,ctx);
  assert.ok(win.music98DiscoverAmbient,"ambient API initialized");
  assert.ok(classes.has("discover-ambient-visible"));
  // A shifting browser toolbar can keep the measured bottom changing forever.
  // The previously unbounded settle gate would leave the canvas fully hidden.
  for(let n=0;n<110;n++){
    tick++;time+=16;
    const current=[...scheduled.values()];
    scheduled.clear();
    for(const fn of current)fn(time);
  }
  assert.ok(classes.has("discover-ambient-settled"),"ambient must eventually become visible");
  assert.ok(draws>0,"background must actually render, not just toggle its CSS class");
  assert.ok(canvas.width>0&&canvas.height>0,"ambient should have a drawable surface");
  win.music98DiscoverAmbient.setVisible(false);
  assert.equal(classes.has("discover-ambient-visible"),false);
  assert.equal(classes.has("discover-ambient-settled"),false);
  win.music98DiscoverAmbient.setVisible(true);
  assert.equal(classes.has("discover-ambient-visible"),true);
});
