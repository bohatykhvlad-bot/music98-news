#!/usr/bin/env python3
"""Scoped Draft-only Ella native guitar photo and prose de-duplication."""
from __future__ import annotations
import base64,copy,hashlib,io,json,sys,time,urllib.request
from pathlib import Path
from PIL import Image,ImageOps
sys.path.insert(0,str(Path(__file__).resolve().parent))
import post as runner,gate
HERE=Path(__file__).resolve().parent
ID="ella26choosintexas"
OLD=(HERE/"ella-oct02-desk-before-native-final-photo.txt").read_text("utf-8").strip()
NEW=(HERE/"ella-oct02-longread-body.txt").read_text("utf-8").strip()
PHOTO="ella-caylee-2024-cma-guitar-native-3648.jpg"
URL="https://imgix.bustle.com/uploads/image/2024/7/1/06d98009/2i0a5096-2.jpg"
CREDIT="https://www.cayleerobillard.com/"
MEDIA="[photo:photos/"+PHOTO+"|Caylee Robillard|"+CREDIT+"|50% 52%|1]"
def read():
 return runner.http(runner.DESK_API+"?fresh="+str(time.time_ns()),runner.desk_key())
def digest(p):
 return hashlib.sha256(json.dumps(p,sort_keys=True,ensure_ascii=False,separators=(",",":")).encode()).hexdigest()
def fetch(url):
 with urllib.request.urlopen(urllib.request.Request(url,headers={"User-Agent":runner.UA}),timeout=55) as r:return r.read(),r.headers.get("Content-Type","")
def photo():
 raw,ctype=fetch(URL);im=Image.open(io.BytesIO(raw))
 assert im.size==(3648,5472) and im.mode=="RGB" and im.format=="JPEG"
 cropped=ImageOps.fit(ImageOps.exif_transpose(im),(3648,2432),method=Image.Resampling.LANCZOS,centering=(.5,.5))
 buf=io.BytesIO();cropped.save(buf,"JPEG",quality=90,optimize=True)
 out=buf.getvalue()
 if len(out)>2850000:
  buf=io.BytesIO();cropped.save(buf,"JPEG",quality=86,optimize=True)
  out=buf.getvalue()
 assert 100000<len(out)<2850000,(len(out),"size not acceptable")
 confirm=Image.open(io.BytesIO(out));assert confirm.size==(3648,2432) and confirm.mode=="RGB"
 print("NATIVE_PHOTO_VERIFIED","source",im.size,"landscape_source_crop",confirm.size,"bytes",len(out),flush=True)
 return out
def hosted():
 try:
  r,ct=fetch("https://music98.news/photos/"+PHOTO+"?fresh="+str(time.time_ns()))
  im=Image.open(io.BytesIO(r));return r,im
 except Exception:return None,None
def store(raw):
 current,im=hosted()
 if current:
  if hashlib.sha256(raw).hexdigest()!=hashlib.sha256(current).hexdigest():raise RuntimeError("photo file collision")
  print("IMAGE_ALREADY_STORED",im.size,flush=True);return
 val=runner.http("https://music98.news/api/photo",runner.desk_key(),{"name":PHOTO,"data":"data:image/jpeg;base64,"+base64.b64encode(raw).decode()},method="POST")
 assert val.get("ok") and val.get("url")=="photos/"+PHOTO,val
 for _ in range(10):
  b,im=hosted()
  if b and hashlib.sha256(b).digest()==hashlib.sha256(raw).digest():
   assert im.size==(3648,2432)
   print("NATIVE_IMAGE_UPLOAD_CONFIRMED",im.size,len(b),flush=True);return
  time.sleep(2)
 raise RuntimeError("Image not visible after upload")
