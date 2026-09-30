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

CANDS2=[
 ("sony_preview","https://cdn-p.smehost.net/sites/5b3bac59eb36401694af3a241173447f/wp-content/uploads/2026/09/lisa-foto-de-promocion-de-su-nuevo-single-sawadika-1788514207-396.jpg","https://www.sonymusic.es/"),
 ("sony_original","https://cdn-p.smehost.net/sites/5b3bac59eb36401694af3a241173447f/wp-content/uploads/2026/09/lisa-foto-de-promocion-de-su-nuevo-single-sawadika-1788514207.jpg","https://www.sonymusic.es/"),
]
for name,url,ref in CANDS2:
    try:
        req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0","Referer":ref})
        raw=urllib.request.urlopen(req,timeout=45).read()
        im=Image.open(io.BytesIO(raw))
        print(name, im.size, im.format, len(raw))
    except Exception as e:
        print(name,"ERR",repr(e))

CANDS3=[
 ("lloud_x_portrait","https://pbs.twimg.com/media/HRqPVOLawAAp735.jpg?format=jpg&name=orig","https://x.com/wearelloud"),
 ("lloud_x_ring","https://pbs.twimg.com/media/HRqPVOPbcAAxywx.jpg?format=jpg&name=orig","https://x.com/wearelloud"),
]
for name,url,ref in CANDS3:
    try:
        req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0","Referer":ref})
        raw=urllib.request.urlopen(req,timeout=45).read()
        im=Image.open(io.BytesIO(raw))
        print(name, im.size, im.format, len(raw))
    except Exception as e:
        print(name,"ERR",repr(e))

CANDS4=[
 ("sony_vision_lisa","https://cdn-p.smehost.net/sites/6dc1d53d1d7f4d7fac4636569eacd797/wp-content/uploads/2026/07/always-lalisa-lisa-first-official-image-scaled.png","https://www.sonymusic.com/"),
]
for name,url,ref in CANDS4:
    try:
        req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0","Referer":ref})
        raw=urllib.request.urlopen(req,timeout=45).read()
        im=Image.open(io.BytesIO(raw))
        print(name, im.size, im.format, len(raw))
    except Exception as e:
        print(name,"ERR",repr(e))
