import test from "node:test";
import assert from "node:assert/strict";
import {artworkKey} from "../functions/lib/chart-identity.js";
import {retainedArtworkHistory} from "../functions/lib/artwork-history.js";

const row=(title,artist,art="https://is1-ssl.mzstatic.com/verified.jpg")=>({
  title,artist,identity:artworkKey(title,artist),art,verified:true,confidence:98,releaseClass:"album"
});
test("verified covers survive leaving and re-entering the daily chart",()=>{
  const old=row("Returning Song","Artist"),current=row("New Song","Other Artist");
  const history=retainedArtworkHistory({entries:{[current.identity]:current},history:{[old.identity]:old}});
  assert.equal(history[old.identity].art,old.art);
  assert.equal(history[current.identity].art,current.art);
  assert.equal(retainedArtworkHistory({entries:{[old.identity]:{...old,confidence:91}}})[old.identity].art,old.art);
  const repaired={...old,art:"https://is1-ssl.mzstatic.com/repaired.jpg"};
  assert.equal(retainedArtworkHistory({history,entries:{[old.identity]:repaired}})[old.identity].art,repaired.art);
});
test("previously certified stripped sleeves never survive as original artwork",()=>{
  const original={...row("Kid Myself","John Morgan"),releaseTitle:"Kid Myself (Stripped) - Single"};
  assert.deepEqual(retainedArtworkHistory({entries:{[original.identity]:original}}),{});
  const studio={...original,releaseTitle:"Carolina Blue"};
  assert.equal(retainedArtworkHistory({entries:{[studio.identity]:studio}})[studio.identity].art,studio.art);
  const stripped={...row("Kid Myself (Stripped)","John Morgan"),releaseTitle:"Kid Myself (Stripped) - Single"};
  assert.equal(retainedArtworkHistory({entries:{[stripped.identity]:stripped}})[stripped.identity].art,stripped.art);
});
test("historical artwork cannot cross identities or preserve unsafe matches",()=>{
  const good=row("Song","Artist & Guest");
  for(const bad of [{...good,verified:false},{...good,confidence:70},{...good,releaseClass:"generic"},
    {...good,releaseClass:"derivative"},{...good,art:"https://mzstatic.com.example.org/fake.jpg"},
    {...good,artist:"Artist & Different Guest"}]){
    assert.deepEqual(retainedArtworkHistory({entries:{[good.identity]:bad}}),{});
  }
});
