import {mergeKey} from "./chart-identity.js";

export const DAILY_CHART_METHOD = "daily-global-v1";
export const DAILY_CHART_CONSENSUS = "all-three-v1";
export const DAILY_SOURCE_IDS = ["A", "S", "D"];
export const CHART_SIZE = 50;
export const SOURCE_SIZE = 100;
export const APPLE_GLOBAL_ID = "pl.d25f5d1181894928af76c85c967f8f31";
export const APPLE_GLOBAL_URL = "https://music.apple.com/us/playlist/top-100-global/" + APPLE_GLOBAL_ID;
export const DEEZER_GLOBAL_ID = "3155776842";
export const DEEZER_CHARTS_CREATOR_ID = "637006841";
export const DEEZER_GLOBAL_URL = "https://api.deezer.com/playlist/" + DEEZER_GLOBAL_ID;
export const DAILY_SOURCE_DETAILS = {
  A: {name:"Apple Music Top 100: Global", region:"global", cadence:"daily", entity:"song", url:APPLE_GLOBAL_URL},
  S: {name:"Spotify Daily Top Songs Global", region:"global", cadence:"daily", entity:"song", url:"https://charts.spotify.com/charts/view/regional-global-daily/latest",
    retrieval:"matching-public-mirrors", mirrors:["https://kworb.net/spotify/country/global_daily.html","https://musicrank.org/spotify"]},
  D: {name:"Deezer Top Worldwide", region:"global", cadence:"daily", entity:"song", url:"https://www.deezer.com/en/playlist/"+DEEZER_GLOBAL_ID,
    dateKind:"capture", upstreamEditionDateAvailable:false},
};

export function completeDailySources(counts) {
  return !!counts && Object.keys(counts).length === DAILY_SOURCE_IDS.length &&
    (DAILY_SOURCE_IDS.every(id => counts[id] === CHART_SIZE) ||
     DAILY_SOURCE_IDS.every(id => counts[id] === SOURCE_SIZE));
}

// Input charts are complete Top 100s (legacy Top 50 snapshots remain readable).
// The output is their intersection,
// capped at 50; never fill missing consensus places with one-platform songs.
export function hasConsensusTracks(tracks) {
  if (!Array.isArray(tracks) || !tracks.length || tracks.length > CHART_SIZE) return false;
  const identities = new Set();
  const positions = Object.fromEntries(DAILY_SOURCE_IDS.map(id => [id, new Set()]));
  return tracks.every(track => {
    if (!track?.title || !track?.artist) return false;
    const key = mergeKey(track.title, track.artist);
    if (identities.has(key)) return false;
    identities.add(key);
    return DAILY_SOURCE_IDS.every(id => {
      const rank = track.sourceRanks?.[id];
      if (!Number.isInteger(rank) || rank < 1 || rank > SOURCE_SIZE || positions[id].has(rank)) return false;
      positions[id].add(rank);
      return true;
    });
  });
}

export function isConsensusChart(snapshot) {
  return snapshot?.methodology === DAILY_CHART_METHOD && snapshot?.consensus === DAILY_CHART_CONSENSUS &&
    snapshot.complete === true && completeDailySources(snapshot.sources) && hasConsensusTracks(snapshot.tracks) &&
    snapshot.tracks.every(t => DAILY_SOURCE_IDS.every(id => t.sourceRanks[id] <= snapshot.sources[id]));
}

export function currentSourceDate(day, now=Date.now(), maxLagDays=1) {
  if (!/^20\d{2}-\d{2}-\d{2}$/.test(String(day || ""))) return false;
  const ms=Date.parse(day+"T00:00:00Z"), today=Math.floor(now/86400000)*86400000;
  return Number.isFinite(ms) && new Date(ms).toISOString().slice(0,10)===day &&
    ms<=today && today-ms<=maxLagDays*86400000;
}

export function validatedDailyRows(rows, source, size=CHART_SIZE) {
  if (!Array.isArray(rows) || rows.length !== size)
    throw new Error("incomplete_chart_sources:"+source);
  const identities=new Set();
  return rows.map((row,i) => {
    const title=String(row?.title || "").trim(), artist=String(row?.artist || "").trim();
    const pos=Number(row?.pos), key=mergeKey(title,artist);
    if (pos!==i+1 || !title || !artist || identities.has(key))
      throw new Error("invalid_rank_or_duplicate_source_"+source+"_at_"+(i+1));
    identities.add(key);
    return {...row,pos,title,artist};
  });
}

