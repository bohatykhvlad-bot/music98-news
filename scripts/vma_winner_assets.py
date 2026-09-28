#!/usr/bin/env python3
import re, html, urllib.request
UA="Mozilla/5.0"
URL="https://www.paramountpressexpress.com/mtv/shows/2026-mtv-video-music-awards-vmas/photos?limit=500&page=1"
page=urllib.request.urlopen(urllib.request.Request(URL,headers={"User-Agent":UA}),timeout=90).read().decode("utf-8","replace")
for who in ["Taylor Swift wins Video of the Year","Madonna","LISA","Sienna Spiro"]:
    print("WHO",who)
    found=False
    for m in re.finditer(r"<li id=['\"]photo-([^'\"]+)['\"][\s\S]*?</li>",page,re.I):
        block=m.group(0)
        if who.lower() not in html.unescape(block).lower(): continue
        key=m.group(1)
        fnm=re.search(r"<dd class=['\"]photo-filename['\"]>([^<]+)",block,re.I)
        cap=re.search(r"<dd class=['\"]photo-caption['\"]>([\s\S]*?)</dd>",block,re.I)
        det=urllib.request.urlopen(urllib.request.Request("https://www.paramountpressexpress.com/mtv/shows/2026-mtv-video-music-awards-vmas/photos/?view="+key,headers={"User-Agent":UA}),timeout=90).read().decode("utf-8","replace")
        emb=re.search(r"https://public-assets-pressexpress\.s3\.amazonaws\.com/assets/photos/embed/[^\"'<> ]+",html.unescape(det))
        print("ASSET",key,fnm.group(1) if fnm else "",emb.group(0) if emb else "")
        print("CAP",re.sub("<[^>]+>","",html.unescape(cap.group(1)))[:700] if cap else "")
        found=True
        break
    if not found: print("NONE")
