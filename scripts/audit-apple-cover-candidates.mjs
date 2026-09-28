import { normTitle, primaryArtist, versionSignature } from "../functions/lib/chart-identity.js";

const cases = [
  ["drop dead","Olivia Rodrigo"],
  ["September","Earth, Wind & Fire"],
  ["I Just Might","Bruno Mars"],
  ["Pink Blush","Dolly Babe"],
  ["Loser","Tame Impala"],
];

function exact(title, artist, x) {
  return normTitle(x.trackName) === normTitle(title)
    && primaryArtist(x.artistName) === primaryArtist(artist)
    && versionSignature(x.trackName) === versionSignature(title);
}
for (const [title,artist] of cases) {
  const terms=[
    `${artist} ${title}`,
    `${title} ${artist}`,
    `${artist} ${title} single`,
  ];
  const seen=new Map();
  for(const term of terms){
    const u="https://itunes.apple.com/search?term="+encodeURIComponent(term)+"&entity=song&limit=200&country=US";
    const r=await fetch(u,{headers:{"user-agent":"Mozilla/5.0"}});
    const j=await r.json();
    for(const x of j.results||[]){
      if(exact(title,artist,x)) seen.set(String(x.trackId),x);
    }
  }
  const rows=[...seen.values()].map(x=>({
    trackId:x.trackId,
    collectionId:x.collectionId,
    trackName:x.trackName,
    artistName:x.artistName,
    collectionName:x.collectionName,
    releaseDate:x.releaseDate,
    primaryGenreName:x.primaryGenreName,
    art:x.artworkUrl100,
  })).sort((a,b)=>(Date.parse(a.releaseDate)||9e15)-(Date.parse(b.releaseDate)||9e15));
  console.log("CASE", JSON.stringify({title,artist,count:rows.length,rows}));
}
