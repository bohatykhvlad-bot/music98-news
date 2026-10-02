#!/usr/bin/env python3
"""Read-only visual selection of photographer Andrew Wendowski's 2026 Ella stage photographs."""
from __future__ import annotations
from io import BytesIO
from pathlib import Path
from PIL import Image,ImageOps,ImageDraw
import urllib.request,json,base64
u={
 "photographer_own_1":"https://musicmayhemmagazine.com/wp-content/uploads/2026/03/Ella-Langley-Photo-by-Andrew-Wendowski.jpg",
 "photographer_own_2":"https://musicmayhemmagazine.com/wp-content/uploads/2026/03/Ella-Langley-Photo-by-Andrew-Wendowski-2.jpg",
 "country_now_2026_4":"https://countrynow.com/wp-content/uploads/2026/03/Ella-Langley-Photo-by-Andrew-Wendowski-4.jpg",
 "country_now_2026_5":"https://countrynow.com/wp-content/uploads/2026/03/Ella-Langley-Photo-by-Andrew-Wendowski-5.jpg"
}
out=[];records=[]
for key,url in u.items():
 try:
  req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0","Accept":"image/jpeg,*/*"})
  with urllib.request.urlopen(req,timeout=35) as resp:data=resp.read()
  im=Image.open(BytesIO(data));im.load()
  print("PHOTO",key,im.size,im.format,im.mode,"bytes",len(data),flush=True)
  records.append(dict(name=key,source=url,size=list(im.size),bytes=len(data)))
  thumb=ImageOps.contain(im.convert("RGB"),(750,490))
  out.append((key,thumb))
 except Exception as e:print("ERROR",key,str(e)[:180],flush=True)
assert out
im=Image.new("RGB",(770,len(out)*530),"white")
draw=ImageDraw.Draw(im)
for n,(key,thumb) in enumerate(out):
 y=n*530;draw.text((10,y+6),key,fill="black");im.paste(thumb,(10,y+28))
buf=BytesIO();im.save(buf,"JPEG",quality=83)
p=Path(".editorial");p.mkdir(exist_ok=True)
(p/"ella-andrew-own-2026-guitar-qc.b64").write_text(base64.b64encode(buf.getvalue()).decode(),encoding="ascii")
(p/"ella-andrew-own-2026-guitar-qc.json").write_text(json.dumps(records,indent=2)+"\n")
print("QC_CREATED",len(out),flush=True)
