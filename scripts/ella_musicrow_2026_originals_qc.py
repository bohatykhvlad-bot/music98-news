#!/usr/bin/env python3
"""Read-only image geometry and labeled contact sheet of public 2026 artist press originals."""
from __future__ import annotations
import urllib.request,io,base64,json
from pathlib import Path
from PIL import Image,ImageOps,ImageDraw
SOURCES={
"musicrow_2026_acm":"https://music-row-website-assets.s3.amazonaws.com/wp-content/uploads/2026/05/ELLA-LANGLEY-ACM-ARTIST-SONGWRITER-AWARD-copy-scaled.jpeg",
"musicrow_2026_april":"https://musicrow.com/wp-content/uploads/2026/04/Ella-Langley-copy-scaled.jpeg",
"musicrow_2026_feb":"https://musicrow.com/wp-content/uploads/2026/02/Ella-Langley.-Photo-Caylee-Robillard-FB-scaled.jpg",
"musicrow_2026_feb2":"https://musicrow.com/wp-content/uploads/2026/02/Ella-Langley.-Photo-Caylee-Robillard-scaled.jpeg",
"musicrow_2026_june":"https://musicrow.com/wp-content/uploads/2026/06/Ella-Langley.-Photo-Caylee-Robillard-scaled.jpeg",
}
out=[];details=[]
for k,u in SOURCES.items():
 try:
  with urllib.request.urlopen(urllib.request.Request(u,headers={"User-Agent":"Mozilla/5.0"}),timeout=30) as r:data=r.read()
  im=Image.open(io.BytesIO(data));im.load()
  out.append((k,ImageOps.contain(im.convert("RGB"),(760,580))))
  details.append({"key":k,"url":u,"size":im.size,"bytes":len(data)})
  print("SOURCE_VERIFIED",k,im.size,len(data),flush=True)
 except Exception as e:print("SOURCE_FAILED",k,str(e)[:150],flush=True)
if out:
 canvas=Image.new("RGB",(790,620*len(out)),(255,255,255));draw=ImageDraw.Draw(canvas)
 for i,(k,im) in enumerate(out):
  draw.text((8,i*620+5),k,fill=(0,0,0));canvas.paste(im,(8,i*620+30))
 buf=io.BytesIO();canvas.save(buf,"JPEG",quality=76)
 p=Path(".editorial");p.mkdir(exist_ok=True)
 (p/"ella-2026-musicrow-press-originals-qc.b64").write_text(base64.b64encode(buf.getvalue()).decode("ascii"))
 (p/"ella-2026-musicrow-press-originals-qc.json").write_text(json.dumps(details,indent=2))
print("FOUND",len(out),"ORIGINALS",flush=True)
