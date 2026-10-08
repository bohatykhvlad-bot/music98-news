import {artworkKey,versionSignature} from "./chart-identity.js";
import {isDerivativeRelease} from "./artwork-resolver.js";

// A temporary exit from the chart must not erase a verified cover. Retain only
// exact full-credit identities and safe releases; current audit rows win.
export function retainedArtworkHistory(audit) {
  const history={};
  for(const [key,entry] of Object.entries({...audit?.history,...audit?.entries})) {
    if(entry?.verified!==true || !entry.title || !entry.artist || entry.identity!==key ||
       key!==artworkKey(entry.title,entry.artist) || !Number.isFinite(Number(entry.confidence)) || Number(entry.confidence)<91 ||
       (["generic","derivative"].includes(entry.releaseClass) ||
        (!versionSignature(entry.title) && isDerivativeRelease(entry.releaseTitle))))continue;
    try {
      const url=new URL(entry.art),host=url.hostname;
      if(url.protocol!=="https:" || !["mzstatic.com","dzcdn.net"].some(domain=>host===domain || host.endsWith("."+domain)))continue;
    }catch{continue;}
    history[key]=entry;
  }
  return history;
}
