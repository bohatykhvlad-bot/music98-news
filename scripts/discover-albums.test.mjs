import test from 'node:test';
import assert from 'node:assert/strict';
import {parseTop500,albumCandidates,decodeHtml,albumLookupStale,reusableCatalog,parseRankedArtists,assembleCatalog,excludedGenre,excludedArtist,eligibleAlbums} from './build-discover-albums.mjs';
const genrePolicyVersion=globalThis.music98DiscoverCatalogPolicy.version;

test('parses ranked rows with HTML-encoded artist names',()=>{
 const rows='<tr><th>#</th><th>Artist</th></tr><tr><td>1</td><td><a href="#">Bruno Mars</a></td><td>123,456</td></tr><tr><td>2</td><td>Beyonc&#233; &amp; Friends</td><td>89,000</td></tr>';
 assert.deepEqual(parseTop500(rows),[{name:'Bruno Mars',rank:1},{name:'Beyoncé & Friends',rank:2}]);
});
test('rejects singles, remixes, compilation, foreign artist and duplicates',()=>{
 const items=[
 {collectionId:1,collectionName:'Future Nostalgia',artistName:'Dua Lipa',trackCount:11,releaseDate:'2020-03-27',primaryGenreName:'Pop'},
 {collectionId:2,collectionName:'Future Nostalgia',artistName:'Dua Lipa',trackCount:11},
 {collectionId:3,collectionName:'Future Nostalgia (Deluxe)',artistName:'Dua Lipa',trackCount:14},
 {collectionId:4,collectionName:'Live at London',artistName:'Dua Lipa',trackCount:14},
 {collectionId:5,collectionName:'Song - Single',artistName:'Dua Lipa',trackCount:1},
 {collectionId:6,collectionName:'Actual Album',artistName:'Another Artist',trackCount:11}
 ];
 assert.deepEqual(albumCandidates(items,'Dua Lipa'),[{id:1,title:'Future Nostalgia',year:2020,genre:'Pop'}]);
});
test('Unicode safe decoding',()=>assert.equal(decodeHtml('Beyonc&#233; &amp; Jhen&#xe9;'),'Beyoncé & Jhené'));

test('weekly refresh caches empty Apple results instead of repeating all API lookups',()=>{
 const now=Date.parse('2026-10-09T19:00:00Z');
 const recent={albums:[],checkedAt:'2026-10-09T18:00:00Z'};
 assert.equal(albumLookupStale(recent,now),false);
 assert.equal(albumLookupStale({albums:[{id:1}],checkedAt:'2026-10-09T18:00:00Z'},now),false);
 assert.equal(albumLookupStale({albums:[],checkedAt:'2026-10-01T19:00:00Z'},now),true);
 assert.equal(albumLookupStale({albums:[],checkedAt:null},now),true);
 assert.equal(albumLookupStale(undefined,now),true);
});

test('filtered recent catalog reuses lookups while preserving the source ranks',()=>{
 const now=Date.parse('2026-10-10T01:00:00Z');
 const ranking=Array.from({length:502},(_,i)=>({rank:i+1,name:'Artist '+(i+1)}));
 const excludedArtists=[{...ranking[0],reason:'excluded-genre',genres:['Bollywood'],checkedAt:'2026-10-10T00:00:00Z'}];
 const missingArtists=[{...ranking[1],albums:[],checkedAt:'2026-10-10T00:00:00Z'}];
 const artists=ranking.slice(2).map((a,i)=>({...a,position:i+1,albums:[{id:100000+i,genre:'Pop'}],checkedAt:'2026-10-10T00:00:00Z'}));
 const previous={schema:2,genrePolicyVersion,artists,excludedArtists,missingArtists};
 assert.equal(reusableCatalog(previous,ranking,now),true);
 assert.equal(reusableCatalog({...previous,artists:artists.slice(0,499)},ranking,now),false);
 assert.equal(reusableCatalog({...previous,genrePolicyVersion:0},ranking,now),false);
 assert.equal(reusableCatalog({...previous,artists:artists.map((a,i)=>i===5?{...a,checkedAt:null}:a)},ranking,now),false);
 assert.equal(reusableCatalog(previous,ranking.map((a,i)=>i===0?{...a,name:'Different artist'}:a),now),false);
 assert.equal(reusableCatalog(previous,ranking,now+7*86400_000),false);
});

test('scans source positions past 500 instead of truncating before genre exclusions',()=>{
 const html=Array.from({length:550},(_,i)=>`<tr><td>${i+1}</td><td>Artist ${i+1}</td></tr>`).join('');
 assert.equal(parseTop500(html).length,500);
 assert.equal(parseRankedArtists(html).length,550);
 assert.deepEqual(parseRankedArtists(html)[549],{name:'Artist 550',rank:550});
});

test('genre policy excludes Indian categories without matching Indie or Indonesian pop',()=>{
 for(const genre of ['Indian','Indian Pop','Indian Classical','Bollywood','Regional Indian','Tamil','Telugu','Punjabi Pop','Kannada','Hindustani'])assert.equal(excludedGenre(genre),true,genre);
 for(const genre of ['Indie Pop','Indie Rock','Indo Pop','Pop','K-Pop','Jazz','Country','Latin','Afrobeats','Christian'])assert.equal(excludedGenre(genre),false,genre);
 assert.equal(excludedArtist({name:'Any name',albums:[{genre:'Bollywood'},{genre:'Soundtrack'}]}),true);
 assert.equal(excludedArtist({name:'Any name',albums:[{genre:'Indian Pop'},{genre:'Devotional & Spiritual'},{genre:'Worldwide'}]}),true);
 const crossover={albums:[{id:1,genre:'Pop'},{id:2,genre:'Rock'},{id:3,genre:'Indian Pop'}]};
 assert.equal(excludedArtist(crossover),false);
 assert.deepEqual(eligibleAlbums(crossover),crossover.albums.slice(0,2));
 assert.deepEqual(eligibleAlbums({albums:[null,{id:1,genre:'Rock'},{id:2,genre:'Bollywood'}]}),[{id:1,genre:'Rock'}]);
});

