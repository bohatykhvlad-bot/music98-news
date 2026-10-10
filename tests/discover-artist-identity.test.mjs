import test from 'node:test';import assert from 'node:assert/strict';
import {anchorArtistId,spotifySongTitles} from '../scripts/lib/discover-artist-identity.mjs';
const song=(id,title,name='Offset')=>({kind:'song',artistId:id,artistName:name,trackName:title});
test('homonyms resolve through distinct recordings, not the largest album catalog',()=>{
 const rows=[song(3973268,'Clout'),song(3973268,'Red Room'),song(1348899249,'Some Other Song'),{wrapperType:'artist',artistId:3973268,artistName:'Offset'}];
 assert.equal(anchorArtistId(rows,['Clout','Red Room'],'Offset').artistId,3973268);
 assert.equal(anchorArtistId([song(1,'One'),song(2,'One')],['One'],'Offset'),null);
 assert.equal(anchorArtistId([song(1,'One'),song(1,'Two'),song(2,'One'),song(2,'Two')],['One','Two'],'Offset'),null);
});
test('unrelated cover artists and duplicate versions cannot corroborate artist identity',()=>{
 assert.equal(anchorArtistId([song(1,'One','Other'),song(1,'Two','Other')],['One','Two'],'Offset'),null);
 assert.equal(anchorArtistId([song(1,'One'),song(1,'One')],['One'],'Offset'),null);
});
test('artist anchors require the correct Spotify page and ignore guest appearances',()=>{
 const html='<title>Offset - Spotify Top Songs</title><table><tr><td><a href="https://open.spotify.com/track/0000000000000000000001">Clout</a></td></tr><tr><td>* <a href="https://open.spotify.com/track/0000000000000000000002">Guest</a></td></tr></table>';
 assert.deepEqual(spotifySongTitles(html,'Offset'),['Clout']);assert.throws(()=>spotifySongTitles(html,'Other'));
});
