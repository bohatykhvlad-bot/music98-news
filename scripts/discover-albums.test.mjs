import test from 'node:test';
import assert from 'node:assert/strict';
import {parseTop500,albumCandidates,decodeHtml} from './build-discover-albums.mjs';

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
