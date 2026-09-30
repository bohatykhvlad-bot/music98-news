#!/usr/bin/env python3
from __future__ import annotations
import io, urllib.request
from PIL import Image

CANDS=[
 ("gma_boxing","https://images.gmanews.tv/webpics/2026/08/lisa-2_2026_08_29_17_05_27.jpg","https://www.gmanetwork.com/"),
 ("allkpop_boxing","https://www.allkpop.com/upload/2026/08/content/281209/1787933391-image.png","https://www.allkpop.com/"),
]
for name,url,ref in CANDS:
    try:
        req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0","Referer":ref})
        raw=urllib.request.urlopen(req,timeout=45).read()
        im=Image.open(io.BytesIO(raw))
        print(name, im.size, im.format, len(raw))
    except Exception as e:
        print(name,"ERR",repr(e))
