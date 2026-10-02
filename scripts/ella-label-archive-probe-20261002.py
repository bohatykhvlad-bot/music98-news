#!/usr/bin/env python3
"""Public, read-only label-archive inventory; prints filenames and image sizes."""
import requests,re,html
from io import BytesIO
from PIL import Image
SOURCES=[
 "https://sm01.app.box.com/s/hqy3qys50h7pnab56bf0nm6x633nnhwm",
 "https://app.box.com/s/hqy3qys50h7pnab56bf0nm6x633nnhwm",
 "https://drive.google.com/drive/folders/1Zj42_sfjozD4BJO5OKjkUkb3ozmOHBiW?usp=sharing",
]
for url in SOURCES:
 try:
  r=requests.get(url,timeout=25,headers={"User-Agent":"Mozilla/5.0"})
  t=html.unescape(r.text)
  files=sorted(set(re.findall(r'[^"<>]{2,100}\\.(?:jpg|jpeg|png|webp|zip)',t,re.I)))
  print("PUBLIC_SHARE",r.status_code,r.url,"size",len(r.content),"names",repr(files[:70]),"guitar_text",t.lower().count("guitar"),flush=True)
 except Exception as e:print("SHARE_FAILED",url,type(e).__name__,str(e)[:100],flush=True)
try:
 import gdown
 files=gdown.download_folder(id="1Zj42_sfjozD4BJO5OKjkUkb3ozmOHBiW",output="/tmp/ella_label_press_assets",quiet=True,remaining_ok=True)
 print("LABEL_DOWNLOADS",len(files or []),flush=True)
 for file in files or []:
  try:
   with Image.open(file) as im: print("LABEL_IMAGE",file,im.size,im.format,flush=True)
  except Exception:print("LABEL_FILE",file,flush=True)
except Exception as exc:print("LABEL_FOLDER_READ_FAILED",str(exc)[:180],flush=True)
