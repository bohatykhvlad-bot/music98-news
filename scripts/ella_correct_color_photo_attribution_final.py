#!/usr/bin/env python3
"""One guarded Ella Draft edit: corrected ICC cover, verified photographer links, canonical end layout."""
from __future__ import annotations
import copy,hashlib,io,json,base64,sys,time,urllib.request
from pathlib import Path
from PIL import Image,ImageCms,ImageOps
sys.path.insert(0,str(Path(__file__).resolve().parent))
import post as runner,gate
BASE=Path(__file__).resolve().parent
POST_ID="ella26choosintexas"
OLD=(BASE/"ella-oct02-before-final-layout.txt").read_text(encoding="utf-8").strip()
NEW=(BASE/"ella-oct02-longread-body.txt").read_text(encoding="utf-8").strip()
ORIGINAL="https://kommunikasjon.ntb.no/files/8931514/18858703/263460/no"
HERO_NAME="ella-sony-standing-dandelion-2026-srgb.jpg"
PHOTOGRAPHER_SITE="https://www.cayleerobillard.com/"
AMY_SITE="https://www.amyharrisphotos.com/bio"
NEW_COVER={"kind":"img","src":"photos/"+HERO_NAME,"credit":"Caylee Robillard","creditUrl":PHOTOGRAPHER_SITE,"pos":"50% 28%","cardX":0.5,"cardY":0.34,"cardZoom":1.45}
def fresh():
 return runner.http(runner.DESK_API+"?fresh="+str(time.time_ns()),runner.desk_key())
def fprint(x):
 return hashlib.sha256(json.dumps(x,sort_keys=True,ensure_ascii=False,separators=(",",":")).encode("utf-8")).hexdigest()
def fetch(u):
 with urllib.request.urlopen(urllib.request.Request(u,headers={"User-Agent":runner.UA}),timeout=60) as r:
  return r.read(),r.headers.get("Content-Type","")
def validate_layout():
 a=[x.strip() for x in NEW.split("\n\n") if x.strip()]
 carriers=[x for x in a if x.startswith("[")]
 prose=[x for x in a if not x.startswith("[")]
 gaps=[];n=0
 for x in a:
  if x.startswith("["):gaps.append(n);n=0
  else:n+=1
 gaps.append(n)
 assert gaps==[2]*10+[1],gaps
 assert len(carriers)==10 and len(prose)==21,(len(carriers),len(prose))
 assert all(80<=len(x.split())<=200 for x in prose)
 assert a[-2].startswith("[photo:photos/ella-crs2026-guitar-amy-harris.jpg|Amy Harris|"+AMY_SITE+"|")
 assert a[-1].startswith("The explanation for")
 assert "post-malone-morgan-wallen-official-bts" not in NEW
 assert "[youtube:4QIZE708gJ4]" in NEW and "[apple:song:1062400323:1062400330]" in NEW
 assert NEW.startswith(OLD.split(". ")[0]+".")
 assert all(x not in NEW for x in ("\u2019","\u2018","\u2014"))
 print("ARTICLE_LAYOUT_OK","gaps",gaps,"carriers",len(carriers),"prose",len(prose),"words",sum(len(p.split()) for p in prose),flush=True)
def corrected_srgb():
 b,t=fetch(ORIGINAL)
 im=Image.open(io.BytesIO(b));icc=im.info.get("icc_profile")
 assert im.mode=="CMYK" and im.size==(2128,2515) and icc
 src_prof=ImageCms.ImageCmsProfile(io.BytesIO(icc))
 description=ImageCms.getProfileDescription(src_prof).strip()
 assert "SWOP" in description,description
 im=ImageOps.exif_transpose(im)
 srgb=ImageCms.createProfile("sRGB")
 out=ImageCms.profileToProfile(im,src_prof,srgb,outputMode="RGB")
 jpeg_icc=ImageCms.ImageCmsProfile(srgb).tobytes()
 buf=io.BytesIO()
 out.save(buf,"JPEG",quality=91,optimize=True,icc_profile=jpeg_icc)
 raw=buf.getvalue()
 if len(raw)>2850000:
  buf=io.BytesIO()
  out.save(buf,"JPEG",quality=87,optimize=True,icc_profile=jpeg_icc)
  raw=buf.getvalue()
 assert len(raw)<2850000,("Image too large",len(raw))
 check=Image.open(io.BytesIO(raw));check_icc=check.info.get("icc_profile")
 assert check.mode=="RGB" and check.size==(2128,2515) and check_icc
 assert "sRGB" in ImageCms.getProfileName(ImageCms.ImageCmsProfile(io.BytesIO(check_icc)))
 print("ICC_CORRECTION_PROOF","source",description,"new","sRGB","dimensions",out.size,"source_bytes",len(b),"target_bytes",len(raw),flush=True)
 return raw