function scriptJSON(html, id) {
  for (const match of String(html || "").matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const scriptId=match[1].match(/\bid\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i);
    if ((scriptId?.[1] || scriptId?.[2] || scriptId?.[3]) === id) {
      try { return JSON.parse(match[2]); } catch { throw new Error("apple_global_invalid_json"); }
    }
  }
  throw new Error("apple_global_missing_"+id);
}

/* /us/ selects catalog metadata. The exact playlist ID selects the global
   daily ranking; the US most-played RSS is never a ranking fallback. */
export function parseAppleGlobal(html, size=CHART_SIZE) {
  const state=scriptJSON(html,"serialized-server-data");
  const page=state?.data?.find(p => p?.intent?.contentDescriptor?.kind==="playlist" &&
    p.intent.contentDescriptor.identifiers?.storeAdamID===APPLE_GLOBAL_ID);
  const sections=page?.data?.sections;
  const header=sections?.find(s => s.id==="playlist-detail-header-section - "+APPLE_GLOBAL_ID)?.items?.[0];
  const items=sections?.find(s => s.id==="track-list - "+APPLE_GLOBAL_ID)?.items;
  const schema=scriptJSON(html,"schema:music-playlist");
  if (header?.title!=="Top 100: Global" || schema?.name!=="Top 100: Global" ||
      !String(schema?.url || "").endsWith("/"+APPLE_GLOBAL_ID) ||
      !Array.isArray(items) || items.length!==100)
    throw new Error("apple_wrong_or_partial_global_playlist");
  const publishedAt=String(schema.datePublished || ""), date=publishedAt.slice(0,10);
  if (!currentSourceDate(date)) throw new Error("apple_global_date_stale_or_missing");
  const tracks=validatedDailyRows(items.slice(0,size).map((item,i) => {
    const descriptor=item?.contentDescriptor;
    if (descriptor?.kind!=="song" || Number(item.rankingText)!==i+1)
      throw new Error("apple_global_rank_missing_"+(i+1));
    return {pos:i+1, title:item.title, artist:item.artistName,
      url:String(descriptor.url || ""),
      art:String(item.artwork?.dictionary?.url || "").replaceAll("{w}","600").replaceAll("{h}","600").replaceAll("{f}","jpg"),
      year:"", prev:""};
  }),"A",size);
  return {date,publishedAt,tracks};
}

export function parseDeezerWorldwide(data, size=CHART_SIZE) {
  if (String(data?.id)!==DEEZER_GLOBAL_ID || data?.title!=="Top Worldwide" ||
      data?.creator?.name!=="Deezer Charts" || String(data?.creator?.id)!==DEEZER_CHARTS_CREATOR_ID || data?.nb_tracks<size)
    throw new Error("deezer_wrong_or_partial_worldwide_playlist");
  return validatedDailyRows((data.tracks?.data || []).slice(0,size).map((item,i) => ({
    pos:i+1, title:item.title,
    artist:(item.contributors || []).map(a => a?.name).filter(Boolean).join(", ") || item.artist?.name,
    // Playback, artwork and listen links continue to use the existing Apple resolver.
    url:"", art:"", year:"", prev:"",
  })),"D",size);
}

export function verifiedDailySeed(snapshot, source, now=Date.now()) {
  const expected=source==="A" ? "official-apple-global-playlist" : "official-deezer-worldwide-playlist";
  if (!["A","D"].includes(source) || snapshot?.schema!==2 || snapshot?.source!==expected ||
      snapshot.region!=="global" || snapshot.cadence!=="daily" ||
      !currentSourceDate(snapshot.updated,now,0) || !currentSourceDate(snapshot.sourceDate,now)) return null;
  const size=snapshot.tracks?.length;
  if(![CHART_SIZE,SOURCE_SIZE].includes(size))return null;
  try { return {...snapshot,tracks:validatedDailyRows(snapshot.tracks,source,size)}; } catch { return null; }
}

/* Old editions are retained for history recovery, never for serving a ranking
   under the new methodology. This keeps existing day counts through migration. */
export function verifiedTenureEdition(snapshot) {
  if (isConsensusChart(snapshot)) return true;
  if (!snapshot || snapshot.complete!==true || snapshot.tracks?.length!==CHART_SIZE) return false;
  if (snapshot.methodology===DAILY_CHART_METHOD) return completeDailySources(snapshot.sources);
  return !snapshot.methodology && Object.keys(snapshot.sources || {}).length===5 &&
    ["A","S","D","B","Y"].every(id => snapshot.sources[id]===CHART_SIZE);
}
