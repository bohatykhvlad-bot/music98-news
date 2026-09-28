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

print("\nDETAIL")
for key in ["dded7f7e94","73f0b0c2a3","0cb642bd2d"]:
    u="https://www.paramountpressexpress.com/mtv/shows/2026-mtv-video-music-awards-vmas/photos/?view="+key
    rr=urllib.request.urlopen(urllib.request.Request(u,headers={"User-Agent":UA}),timeout=90).read().decode("utf-8","replace")
    urls=re.findall(r'https?://[^"\'<> ]+', html.unescape(rr))
    print("KEY",key,"LEN",len(rr))
    for x in urls:
        if "pressexpress" in x or "amazonaws" in x:
            print(x[:1200])


print("\nNAMED_ASSETS")
items=re.findall(r'<li id="photo-([^"]+)"[\s\S]*?</li>', raw, re.I)
for block in items:
    pass

# Simpler block scan around matching captions.
for who in ["Madonna", "Sienna Spiro", "LISA"]:
    print("\nWHO", who)
    for m in re.finditer(who, raw, re.I):
        a=raw.rfind('<li id="photo-',0,m.start())
        b=raw.find('</li>',m.end())
        if a<0 or b<0: continue
        block=raw[a:b+5]
        fn=re.search(r"<dd class='photo-filename'>([^<]+)",block,re.I)
        cap=re.search(r"<dd class='photo-caption'>([^<]+)",block,re.I)
        view=re.search(r"href='([^']+\?view=[^']+)'",block,re.I)
        if fn and cap:
            print("ITEM", fn.group(1), "VIEW", urljoin(URL, view.group(1)) if view else "")
            print("CAPTION", html.unescape(cap.group(1)))
            break

print("\nDIMENSIONS")
try:
    from PIL import Image
    import io
except Exception as e:
    print("PIL_ERROR",repr(e))
else:
    embeds=[
      "https://public-assets-pressexpress.s3.amazonaws.com/assets/photos/embed/2026/09/27/3228388_VMAS_2026_2881b-941dab88de1cfb8c.jpg",
      "https://public-assets-pressexpress.s3.amazonaws.com/assets/photos/embed/2026/09/27/3228388_VMAS_2026_3037b-045509f35884e166.jpg",
    ]
    for u in embeds:
        data=urllib.request.urlopen(urllib.request.Request(u,headers={"User-Agent":UA}),timeout=90).read()
        im=Image.open(io.BytesIO(data))
        print("EMBED",u,im.size,len(data),im.format)


print("\nHIGHRES_PROBE")
for u in [
  "https://www.paramountpressexpress.com/cbs-entertainment/photos/download-highres?id=91603&limit=100&page=1",
  "https://www.paramountpressexpress.com/cbs-entertainment/photos/download-webres?id=142100&limit=250&page=1",
]:
    try:
        rq=urllib.request.Request(u,headers={"User-Agent":UA})
        with urllib.request.urlopen(rq,timeout=90) as rr:
            data=rr.read()
            print("DL",u,"STATUS",getattr(rr,"status",None),"TYPE",rr.headers.get("Content-Type"),"DISP",rr.headers.get("Content-Disposition"),"LEN",len(data),"HEAD",data[:20])
    except Exception as e:
        print("DL_ERROR",u,repr(e))

for key in ["dded7f7e94","a6d485acfd","16d405d43a"]:
    u="https://www.paramountpressexpress.com/mtv/shows/2026-mtv-video-music-awards-vmas/photos/?view="+key
    rr=urllib.request.urlopen(urllib.request.Request(u,headers={"User-Agent":UA}),timeout=90).read().decode("utf-8","replace")
    print("DETAIL_SCAN",key)
    for pat in ["download-highres","download-webres","photo-action_download","data-mediakey","download"]:
        spots=[m.start() for m in re.finditer(pat,rr,re.I)]
        print("PAT",pat,spots[:10])
        for pos in spots[:2]:
            print(re.sub(r"\s+"," ",rr[max(0,pos-900):pos+1600])[:2600])


print("\nHIGHRES_URL_SCAN")
for u in [
  "https://www.paramountpressexpress.com/cbs-entertainment/photos/download-highres?id=91603&limit=250&page=1",
  "https://www.paramountpressexpress.com/cbs-entertainment/photos/download-webres?id=142100&limit=250&page=1",
]:
    rr=urllib.request.urlopen(urllib.request.Request(u,headers={"User-Agent":UA}),timeout=90).read().decode("utf-8","replace")
    print("PAGE",u,"LEN",len(rr))
    for filename in ["3228388_VMAS_2026_2881b","3244981_VMAS_2026_4001b","3244981_VMAS_2026_3905b","3228388_VMAS_2026_1963b"]:
        i=rr.find(filename)
        print("FILE",filename,"AT",i)
        if i>=0:
            ctx=html.unescape(rr[max(0,i-6000):i+9000])
            urls=re.findall(r'https?://[^"\'<> ]+',ctx)
            for x in urls:
                if ("assets/photos/" in x or "download" in x) and filename in x:
                    print("ASSET_URL",x[:3000])
            for pat in ["original","webres","highres","download"]:
                spots=[m.start() for m in re.finditer(pat,ctx,re.I)]
                if spots: print("CTX_PAT",pat,spots[:10])
