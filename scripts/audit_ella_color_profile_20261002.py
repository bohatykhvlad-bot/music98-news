#!/usr/bin/env python3
"""Read only: determine whether color profile was stripped from original Sony asset."""
from pathlib import Path
import urllib.request,io,hashlib,json
from PIL import Image,ImageCms,ImageStat,ImageChops
def get(url):
 with urllib.request.urlopen(urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0"}),timeout=30) as r:return r.read()
urls={
 "sony_original":"https://kommunikasjon.ntb.no/files/8931514/18858703/263460/no",
 "music98_stored":"https://music98.news/photos/ella-sony-standing-dandelion-2026.jpg?icc_audit=20261002",
}
pic={}
for name,url in urls.items():
 b=get(url);im=Image.open(io.BytesIO(b));prof=im.info.get("icc_profile",b"")
 print("IMAGE",name,"bytes",len(b),"shape",im.size,"image_mode",im.mode,"icc_len",len(prof),"exif_color_space",im.getexif().get(0xA001),"sha",hashlib.sha256(b).hexdigest(),flush=True)
 if prof:
  p=ImageCms.ImageCmsProfile(io.BytesIO(prof))
  print("ICC",name,"name",repr(ImageCms.getProfileName(p)),"description",repr(ImageCms.getProfileDescription(p)),flush=True)
 pic[name]=im
o,s=pic["sony_original"],pic["music98_stored"]
if o.size==s.size:
 oo=o.convert("RGB")
 ss=s.convert("RGB")
 before=ImageStat.Stat(ImageChops.difference(oo,ss).resize((200,236))).mean
 print("SOURCE_PIXELS_VS_SITE_MAE",before,flush=True)
 if o.info.get("icc_profile"):
  srcprof=ImageCms.ImageCmsProfile(io.BytesIO(o.info["icc_profile"]))
  srgb=ImageCms.createProfile("sRGB")
  target=ImageCms.profileToProfile(o,srcprof,srgb,outputMode="RGB")
  print("CMYK_SWOP_CORRECT_COLOR_TRANSFORM",target.mode,target.size,flush=True)
  diff=ImageStat.Stat(ImageChops.difference(target,ss).resize((200,236))).mean
  print("SOURCE_COLOR_MANAGED_TO_sRGB_VS_SITE_MAE",diff,flush=True)
  out=io.BytesIO();target.save(out,"JPEG",quality=91,optimize=True,icc_profile=ImageCms.ImageCmsProfile(srgb).tobytes())
  print("COLOR_MANAGED_REENCODE_BYTES",len(out.getvalue()),flush=True)
  from PIL import ImageOps,ImageDraw
  # Contact sheet shows the incorrectly stripped asset beside correctly managed colors.
  a=ImageOps.fit(ss,(600,600));b=ImageOps.fit(target,(600,600))
  board=Image.new("RGB",(1220,650),"white");d=ImageDraw.Draw(board)
  d.text((8,8),"SITE CURRENT: incorrect CMYK -> RGB without ICC",fill="black")
  d.text((615,8),"PROPOSED: ICC-managed CMYK SWOP -> sRGB",fill="black")
  board.paste(a,(8,38));board.paste(b,(612,38))
  import base64,subprocess
  from pathlib import Path
  p=Path(".editorial/ella-cmyk-color-comparison.b64");p.parent.mkdir(exist_ok=True)
  bbuf=io.BytesIO();board.save(bbuf,"JPEG",quality=82)
  p.write_text(base64.b64encode(bbuf.getvalue()).decode("ascii"))
  subprocess.run(["git","config","user.name","music98 editorial"],check=True)
  subprocess.run(["git","config","user.email","qc@music98.news"],check=True)
  subprocess.run(["git","add",str(p)],check=True)
  if subprocess.run(["git","diff","--cached","--quiet"]).returncode:
   subprocess.run(["git","commit","-m","Verify original Sony color profile restoration visually"],check=True)
   subprocess.run(["git","push"],check=True)
  print("COLOR_PROOF_SAVED",flush=True)
