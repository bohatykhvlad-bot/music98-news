import test from 'node:test';
import assert from 'node:assert/strict';
import {parseKworbArtistDaily,matchKworbTrack,rankAppleSpotify,validHybridRows,verifiedStreamSeed,
 isAppleSpotifyChart,HYBRID_METHOD,HYBRID_RULE,titleKey} from '../functions/lib/apple-spotify-chart.js';

const date=new Date().toISOString().slice(0,10);
const artist={name:'Artist',id:'a'.repeat(22)};
function page(rows,columns=['Song Title','Streams','Daily']){
 return `<title>Artist - Spotify Top Songs</title>Last updated: ${date.replaceAll('-','/')}<table><tr>${columns.map(x=>'<th>'+x+'</th>').join('')}</tr>`+
 rows.map((r,i)=>`<tr><td><a href="https://open.spotify.com/track/${String(i).padStart(22,'0')}">${r.title}</a></td><td>${r.total??'99,999,999'}</td><td>${r.daily??'123,456'}</td></tr>`).join('')+'</table>';
}
export function rows(){
 return Array.from({length:50},(_,i)=>({pos:i+1,title:'Song '+(i+1),artist:'Artist '+(i+1),sourceRanks:{A:i+1},
  spotify:{status:i<35?'matched':'track-not-found',daily:i<35?(i+1)*10000:null,
   ...(i<35?{spotifyId:String(i).padStart(22,'0'),date,sourceUrl:`https://kworb.net/spotify/artist/${artist.id}_songs.html`}:{})}}));
}
test('artist Daily is distinct from lifetime Streams and accepts values outside a Top 200',()=>{
 const p=parseKworbArtistDaily(page([{title:'Song',total:'3,197,014,668',daily:'941,851'}]),artist);
 assert.equal(p.tracks[0].daily,941851);assert.equal(p.tracks[0].total,3197014668);assert.equal(p.date,date);
});
test('rejects wrong artist, changed columns, impossible counters and partial pages',()=>{
 assert.throws(()=>parseKworbArtistDaily(page([{title:'Song'}]),{...artist,name:'Other'}));
 assert.throws(()=>parseKworbArtistDaily(page([{title:'Song'}],['Song Title','Daily','Streams']),artist));
 assert.throws(()=>parseKworbArtistDaily(page([{title:'Song',total:'10',daily:'20'}]),artist));
 assert.throws(()=>parseKworbArtistDaily('<title>Artist - Spotify Top Songs</title>',artist));
});
test('matches feature spelling while retaining versions, Unicode titles and ambiguity',()=>{
 const p=parseKworbArtistDaily(page([{title:'Song (feat. Guest)'},{title:'Song - Live'}]),artist);
 assert.equal(matchKworbTrack({title:'Song'},p).daily,123456);
 assert.equal(matchKworbTrack({title:'Song - Remix'},p).status,'track-not-found');
 assert.equal(matchKworbTrack({title:'Song'},parseKworbArtistDaily(page([{title:'Song'},{title:'Song'}]),artist)).status,'ambiguous');
 assert.notEqual(titleKey('曲一'),titleKey('曲二'));
});
test('missing Daily stays unknown rather than becoming zero or lifetime streams',()=>{
 const p=parseKworbArtistDaily(page([{title:'Song',daily:'-'}]),artist);
 assert.equal(p.tracks[0].daily,null);assert.equal(matchKworbTrack({title:'Song'},p).status,'track-not-found');
});
test('keeps exactly the Apple 50, limits stream correction and leaves unknowns at Apple base points',()=>{
 const input=rows(),ranked=rankAppleSpotify(input);
 assert.equal(ranked.length,50);assert.deepEqual(new Set(ranked.map(t=>t.title)),new Set(input.map(t=>t.title)));
 assert.ok(ranked.every(t=>t.spotifyBonus>=0&&t.spotifyBonus<=10));
 assert.equal(ranked.find(t=>t.pos===50).score,1);
 assert.deepEqual(input,rows());
 const boost=rows();boost[8].spotify.daily=5000000;
 assert.ok(rankAppleSpotify(boost).find(t=>t.pos===9).rank<9);
});
test('seed rejects low coverage, stale edition, mixed dates and duplicate Spotify IDs',()=>{
 const seed={schema:1,methodology:HYBRID_METHOD,appleDate:date,spotifyDate:date,fingerprint:'a'.repeat(64),coverage:{matched:35},tracks:rows()};
 assert.ok(verifiedStreamSeed(seed));assert.equal(verifiedStreamSeed({...seed,spotifyDate:'2020-01-01'}),null);
 const bad=structuredClone(seed);bad.tracks[1].spotify.spotifyId=bad.tracks[0].spotify.spotifyId;assert.equal(verifiedStreamSeed(bad),null);
 const mixed=structuredClone(seed);mixed.tracks[1].spotify.date='2020-01-01';assert.equal(verifiedStreamSeed(mixed),null);
 assert.equal(verifiedStreamSeed({...seed,coverage:{matched:1}}),null);
});
test('published proof rejects changed scores, invented ranks, outsiders and obsolete methodology',()=>{
 const chart={methodology:HYBRID_METHOD,consensus:HYBRID_RULE,complete:true,sources:{A:50,S:35},sourceDates:{S:date},
  spotifyFingerprint:'a'.repeat(64),tracks:rankAppleSpotify(rows())};
 assert.ok(isAppleSpotifyChart(chart));
 const tampered=structuredClone(chart);tampered.tracks[0].score+=1;assert.equal(isAppleSpotifyChart(tampered),false);
 assert.equal(isAppleSpotifyChart({...chart,methodology:'daily-global-v1'}),false);
 assert.equal(validHybridRows(chart.tracks.slice(0,49)),false);
});
