#!/usr/bin/env python3
"""Read-only original-image provenance/geometry for Ella's draft.
This does not crop images, upload photos, or write the editorial desk.
"""
import urllib.request,io,json
from PIL import Image,ImageOps
from pathlib import Path
SOURCES={
 "hero_current_hosted":"https://music98.news/photos/ella-sony-standing-dandelion-2026-srgb.jpg",
 "second_photo_laying_full_press_original":"https://prowly-prod.s3.eu-west-1.amazonaws.com/uploads/landing_page_image/image/670237/c17d81243d0803daafa4cf95b07cc51c.jpg",
 "2026_bluesfest_live_guitar_original_01":"https://charlatan.ca/wp-content/uploads/2026/07/EllaLangley_01.jpg",
 "2026_bluesfest_live_guitar_original_06":"https://charlatan.ca/wp-content/uploads/2026/07/EllaLangley_06.jpg"
}
out=[]
for label,url in SOURCES.items():
 try:
  request=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0","Accept":"image/avif,image/webp,image/jpeg,image/png,*/*"})
  with urllib.request.urlopen(request,timeout=30) as r: raw=r.read();mime=r.headers.get("Content-Type","")
  im=Image.open(io.BytesIO(raw));im.verify()
  im=Image.open(io.BytesIO(raw))
  meta={k:im.getexif().get(k) for k in (270,315,33432) if im.getexif().get(k)}
  info={"label":label,"width":im.width,"height":im.height,"format":im.format,"bytes":len(raw),"mime":mime,"EXIF":meta,"url":url}
  print("PHOTO_SOURCE",json.dumps(info,ensure_ascii=False),flush=True)
  out.append(info)
 except Exception as exc:print("PHOTO_SOURCE_FAILED",label,str(exc)[:300],flush=True)
Path(".editorial/ella-oct02-original-source-geometry.json").write_text(json.dumps(out,ensure_ascii=False,indent=2)+"\n")
if not any(x["label"].startswith("2026_bluesfest") and x["width"]>=1900 for x in out):
 raise RuntimeError("No 2026 live with guitar original >=1900px; do not select lowres")
if not any(x["label"]=="second_photo_laying_full_press_original" and x["width"]==2730 and x["height"]==3631 for x in out):
 raise RuntimeError("Original laying press photo missing or changed")
print("SOURCE_QC_PASS",flush=True)