def site_photo():
 try:
  raw,ct=fetch("https://music98.news/photos/"+HERO_NAME+"?t="+str(time.time_ns()))
  im=Image.open(io.BytesIO(raw))
  return raw,im
 except Exception:
  return None,None
def upload_jpeg(raw):
 existing,im=site_photo()
 if existing:
  if hashlib.sha256(existing).hexdigest()!=hashlib.sha256(raw).hexdigest():
   raise RuntimeError("Existing image name has different data")
  print("VERIFIED_UPLOADED_IMAGE_REUSED",im.size,flush=True)
  return
 data="data:image/jpeg;base64,"+base64.b64encode(raw).decode("ascii")
 resp=runner.http("https://music98.news/api/photo",runner.desk_key(),{"name":HERO_NAME,"data":data},method="POST")
 assert resp.get("ok") and resp.get("url")=="photos/"+HERO_NAME,resp
 for _ in range(8):
  got,im=site_photo()
  if got and hashlib.sha256(got).digest()==hashlib.sha256(raw).digest():
   assert im.size==(2128,2515) and im.info.get("icc_profile")
   print("COLOR_CORRECTED_IMAGE_LIVE","bytes",len(got),"icc",len(im.info["icc_profile"]),flush=True)
   return
  time.sleep(2)
 raise RuntimeError("Correctly profiled image upload did not verify")
def main():
 runner.load_env();runner.desk_read=fresh;gate.KEY=runner.desk_key();gate.CHECK_IDS=True
 validate_layout()
 data=fresh();old=runner.find_post(data["posts"],POST_ID)
 assert old.get("status")=="draft" and old.get("body","").strip()==OLD,"Owner edited draft; abort"
 assert old.get("cover",{}).get("src")=="photos/ella-sony-standing-dandelion-2026.jpg","Cover changed; abort"
 assert old.get("cover",{}).get("credit")=="Sony Music","Unexpected photo credit; abort"
 assert NEW.startswith(old["excerpt"]),"Excerpt unexpectedly changed"
 raw=corrected_srgb()
 candidate=copy.deepcopy(old)
 candidate["body"]=NEW;candidate["cover"]=copy.deepcopy(NEW_COVER)
 if len(sys.argv)<2 or sys.argv[1]=="--audit":
  print("READONLY_VERIFIED_DRAFT_MATCH","existing","Sony Music","new","Caylee Robillard","body_modified",OLD!=NEW,flush=True)
  return
 if sys.argv[1]!="--save":raise RuntimeError("Unknown mode")
 Path("/tmp/ella-before-icc-and-credit-20261002.json").write_text(json.dumps(data,ensure_ascii=False),encoding="utf-8")
 upload_jpeg(raw)
 fails,warns,info=gate.check_post(candidate,strict=True)
 print("CANDIDATE_GATE","PASS" if not fails else "FAIL","errors",json.dumps(fails),"warnings",json.dumps(warns),flush=True)
 if fails:raise RuntimeError("Gate rejected candidate without changing draft")
 other={str(p["id"]):fprint(p) for p in data["posts"] if str(p["id"])!=POST_ID}
 protected={k:copy.deepcopy(v) for k,v in old.items() if k not in ("body","cover")}
 def mutate(posts):
  p=runner.find_post(posts,POST_ID)
  if p.get("status")!="draft" or p.get("body","").strip()!=OLD or p.get("cover")!=old["cover"]:
   raise RuntimeError("Owner changed draft during update")
  assert {k:v for k,v in p.items() if k not in ("body","cover")}==protected
  p["body"]=NEW;p["cover"]=copy.deepcopy(NEW_COVER)
  return copy.deepcopy(p)
 saved=runner.guarded_write(mutate)
 assert saved.get("status")=="draft" and saved.get("body")==NEW and saved.get("cover")==NEW_COVER
 new=fresh()
 assert {str(p["id"]):fprint(p) for p in new["posts"] if str(p["id"])!=POST_ID}==other
 for n in range(1,4):
  success,lines=runner.run_gate(POST_ID,quiet=True)
  print("POSTWRITE_GATE",n,"PASS" if success else "FAIL",json.dumps(lines,ensure_ascii=False),flush=True)
  if not success:raise RuntimeError("Postwrite gate failed")
 final=runner.find_post(fresh()["posts"],POST_ID)
 assert final["body"]==NEW and final["cover"]==NEW_COVER and final["status"]=="draft"
 assert {k:v for k,v in final.items() if k not in ("body","cover")}==protected
 public=runner.http(runner.DESK_API+"?t="+str(time.time_ns()))
 assert not any(str(p.get("id"))==POST_ID for p in public.get("posts",[]))
 print("ELLA_COLOR_CREDIT_LAYOUT_SAVED",POST_ID,"draft_only",True,"cover_srgb_icc",True,"photographer_credit","Caylee Robillard","guitar_credit","Amy Harris","guitar_photo_before_final_paragraph",True,"other_posts_unchanged",True,flush=True)
if __name__=="__main__":main()
