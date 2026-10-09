/* Music98 Discover — full-viewport ambient cyan plasma.
   Purely decorative. Reacts to MusicKit play/pause state, never accesses audio.
   No external assets, canvases in the playback frame, or click interception. */
(() => {
  "use strict";
  const canvas = document.getElementById("discoverAmbient");
  const ctx = canvas?.getContext("2d", { alpha: true });
  if (!canvas || !ctx) return;
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const precisePointer = window.matchMedia("(hover:hover) and (pointer:fine)");
  const TAU = Math.PI * 2;
  const pointer = { x:0, y:0, targetX:0, targetY:0, strength:0, targetStrength:0 };
  const clamp = (n,min,max) => Math.max(min,Math.min(max,n));
  let pointerLastMove = 0;
  function setPointer(x,y){
    if(!active || motion.matches || !precisePointer.matches) return;
    if(!Number.isFinite(x) || !Number.isFinite(y)) return;
    pointer.targetX=clamp(x,0,window.innerWidth);
    pointer.targetY=clamp(y,0,window.innerHeight);
    if(pointer.strength === 0 && pointer.targetStrength === 0){
      pointer.x=pointer.targetX;pointer.y=pointer.targetY;
    }
    pointer.targetStrength=1;
    pointerLastMove=performance.now();
  }
  function field(x,y){
    if(pointer.strength < .006) return [x,y];
    const dx=x-pointer.x,dy=y-pointer.y;
    const range=Math.max(205,Math.min(width,height)*.43);
    const pull=Math.exp(-(dx*dx+dy*dy)/(2*range*range))*pointer.strength*.24;
    return [x-dx*pull,y-dy*pull];
  }
  const particles = Array.from({ length: 85 }, (_, i) => {
    const h = n => {
      const x = Math.sin(n * 127.1 + 78.233) * 43758.5453123;
      return x - Math.floor(x);
    };
    return { x:h(i + 1), y:h(i + 123), size:.6+h(i+531)*1.2,
      phase:h(i+921)*TAU, speed:.16+h(i+233)*.37, a:.13+h(i+377)*.31 };
  });

  let width=0, height=0, ratio=1, active=false, playing=false;
  let frame=0, last=0, clock=0, energy=0;

  function resize() {
    const w=Math.max(1, window.innerWidth), h=Math.max(1, window.innerHeight);
    const maxPixels=1400000;
    const dpr=Math.min(window.devicePixelRatio || 1, 1.35);
    const scale=Math.min(dpr, Math.sqrt(maxPixels/(w*h)));
    const pw=Math.round(w*scale), ph=Math.round(h*scale);
    if (pw===canvas.width && ph===canvas.height && width===w && height===h) return;
    width=w; height=h; ratio=scale;
    canvas.width=pw; canvas.height=ph;
    ctx.setTransform(ratio,0,0,ratio,0,0);
  }

  function cloud(x,y,rx,ry,colour,opacity) {
    ctx.save();
    ctx.translate(x,y);
    ctx.scale(rx,ry);
    const g=ctx.createRadialGradient(0,0,.025,0,0,1);
    g.addColorStop(0,`rgba(${colour},${opacity.toFixed(4)})`);
    g.addColorStop(.26,`rgba(${colour},${(opacity*.65).toFixed(4)})`);
    g.addColorStop(.64,`rgba(${colour},${(opacity*.18).toFixed(4)})`);
    g.addColorStop(1,`rgba(${colour},0)`);
    ctx.fillStyle=g;
    ctx.beginPath(); ctx.arc(0,0,1,0,TAU); ctx.fill();
    ctx.restore();
  }

  /* Overlapping very wide, low-alpha curved ribbons produce a soft volume,
     rather than visible strokes, an equalizer or rigid sine waves. */
  function ribbon(axis,seed,intensity) {
    const t=clock, w=width, h=height;
    ctx.beginPath();
    if (axis==="top" || axis==="bottom") {
      const base=axis==="top"?h*.13:h*.92;
      const sway=Math.sin(t*.24+seed)*h*.038;
      ctx.moveTo(-w*.14,base+sway);
      const a=field(w*.18,base+h*.12*Math.sin(t*.29+seed));
      const b=field(w*.30,base-h*.13*Math.cos(t*.23+seed));
      const mid=field(w*.54,base+h*.018);
      const d=field(w*.75,base+h*.13*Math.sin(t*.27+seed+2));
      const e=field(w*.92,base-h*.08*Math.cos(t*.2+seed));
      ctx.bezierCurveTo(...a,...b,...mid);
      ctx.bezierCurveTo(...d,...e,w*1.12,base-sway);
    } else {
      const base=axis==="left"?w*.055:w*.96;
      const sway=Math.sin(t*.25+seed)*w*.018;
      ctx.moveTo(base+sway,-h*.12);
      const a=field(base+w*.12*Math.sin(t*.22+seed),h*.23);
      const b=field(base-w*.11*Math.cos(t*.28+seed),h*.40);
      const mid=field(base+w*.01,h*.56);
      const d=field(base+w*.10*Math.sin(t*.21+seed+1),h*.70);
      const e=field(base-w*.08*Math.cos(t*.19+seed),h*.88);
      ctx.bezierCurveTo(...a,...b,...mid);
      ctx.bezierCurveTo(...d,...e,base-sway,h*1.13);
    }
    const gradient=(axis==="top"||axis==="bottom")
      ?ctx.createLinearGradient(0,0,width,0)
      :ctx.createLinearGradient(0,0,0,height);
    gradient.addColorStop(0,"rgba(0,230,232,.08)");
    gradient.addColorStop(.23,"rgba(0,213,217,.45)");
    gradient.addColorStop(.54,"rgba(16,239,217,.58)");
    gradient.addColorStop(.78,"rgba(55,178,232,.37)");
    gradient.addColorStop(1,"rgba(79,255,223,.07)");
    ctx.strokeStyle=gradient;
    ctx.lineJoin="round"; ctx.lineCap="round";
    ctx.globalAlpha=.075*intensity;
    ctx.lineWidth=182;
    ctx.stroke();
    ctx.globalAlpha=.095*intensity;
    ctx.lineWidth=95;
    ctx.stroke();
    ctx.globalAlpha=.10*intensity;
    ctx.lineWidth=37;
    ctx.stroke();
    ctx.globalAlpha=1;
  }

  function dust(intensity) {
    const limit=width<760?37:particles.length;
    for(let i=0;i<limit;i++){
      const p=particles[i];
      let x=p.x*width+Math.sin(clock*p.speed+p.phase)*15;
      let y=p.y*height+Math.cos(clock*p.speed*.79+p.phase)*18;
      const dx=x-pointer.x,dy=y-pointer.y;
      const distance=Math.hypot(dx,dy);
      const near=pointer.strength*Math.max(0,1-distance/235);
      if(distance>1 && near>0){
        x+=(dx/distance)*near*28;
        y+=(dy/distance)*near*28;
      }
      /* Concentrate subtle grain in the glow around the viewport edges. */
      const edge=Math.min(x/width,1-x/width,y/height,1-y/height);
      const weight=Math.max(0,1-edge*2.35);
      if(weight<.12)continue;
      const blink=.67+.33*Math.sin(clock*(.45+p.speed)+p.phase);
      const alpha=p.a*weight*blink*intensity*(1+near*.75);
      if(alpha<.025)continue;
      cloud(x,y,p.size*3.8,p.size*3.8,"0,220,214",alpha*.22);
      ctx.fillStyle=`rgba(15,192,197,${Math.min(.48,alpha).toFixed(4)})`;
      ctx.beginPath();ctx.arc(x,y,p.size,0,TAU);ctx.fill();
    }
  }

  function render(){
    resize();
    ctx.clearRect(0,0,width,height);
    const live=.88+energy*.48;
    const breath=1+.10*Math.sin(clock*.72);
    ctx.globalCompositeOperation="screen";
    cloud(width*.04+Math.sin(clock*.25)*width*.025,height*.46,width*.29,height*.53,
      "0,205,219",.11*live*breath);
    cloud(width*.97+Math.sin(clock*.19+1)*width*.018,height*.54,width*.31,height*.56,
      "0,217,202",.115*live);
    cloud(width*.60,height*.035+Math.cos(clock*.20)*height*.03,width*.47,height*.27,
      "5,222,224",.098*live);
    cloud(width*.48,height*.99+Math.cos(clock*.25)*height*.02,width*.50,height*.28,
      "24,208,230",.12*live);
    cloud(width*.33+Math.sin(clock*.11)*width*.035,height*.47,width*.29,height*.36,
      "91,242,212",.035*live);
    if(pointer.strength>.01){
      cloud(pointer.x,pointer.y,Math.max(160,width*.16),Math.max(135,height*.22),
        "0,217,218",.105*pointer.strength*live);
      cloud(pointer.x+45,pointer.y-26,Math.max(110,width*.105),Math.max(95,height*.13),
        "85,255,218",.062*pointer.strength*live);
    }
    ribbon("top",.7,live);
    ribbon("right",1.8,live);
    ribbon("bottom",3.2,live);
    ribbon("left",4.8,live);
    ctx.globalCompositeOperation="source-over";
    dust(live);
  }

  function loop(ts){
    frame=0;
    if(!active || document.hidden) return;
    const interval=1000/(playing?36:24);
    if(!last)last=ts-interval;
    if (ts-last>=interval) {
      clock+=Math.min((ts-last)/1000,.08);
      last=ts;
      energy+=(Number(playing)-energy)*.065;
      if(pointer.targetStrength && performance.now()-pointerLastMove>5000)pointer.targetStrength=.40;
      pointer.x+=(pointer.targetX-pointer.x)*.095;
      pointer.y+=(pointer.targetY-pointer.y)*.095;
      pointer.strength+=(pointer.targetStrength-pointer.strength)*.075;
      render();
    }
    if (!motion.matches) frame=requestAnimationFrame(loop);
  }

  function start(){
    if(frame)cancelAnimationFrame(frame);
    frame=0; last=0;
    if(active&&!document.hidden){
      render();
      if(!motion.matches) frame=requestAnimationFrame(loop);
    }
  }
  function setVisible(value){
    active=!!value;
    document.body.classList.toggle("discover-ambient-visible",active);
    if(!active){playing=false;energy=0;pointer.targetStrength=0;pointer.strength=0;}
    if(active)start();
    else if(frame){cancelAnimationFrame(frame);frame=0;}
  }
  function setPlaying(value){
    playing=!!value;
    if(active && motion.matches)render();
  }

  window.music98DiscoverAmbient={setVisible,setPlaying,setPointer};
  window.addEventListener("pointermove",e=>{
    if(e.pointerType==="mouse"||e.pointerType==="pen")setPointer(e.clientX,e.clientY);
  },{passive:true});
  window.addEventListener("blur",()=>{pointer.targetStrength=0;});
  window.addEventListener("pointerout",e=>{if(!e.relatedTarget)pointer.targetStrength=0;});
  window.addEventListener("resize",()=>{if(active)start();});
  document.addEventListener("visibilitychange",()=>{if(active)start();});
  if(motion.addEventListener)motion.addEventListener("change",()=>{if(active)start();});
})();
