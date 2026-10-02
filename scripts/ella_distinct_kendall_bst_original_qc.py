#!/usr/bin/env python3
"""Read-only audit of a DISTINCT Ella acoustic concert photograph (BST Hyde Park).
No desk writes, no publishing; preserve original bytes; review actual 16:9 browser framing.
"""
import io,hashlib,base64,json,urllib.request
from pathlib import Path
from PIL import Image,ImageOps,ImageDraw
SRC="https://cdn.sanity.io/images/o6uq28nb/production/259331ea649293476d99429d614607c27da55c62-2900x1936.jpg"
req=urllib.request.Request(SRC,headers={"User-Agent":"Mozilla/5.0","Accept":"image/jpeg"})
with urllib.request.urlopen(req,timeout=60) as r:
 raw=r.read()
 im=Image.open(io.BytesIO(raw));im.load()
 assert im.size==(2900,1936) and im.format=="JPEG",(im.size,im.format)
 print("VERIFIED_DISTINCT_GUITAR_SOURCE",im.size,"BYTES",len(raw),"SHA",hashlib.sha256(raw).hexdigest(),flush=True)
 full=ImageOps.contain(im.convert("RGB"),(960,650))
 crops=[]
 for anchor in (.30,.47,.63):
  crops.append(ImageOps.fit(im.convert("RGB"),(960,540),method=Image.Resampling.LANCZOS,centering=(.5,anchor)))
 out=Image.new("RGB",(985,720+590*len(crops)),"white");d=ImageDraw.Draw(out)
 d.text((8,8),"Full frame original; photographer Kendall Vowels; BST Hyde Park 2024",fill="black");out.paste(full,(8,40))
 for idx,(pos,crop) in enumerate(zip((.30,.47,.63),crops)):
  y=720+idx*590
  d.text((8,y+5),"Actual 16:9 article frame, vertical focus "+str(pos),fill="black")
  out.paste(crop,(8,y+30))
 p=Path(".editorial");p.mkdir(exist_ok=True)
 b=io.BytesIO();out.save(b,"JPEG",quality=77)
 (p/"ella-alternate-kendall-bst-2900-preview.b64").write_text(base64.b64encode(b.getvalue()).decode())
 (p/"ella-alternate-kendall-bst-2900-meta.json").write_text(json.dumps({"original":SRC,"original_size":im.size,"bytes":len(raw),"sha256":hashlib.sha256(raw).hexdigest(),"photographer":"Kendall Vowels","press_attribution":"https://holler.country/news/breaking/ella-langley-joins-riley-green-to-perform-viral-duet-you-look-like-you-love-me-at-bst-hyde-park-2024/","photographer_personal_instagram_candidate":"https://www.instagram.com/kendallvowels/","rights_clearance":"needs review before publishing"},indent=2)+"\n")
 print("VISUAL_REVIEW_READY",flush=True)
