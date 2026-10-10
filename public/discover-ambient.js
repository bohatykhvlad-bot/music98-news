/* Discover's flowing mineral-textured currents. Playback changes their energy, not
   its spectrum: the Apple iframe does not expose decoded audio to this page. */
(() => {
  "use strict";
  const canvas = document.getElementById("discoverAmbient");
  if (!canvas) return;
  const panel = document.getElementById("tab-discover");
  const stage = document.getElementById("discoverPlayerStage");
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const precisePointer = matchMedia("(hover:hover) and (pointer:fine)");
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const pointer = { x:0, y:0, targetX:0, targetY:0, strength:0, targetStrength:0 };
  let width=0, height=0, active=false, playing=false, frame=0, last=0;
  let clock=0, energy=0, pointerLastMove=0, renderer=null, lost=false;
  let sourceBounds=null, layoutFrame=0, inView=true;
  let scrolling=false, scrollTimer=0;
  const defaultPalette=[[.18,.66,.90],[0,.83,.81],[.02,.59,.64]];
  let palette=defaultPalette.map(c=>c.slice()), targetPalette=palette.map(c=>c.slice()), artworkRequest=0;
  const artworkPalettes=new Map();

  const vertex = `
    attribute vec2 position;
    varying vec2 uv;
    void main() { uv=position*.5+.5; gl_Position=vec4(position,0.,1.); }
  `;
  const fragment = `
    precision highp float;
    varying vec2 uv;
    uniform vec2 viewport;
    uniform vec4 source;
    uniform vec3 pointer;
    uniform float time;
    uniform float energy;
    uniform vec3 tintBlue;
    uniform vec3 tintCyan;
    uniform vec3 tintMineral;
    float hash(vec2 p) {
      vec3 p3=fract(vec3(p.xyx)*.1031);
      p3+=dot(p3,p3.yzx+33.33);
      return fract((p3.x+p3.y)*p3.z);
    }
    float noise(vec2 p) {
      vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
      return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),
                 mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);
    }
    float fbm(vec2 p) {
      float v=0.; float a=.565;
      mat2 turn=mat2(.80,-.60,.60,.80);
      for(int i=0;i<3;i++) { v+=a*noise(p); p=turn*p*2.04+7.3; a*=.49; }
      return v;
    }
    float playerDistance(vec2 p, vec2 centre, vec2 size) {
      float rounding=min(24./viewport.y,min(size.x,size.y));
      vec2 q=abs(p-centre)-size+rounding;
      return length(max(q,0.))+min(max(q.x,q.y),0.)-rounding;
    }
    vec2 sparkle(vec2 p, float scale, float seed) {
      vec2 cell=p*scale+seed;
      vec2 id=floor(cell), f=fract(cell);
      vec2 center=.22+.56*vec2(hash(id+seed),hash(id+seed+23.));
      vec2 offset=f-center;
      float d2=dot(offset,offset);
      // Rounded light with no hard core or trail. An undistorted sampling
      // field keeps the glow circular while the larger currents bend.
      float core=exp(-d2*240.);
      float halo=exp(-d2*42.);
      float presence=smoothstep(.52,.85,hash(id+71.));
      float twinkle=.48+.22*sin(time*.65+hash(id+11.)*6.283);
      return vec2(core,halo)*presence*twinkle;
    }
    void main() {
      float aspect=viewport.x/viewport.y;
      vec2 p=vec2(uv.x*aspect,1.-uv.y);
      vec2 mouse=vec2(pointer.x/viewport.y,pointer.y/viewport.y);
      vec2 delta=p-mouse;
      float influence=exp(-dot(delta,delta)/.085)*pointer.z;
      // Bend the existing current with a softened version of the original
      // vortex. Its bounded displacement never creates a separate cloud.
      vec2 nudge=(vec2(-delta.y,delta.x)*.48-delta*.12)*influence;
      p+=clamp(nudge,vec2(-27.2916/viewport.y),vec2(27.2916/viewport.y));
      float t=time*.25;
      vec2 centre=source.xy/viewport.y, size=source.zw/viewport.y;
      vec2 nearest=clamp(p,centre-size,centre+size);
      vec2 outward=(p-nearest)/max(length(p-nearest),.03);
      float distance=playerDistance(p,centre,size);
      // A decreasing phase sends curved fronts away from the player. Keep
      // the texture displacement bounded so long playback cannot stretch it
      // into straight rays converging on a fixed point.
      vec2 tangent=vec2(-outward.y,outward.x);
      float swell=.045*sin(distance*9.-time*.85+p.y*2.)
                 +.020*sin(distance*16.+time*.55-p.x*1.8);
      vec2 transport=p+tangent*swell+outward*.035*sin(distance*16.-time*.95)
                     +vec2(time*.012,-time*.008);
      vec2 warp=vec2(fbm(transport*2.1+vec2(t*.15,0.)),fbm(transport*2.1+19.));
      float bend=(fbm(p*2.6+vec2(time*.04,-time*.02))-.5)*.10;
      // Fronts begin on the card boundary, then bend gradually as they spread.
      float edgeBend=smoothstep(0.,.12,max(distance,0.));
      float waveDistance=distance+edgeBend*(bend+.025*sin(p.x*4.+p.y*3.-time*.3));
      float lanes=fbm(vec2(waveDistance*8.-time*.46,(p.x+p.y)*2.)+warp*.6);
      float volume=fbm(transport*4.8+warp*.9);
      float detail=noise(transport*26.+warp*2.);
      float ripple=.5+.5*sin(waveDistance*20.-time*1.+(volume-.5)*.8*edgeBend);
      // Equal distances from the player share the same base coverage. This
      // removes the old asymmetric edge clouds and their white clearings.
      float envelope=.60+.40*exp(-max(distance,0.)*1.5);
      float density=.08+volume*.62+lanes*.18+ripple*.10+detail*.05;
      float body=envelope*(.10+smoothstep(.25,.80,density)*.8);
      // Keep the outward fronts within the diffuse texture so repeating
      // rings don't dominate the player or become a high-contrast pulse.
      float crests=smoothstep(.55,.98,ripple)*(.45+.55*smoothstep(.25,.75,volume));
      body+=envelope*crests*.055;
      float haze=.04+envelope*.035;
      // Interpolated grain moves continuously instead of jumping between
      // random pixel cells as the current advances.
      float grain=noise(transport*viewport.y/3.5+17.);
      vec2 lights=p+vec2(time*.008,-time*.005);
      vec2 dots=sparkle(lights,viewport.y/15.,3.);
      vec2 motes=sparkle(lights,viewport.y/28.,89.);
      float depth=smoothstep(.30,.8,volume);
      vec3 blue=tintBlue, cyan=tintCyan, mineral=tintMineral;
      vec3 colour=mix(blue,cyan,smoothstep(.12,.85,warp.x+p.y*.23));
      colour=mix(colour,mineral,clamp(smoothstep(.48,.86,lanes)*.25+crests*.04,0.,.65));
      // Lit grains sit within the volume, with a wider glow beneath it.
      colour=mix(colour,vec3(.86,1.,.99),clamp(dots.x*.35+dots.y*.45+motes.y*.3+depth*.14,0.,.8));
      float breathing=1.+.025*sin(time*.55);
      float alpha=(body*(.405+grain*.03)+haze+dots.y*body*.12)*(1.+energy*.18)*breathing;
      alpha+=(dots.x*.025+dots.y*.04+motes.x*.035+motes.y*.04)*body;
      gl_FragColor=vec4(colour,clamp(alpha,0.,.65));
    }
  `;

  function createRenderer() {
    const gl=canvas.getContext("webgl", { alpha:true, premultipliedAlpha:false,
      antialias:false, depth:false, stencil:false, powerPreference:"low-power" });
    if (gl) {
      const compile=(type, source) => {
        const shader=gl.createShader(type);
        gl.shaderSource(shader,source); gl.compileShader(shader);
        if (!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) { gl.deleteShader(shader); return null; }
        return shader;
      };
      const vs=compile(gl.VERTEX_SHADER,vertex), fs=compile(gl.FRAGMENT_SHADER,fragment);
      if (vs && fs) {
        const program=gl.createProgram(); gl.attachShader(program,vs); gl.attachShader(program,fs);
        gl.linkProgram(program); gl.deleteShader(vs); gl.deleteShader(fs);
        if (gl.getProgramParameter(program,gl.LINK_STATUS)) {
          gl.useProgram(program);
          const buffer=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
          gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
          const position=gl.getAttribLocation(program,"position");
          gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
          const locations=Object.fromEntries(["viewport","source","pointer","time","energy","tintBlue","tintCyan","tintMineral"]
            .map(key=>[key,gl.getUniformLocation(program,key)]));
          return { draw() {
            gl.viewport(0,0,canvas.width,canvas.height);
            gl.uniform2f(locations.viewport,width,height);
            gl.uniform4fv(locations.source,playerSource());
            gl.uniform3f(locations.pointer,pointer.x,pointer.y,pointer.strength);
            gl.uniform1f(locations.time,clock); gl.uniform1f(locations.energy,energy);
            ["tintBlue","tintCyan","tintMineral"].forEach((key,i)=>gl.uniform3fv(locations[key],palette[i]));
            gl.drawArrays(gl.TRIANGLES,0,6);
          }};
        }
        gl.deleteProgram(program);
      }
      // A canvas cannot change context type after WebGL was acquired.
      const replacement=canvas.cloneNode(); canvas.replaceWith(replacement);
      return fallbackRenderer(replacement);
    }
    return fallbackRenderer(canvas);
  }

  function fallbackRenderer(surface) {
    const ctx=surface.getContext("2d",{alpha:true});
    if (!ctx) return null;
    // Reuse one blurred light sprite instead of drawing hundreds of sharp
    // grains or applying a canvas shadow separately to every particle.
    const light=document.createElement("canvas");light.width=light.height=24;
    const lightContext=light.getContext("2d");
    const lightGlow=lightContext.createRadialGradient(12,12,0,12,12,12);
    lightGlow.addColorStop(0,"rgba(225,255,253,.65)");
    lightGlow.addColorStop(.3,"rgba(175,249,246,.28)");
    lightGlow.addColorStop(1,"rgba(175,249,246,0)");
    lightContext.fillStyle=lightGlow;lightContext.fillRect(0,0,24,24);
    const grains=Array.from({length:320},()=>({x:Math.random(),y:Math.random(),phase:Math.random()*6.28,size:3+Math.random()*3}));
    return { surface, draw() {
      if(surface.width!==canvas.width||surface.height!==canvas.height){surface.width=canvas.width;surface.height=canvas.height;}
      ctx.setTransform(surface.width/width,0,0,surface.height/height,0,0);
      ctx.clearRect(0,0,width,height);
      const rgba=(c,a)=>`rgba(${c.map(v=>Math.round(v*255)).join(',')},${a})`;
      ctx.fillStyle=rgba(palette[1],.06+.005*Math.sin(clock*.25));
      ctx.fillRect(0,0,width,height);
      const [sourceX,sourceY,halfWidth,halfHeight]=playerSource();
      const centres=[[sourceX,sourceY,width*.65,height*.8]];
      for(const [x,y,rx,ry] of centres){
        ctx.save();ctx.translate(x,y);ctx.scale(rx,ry);
        const glow=ctx.createRadialGradient(0,0,0,0,0,1);
        glow.addColorStop(0,rgba(palette[0],.12+energy*.04));
        glow.addColorStop(.45,rgba(palette[1],.08));glow.addColorStop(1,rgba(palette[1],0));
        ctx.fillStyle=glow;ctx.fillRect(-1,-1,2,2);ctx.restore();
      }
      ctx.save();ctx.shadowBlur=32;ctx.shadowColor="rgba(0,220,215,.12)";
      for(let i=0;i<3;i++){
        const travel=(clock*.045+i/3)%1,spread=travel*Math.max(width,height)*.5;
        ctx.strokeStyle=`rgba(0,178,194,${(1-travel)*(.02+energy*.015)})`;
        ctx.lineWidth=32+spread*.06;ctx.beginPath();
        if(ctx.roundRect)ctx.roundRect(sourceX-halfWidth-spread,sourceY-halfHeight-spread,
          (halfWidth+spread)*2,(halfHeight+spread)*2,24+spread);
        else ctx.ellipse(sourceX,sourceY,halfWidth+spread,halfHeight+spread,0,0,Math.PI*2);
        ctx.stroke();
      }
      ctx.restore();
      const count=width<760?160:grains.length;
      for(let i=0;i<count;i++){
        const p=grains[i];
        // Curved outward paths start at the actual player boundary.
        const travel=(p.x+clock*.04)%1;
        const angle=p.phase+Math.sin(travel*6.28-clock*.28+p.phase)*.13
          +Math.sin(travel*11.-clock*.17)*.06;
        const cos=Math.cos(angle),sin=Math.sin(angle);
        const edge=Math.min(halfWidth/Math.max(Math.abs(cos),.001),halfHeight/Math.max(Math.abs(sin),.001));
        const radius=edge+travel*Math.max(width,height)*.7;
        let x=sourceX+cos*radius;
        let y=sourceY+sin*radius;
        x+=Math.sin(clock*.25+p.phase)*22;y+=Math.cos(clock*.2+p.phase)*18;
        const dx=x-pointer.x,dy=y-pointer.y,near=Math.exp(-(dx*dx+dy*dy)/32000)*pointer.strength;
        x-=dy*near*.17;y+=dx*near*.17;
        ctx.globalAlpha=(.25+.15*Math.sin(clock*.65+p.phase))*(1+energy*.15);
        ctx.drawImage(light,x-p.size,y-p.size,p.size*2,p.size*2);
      }
      ctx.globalAlpha=1;
    }};
  }

  function playerSource() {
    return sourceBounds || [width/2,height/2,Math.min(width*.3,330),225];
  }

  function resize() {
    // The texture and its source share document coordinates. Native scrolling
    // moves the existing canvas with the card instead of rebuilding a fixed
    // background around a source that jumps through viewport coordinates.
    const rect=stage?.getBoundingClientRect();
    const panelRect=panel?.getBoundingClientRect();
    width=Math.max(1,document.documentElement.clientWidth);
    height=Math.max(1,panelRect?.height ? panelRect.bottom+scrollY : innerHeight);
    if(rect?.width&&rect.height){
      sourceBounds=[rect.left+scrollX+rect.width/2,rect.top+scrollY+rect.height/2,rect.width/2,rect.height/2];
    }
    const surface=renderer?.surface || canvas;
    surface.style.height=height+"px";
    const maxPixels=width<760?360000:850000;
    const scale=Math.min(devicePixelRatio||1,1.5,Math.sqrt(maxPixels/(width*height)));
    const w=Math.round(width*scale),h=Math.round(height*scale);
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  }
  function render() { if(lost)return;renderer?.draw(); }
  function queueLayout() {
    if(!active||layoutFrame)return;
    layoutFrame=requestAnimationFrame(()=>{
      layoutFrame=0;
      if(!active||lost)return;
      resize();render();
    });
  }
  function setPointer(x,y) {
    if(!active||motion.matches||!precisePointer.matches||!Number.isFinite(x)||!Number.isFinite(y))return;
    pointer.targetX=clamp(x,0,innerWidth)+scrollX;pointer.targetY=clamp(y,0,innerHeight)+scrollY;
    if(pointer.strength<.01){pointer.x=pointer.targetX;pointer.y=pointer.targetY;}
    pointer.targetStrength=.42253245;pointerLastMove=performance.now();
  }
  function loop(ts) {
    frame=0;
    if(!active||document.hidden||lost||!inView||scrolling)return;
    // Quiet drift needs fewer full-surface draws. Playback and pointer motion
    // retain the existing cadence; neither requires a layout read per frame.
    const lively=playing||energy>.05||pointer.targetStrength>0||pointer.strength>.05;
    const interval=1000/(width<760?(lively?24:15):(lively?30:18));
    if(!last)last=ts-interval;
    if(ts-last>=interval){
      const elapsed=(ts-last)/1000,dt=Math.min(elapsed,.1);last=ts;
      // Around 7 times more transport during playback, with a soft coast
      // into pause; the remaining motion is only a quiet background drift.
      energy+=(Number(playing)-energy)*(1-Math.exp(-elapsed*(playing?2.4:1.5)));
      clock+=dt*(.28+energy*.76);
      palette=palette.map((c,i)=>c.map((v,k)=>v+(targetPalette[i][k]-v)*(1-Math.exp(-dt*1.4))));
      const smooth=1-Math.exp(-dt*2.6);
      if(ts-pointerLastMove>2500)pointer.targetStrength=0;
      pointer.x+=(pointer.targetX-pointer.x)*(1-Math.exp(-dt*4));
      pointer.y+=(pointer.targetY-pointer.y)*(1-Math.exp(-dt*4));
      pointer.strength+=(pointer.targetStrength-pointer.strength)*smooth;
      render();
    }
    if(!motion.matches)frame=requestAnimationFrame(loop);
  }
  function start() {
    if(frame)cancelAnimationFrame(frame);frame=0;last=0;
    if(active&&!document.hidden&&!lost&&inView&&!scrolling){resize();render();if(!motion.matches)frame=requestAnimationFrame(loop);}
  }
  function setVisible(value) {
    active=!!value;document.body.classList.toggle("discover-ambient-visible",active);
    if(!active){playing=false;energy=0;pointer.strength=0;pointer.targetStrength=0;}
    start();
  }
  function setPlaying(value) { playing=!!value;if(active&&motion.matches)render(); }
  async function setArtwork(url) {
    const request=++artworkRequest;
    targetPalette=defaultPalette.map(c=>c.slice());
    if(!/^https:\/\/[^/]*mzstatic\.com\//i.test(url||''))return;
    try {
      let colours=artworkPalettes.get(url);
      if(!colours){
        const image=new Image();image.crossOrigin="anonymous";
        // One small read per cover, never in the animation loop.
        image.src=url.replace(/\d+x\d+bb(?:-\d+)?\./,'64x64bb.');
        await image.decode();
        const sample=document.createElement('canvas');sample.width=sample.height=24;
        const context=sample.getContext('2d',{willReadFrequently:true});
        context.drawImage(image,0,0,24,24);
        const pixels=context.getImageData(0,0,24,24).data,bins=new Map();
        for(let i=0;i<pixels.length;i+=4){
          const c=[pixels[i],pixels[i+1],pixels[i+2]].map(v=>v/255);
          const high=Math.max(...c),low=Math.min(...c);
          if(high<.18||low>.88||high-low<.12)continue;
          const key=c.map(v=>Math.floor(v*5)).join(',');
          const bin=bins.get(key)||{count:0,total:[0,0,0]};
          bin.count++;c.forEach((v,k)=>bin.total[k]+=v);bins.set(key,bin);
        }
        const dominant=[...bins.values()].sort((a,b)=>b.count-a.count).slice(0,3);
        if(!dominant.length)return;
        colours=defaultPalette.map((base,i)=>{
          const bin=dominant[i%dominant.length];
          return base.map((v,k)=>v*.25+(bin.total[k]/bin.count)*.75);
        });
        artworkPalettes.set(url,colours);
        if(artworkPalettes.size>24)artworkPalettes.delete(artworkPalettes.keys().next().value);
      }
      if(request!==artworkRequest)return;
      targetPalette=colours.map(c=>c.slice());
      if(motion.matches){palette=targetPalette.map(c=>c.slice());if(active)render();}
    } catch { /* Keep the site palette if artwork is unavailable or CORS blocks sampling. */ }
  }
  canvas.addEventListener("webglcontextlost",event=>{event.preventDefault();lost=true;if(frame)cancelAnimationFrame(frame);frame=0;});
  canvas.addEventListener("webglcontextrestored",()=>{lost=false;renderer=createRenderer();start();});
  renderer=createRenderer();
  window.music98DiscoverAmbient={setVisible,setPlaying,setPointer,setArtwork};
  const syncVisibility=()=>setVisible(!!panel?.classList.contains('active')&&!document.body.classList.contains('articlepage'));
  // Start on direct entry as well as navigation; do not depend on a later
  // catalogue request or on which deferred script first observes pagechange.
  addEventListener('music98:pagechange',syncVisibility);
  addEventListener("pointermove",e=>{if(e.pointerType==="mouse"||e.pointerType==="pen")setPointer(e.clientX,e.clientY);},{passive:true});
  addEventListener("blur",()=>{pointer.targetStrength=0;});
  addEventListener("pointerout",e=>{if(!e.relatedTarget)pointer.targetStrength=0;});
  addEventListener("resize",queueLayout,{passive:true});
  // Let the compositor scroll the cached texture without competing with
  // full-canvas shader draws. Resume its clock without a catch-up jump.
  addEventListener("scroll",()=>{
    if(!active||motion.matches)return;
    scrolling=true;
    if(frame)cancelAnimationFrame(frame);frame=0;
    clearTimeout(scrollTimer);
    scrollTimer=setTimeout(()=>{scrolling=false;if(active)start();},120);
  },{passive:true});
  if(window.ResizeObserver){
    const layoutObserver=new ResizeObserver(queueLayout);
    [panel,stage,document.querySelector(".topbar")].forEach(el=>{if(el)layoutObserver.observe(el);});
  }
  if(window.IntersectionObserver&&panel){
    const visibilityObserver=new IntersectionObserver(([entry])=>{
      if(inView===entry.isIntersecting)return;
      inView=entry.isIntersecting;
      if(active)start();
    });
    visibilityObserver.observe(panel);
  }
  document.fonts?.ready.then(queueLayout);
  document.addEventListener("visibilitychange",()=>{if(active)start();});
  motion.addEventListener?.("change",()=>{pointer.strength=0;pointer.targetStrength=0;if(active)start();});
  syncVisibility();
})();
