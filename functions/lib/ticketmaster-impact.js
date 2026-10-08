// Impact deep links for Ticketmaster countries where a documented regional
// wrapper exists. All destinations retain their original event URL, including
// its local Ticketmaster domain, using the official percent-encoded ?u= field.
//
// Account ID: confirmed from this property's own Discovery API event URLs.
// ad/campaign IDs: the Ticketmaster market templates (not publisher IDs).
// Do not substitute the US campaign for an international Ticketmaster domain.
// Unlisted or third-party sellers keep their original URLs.
export const IMPACT_PUBLISHER_ID="4932692";
export const IMPACT_CONCERTS_SUBID="music98_concerts";

const MARKET_TEMPLATES=Object.freeze({
  "com":    ["ticketmaster.evyy.net","264167","4272"],
  "ca":     ["ticketmaster.evyy.net","264167","4272"],
  "com.au": ["ticketmaster-au.tm7566.net","431533","7566"],
  "at":     ["ticketmaster-at.tm8116.net","454812","8116"],
  "be":     ["ticketmaster-be.tm7522.net","427771","7522"],
  "co.uk":  ["ticketmaster-uk.tm7559.net","431519","7559"],
  "cz":     ["ticketmaster-cz.tm9743.net","591899","9743"],
  "dk":     ["ticketmaster-dk.tm7521.net","427769","7521"],
  "fi":     ["ticketmaster-fi.tm7520.net","427767","7520"],
  "fr":     ["ticketmaster-fr.tm7516.net","427761","7516"],
  "de":     ["ticketmaster-de.tm7514.net","427757","7514"],
  "ie":     ["ticketmaster-ie.tm7512.net","427753","7512"],
  "es":     ["ticketmaster-es.tm7508.net","427744","7508"],
  "it":     ["ticketmasteritalia.46uy.net","458790","8188"],
  "nl":     ["ticketmaster-nl.tm7510.net","427748","7510"],
  "no":     ["ticketmaster-no.tm8215.net","462382","8215"],
  "pl":     ["ticketmaster-pl.tm8185.net","458655","8185"],
  "ch":     ["ticketmaster-ch.tm8186.net","458657","8186"],
  "se":     ["ticketmaster-se.tm7505.net","427737","7505"],
});

// Tracking hosts are explicit to prevent accidentally wrapping arbitrary links.
const REGIONAL_HOSTS=new Set(Object.values(MARKET_TEMPLATES).map(row=>row[0]));

function addMapAttribution(url){
  // Impact supports subId1..subId3; using subId3 keeps any existing partner
  // values intact and makes map clicks identifiable in Impact reporting.
  if(!url.searchParams.has("subId3")) url.searchParams.set("subId3",IMPACT_CONCERTS_SUBID);
  return url.toString();
}

function sourceURL(raw){
  try{
    const u=new URL(String(raw||""));
    return u.protocol==="https:" ? u : null;
  }catch{return null;}
}

function marketForHost(hostname){
  const host=hostname.toLowerCase().replace(/^www\./,"");
  const prefix="ticketmaster.";
  if(!host.startsWith(prefix)) return "";
  const suffix=host.slice(prefix.length);
  return Object.prototype.hasOwnProperty.call(MARKET_TEMPLATES,suffix)
    ? suffix : "";
}

export function impactTicketUrl(original){
  const input=sourceURL(original);
  if(!input) return String(original||"");
  let landing=input;
  // The Discovery API can already provide correct Impact links. Preserve
  // matching Publisher IDs, their ad/campaign, and existing sub IDs.
  if(REGIONAL_HOSTS.has(input.hostname.toLowerCase()) &&
     /^\/c\/\d+\/\d+\/\d+\/?$/.test(input.pathname)){
    const matched=input.pathname.match(/^\/c\/(\d+)\//);
    if(matched?.[1]===IMPACT_PUBLISHER_ID) return addMapAttribution(input);
    const nested=sourceURL(input.searchParams.get("u"));
    if(!nested) return input.toString();
    landing=nested;
  }
  const market=marketForHost(landing.hostname);
  if(!market) return input.toString();
  const [host,adId,campaignId]=MARKET_TEMPLATES[market];
  const output=new URL(`https://${host}/c/${IMPACT_PUBLISHER_ID}/${adId}/${campaignId}`);
  output.searchParams.set("u",landing.toString());
  output.searchParams.set("utm_medium","affiliate");
  return addMapAttribution(output);
}

export function impactTicketMarket(original){
  const input=sourceURL(original);
  if(!input) return null;
  const landing=REGIONAL_HOSTS.has(input.hostname.toLowerCase())
    ? sourceURL(input.searchParams.get("u"))
    : input;
  return landing ? marketForHost(landing.hostname)||null : null;
}
