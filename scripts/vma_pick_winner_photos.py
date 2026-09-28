#!/usr/bin/env python3
import re, html, urllib.request
UA="Mozilla/5.0"
URL="https://www.paramountpressexpress.com/mtv/shows/2026-mtv-video-music-awards-vmas/photos?limit=500&page=1"
targets=["3228388_VMAS_2026_2881b.jpg","3244981_VMAS_2026_4001b.jpg","3244981_VMAS_2026_3835b.jpg"]
page=urllib.request.urlopen(urllib.request.Request(URL,headers={"User-Agent":UA}),timeout=90).read().decode("utf-8","replace")
for fn in targets:
    print("TARGET",fn)
    found=False
    for m in re.finditer(r"<li id=['\"]photo-([^'\"]+)['\"][^>]*>([\\s\\S]*?)</li>",page,re.I):
        key=m.group(1)
        block=m.group(2)
        if fn not in block:
            continue
        cap=re.search(r"<dd class=['\"]photo-caption['\"]>([\\s\\S]*?)</dd>",block,re.I)
        deturl="https://www.paramountpressexpress.com/mtv/shows/2026-mtv-video-music-awards-vmas/photos/?view="+key
        det=urllib.request.urlopen(urllib.request.Request(deturl,headers={"User-Agent":UA}),timeout=90).read().decode("utf-8","replace")
        emb=re.search(r"https://public-assets-pressexpress\\.s3\\.amazonaws\\.com/assets/photos/embed/[^\\\"'<> ]+",html.unescape(det))
        print("KEY",key)
        print("DETAIL",deturl)
        print("EMBED",emb.group(0) if emb else "")
        print("CAPTION",re.sub("<[^>]+>","",html.unescape(cap.group(1))) if cap else "")
        found=True
        break
    if not found:
        print("NOT_FOUND")