def structure():
 a=[s.strip() for s in NEW.split("\n\n") if s.strip()]
 para=[v for v in a if not v.startswith("[")]
 media=[v for v in a if v.startswith("[")]
 assert len(para)==21 and len(media)==10
 assert all(80<=len(x.split())<=200 for x in para)
 gap=[];n=0
 for x in a:
  if x.startswith("["):gap.append(n);n=0
  else:n+=1
 gap.append(n)
 assert gap==[2]*10+[1],gap
 assert MEDIA==a[-2] and a[-1].startswith("The explanation for")
 assert "ella-crs2026-guitar-amy-harris.jpg" not in NEW
 assert NEW.count("Nashville")==2
 assert NEW.startswith(OLD.split(". ")[0]+".")
 assert NEW.count("[youtube:4QIZE708gJ4]")==1
 print("LAYOUT_VERIFIED",len(para),"prose",len(media),"media",gap,"Nashville",2,"words",sum(len(s.split()) for s in para),flush=True)
def main():
 runner.load_env();runner.desk_read=read;gate.KEY=runner.desk_key();gate.CHECK_IDS=True
 structure();before=read();old=runner.find_post(before["posts"],ID)
 assert old.get("status")=="draft" and old.get("body","").strip()==OLD,"Owner editing conflict: draft changed since snapshot"
 raw=photo()
 cand=copy.deepcopy(old);cand["body"]=NEW
 if len(sys.argv)<2 or sys.argv[1]=="--audit":
  errs,warns,_=gate.check_post(cand,strict=True)
  print("PREWRITE_AUDIT","PASS" if not errs else "FAIL","errors",json.dumps(errs),"warnings",json.dumps(warns),flush=True)
  if errs:raise RuntimeError("Candidate gate failed")
  print("READONLY_GUITAR_PHOTO_AUDIT_PASS",flush=True);return
 if sys.argv[1]!="--save":raise RuntimeError("Unknown argument")
 Path("/tmp/ella-native-final-20261002-backup.json").write_text(json.dumps(before,ensure_ascii=False),encoding="utf-8")
 store(raw)
 fails,warns,info=gate.check_post(cand,strict=True)
 print("WRITE_GATE","PASS" if not fails else "FAIL",json.dumps(fails),json.dumps(warns),flush=True)
 if fails:raise RuntimeError("Gate rejected candidate before write")
 others={str(p["id"]):digest(p) for p in before["posts"] if str(p["id"])!=ID}
 protected={k:copy.deepcopy(v) for k,v in old.items() if k!="body"}
 def mutate(posts):
  p=runner.find_post(posts,ID)
  if p.get("status")!="draft" or p.get("body","").strip()!=OLD or {k:v for k,v in p.items() if k!="body"}!=protected:
   raise RuntimeError("Concurrent edit: abort")
  p["body"]=NEW;return copy.deepcopy(p)
 saved=runner.guarded_write(mutate)
 assert saved.get("status")=="draft" and saved.get("body")==NEW
 after=read()
 assert {str(p["id"]):digest(p) for p in after["posts"] if str(p["id"])!=ID}==others
 for n in range(1,4):
  success,lines=runner.run_gate(ID,quiet=True)
  print("POSTWRITE_GATE",n,"PASS" if success else "FAIL",json.dumps(lines,ensure_ascii=True),flush=True)
  if not success:raise RuntimeError("Postwrite validation failed")
 final=runner.find_post(read()["posts"],ID)
 assert final["body"]==NEW and final["status"]=="draft" and final["cover"]==old["cover"]
 assert {k:v for k,v in final.items() if k!="body"}==protected
 public=runner.http(runner.DESK_API+"?nocache="+str(time.time_ns()))
 assert not any(str(p.get("id"))==ID for p in public.get("posts",[]))
 print("ELLA_NATIVE_GUITAR_DRAFT_VERIFIED","image",PHOTO,"pixel_size",str((3648,2432)),"photographer_credit","Caylee Robillard","nashville_count",NEW.count("Nashville"),"OTHER_POSTS_UNCHANGED",True,"PUBLIC_VISIBLE",False,flush=True)
if __name__=="__main__":main()
