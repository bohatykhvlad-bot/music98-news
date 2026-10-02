#!/usr/bin/env python3
"""Read-only 2026 Sony official Ella high-resolution press candidate selection.
Create actual article 16:9 previews; no live desk edits, no publishing.
"""
import io,base64,urllib.request,subprocess,json
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw, ImageFont
OUT=Path(".editorial/ella-2026-new-final-photo-qc-small.b64")
CANDIDATES={
 "Sony official 2026 Dandelion photo 2":"https://prowly-prod.s3.eu-west-1.amazonaws.com/uploads/landing_page_image/image/670237/c17d81243d0803daafa4cf95b07cc51c.jpg",
}
sheet=[];metadata=[]
for name,url in CANDIDATES.items():
 try:
  req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0"})
  with urllib.request.urlopen(req,timeout=40) as res: raw=res.read();ct=res.headers.get("Content-Type","")
  img=Image.open(io.BytesIO(raw));img.load()
  exif=img.getexif()
  print("CANDIDATE",name,"SOURCE",url,"DIMENSIONS",img.size,"FILE_BYTES",len(raw),"MODE",img.mode,"EXIF_ARTIST",repr(exif.get(315)),"CT",ct,flush=True)
  assert img.width>=1900 and img.height>=2400
  im=ImageOps.exif_transpose(img).convert("RGB")
  # Render actual 16:9. Portrait sources have narrower horizontal coverage;
  # preview multiple vertical offsets to avoid cutting face.
  for y in [.25,.40,.58]:
   crop=ImageOps.fit(im,(800,450),method=Image.Resampling.LANCZOS,centering=(.5,y))
   sheet.append((name+" 16:9 y="+str(y),crop))
  metadata.append({"name":name,"url":url,"dimensions":im.size,"bytes":len(raw),"artist_exif":str(exif.get(315) or "")})
 except Exception as e:
  print("CANDIDATE_FAILED",name,str(e)[:220],flush=True)
assert sheet,"Could not verify any 2026 official press original"
w=830;h=490*len(sheet)
canvas=Image.new("RGB",(w,h),"white");draw=ImageDraw.Draw(canvas)
for i,(name,img) in enumerate(sheet):
 y=i*490;draw.text((12,y+7),name,fill="black");canvas.paste(img,(12,y+34))
buf=io.BytesIO();canvas.save(buf,format="JPEG",quality=70)
OUT.parent.mkdir(parents=True,exist_ok=True)
OUT.write_text(base64.b64encode(buf.getvalue()).decode("ascii"),encoding="ascii")
Path(".editorial/ella-2026-new-final-photo-qc.json").write_text(json.dumps(metadata,indent=2),encoding="utf-8")
print("PREVIEW_READY",len(sheet),"SAMPLES",OUT,flush=True)
