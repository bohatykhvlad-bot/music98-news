import test from "node:test";
import assert from "node:assert/strict";
import {compareSpotifyRankings,parseKworbSpotify,parseMusicrankSpotify,spotifyDateCurrent,
 validatedSpotifyRows,verifiedSpotifySnapshot} from "../functions/lib/spotify-chart.js";
const tracks=Array.from({length:50},(_,i)=>({pos:i+1,title:"Song "+(i+1),artist:"Artist "+(i+1)}));
function kworb(rows=tracks,date="2026-09-30"){
 const markup=rows.map(t=>{
  const styled=[17,36,50].includes(t.pos),open=styled?'<tr class="d2">':"<tr>";
  const artist=styled?"<b>"+t.artist+"</b>":t.artist;
  return open+'<td class="np">'+t.pos+'</td><td class="np">=</td>'+
    '<td class="text mp"><div><a>'+artist+'</a> - <a>'+t.title+'</a></div></td></tr>';
 }).join("");
 return '<html><title>Spotify Daily Chart - Global</title><h2>'+date.replaceAll("-","/")+
   '</h2><table>'+markup+'</table></html>';
}
function musicrank(rows=tracks,date="Sep 30, 2026"){
 const json={"@type":"ItemList",name:"Spotify global chart",
  itemListElement:rows.slice(0,20).map(t=>({position:t.pos,item:{name:t.title,byArtist:{name:t.artist}}}))};
 const links=rows.map(t=>'<a href="/track/'+t.pos+'">'+t.title+'</a>'+
    '<p><a href="/artist/'+t.pos+'">'+t.artist+'</a></p>').join("");
 return '<html><head><meta name="description" content="Spotify&#x27;s daily top songs worldwide for '+
   date+'. Worldwide"/></head><body><main><script type="application/ld+json">'+JSON.stringify(json)+
   '</script>'+links+'</main></body></html>';
}
test("bold/highlighted Kworb rows and all 50 positions are retained",()=>{
 const v=parseKworbSpotify(kworb());
 assert.equal(v.date,"2026-09-30");
 assert.deepEqual(v.tracks.map(t=>t.pos),tracks.map(t=>t.pos));
 for(const rank of [17,36,50])assert.equal(v.tracks[rank-1].title,"Song "+rank);
});
test("Kworb tolerates alternate class order and nested bold text",()=>{
 const html=kworb().replace('<td class="text mp">','<td class="mp text highlight">')
   .replace("<b>Artist 17</b>","<strong>Artist &amp; Guest</strong>");
 assert.equal(parseKworbSpotify(html).tracks[16].artist,"Artist & Guest");
});
test("partial ranks, duplicates and wrong chart markup are rejected",()=>{
 assert.throws(()=>parseKworbSpotify(kworb(tracks.slice(0,49))));
 assert.throws(()=>parseKworbSpotify(kworb().replace('Spotify Daily Chart - Global','Wrong chart')));
 assert.throws(()=>validatedSpotifyRows(tracks.map(t=>({...t,pos:t.pos===50?49:t.pos}))));
 assert.throws(()=>validatedSpotifyRows(tracks.map(t=>({...t,
   title:t.pos===50?"Song 1":t.title,artist:t.pos===50?"Artist 1":t.artist}))));
});
test("Musicrank independently confirms visible top 20 and yields all 50",()=>{
 const mr=parseMusicrankSpotify(musicrank());
 assert.equal(mr.tracks.length,50);
 assert.equal(mr.ldConfirmed,20);
 assert.equal(compareSpotifyRankings(parseKworbSpotify(kworb()),mr).ok,true);
 const h=musicrank().replace('>Song 5</a>','>Wrong title</a>');
 assert.throws(()=>parseMusicrankSpotify(h),/metadata_mismatch/);
});
test("mismatched ranks and dates block cross-provider verification",()=>{
 const a=parseKworbSpotify(kworb()),b=parseMusicrankSpotify(musicrank());
 assert.deepEqual(compareSpotifyRankings(a,b).mismatchPositions,[]);
 b.tracks[35].title="Other";
 assert.deepEqual(compareSpotifyRankings(a,b).mismatchPositions,[36]);
 assert.equal(compareSpotifyRankings(a,{...b,date:"2026-09-29"}).dateMatch,false);
});
test("Spotify source dates are checked in UTC and expire after two days",()=>{
 const now=Date.parse("2026-10-02T16:00:00Z");
 assert.equal(spotifyDateCurrent("2026-09-30",now),true);
 assert.equal(spotifyDateCurrent("2026-09-29",now),false);
 assert.equal(spotifyDateCurrent("2026-10-03",now),false);
 assert.equal(spotifyDateCurrent("no date",now),false);
});
test("daily fallback requires verified provenance and all 50 tracks",()=>{
 const now=Date.parse("2026-10-02T16:00:00Z");
 const s={schema:1,verified:true,chartDate:"2026-09-30",provider:"kworb+musicrank",
   mirrorMatched:50,tracks};
 assert.equal(verifiedSpotifySnapshot(s,now)?.tracks.length,50);
 assert.equal(verifiedSpotifySnapshot({...s,mirrorMatched:49},now),null);
 assert.equal(verifiedSpotifySnapshot({...s,tracks:tracks.slice(0,49)},now),null);
 assert.equal(verifiedSpotifySnapshot({...s,chartDate:"2026-09-29"},now),null);
 assert.equal(verifiedSpotifySnapshot({...s,provider:"musicrank-self-validated",ldConfirmed:20},now)?.tracks.length,50);
 assert.equal(verifiedSpotifySnapshot({...s,provider:"musicrank-self-validated",ldConfirmed:19},now),null);
});
