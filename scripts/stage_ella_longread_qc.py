#!/usr/bin/env python3
from __future__ import annotations
import io, urllib.request
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urljoin
from PIL import Image, ImageOps, ImageDraw

OUT=Path("ella-longread-qc")
OUT.mkdir(exist_ok=True)

CANDIDATES=[
    ("sony-dandelion-10","https://cdn-p.smehost.net/sites/a6700d2fbaf642099802a57af8b10fe6/wp-content/uploads/2026/04/download-10.png"),
    ("sony-dandelion-11","https://cdn-p.smehost.net/sites/a6700d2fbaf642099802a57af8b10fe6/wp-content/uploads/2026/04/download-11.png"),
    ("sony-press","https://cdn-p.smehost.net/sites/a6700d2fbaf642099802a57af8b10fe6/wp-content/uploads/2025/06/EL3.png"),
    ("sony-press-landscape","https://cdn-p.smehost.net/sites/a6700d2fbaf642099802a57af8b10fe6/wp-content/uploads/2025/06/Ella-Langley.png"),
    ("sony-press-el2","https://cdn-p.smehost.net/sites/a6700d2fbaf642099802a57af8b10fe6/wp-content/uploads/2025/06/EL2.jpg"),
    ("sony-dandelion-9","https://cdn-p.smehost.net/sites/a6700d2fbaf642099802a57af8b10fe6/wp-content/uploads/2026/04/download-9.png"),
    ("you-look-like-video","https://i.ytimg.com/vi/Dm2TSMerGPQ/maxresdefault.jpg"),
    ("werent-for-wind-video","https://i.ytimg.com/vi/U4NPZi2b0aQ/maxresdefault.jpg"),
]

def fetch(url, referer=None):
    headers={"User-Agent":"Mozilla/5.0"}
    if referer: headers["Referer"]=referer
    req=urllib.request.Request(url,headers=headers)
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
    raw=fetch(url,"https://www.youtube.com/" if "ytimg" in url else None)
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
    sheet.paste(im,(20,y+40)); draw.text((20,y+12),name,fill="black"); y+=430
sheet.save(OUT/"contact-sheet.jpg",quality=92)

class ImgParser(HTMLParser):
    def __init__(self,base):
        super().__init__(); self.base=base; self.urls=[]
    def handle_starttag(self,tag,attrs):
        if tag.lower()!="img": return
        d=dict(attrs)
        for key in ("src","data-src","data-lazy-src"):
            v=d.get(key)
            if v: self.urls.append(urljoin(self.base,v))
        for key in ("srcset","data-srcset"):
            v=d.get(key)
            if v:
                for part in v.split(","):
                    u=part.strip().split(" ")[0]
                    if u: self.urls.append(urljoin(self.base,u))

PAGES=[
 "https://www.sonymusic.ca/press_release/ella-langley-unveils-highly-anticipated-sophomore-album-dandelion",
 "https://www.sonymusic.ca/press_release/ella-langley-returns-with-dynamic-and-soaring-new-single-never-met-anyone-like-you-feat-hardy",
 "https://www.ellalangley.com/",
]
for page in PAGES:
    try:
        html=fetch(page).decode("utf-8","ignore")
        p=ImgParser(page); p.feed(html)
        print("PAGE",page)
        for u in sorted(set(p.urls)):
            if any(x in u.lower() for x in (".jpg",".jpeg",".png",".webp")):
                print("IMGURL",u)
    except Exception as e:
        print("PAGEERR",page,repr(e))
print("DONE",OUT)
