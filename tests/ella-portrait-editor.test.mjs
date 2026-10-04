import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync, existsSync} from "node:fs";

const article=readFileSync(new URL("../public/index.html", import.meta.url),"utf8");
const editor=readFileSync(new URL("../public/admin-desk.html", import.meta.url),"utf8");
const original=new URL("../public/photos/ella-langley-live-caylee-robillard-2026.jpg", import.meta.url);
const ellaSelector="ella-langley-live-caylee-robillard-2026.jpg";

test("Ella live photo original is preserved and the public article uses the default landscape inline frame",()=>{
  assert.ok(existsSync(original),"The original live photo must remain present and editable");
  assert.match(article,/\.abody-box\{[^}]*aspect-ratio:16\/9[^}]*\}/);
  assert.ok(!article.includes('.abody-pic:has(img[src*="'+ellaSelector+'"])'),
    "Do not hard-code a special aspect ratio for Ella in the public article");
  assert.match(article,/function fitCover\(img\)\{/);
  assert.match(article,/img\.dataset\.zoom/);
  assert.match(article,/img\.dataset\.fy/);
});

test("Inline editor matches the landscape article frame and keeps focal-point, zoom and drag controls",()=>{
  assert.match(editor,/\.composer \.abody-box\{[^}]*aspect-ratio:16\/9[^}]*\}/);
  assert.ok(!editor.includes('.abody-pic:has(img[src*="'+ellaSelector+'"])'),
    "Editor must not force Ella into a different crop aspect");
  assert.match(editor,/function fitPhotoFig\(fig\)\{/);
  assert.match(editor,/function bindPhotoFit\(fig\)\{/);
  assert.match(editor,/class="pp-zoom"/);
  assert.match(editor,/dataset\.pzoom/);
  assert.match(editor,/dataset\.fx/);
  assert.match(editor,/dataset\.fy/);
  assert.match(editor,/addEventListener\("mousedown"/);
  assert.match(editor,/addEventListener\("mousemove"/);
});
