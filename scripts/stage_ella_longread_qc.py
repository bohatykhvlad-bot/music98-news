#!/usr/bin/env python3
from __future__ import annotations
import io, os, urllib.request
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw

OUT=Path("ella-longread-qc")
OUT.mkdir(exist_ok=True)

CANDIDATES=[
    ("sony-press","https://cdn-p.smehost.net/sites/a6700d2fbaf642099802a57af8b10fe6/wp-content/uploads/2025/06/EL3.png"),
    ("you-look-like-video","https://i.ytimg.com/vi/Dm2TSMerGPQ/maxresdefault.jpg"),
    ("werent-for-wind-video","https://i.ytimg.com/vi/U4NPZi2b0aQ/maxresdefault.jpg"),
]

def fetch(url):
    req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0","Referer":"https://www.youtube.com/"})
    with urllib.request.urlopen(req,timeout=60) as r:
        return r.read()

def crop169(im):
    im=ImageOps.exif_transpose(im).convert("RGB")
    w,h=im.size
    target=16/9
    if w/h>target:
        nw=int(h*target); left=(w-nw)//2
        return im.crop((left,0,left+nw,h))
    nh=int(w/target); top=max(0,(h-nh)//2)
    return im.crop((0,top,w,top+nh))

thumbs=[]
for name,url in CANDIDATES:
    raw=fetch(url)
    im=Image.open(io.BytesIO(raw))
    print("CANDIDATE",name,im.size,im.format,len(raw),url)
    ext=".png" if im.format=="PNG" else ".jpg"
    (OUT/(name+ext)).write_bytes(raw)
    c=crop169(im).resize((640,360),Image.Resampling.LANCZOS)
    c.save(OUT/(name+"-169.jpg"),quality=92)
    thumbs.append((name,c))

sheet=Image.new("RGB",(680,430*len(thumbs)),"white")
draw=ImageDraw.Draw(sheet)
y=0
for name,im in thumbs:
    sheet.paste(im,(20,y+40))
    draw.text((20,y+12),name,fill="black")
    y+=430
sheet.save(OUT/"contact-sheet.jpg",quality=92)
print("DONE",OUT)

import re
for page in [
    "https://www.sonymusic.ca/press_release/ella-langley-unveils-highly-anticipated-sophomore-album-dandelion",
    "https://www.sonymusic.ca/press_release/ella-langley-returns-with-dynamic-and-soaring-new-single-never-met-anyone-like-you-feat-hardy",
    "https://www.ellalangley.com/",
]:
    try:
        req=urllib.request.Request(page,headers={"User-Agent":"Mozilla/5.0"})
        html=urllib.request.urlopen(req,timeout=60).read().decode("utf-8","ignore")
        urls=sorted(set(re.findall(r'https?://[^"\\'<> ]+?\\.(?:jpg|jpeg|png|webp)(?:\\?[^"\\'<> ]*)?',html,re.I)))
        print("PAGE",page)
        for u in urls:
            print("IMGURL",u.replace("&amp;","&"))
    except Exception as e:
        print("PAGEERR",page,repr(e))
