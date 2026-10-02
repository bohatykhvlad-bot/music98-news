#!/usr/bin/env python3
"""Photo research only. Does not change desk. Prints dimensions and a labeled visual sheet."""
import urllib.request,urllib.parse,json,re,io,base64,subprocess,html
from html.parser import HTMLParser
from pathlib import Path
from PIL import Image,ImageOps,ImageDraw
UA="Mozilla/5.0"
def get(url):
 req=urllib.request.Request(url,headers={"User-Agent":UA,"Referer":"https://www.google.com/"})
 with urllib.request.urlopen(req,timeout=25) as q:return q.read(),q.headers.get("Content-Type","")
SOURCES={
"sony-2026-press":"https://app.box.com/s/rqb31gg29dirmsc3d40o3al1k11sywog",
"sony-ella-wallen-2026":"https://app.box.com/s/r8u64hrr2h4no9r0tz27vyyjecvghdhd",
"hits-original":"https://res.cloudinary.com/hits-photos-archive/image/upload/v1769533762/MAIN_PRESS_WIDE_USE_IMAGE_1_DIGITAL_RGB_a73yrl.jpg",
"hits-crop":"https://res.cloudinary.com/hits-photos-archive/image/upload/c_crop,w_1118,h_1247,x_508,y_48/v1769533762/MAIN_PRESS_WIDE_USE_IMAGE_1_DIGITAL_RGB_a73yrl.jpg",
"country-now-cma":"https://countrynow.com/ella-langley-shines-with-performances-of-be-her-and-choosin-texas-during-cma-fest-broadcast/",
"traveladdict-concert":"https://thetraveladdict.com/continents/northamerica/new-faces-of-country-music-show-shines-at-crs-2026-with-breakout-performances-and-industry-honors/"
}
candidates={}
for name,url in SOURCES.items():
 try:
  b,t=get(url); print("FETCH",name,len(b),t,flush=True)
  if t.startswith("image/"):
   candidates[name]=(b,url)
  else:
   s=b.decode("utf-8","replace")
   if "box.com" in url:
    idx=s.find("Box.postStreamData")
    print("BOXMETA",name,re.sub(r"\\s+"," ",s[idx:idx+3500])[:1500],flush=True)
    m=re.search(r'"itemID"\s*:\s*(\d+)',s)
    if m:
     fid=m.group(1); shared=url.split("/s/")[-1]
     direct=f"https://app.box.com/index.php?rm=box_download_shared_file&shared_name={shared}&file_id=f_{fid}"
     try:
      bb,tt=get(direct);candidates[name+"-original"]=(bb,direct);print("BOX_FILE",name,fid,len(bb),tt,flush=True)
     except Exception as ee:print("BOXFILE_FAIL",name,ee,flush=True)
   else:
    urls=re.findall(r'https?[^\s\\"<>]+?\.(?:jpg|jpeg|webp|png)(?:\?[^\s\\"<>]*)?',s,re.I)
    urls=[html.unescape(x).replace("\\/","/") for x in urls]
    urls=list(dict.fromkeys(urls))
    for u in urls:
     if any(x in u.lower() for x in ("langley","ella","cma","natasha","acacia","harris","kempin")):
      print("HTML_PHOTO",name,u[:270],flush=True)
    # save HTML for debug if needed but not full output
 except Exception as e:print("SOURCE_ERROR",name,repr(e),flush=True)
# additional direct candidates from source image search
other={
"cma-2026-crop":"https://hermes.media.static.aol.com/media/2026/06/26/01f8e265-4258-3e48-86ed-42ce8e6bd15a/17ed187e-708c-438d-9cce-ddf98d639744.jpg",
"cma-2026-stagecoach":"https://hermes.media.static.aol.com/media/2026/08/05/9931fa68-a7a2-378d-83ef-9a55f519db19/de760506-f3af-44ff-88ca-fdbfabc80bea.jpg",
}
for name,u in other.items():
 try:b,t=get(u);candidates[name]=(b,u)
 except Exception as e:print("SOURCE_ERROR",name,repr(e),flush=True)
thumbs=[]
for name,(raw,url) in candidates.items():
 try:
  im=Image.open(io.BytesIO(raw))
  print("PHOTO",name,"DIM",im.size,"FORMAT",im.format,"BYTES",len(raw),"SOURCE",url,flush=True)
  im=ImageOps.exif_transpose(im).convert("RGB")
  w,h=im.size
  crop=ImageOps.fit(im,(640,360),Image.Resampling.LANCZOS,centering=(.5,.36))
  thumbs.append((name,crop))
 except Exception as e:print("BAD_IMAGE",name,repr(e),flush=True)
if thumbs:
 sheet=Image.new("RGB",(660,len(thumbs)*392),"white");d=ImageDraw.Draw(sheet)
 for i,(name,img) in enumerate(thumbs):
  y=392*i;d.text((10,y+3),name,fill="black");sheet.paste(img,(10,y+27))
 b=io.BytesIO();sheet.save(b,format="JPEG",quality=78)
 out=Path(".editorial/ella-final-photo-sheet.b64");out.parent.mkdir(exist_ok=True);out.write_text(base64.b64encode(b.getvalue()).decode("ascii"))
 subprocess.run(["git","config","user.name","music98 editorial"],check=True)
 subprocess.run(["git","config","user.email","editorial@music98.news"],check=True)
 subprocess.run(["git","add",str(out)],check=True)
 if subprocess.run(["git","diff","--cached","--quiet"]).returncode:
  subprocess.run(["git","commit","-m","Visual photo QC Ella final cover candidates"],check=True)
  subprocess.run(["git","push"],check=True)
 print("SHEET_READY",len(thumbs),flush=True)
