#!/usr/bin/env python3
"""Guarded editor-reviewed Ella draft update with original 2026 Amy Harris
New Faces live guitar photo. No crops, no hidden publishing. Rights review
required before the eventual publication of the photographer's image.
"""
from __future__ import annotations
import base64,copy,difflib,hashlib,io,json,sys,time,urllib.request
from pathlib import Path
from PIL import Image
sys.path.insert(0,str(Path(__file__).resolve().parent))
import post as runner, gate

HERE=Path(__file__).resolve().parent
POST_ID="ella26choosintexas"
PREV=(HERE/"ella-20261002-all-originals-final-body.txt").read_text("utf8").strip()
# Rebase on owner's verified credit-only edit in the current draft:
# the publisher URL was removed without changing the photographer's name.
PREV=PREV.replace(
 "[photo:photos/ella-bluesfest-2026-miriam-visser-full-original.jpg|Miriam Visser|https://charlatan.ca/bluesfest-ella-langley-angine-de-poitrine-night-seven/|50% 50%|1]",
 "[photo:photos/ella-bluesfest-2026-miriam-visser-full-original.jpg|Miriam Visser||50% 50%|1]"
)
NEW=(HERE/"ella-20261002-amy-harris-proofread-body.txt").read_text("utf8").strip()
HERO="photos/ella-sony-standing-dandelion-2026-srgb.jpg"
PHOTOS={
 "second_lying":{
  "name":"ella-dandelion-caylee-2026-2730x3631-original.jpg",
  "url":"https://prowly-prod.s3.eu-west-1.amazonaws.com/uploads/landing_page_image/image/670237/c17d81243d0803daafa4cf95b07cc51c.jpg",
  "size":(2730,3631),"author":"Caylee Robillard",
 },
 "last_live_guitar":{
  "name":"ella-crs2026-amy-harris-00419-original.jpg",
  "url":"https://thetraveladdict.com/wp-content/uploads/2026/03/EllaLangley-00419.jpg",
  "size":(1200,800),"author":"Amy Harris",
 }
}
def digest(obj):
 return hashlib.sha256(json.dumps(obj,sort_keys=True,separators=(",",":"),ensure_ascii=False).encode()).hexdigest()
