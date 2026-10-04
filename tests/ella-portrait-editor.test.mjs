import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync, existsSync} from "node:fs";

const article=readFileSync(new URL("../public/index.html", import.meta.url),"utf8");
const editor=readFileSync(new URL("../public/admin-desk.html", import.meta.url),"utf8");
const original=new URL("../public/photos/ella-langley-live-caylee-robillard-2026.jpg", import.meta.url);

test("Ella live original remains in the repository and uses its portrait frame on the public article",()=>{
  assert.ok(existsSync(original),"The original live photo must remain editable and uncropped");
  assert.match(article,/\.abody-pic:has\(img\[src\*="ella-langley-live-caylee-robillard-2026\.jpg"\]\) \.abody-box\{aspect-ratio:1638\/2048;max-width:550px;margin-inline:auto\}/);
});

test("Ella portrait is not force-cropped to 16:9 in the inline editor",()=>{
  assert.match(editor,/\.composer \.abody-pic:has\(img\[src\*="ella-langley-live-caylee-robillard-2026\.jpg"\]\) \.abody-box\{aspect-ratio:1638\/2048;max-width:520px;margin-inline:auto\}/);
  assert.match(editor,/function fitPhotoFig\(fig\)\{/);
  assert.match(editor,/function bindPhotoFit\(fig\)\{/);
  assert.match(editor,/class="pp-zoom"/);
  assert.match(editor,/dataset\.pzoom/);
  assert.match(editor,/addEventListener\("mousedown"/);
  assert.match(editor,/addEventListener\("mousemove"/);
});
