#!/usr/bin/env python3
"""Independent public-site verification that this draft's one portrait photo keeps native aspect ratio."""
import urllib.request,time,io,hashlib
from PIL import Image
ROOT="https://music98.news"
FNAME="ella-caylee-cma-2024-acoustic-native.jpg"
expected="c7c02d6e553619b7aaf9da52800a06d47a1ff73c9147d8eaae1482f7d9505e43"
def get(url):
 with urllib.request.urlopen(urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0","Cache-Control":"no-cache"}),timeout=40) as r:
  return r.read(),r.headers.get("Content-Type",""),r.url
pic,typ,url=get(ROOT+"/photos/"+FNAME+"?qc="+str(time.time_ns()))
im=Image.open(io.BytesIO(pic));im.load()
assert im.size==(3648,5472) and hashlib.sha256(pic).hexdigest()==expected
print("HOSTED_NATIVE_IMAGE_VERIFIED",im.size,len(pic),typ,flush=True)
for host in (ROOT+"/?qc="+str(time.time_ns()),ROOT+"/index.html?qc="+str(time.time_ns())):
 try:
  raw,typ,final=get(host)
  page=raw.decode("utf8","replace")
  here=FNAME in page
  rule='aspect-ratio:2/3' in page
  print("PUBLIC_SITE_CSS",host,"url",final,"specific_image_selector",here,
     "portrait_css",rule,"bytes",len(raw),flush=True)
  if here and rule:print("PUBLIC_PORTRAIT_CROP_CONFIG_CONFIRMED",flush=True);break
 except Exception as e:print("SITE_FETCH_ISSUE",str(e)[:160],flush=True)
else:raise RuntimeError("Production CSS portrait layout not visible; do not claim deployed")