def get_binary(url):
 req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0","Accept":"image/avif,image/webp,image/jpeg,image/png,*/*"})
 with urllib.request.urlopen(req,timeout=60) as r:return r.read(),r.headers.get("Content-Type","")
def fresh():
 return runner.http(runner.DESK_API+"?fresh="+str(time.time_ns()),runner.desk_key())
def read_public_photo(name):
 try:
  data,mime=get_binary("https://music98.news/photos/"+name+"?check="+str(time.time_ns()))
  im=Image.open(io.BytesIO(data));im.load()
  return data,im
 except Exception:return None,None
def confirm_layout():
 a=PREV.split("\n\n");b=NEW.split("\n\n")
 altered=[i for i,(x,y) in enumerate(zip(a,b)) if x!=y]
 assert len(a)==len(b)==31 and altered==[6,9,15,16,24,28,29,30],altered
 p=[x for x in b if not x.startswith("[")]
 m=[x for x in b if x.startswith("[")]
 assert len(p)==21 and len(m)==10
 assert all(80<=len(x.split())<=200 for x in p)
 assert sum(x.startswith("[photo:") for x in m)==2
 assert "ella-dandelion-caylee-2026-2730x3631-original.jpg" in b[5]
 assert "ella-crs2026-amy-harris-00419-original.jpg|Amy Harris|https://www.amyharrisphotos.com/bio" in b[29]
 gap=[];n=0
 for x in b:
  if x.startswith("["):gap.append(n);n=0
  else:n+=1
 gap.append(n)
 assert gap==[2]*10+[1],gap
 print("STRUCTURE_VERIFIED","blocks",len(b),"changed",altered,"prose_words",sum(len(x.split()) for x in p),flush=True)
def originals():
 raw,im=read_public_photo(HERO.rsplit("/",1)[-1])
 assert raw and im.size==(2128,2515) and im.mode=="RGB",("Hero no longer stored at full original pixel dimensions",getattr(im,"size",None))
 print("HERO_FULL_FRAME_CONFIRMED",(im.width,im.height),"STORED_BYTES",len(raw),flush=True)
 photos={}
 for key,info in PHOTOS.items():
  blob,mime=get_binary(info["url"])
  im=Image.open(io.BytesIO(blob));im.verify()
  im=Image.open(io.BytesIO(blob))
  assert im.format=="JPEG" and im.mode=="RGB" and im.size==info["size"],(key,im.size,im.mode,im.format)
  assert 80_000<len(blob)<3_000_000
  print("SOURCE_FULL_FRAME_VERIFIED",key,im.size,"UNTOUCHED_BYTES",len(blob),"PHOTOGRAPHER",info["author"],flush=True)
  photos[key]=blob
 return photos
def upload(name,src):
 existing,im=read_public_photo(name)
 if existing:
  assert hashlib.sha256(existing).digest()==hashlib.sha256(src).digest(),("Refuse existing filename collision",name)
  print("FULL_SOURCE_ALREADY_UPLOADED",name,im.size,flush=True)
  return
 out=runner.http("https://music98.news/api/photo",runner.desk_key(),
       {"name":name,"data":"data:image/jpeg;base64,"+base64.b64encode(src).decode("ascii")},method="POST")
 assert out.get("ok") and out.get("url")=="photos/"+name,out
 for i in range(14):
  now,im=read_public_photo(name)
  if now and hashlib.sha256(now).digest()==hashlib.sha256(src).digest():
   print("UPLOADED_BYTE_FOR_BYTE_ORIGINAL_VERIFIED",name,im.size,len(now),flush=True)
   return
  time.sleep(2)
 raise RuntimeError("Original photo not yet confirmed on live media endpoint: "+name)
def main():
 mode=sys.argv[1] if len(sys.argv)>1 else "--audit"
 assert mode in ("--audit","--save")
 runner.load_env();gate.KEY=runner.desk_key()
 confirm_layout()
 before=fresh();old=runner.find_post(before["posts"],POST_ID)
 assert old.get("status")=="draft"
 actual=old.get("body","").strip()
 print("DRAFT_SHA",hashlib.sha256(actual.encode()).hexdigest(),"BASE_SHA",hashlib.sha256(PREV.encode()).hexdigest(),flush=True)
 if actual not in (PREV,NEW):
  print("CURRENT_DESK_DIFF_BEGIN",flush=True)
  print("\\n".join(difflib.unified_diff(PREV.splitlines(),actual.splitlines(),fromfile="repo-baseline",tofile="current-desk",lineterm="")),flush=True)
  print("CURRENT_DESK_DIFF_END",flush=True)
  raise RuntimeError("Ella draft was edited since verified snapshot. Abort without overwriting.")
 source=originals()
 if mode=="--audit":
  cand=copy.deepcopy(old);cand["body"]=NEW
  gate.CHECK_IDS=False
  errors,warnings,_=gate.check_post(cand,strict=True)
  expected=set(x["name"] for x in PHOTOS.values())
  unexpected=[e for e in errors if not (e[0]=="card-dead" and any(name in str(e[1]) for name in expected))]
  print("READONLY_ORIGINALS_AUDIT","PASS" if not unexpected else "FAIL","ERRORS",json.dumps(errors),"WARNINGS",json.dumps(warnings),flush=True)
  if unexpected:raise RuntimeError("Other article gate errors")
  return
 # Originals are stored exactly as downloaded: not a single pixel is cropped.
 for info in PHOTOS.values():
  key=next(k for k,v in PHOTOS.items() if v==info)
  upload(info["name"],source[key])
 if actual==NEW:
  print("ALREADY_UPDATED_ARTICLE",flush=True)
 else:
  other={str(p["id"]):digest(p) for p in before["posts"] if str(p["id"])!=POST_ID}
  protected={k:copy.deepcopy(v) for k,v in old.items() if k!="body"}
  candidate=copy.deepcopy(old);candidate["body"]=NEW
  gate.CHECK_IDS=True
  errors,warnings,_=gate.check_post(candidate,strict=True)
  print("PREWRITE_GATE",json.dumps(errors),flush=True)
  if errors:raise RuntimeError("Gate errors before save")
  current=fresh()
  if runner.find_post(current["posts"],POST_ID)!=old:raise RuntimeError("Concurrent edit before write")
  runner.find_post(current["posts"],POST_ID)["body"]=NEW
  runner.http(runner.DESK_API,runner.desk_key(),{"posts":current["posts"]},method="POST")
  for n in range(16):
   latest=fresh();now=runner.find_post(latest["posts"],POST_ID)
   if now["body"].strip()==NEW:break
   if now["body"].strip()!=PREV:raise RuntimeError("Unexpected owner edit during desk propagation")
   time.sleep(2)
  else:raise RuntimeError("Updated article did not propagate")
  assert now["status"]=="draft"
  assert {k:v for k,v in now.items() if k!="body"}==protected
  assert {str(p["id"]):digest(p) for p in latest["posts"] if str(p["id"])!=POST_ID}==other
  print("ARTICLE_UPDATED_OTHER_POSTS_UNCHANGED",flush=True)
 final=runner.find_post(fresh()["posts"],POST_ID)
 assert final["body"].strip()==NEW and final["status"]=="draft"
 for n in range(3):
  ok,lines=runner.run_gate(POST_ID,quiet=True)
  print("POSTWRITE_GATE",n+1,"PASS" if ok else "FAIL",json.dumps(lines,ensure_ascii=True),flush=True)
  if not ok:raise RuntimeError("Postwrite gate failed")
 public=runner.http(runner.DESK_API+"?nocache="+str(time.time_ns()))
 assert not any(str(x.get("id"))==POST_ID for x in public.get("posts",[]))
 print("ELLA_ALL_NATIVE_FRAMES_SAVED_IN_DRAFT_ONLY",True,"HERO",(2128,2515),
       "SECOND",(2730,3631),"LAST",(1200,800),"NO_CROPS",True,flush=True)
if __name__=="__main__":main()
