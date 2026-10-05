import {APPLE_GLOBAL_ID,APPLE_GLOBAL_URL,DEEZER_GLOBAL_ID} from "../../functions/lib/daily-chart-sources.js";

export function appleHTML(rows, {id=APPLE_GLOBAL_ID,count=100,date=new Date().toISOString().slice(0,10)}={}) {
  const items=Array.from({length:count},(_,i)=>{
    const row=rows[i] || {title:"Apple Song "+(i+1),artist:"Apple Artist "+(i+1)};
    return {title:row.title,artistName:row.artist,rankingText:String(i+1),
      contentDescriptor:{kind:"song",url:"https://music.apple.com/us/album/song/100?i="+(1000+i)},
      artwork:{dictionary:{url:"https://is1-ssl.mzstatic.com/image/thumb/"+(i+1)+"/{w}x{h}bb.{f}"}}};
  });
  const state={data:[{intent:{contentDescriptor:{kind:"playlist",identifiers:{storeAdamID:id}}},data:{sections:[
    {id:"playlist-detail-header-section - "+id,items:[{title:"Top 100: Global"}]},
    {id:"track-list - "+id,items}
  ]}}]};
  const schema={name:"Top 100: Global",url:APPLE_GLOBAL_URL,datePublished:date+"T07:00:00Z"};
  return '<script type="application/json" id="serialized-server-data">'+JSON.stringify(state)+
    '</script><script id=schema:music-playlist type="application/ld+json">'+JSON.stringify(schema)+'</script>';
}

export function fakeDailySource({deezerCount=50,kworbMissing=[],kworbSwap=false,appleOffline=false,deezerOffline=false}={}) {
  const today=new Date().toISOString().slice(0,10),requests=[];
  const rows=Array.from({length:50},(_,i)=>({pos:i+1,title:"Source Song "+(i+1),artist:"Source Artist "+(i+1)}));
  const snapshot={schema:1,verified:true,provider:"kworb+musicrank",mirrorMatched:50,
    fingerprint:"a".repeat(64),chartDate:today,tracks:rows};
  const kw='<title>Spotify Daily Chart - Global</title><h2>'+today.replaceAll("-","/")+'</h2><table>'+
    rows.filter(x=>!kworbMissing.includes(x.pos)).map(x=>
      '<tr class="d2"><td class="np">'+x.pos+'</td><td class="np">=</td>'+
      '<td class="text mp"><div><b>'+x.artist+'</b> - '+(kworbSwap&&x.pos===36?"Wrong Song":x.title)+'</div></td></tr>'
    ).join("")+'</table>';
  const apple=appleHTML(rows);
  const deezer={id:Number(DEEZER_GLOBAL_ID),title:"Top Worldwide",nb_tracks:100,creator:{name:"Deezer Charts"},
    tracks:{data:rows.slice(0,deezerCount).map(x=>({title:x.title,artist:{name:x.artist}}))}};
  const fakeFetch=async input=>{
    const url=String(input);requests.push(url);
    const response=body=>new Response(typeof body==="string"?body:JSON.stringify(body),{status:200});
    if(url.includes("music.apple.com/us/playlist"))return appleOffline ? new Response("offline",{status:503}) : response(apple);
    if(url.includes("kworb.net"))return response(kw);
    if(url.includes("api.deezer.com/playlist/"))return deezerOffline ? new Response("offline",{status:503}) : response(deezer);
    return new Response("missing",{status:404});
  };
  return {fakeFetch,snapshot,rows,apple,deezer,requests};
}
