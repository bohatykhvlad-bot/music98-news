/* Cover colours for Discover. Keep neutral areas and weight colours by their
   actual coverage, so a tiny accent cannot recolour a mostly monochrome album. */
(() => {
  "use strict";
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const linear=v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4;
  function oklab(rgb) {
    const [r,g,b]=rgb.map(linear);
    const l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b);
    const m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b);
    const s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);
    return [.2104542553*l+.793617785*m-.0040720468*s,
      1.9779984951*l-2.428592205*m+.4505937099*s,
      .0259040371*l+.7827717662*m-.808675766*s];
  }
  const distance=(a,b)=>.65*(a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2;
  const neutral=()=>({colours:[[.55,.55,.55],[.65,.65,.65],[.45,.45,.45]],mix:[.5,.125],strength:.75});

  function extract(pixels) {
    const bins=new Map();
    let total=0,lightness=0,chroma=0;
    for(let i=0;i+3<pixels.length;i+=4){
      const weight=pixels[i+3]/255;
      if(weight<.05)continue;
      const rgb=[pixels[i],pixels[i+1],pixels[i+2]].map(v=>v/255);
      const lab=oklab(rgb);
      const key=[Math.round(lab[0]*24),Math.round(lab[1]*32),Math.round(lab[2]*32)].join(',');
      const bin=bins.get(key)||{count:0,lab:[0,0,0],rgb:[0,0,0]};
      bin.count+=weight;
      for(let k=0;k<3;k++){bin.lab[k]+=lab[k]*weight;bin.rgb[k]+=rgb[k]*weight;}
      bins.set(key,bin);
      total+=weight;lightness+=lab[0]*weight;chroma+=Math.hypot(lab[1],lab[2])*weight;
    }
    if(!total)return neutral();
    const samples=[...bins.values()].map(bin=>({count:bin.count,
      lab:bin.lab.map(v=>v/bin.count),rgb:bin.rgb.map(v=>v/bin.count)}))
      .sort((a,b)=>b.count-a.count);
    // Deterministic, coverage-weighted clusters in perceptual colour space.
    // Nearby shades form one colour instead of competing in coarse RGB bins.
    let centres=[samples[0].lab];
    while(centres.length<6){
      let candidate=null,best=total*.00002;
      for(const sample of samples){
        const score=sample.count*Math.min(...centres.map(c=>distance(sample.lab,c)));
        if(score>best){best=score;candidate=sample;}
      }
      if(!candidate)break;
      centres.push(candidate.lab);
    }
    let clusters=[];
    for(let pass=0;pass<7;pass++){
      clusters=centres.map(()=>({count:0,lab:[0,0,0],rgb:[0,0,0]}));
      for(const sample of samples){
        let nearest=0,best=Infinity;
        centres.forEach((c,i)=>{const d=distance(sample.lab,c);if(d<best){best=d;nearest=i;}});
        const cluster=clusters[nearest];cluster.count+=sample.count;
        for(let k=0;k<3;k++){
          cluster.lab[k]+=sample.lab[k]*sample.count;
          cluster.rgb[k]+=sample.rgb[k]*sample.count;
        }
      }
      clusters=clusters.filter(c=>c.count).map(c=>({count:c.count,
        lab:c.lab.map(v=>v/c.count),rgb:c.rgb.map(v=>clamp(v/c.count,0,1))}));
      centres=clusters.map(c=>c.lab);
    }
    clusters.sort((a,b)=>b.count-a.count);
    const selected=[clusters[0]];
    // Keep the largest area as the base. Among substantial secondary areas,
    // prefer a characteristic colour over another grey/lightness variation.
    // The modest bonus cannot make a tiny bright detail dominate the cover.
    const salience=c=>c.count*(1+.65*clamp(Math.hypot(c.lab[1],c.lab[2])/.16,0,1));
    for(const cluster of clusters.slice(1).sort((a,b)=>salience(b)-salience(a))){
      if(cluster.count/total<.06)continue;
      if(selected.every(c=>distance(c.lab,cluster.lab)>.0025))selected.push(cluster);
      if(selected.length===3)break;
    }
    // Reuse real cover colours when only one or two are present. Never fill
    // missing swatches with the site's cyan or artificially boost saturation.
    const colours=Array.from({length:3},(_,i)=>selected[i%selected.length].rgb.slice());
    const [base,secondary=0,accent=0]=selected.map(c=>c.count);
    const mix=[secondary/(base+secondary),accent/(base+secondary+accent)];
    const vibrancy=clamp(chroma/total/.18,0,1);
    const strength=.78+.40*vibrancy+.08*(1-lightness/total);
    return {colours,mix,strength};
  }
  globalThis.music98DiscoverPalette=Object.freeze({extract,neutral});
})();
