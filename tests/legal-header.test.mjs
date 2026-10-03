import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read = name => readFileSync(new URL("../public/" + name, import.meta.url), "utf8");
const main=read("index.html");
const legalCSS=read("legal-header.css");
const legalJS=read("legal-header.js");
const legalPages=["about.html","contacts.html","privacy.html","terms.html"];

test("legal pages reuse exact main logo geometry and glass header design",()=>{
  const desktopStart=main.indexOf(".topbar{--hp:0;position:fixed;");
  const desktopEnd=main.indexOf("\n.nav{",desktopStart);
  assert.ok(desktopStart>=0 && desktopEnd>desktopStart);
  assert.ok(legalCSS.includes(main.slice(desktopStart,desktopEnd)));
  const mobileStart=main.indexOf("  .topbar{--hp:0;height:auto;");
  const mobileEnd=main.indexOf("  .top-actions{flex:1",mobileStart);
  assert.ok(mobileStart>=0 && mobileEnd>mobileStart);
  assert.ok(legalCSS.includes(main.slice(mobileStart,mobileEnd)));
  assert.ok(legalCSS.includes("border:1px solid rgba(0,0,0,.08);"));
  assert.match(legalCSS,/@media \(min-width:1100px\)\{html\{zoom:\.96\}\}/);
  assert.match(legalCSS,/\.topbar\{font-family:var\(--font\)\}/);
  assert.match(legalCSS,/body\{padding-top:var\(--header-h,55px\)\}/);
  assert.match(legalJS,/function setHeaderAway\(away\)\{/);
  assert.match(legalJS,/function onScroll\(\)\{/);
  assert.match(legalJS,/window\.addEventListener\("scroll", onScroll/);
});

for(const filename of legalPages){
  test(filename+" has one logo and no navigation pills or search in the shared header",()=>{
    const page=read(filename);
    const header=page.match(/<header class="topbar">([\s\S]*?)<\/header>/);
    assert.ok(header,filename+" must have the topbar");
    assert.match(header[1],/<div class="topbar-glass topbar-glass-full" aria-hidden="true"><\/div>/);
    assert.match(header[1],/<div class="topbar-glass topbar-glass-isle" aria-hidden="true"><\/div>/);
    assert.match(header[1],/<img class="brand-logo" src="\/logo.png" alt="music98.news"/);
    assert.match(header[1],/<span class="brand-name">music98.news<\/span>/);
    assert.doesNotMatch(header[1],/<nav\b|nav-btn|search|top-actions/);
    assert.match(page,/<link rel="stylesheet" href="\/legal-header.css\?v=20261003-1">/);
    assert.match(page,/<script src="\/legal-header.js\?v=20261003-1" defer><\/script>/);
  });
}
