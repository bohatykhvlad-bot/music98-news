import { normTitle, versionSignature } from "./chart-identity.js";

function decodeHtml(s) {
  return String(s || "")
    .replace(/&amp;/gi,"&")
    .replace(/&quot;/gi,'"')
    .replace(/&#39;|&apos;/gi,"'")
    .replace(/&nbsp;/gi," ")
    .replace(/&lt;/gi,"<")
    .replace(/&gt;/gi,">")
    .replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)));
}

function visibleText(html) {
  return decodeHtml(
    String(html || "")
      .replace(/<script\b[\s\S]*?<\/script>/gi," ")
      .replace(/<style\b[\s\S]*?<\/style>/gi," ")
      .replace(/<[^>]+>/g," ")
  ).replace(/\s+/g," ").trim();
}

function topSongsSection(html) {
  const src=String(html || "");
  const lower=src.toLowerCase();
  const start=lower.indexOf("top songs");
  if(start<0) return "";
  let end=src.length;
  for(const marker of ["essential albums","albums","music videos","singles & eps","singles &amp; eps","appears on"]){
    const p=lower.indexOf(marker,start+9);
    if(p>=0 && p<end) end=p;
  }
  return src.slice(start,end);
}

export function appleTopSongHref(html,wantedTitle) {
  const section=topSongsSection(html);
  if(!section) return "";
  const want=normTitle(wantedTitle);
  const wantVersion=versionSignature(wantedTitle);
  const re=/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for(const m of section.matchAll(re)){
    const label=visibleText(m[2]);
    if(!label || normTitle(label)!==want || versionSignature(label)!==wantVersion) continue;
    const href=decodeHtml(m[1]);
    if(!/[?&]i=\d+/.test(href)) continue;
    if(/^https?:\/\//i.test(href)) return href;
    if(href.startsWith("/")) return "https://music.apple.com"+href;
  }
  return "";
}

export function appleTrackIdFromHref(href) {
  return (String(href || "").match(/[?&]i=(\d+)/) || [])[1] || "";
}