test('backfills to exactly 500 playable artists, reusing fresh matches and caching exclusions',async()=>{
 const now=Date.parse('2026-10-10T01:00:00Z');
 const ranking=Array.from({length:550},(_,i)=>({rank:i+1,name:'Artist '+(i+1)}));
 const previous={artists:ranking.slice(0,500).map((a,i)=>({...a,albums:[{id:i+1,genre:i<30?'Bollywood':'Pop'}],checkedAt:'2026-10-10T00:00:00Z'}))};
 const calls=[];
 const result=await assembleCatalog(ranking,previous,{now,lookup:async name=>{calls.push(name);return {albums:[{id:10000+calls.length,genre:'Rock'}]}}});
 assert.equal(result.artists.length,500);
 assert.equal(result.playableArtistCount,500);
 assert.equal(result.artists[0].rank,31);
 assert.equal(result.artists[0].position,1);
 assert.equal(result.artists.at(-1).rank,530);
 assert.equal(result.excludedArtistCount,30);
 assert.equal(calls.length,30);
 assert.ok(calls.every(name=>Number(name.split(' ')[1])>500));
 assert.ok(result.artists.every(a=>a.albums.length&&a.albums.every(v=>!excludedGenre(v.genre))));
 assert.equal(reusableCatalog(result,ranking,now),true);
});

test('insufficient healthy candidates fail rather than returning a smaller catalog',async()=>{
 const ranking=Array.from({length:510},(_,i)=>({rank:i+1,name:'Artist '+(i+1)}));
 const previous={artists:ranking.map(a=>({...a,albums:[],checkedAt:'2026-10-10T00:00:00Z'}))};
 await assert.rejects(assembleCatalog(ranking,previous,{now:Date.parse('2026-10-10T01:00:00Z'),lookup:async()=>{throw Error('must not retry fresh empty lookups')}}),/Catalog incomplete/);
 assert.equal(previous.artists.length,510);
 assert.ok(previous.artists.every(a=>!a.albums.length));
});

test('weekly lookup budget covers excluded ranks and refreshes the last selected artist',async()=>{
 const now=Date.parse('2026-10-17T01:00:00Z');
 const ranking=Array.from({length:550},(_,i)=>({rank:i+1,name:'Artist '+(i+1)}));
 const calls=[];
 const oldTime='2026-10-09T01:00:00Z';
 const previous={genrePolicyVersion,artists:ranking.slice(30,530).map(a=>({...a,albums:[{id:a.rank,genre:'Pop'}],checkedAt:oldTime})),excludedArtists:ranking.slice(0,30).map(a=>({...a,reason:'excluded-genre',genres:['Bollywood'],checkedAt:oldTime}))};
 const result=await assembleCatalog(ranking,previous,{now,batch:750,lookup:async name=>{
  const rank=Number(name.split(' ')[1]);calls.push(rank);
  return {albums:[{id:rank,genre:rank<=30?'Bollywood':'Pop'}]};
 }});
 assert.equal(calls.length,530);
 assert.equal(result.artists.at(-1).rank,530);
 assert.equal(result.artists.at(-1).checkedAt,new Date(now).toISOString());
 assert.equal(result.artists.length,500);
});


test('regional Mexican labels are excluded without removing other Latin genres',()=>{
 for(const genre of ['Música Mexicana','Musica Mexicana','Regional Mexican','Regional Mexicano','Ranchera','Corridos','Mariachi','Banda','Norteño','Grupero','Tejano','Sierreño'])assert.equal(excludedGenre(genre),true,genre);
 for(const genre of ['Latin','Urbano latino','Pop Latino','Música tropical','Baladas y Boleros','Banda Sonora'])assert.equal(excludedGenre(genre),false,genre);
});

test('expanded policy refilters cached albums and backfills without re-querying previous exclusions',async()=>{
 const now=Date.parse('2026-10-10T01:00:00Z'),checkedAt=new Date(now).toISOString();
 const ranking=Array.from({length:560},(_,i)=>({rank:i+1,name:'Artist '+(i+1)}));
 const previous={genrePolicyVersion:1,
  artists:ranking.slice(2,502).map((a,i)=>({...a,position:i+1,checkedAt,albums:[{id:a.rank,genre:i<10?'Música Mexicana':'Pop'}]})),
  excludedArtists:[{...ranking[0],reason:'excluded-genre',genres:['Bollywood'],checkedAt}],
  missingArtists:[{...ranking[1],albums:[],checkedAt}]};
 const calls=[];
 const result=await assembleCatalog(ranking,previous,{now,lookup:async name=>{calls.push(name);return {albums:[{id:10000+calls.length,genre:'Rock'}]}}});
 assert.equal(result.genrePolicyVersion,genrePolicyVersion);
 assert.equal(result.artists.length,500);
 assert.equal(result.excludedArtistCount,11);
 assert.equal(result.unmatchedArtistCount,1);
 assert.equal(result.artists.at(-1).rank,512);
 assert.equal(calls.length,10);
 assert.ok(result.artists.every(a=>a.albums.every(v=>!excludedGenre(v.genre))));
 assert.equal(reusableCatalog(result,ranking,now),true);
});
