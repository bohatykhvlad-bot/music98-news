#!/usr/bin/env python3
"""Read-only provenance and native pixel verification of authentic 2025 Ella live guitar images.
No photo download persisted, site changes or unpublished article writes.
"""
from io import BytesIO
import hashlib,json,urllib.request
from PIL import Image
GHOST="https://storage.ghost.io/c/5f/70/5f70dd71-dc3a-499c-9434-45bdab72b00a/content/images/2025/05/"
SRC={
 "Brian Butler Sand In My Boots May 17 2025 Ella acoustic guitar":GHOST+"EllaLangley_14.jpg",
 "Brian Butler Sand In My Boots Ella stage side":GHOST+"EllaLangley_06.jpg",
 "Brian Butler Sand In My Boots Ella wide stage":GHOST+"EllaLangley_17.jpg",
 "Caylee Robillard Billy Bobs Oct 18 2025 Pollstar": "https://static.pollstar.com/wp-content/uploads/2026/01/Elle-playing-live.jpg",
}
for name,url in SRC.items():
 try:
  req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0 (image quality review for publication)","Accept":"image/avif,image/webp,image/jpeg,image/*"})
  with urllib.request.urlopen(req,timeout=30) as r: blob=r.read();typ=r.headers.get("Content-Type","")
  im=Image.open(BytesIO(blob));im.verify()
  im=Image.open(BytesIO(blob));im.load()
  print(json.dumps({"name":name,"url":url,"native_pixels":[im.width,im.height],"bytes":len(blob),"format":im.format,"mime":typ,"sha256":hashlib.sha256(blob).hexdigest(),"width_1920":im.width>=1920,"long_side_1920":max(im.size)>=1920,"can_crop_landscape_16x9_without_upscale":im.width>=1920 and im.height>=1080,"photographer_attribution":"Brian Butler (Scene Pensacola)" if name.startswith("Brian") else "Caylee Robillard (Pollstar)"},ensure_ascii=False),flush=True)
 except Exception as e:print(json.dumps({"name":name,"error":str(e)},ensure_ascii=False),flush=True)
