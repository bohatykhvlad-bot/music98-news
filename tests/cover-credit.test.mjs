import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { articleHtml, slugify } from "../functions/lib/seo.js";

const shell = `<!doctype html><html><head><title>x</title>
<meta name="description" content="home">
<meta property="og:title" content="home">
<meta property="og:description" content="home">
<meta property="og:url" content="https://music98.news/">
<meta property="og:image" content="https://music98.news/logo.png">
</head><body><section id="articlePage" hidden></section></body></html>`;

function post(cover){
  return {
    id: "credit-byline",
    title: "Two Photographers",
    type: "news",
    date: "2026-10-26",
    status: "live",
    excerpt: "A short teaser.",
    body: "One paragraph of the story.",
    cover,
  };
}

function byline(cover){
  const p = post(cover);
  const html = articleHtml(shell, p, slugify(p), "https://music98.news");
  const m = html.match(/<p class="pcred">[\s\S]*?<\/p>/);
  return m ? m[0] : "";
}

test("one cover credit stays Photo: Author", () => {
  const html = byline({
    kind: "img",
    src: "/photos/news-cover.jpg",
    credit: "Author One",
    creditUrl: "https://photos.example/one",
  });
  assert.equal(
    html,
    `<p class="pcred">Photo: <a href="https://photos.example/one" rel="noopener noreferrer">Author One</a></p>`,
  );
});

test("two cover credits render as Photo: Author 1 / Author 2", () => {
  const html = byline({
    kind: "img",
    src: "/photos/news-cover.jpg",
    credit: "Author One",
    creditUrl: "https://photos.example/one",
    credit2: "Author Two",
    creditUrl2: "https://photos.example/two",
  });
  assert.equal(
    html,
    `<p class="pcred">Photo: <a href="https://photos.example/one" rel="noopener noreferrer">Author One</a> / <a href="https://photos.example/two" rel="noopener noreferrer">Author Two</a></p>`,
  );
  assert.doesNotMatch(html, /Photos:|\(left\)|\(right\)/);
});

test("a second credit without a link is plain text after the slash", () => {
  const html = byline({
    kind: "img",
    src: "/photos/news-cover.jpg",
    credit: "Author One",
    credit2: "Author <Two>",
  });
  assert.equal(
    html,
    `<p class="pcred">Photo: Author One / Author &lt;Two&gt;</p>`,
  );
});

test("the desk editor can add one second author and still saves cardSrc", () => {
  const desk = readFileSync(new URL("../public/admin-desk.html", import.meta.url), "utf8");
  const page = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
  assert.match(desk, /id="addCredit"/);
  assert.match(desk, /id="credit2"/);
  assert.match(desk, /id="creditUrl2"/);
  assert.match(desk, /id="removeCredit"/);
  assert.match(desk, /class="cred-block hide" id="credit2row"/);
  assert.match(desk, /class="cred-slot"/);
  assert.match(desk, /setSecondCredit\(!!\(\(p\?\.cover && p\.cover\.credit2\) \|\| \(p\?\.cover && p\.cover\.creditUrl2\)\)\)/);
  assert.match(desk, /credit2: secondCredit\("credit2"\)/);
  assert.match(desk, /creditUrl2: secondCredit\("creditUrl2"\)/);
  assert.match(desk, /if\(cardSrc\) cover\.cardSrc = cardSrc/);
  assert.match(page, /Photo: \$\{link\(c\.credit, c\.creditUrl\)\}\$\{second\}/);
  assert.doesNotMatch(page, /Photos:| \(left\)| \(right\)/);
  assert.doesNotMatch(desk, /Photos:| \(left\)| \(right\)/);
});
