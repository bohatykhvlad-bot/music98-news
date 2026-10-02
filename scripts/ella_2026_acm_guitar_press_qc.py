#!/usr/bin/env python3
"""Read-only full original geometry for 2026 official ACM press handout guitar images."""
import io,urllib.request,json,base64
from pathlib import Path
from PIL import Image,ImageOps,ImageDraw
names=["Ella-Langley-Photo-Provided-by-Penske-Media-via-ACM-Awards.jpg","Ella-Langley-Photo-Provided-by-Penske-Media-via-ACM-Awards-2.jpg","Ella-Langley-Photo-Provided-by-Penske-Media-via-ACM-Awards-3.jpg"]
out=[];meta=[]
for name in names:
 url="https://musicmayhemmagazine.com/wp-content/uploads/2026/05/"+name
 try:
  req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0","Accept":"image/jpeg,*/*"})
  with urllib.request.urlopen(req,timeout=40) as r:b=r.read()
  im=Image.open(io.BytesIO(b));im.load()
  print("ACM_OFFICIAL_HANDOUT",name,im.size,im.format,len(b),flush=True)
  meta.append({"name":name,"url":url,"pixels":list(im.size),"bytes":len(b)})
  pic=ImageOps.contain(im.convert("RGB"),(850,500))
  out.append((name,pic))
 except Exception as e:print("HANDOUT_ERROR",name,str(e)[:250],flush=True)
p=Path(".editorial");p.mkdir(exist_ok=True)
(p/"ella-2026-acm-handout-source-geometry.json").write_text(json.dumps(meta,indent=2))
if out:
 sheet=Image.new("RGB",(875,len(out)*530),"white");d=ImageDraw.Draw(sheet)
 for i,(name,im) in enumerate(out):
  d.text((8,i*530+5),name,fill="black");sheet.paste(im,(8,i*530+25))
 f=io.BytesIO();sheet.save(f,"JPEG",quality=78)
 (p/"ella-2026-acm-handout-guitar-contact.b64").write_text(base64.b64encode(f.getvalue()).decode())
print("CANDIDATES",len(out),flush=True)
