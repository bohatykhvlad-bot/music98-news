/* Discover's sand-textured, luminous fluid. Playback changes its energy, not
   its spectrum: the Apple iframe does not expose decoded audio to this page. */
(() => {
  "use strict";
  const canvas = document.getElementById("discoverAmbient");
  if (!canvas) return;
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const precisePointer = matchMedia("(hover:hover) and (pointer:fine)");
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const pointer = { x:0, y:0, targetX:0, targetY:0, strength:0, targetStrength:0 };
  let width=0, height=0, active=false, playing=false, frame=0, last=0;
  let clock=0, energy=0, pointerLastMove=0, renderer=null, lost=false;

  const vertex = `
    attribute vec2 position;
    varying vec2 uv;
    void main() { uv=position*.5+.5; gl_Position=vec4(position,0.,1.); }
  `;
  const fragment = `
    precision highp float;
    varying vec2 uv;
        uniform vec2 viewport;
    uniform vec3 pointer;
    uniform float time;
    uniform float energy;
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
      float v=0.; float a=.53;
      mat2 turn=mat2(.80,-.60,.60,.80);
      for(int i=0;i<4;i++) { v+=a*noise(p); p=turn*p*2.04+7.3; a*=.49; }
      return v;
    }
    float cloud(vec2 p, vec2 center, vec2 size) {
      vec2 d=(p-center)/size; return exp(-dot(d,d)*2.);
    }
    vec2 sand(vec2 p, float scale, float seed) {
      vec2 cell=p*scale+vec2(time*.55,-time*.36)+seed;
      vec2 id=floor(cell), f=fract(cell);
      vec2 center=.22+.56*vec2(hash(id+seed),hash(id+seed+23.));
      float d=length(f-center);
      float radius=.055+.05*hash(id+71.);
      float dotLight=1.-smoothstep(radius*.3,radius,d);
      float halo=exp(-d*d*110.)*.22;
      float twinkle=.65+.35*sin(time*.8+hash(id+11.)*6.283);
      return vec2(dotLight,halo)*twinkle;
    }
    void main() {
      float aspect=viewport.x/viewport.y;
      vec2 p=vec2(uv.x*aspect,1.-uv.y);
      vec2 mouse=vec2(pointer.x/viewport.y,pointer.y/viewport.y);
      vec2 delta=p-mouse;
      float influence=exp(-dot(delta,delta)/.085)*pointer.z;
      // A local vortex bends the volume and its grains together.
      p+=vec2(-delta.y,delta.x)*influence*.65-delta*influence*.16;
      float t=time*.12;
      vec2 warp=vec2(fbm(p*2.4+vec2(t,-t*.7)),fbm(p*2.4+vec2(-t*.6,t)+19.));
      vec2 flow=p+(warp-.5)*.24;
      float volume=fbm(flow*5.3+vec2(t*.6,-t*.8));
      float detail=noise(flow*24.+warp*3.-t);
      float left=cloud(flow,vec2(aspect*.035+.04*sin(t),.56+.09*cos(t*.7)),vec2(.24,.52));
      float right=cloud(flow,vec2(aspect*.97+.025*cos(t*.8),.42+.09*sin(t)),vec2(.26,.52));
      float top=cloud(flow,vec2(aspect*(.48+.11*sin(t*.6)),.015),vec2(aspect*.44,.22));
      float bottom=cloud(flow,vec2(aspect*(.48+.13*cos(t*.7)),1.02),vec2(aspect*.46,.26));
      float mass=left+right+top*.8+bottom*.95;
      float envelope=clamp(mass,0.,1.5);
      float body=envelope*smoothstep(.22,.77,volume+.13*detail);
      float haze=envelope*.075;
      float grain=hash(floor(gl_FragCoord.xy)+floor(flow*73.)+17.);
      vec2 dots=sand(flow,viewport.y/7.,3.)+sand(flow,viewport.y/12.,41.)*.65;
      vec2 motes=sand(flow,viewport.y/24.,89.);
      float depth=smoothstep(.30,.8,volume);
      vec3 blue=vec3(.12,.60,.94), cyan=vec3(.0,.86,.85), mint=vec3(.46,.97,.79);
      vec3 colour=mix(blue,cyan,smoothstep(.12,.85,warp.x+p.y*.23));
      colour=mix(colour,mint,smoothstep(.52,.92,warp.y+volume*.2)*.65);
      // Lit grains sit within the volume, with a wider glow beneath it.
      colour=mix(colour,vec3(.80,1.,.98),clamp(dots.x*.62+dots.y*.4+depth*.14,0.,.8));
      colour=mix(colour,vec3(.15,.67,.88),motes.x*.4);
      float breathing=1.+.055*sin(time*.65);
      float alpha=(body*(.30+grain*.24)+haze+dots.y*body*.18)*(1.+energy*.36)*breathing;
      alpha+=(dots.x*.18+motes.x*.32+motes.y*.06)*body;
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
          const locations=Object.fromEntries(["viewport","pointer","time","energy"]
            .map(key=>[key,gl.getUniformLocation(program,key)]));
          return { draw() {
            gl.viewport(0,0,canvas.width,canvas.height);
            gl.uniform2f(locations.viewport,width,height);
            gl.uniform3f(locations.pointer,pointer.x,pointer.y,pointer.strength);
            gl.uniform1f(locations.time,clock); gl.uniform1f(locations.energy,energy);
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
    const grains=Array.from({length:2600},()=>({x:Math.random(),y:Math.random(),phase:Math.random()*6.28,size:.4+Math.random()*.8}));
    return { surface, draw() {
      if(surface.width!==canvas.width||surface.height!==canvas.height){surface.width=canvas.width;surface.height=canvas.height;}
      ctx.setTransform(surface.width/width,0,0,surface.height/height,0,0);
      ctx.clearRect(0,0,width,height);
      const blobs=[[.03,.55,.23,.52],[.97,.42,.23,.52],[.5,0,.44,.22],[.48,1,.46,.26]];
      const centres=blobs.map(([x,y,rx,ry],i)=>[x*width+Math.sin(clock*.12+i)*25,y*height,rx*width,ry*height]);
      for(const [x,y,rx,ry] of centres){
        ctx.save();ctx.translate(x,y);ctx.scale(rx,ry);
        const glow=ctx.createRadialGradient(0,0,0,0,0,1);
        glow.addColorStop(0,`rgba(0,204,219,${.20+energy*.06})`);
        glow.addColorStop(.45,"rgba(40,232,209,.11)");glow.addColorStop(1,"rgba(0,220,225,0)");
        ctx.fillStyle=glow;ctx.fillRect(-1,-1,2,2);ctx.restore();
      }
      const count=width<760?1300:grains.length;
      for(let i=0;i<count;i++){
        const p=grains[i];let x=p.x*width+Math.sin(clock*.18+p.phase)*18,y=p.y*height+Math.cos(clock*.14+p.phase)*16;
        const dx=x-pointer.x,dy=y-pointer.y,near=Math.exp(-(dx*dx+dy*dy)/32000)*pointer.strength;
        x-=dy*near*.24;y+=dx*near*.24;
        let density=0;
        for(const [cx,cy,rx,ry] of centres)density+=Math.exp(-2*((x-cx)**2/rx**2+(y-cy)**2/ry**2));
        ctx.fillStyle=`rgba(0,168,196,${Math.min(.35,density*.22)*(1+energy*.3)})`;
        ctx.fillRect(x,y,p.size,p.size);
      }
    }};
  }

  function resize() {
    width=Math.max(1,innerWidth);height=Math.max(1,innerHeight);
    const maxPixels=width<760?480000:1000000;
    const scale=Math.min(devicePixelRatio||1,1.5,Math.sqrt(maxPixels/(width*height)));
    const w=Math.round(width*scale),h=Math.round(height*scale);
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  }
  function render() { if(lost)return; resize();renderer?.draw(); }
  function setPointer(x,y) {
    if(!active||motion.matches||!precisePointer.matches||!Number.isFinite(x)||!Number.isFinite(y))return;
    pointer.targetX=clamp(x,0,innerWidth);pointer.targetY=clamp(y,0,innerHeight);
    if(pointer.strength<.01){pointer.x=pointer.targetX;pointer.y=pointer.targetY;}
    pointer.targetStrength=1;pointerLastMove=performance.now();
  }
  function loop(ts) {
    frame=0;
    if(!active||document.hidden||lost)return;
    const interval=1000/(width<760?24:30);
    if(!last)last=ts-interval;
    if(ts-last>=interval){
      const dt=Math.min((ts-last)/1000,.1);last=ts;
      clock+=dt*(.65+energy*.65);
      const smooth=1-Math.exp(-dt*4);
      energy+=(Number(playing)-energy)*smooth;
      if(ts-pointerLastMove>2500)pointer.targetStrength=0;
      pointer.x+=(pointer.targetX-pointer.x)*(1-Math.exp(-dt*9));
      pointer.y+=(pointer.targetY-pointer.y)*(1-Math.exp(-dt*9));
      pointer.strength+=(pointer.targetStrength-pointer.strength)*smooth;
      render();
    }
    if(!motion.matches)frame=requestAnimationFrame(loop);
  }
  function start() {
    if(frame)cancelAnimationFrame(frame);frame=0;last=0;
    if(active&&!document.hidden&&!lost){render();if(!motion.matches)frame=requestAnimationFrame(loop);}
  }
  function setVisible(value) {
    active=!!value;document.body.classList.toggle("discover-ambient-visible",active);
    if(!active){playing=false;energy=0;pointer.strength=0;pointer.targetStrength=0;}
    start();
  }
  function setPlaying(value) { playing=!!value;if(active&&motion.matches)render(); }
  canvas.addEventListener("webglcontextlost",event=>{event.preventDefault();lost=true;if(frame)cancelAnimationFrame(frame);frame=0;});
  canvas.addEventListener("webglcontextrestored",()=>{lost=false;renderer=createRenderer();start();});
  renderer=createRenderer();
  window.music98DiscoverAmbient={setVisible,setPlaying,setPointer};
  addEventListener("pointermove",e=>{if(e.pointerType==="mouse"||e.pointerType==="pen")setPointer(e.clientX,e.clientY);},{passive:true});
  addEventListener("blur",()=>{pointer.targetStrength=0;});
  addEventListener("pointerout",e=>{if(!e.relatedTarget)pointer.targetStrength=0;});
  addEventListener("resize",()=>{if(active)start();});
  document.addEventListener("visibilitychange",()=>{if(active)start();});
  motion.addEventListener?.("change",()=>{pointer.strength=0;pointer.targetStrength=0;if(active)start();});
})();
