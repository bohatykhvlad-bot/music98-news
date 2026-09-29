import {
  artworkCreditSignature,
  normTitle,
  versionSignature,
} from "./chart-identity.js";

export function releaseBase(name) {
  return String(name || "").replace(/\s*[-–—]\s*(?:single|ep)\s*$/i, "").trim();
}
export function normalizedRelease(name) { return normTitle(releaseBase(name)); }
export function releaseYear(value) {
  const m=String(value||"").match(/(?:19|20)\d{2}/);
  return m ? Number(m[0]) : 0;
}
export function isDerivativeRelease(name) {
  const s=String(name||"").toLowerCase();
  return /\b(?:remix(?:es)?|rmx|live|acoustic|instrumental|karaoke|demo|sped\s*up|slowed|reverb(?:ed)?|isolated\s+vocals?|singalong|track\s+by\s+track|commentary|alternate\s+(?:cover|version)|radio\s+edit|extended\s+(?:mix|version)|dj\s+mix|bootleg|mashup|rework(?:ed)?)\b/.test(s);
}
export function isGenericRelease(name, releaseArtist="", genre="") {
  const s=String(name||"").toLowerCase();
  const a=String(releaseArtist||"").toLowerCase();
  const g=String(genre||"").toLowerCase();
  if (/\bvarious artists\b/.test(a)) return true;
  if (/\b(?:greatest hits?|best of|essentials?|essential|anthology|collection|compilation|retrospective)\b/.test(s)) return true;
  if (/\b(?:20th century masters|millennium collection|number ones|classic hits?|complete singles?|complete duets?|golden oldies|favorites|movie love songs|party hits?|throwback|workout|karaoke|tribute)\b/.test(s)) return true;
  if (/\b(?:various artists|now that's what i call|hits of the|top hits|coffee o'?clock)\b/.test(s)) return true;
  if (g==="karaoke") return true;
  return false;
}
function derivativeTrackQualifier(title){
  return /\b(?:live\s+(?:at|from)|session|performance|unplugged|rehearsal|from\s+the\s+carwash)\b/i.test(String(title||""));
}
export function candidateCompatible(track,candidate) {
  if(!track||!candidate) return false;
  if(normTitle(candidate.trackTitle)!==normTitle(track.title)) return false;
  if(versionSignature(candidate.trackTitle)!==versionSignature(track.title)) return false;
  if(!derivativeTrackQualifier(track.title) && derivativeTrackQualifier(candidate.trackTitle)) return false;
  const want=artworkCreditSignature(track.title,track.artist);
  const got=artworkCreditSignature(candidate.trackTitle,candidate.artist);
  return !!want && want===got;
}
export function classifyCandidate(track,candidate) {
  if(!candidateCompatible(track,candidate)) return "mismatch";
  if(isGenericRelease(candidate.releaseTitle,candidate.releaseArtist,candidate.genre)) return "generic";
  const wantV=versionSignature(track.title), releaseV=versionSignature(candidate.releaseTitle);
  if(!wantV && releaseV && isDerivativeRelease(candidate.releaseTitle)) return "derivative";
  if(wantV && releaseV && releaseV!==wantV) return "derivative";
  const count=Math.max(0,Number(candidate.trackCount||0));
  const exact=normalizedRelease(candidate.releaseTitle)===normTitle(track.title);
  if(exact && (!count||count<=5)) return "dedicated";
  return "album";
}
const family=(p)=>String(p||"").startsWith("apple")?"apple":String(p||"");
export function rankArtworkCandidates(track,candidates) {
  const clean=(candidates||[]).filter(c=>c&&c.art&&candidateCompatible(track,c))
    .map(c=>({...c,releaseClass:classifyCandidate(track,c)}))
    .filter(c=>!["generic","derivative","mismatch"].includes(c.releaseClass));
  const years=clean.map(c=>releaseYear(c.releaseDate)).filter(Boolean);
  const earliest=years.length?Math.min(...years):0;
  const catalog=!!earliest && earliest<=new Date().getUTCFullYear()-5;
  const releaseProviders=new Map();
  for(const c of clean){
    const k=normalizedRelease(c.releaseTitle); if(!k) continue;
    const set=releaseProviders.get(k)||new Set(); set.add(family(c.provider)); releaseProviders.set(k,set);
  }
  const ranked=clean.map(c=>{
    const y=releaseYear(c.releaseDate), rk=normalizedRelease(c.releaseTitle);
    const consensus=rk?(releaseProviders.get(rk)?.size||0):0;
    let score=c.provider==="apple-feed"?520:c.provider==="apple-chart"?340:c.provider==="apple"?300:c.provider==="deezer"?260:c.provider==="apple-runtime"?240:180;
    if(c.provider==="apple-feed") score+=420;
    if(c.provider==="apple-chart") score+=100;
    if(c.releaseClass==="dedicated") score+=catalog?90:230;
    else if(c.releaseClass==="album") score+=catalog?260:150;
    if(earliest&&y){
      const gap=Math.max(0,y-earliest);
      if(gap<=1) score+=180; else if(gap<=2) score+=110; else score-=Math.min(360,gap*18);
    }
    if(consensus>=2) score+=240;
    if(c.provider==="apple") score+=15;
    const confidence=c.provider==="apple-feed"?99:consensus>=2?98:c.provider==="apple-chart"?96:c.provider==="apple"?94:c.provider==="apple-runtime"?92:c.provider==="deezer"?91:88;
    return {...c,score,confidence,consensus,earliestReleaseYear:earliest||null,catalog};
  });
  ranked.sort((a,b)=>b.score-a.score||b.confidence-a.confidence||releaseYear(a.releaseDate)-releaseYear(b.releaseDate)||String(a.provider).localeCompare(String(b.provider))||String(a.id||"").localeCompare(String(b.id||"")));
  return ranked;
}
export function selectArtworkCandidate(track,candidates) {
  const ranked=rankArtworkCandidates(track,candidates);
  return {selected:ranked[0]||null,ranked};
}
