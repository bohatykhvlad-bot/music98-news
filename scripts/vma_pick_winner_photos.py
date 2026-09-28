#!/usr/bin/env python3
import re, html, urllib.request
UA="Mozilla/5.0"
URL="https://www.paramountpressexpress.com/mtv/shows/2026-mtv-video-music-awards-vmas/photos?limit=500&page=1"
targets=["3228388_VMAS_2026_2881b.jpg","3244981_VMAS_2026_4001b.jpg","3244981_VMAS_2026_3835b.jpg"]
page=urllib.request.urlopen(urllib.request.Request(URL,headers={"User-Agent":UA}),timeout=90).read().decode("utf-8","replace")
for fn in targets:
    print("TARGET",fn)
    pat=re.compile(r"<li id=['\"]photo-([^'\"]+)['\"][\s\S]*?<dd class=['\"]photo-filename['\"]>"+re.escape(fn)+r"</dd>[\s\S]*?</li>",re.I)
    m=pat.search(page)
    if not m:
        # fallback: locate filename then backtrack to li
        i=page.find(fn)
        a=page.rfind("<li id=",0,i)
        b=page.find("</li>",i)
        block=page[a:b+5] if i>=0 and a>=0 and b>=0 else ""
        km=re.search(r"<li id=['\"]photo-([^'\"]+)['\"]",block,re.I)
        if not km:
            print("NOT_FOUND")
            continue
        key=km.group(1)
    else:
        key=m.group(1)
        block=m.group(0)
    cap=re.search(r"<dd class=['\"]photo-caption['\"]>([\s\S]*?)</dd>",block,re.I)
    deturl="https://www.paramountpressexpress.com/mtv/shows/2026-mtv-video-music-awards-vmas/photos/?view="+key
    det=urllib.request.urlopen(urllib.request.Request(deturl,headers={"User-Agent":UA}),timeout=90).read().decode("utf-8","replace")
    emb=re.search(r"https://public-assets-pressexpress\.s3\.amazonaws\.com/assets/photos/embed/[^\"'<> ]+",html.unescape(det))
    print("KEY",key)
    print("DETAIL",deturl)
    print("EMBED",emb.group(0) if emb else "")
    print("CAPTION",re.sub("<[^>]+>","",html.unescape(cap.group(1))) if cap else "")
