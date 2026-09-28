#!/usr/bin/env python3
import re, html, urllib.request
from urllib.parse import urljoin

UA="Mozilla/5.0"
URL="https://www.paramountpressexpress.com/mtv/shows/2026-mtv-video-music-awards-vmas/photos?limit=500&page=1"
targets=[
  "3228388_VMAS_2026_2881b.jpg",
  "3228388_VMAS_2026_3037b.jpg",
  "3228388_VMAS_2026_1963b.jpg",
]
req=urllib.request.Request(URL,headers={"User-Agent":UA})
raw=urllib.request.urlopen(req,timeout=90).read().decode("utf-8","replace")
print("HTML",len(raw))
for name in targets:
    i=raw.find(name)
    print("\nTARGET",name,"at",i)
    if i<0: continue
    ctx=raw[max(0,i-3500):i+5000]
    hrefs=re.findall(r'href=["\']([^"\']+)["\']',ctx,re.I)
    srcs=re.findall(r'(?:src|data-src)=["\']([^"\']+)["\']',ctx,re.I)
    ids=re.findall(r'(?:photo|id)[^=]{0,20}=["\']?(\d{3,})',ctx,re.I)
    print("HREFS")
    for x in hrefs[-20:]: print(urljoin(URL,html.unescape(x)))
    print("SRCS")
    for x in srcs[-20:]: print(urljoin(URL,html.unescape(x)))
    print("IDS",ids[-20:])
    clean=re.sub(r"\s+"," ",ctx)
    print("CTX",clean[:7000])
