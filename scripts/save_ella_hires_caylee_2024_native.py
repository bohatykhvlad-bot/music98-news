#!/usr/bin/env python3
"""Scoped Ella longread: replace only last photo and neighboring prose with
a native 3648x5472 guitar performance original, retaining unaltered pixels.
Draft only. Photographer permission remains to be confirmed before publishing.
"""
from __future__ import annotations
import base64,copy,hashlib,io,json,sys,time,urllib.request
from pathlib import Path
from PIL import Image
sys.path.insert(0,str(Path(__file__).resolve().parent))
import post as run,gate

ID="ella26choosintexas"
PHOTO="ella-caylee-cma-2024-acoustic-native.jpg"
URL="https://imgix.bustle.com/uploads/image/2024/7/1/06d98009/2i0a5096-2.jpg"
MEDIA="[photo:photos/"+PHOTO+"|Caylee Robillard|https://www.cayleerobillard.com/|50% 50%|1]"
PARA=("Long before the summer when \"Choosin' Texas\" broke its chart records, Langley was already learning "
"how to make a song work in front of an audience. At CMA Fest in 2024, photographer Caylee Robillard "
"captured her singing into a microphone with an acoustic guitar across her lap. The original image "
"has the intimacy of a moment between songs rather than the distant spectacle of an arena show. "
"Langley faces the audience while the guitar fills the foreground, a portrait of the performing "
"experience she carried into the next phase of her career. It offers a deliberate contrast to the "
"carefully staged 2026 album photograph earlier in this article, without confusing the two eras.")
def sha(x):return hashlib.sha256(x).hexdigest()
def digest(x):return sha(json.dumps(x,sort_keys=True,ensure_ascii=False,separators=(",",":")).encode())
def fetch(url):
 with urllib.request.urlopen(urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0","Accept":"image/jpeg,*/*"}),timeout=70) as r:return r.read()
def desk():return run.http(run.DESK_API+"?fresh="+str(time.time_ns()),run.desk_key())
def photo():
 raw=fetch(URL);im=Image.open(io.BytesIO(raw));im.verify()
 im=Image.open(io.BytesIO(raw));im.load()
 assert im.size==(3648,5472) and im.format=="JPEG",im.size
 assert sha(raw)=="c7c02d6e553619b7aaf9da52800a06d47a1ff73c9147d8eaae1482f7d9505e43"
 assert len(raw)<2900000
 print("NATIVE_HIGH_RES_SOURCE_CONFIRMED",im.size,len(raw),sha(raw),flush=True)
 return raw
def hosted():
 try:return fetch("https://music98.news/photos/"+PHOTO+"?fresh="+str(time.time_ns()))
 except Exception:return None
def upload(raw):
 there=hosted()
 if there:
  assert sha(there)==sha(raw),"Filename collision"
  print("NATIVE_ORIGINAL_ALREADY_HOSTED",flush=True);return
 val=run.http("https://music98.news/api/photo",run.desk_key(),{"name":PHOTO,"data":"data:image/jpeg;base64,"+base64.b64encode(raw).decode()},method="POST")
 assert val.get("ok") and val.get("url")=="photos/"+PHOTO,val
 for attempt in range(14):
  there=hosted()
  if there and sha(there)==sha(raw):
   img=Image.open(io.BytesIO(there));assert img.size==(3648,5472)
   print("NATIVE_ORIGINAL_HOSTED_BYTE_FOR_BYTE",img.size,len(there),flush=True);return
  time.sleep(2)
 raise RuntimeError("Uploaded original not visible byte for byte")
def mutate(body):
 blocks=body.split(chr(10)*2)
 assert len(blocks)==31,"Owner changed longread structure"
 current_media=blocks[29]
 if current_media==MEDIA:return body
 assert current_media.startswith("[photo:photos/ella-crs2026-andrew-wendowski-live-guitar-1200.jpg|Andrew Wendowski|"),"Unexpected current photo; protect owner edits"
 assert blocks[28].startswith("At the 2026 New Faces of Country Music show in Nashville") or blocks[28].startswith("Long before"),"Unknown neighboring paragraph; protect owner edits"
 old=blocks[:]
 blocks[28]=PARA;blocks[29]=MEDIA
 changes=[i for i,(a,b) in enumerate(zip(old,blocks)) if a!=b]
 assert changes==[28,29],changes
 ps=[b for b in blocks if not b.startswith("[")]
 ms=[b for b in blocks if b.startswith("[")]
 assert len(ps)==21 and len(ms)==10 and all(80<=len(x.split())<=200 for x in ps)
 assert blocks[30]==old[30]
 result=(chr(10)*2).join(blocks)
 print("SCOPED_REBASE_ONLY_LAST_2_BLOCKS",changes,"NATIVE_GUITAR_2024_WORDS",len(PARA.split()),"TOTAL",sum(len(p.split()) for p in ps),flush=True)
 return result
def main():
 mode=sys.argv[1] if len(sys.argv)>1 else "--audit"
 assert mode in ("--audit","--save")
 run.load_env();gate.KEY=run.desk_key()
 before=desk();old=run.find_post(before["posts"],ID)
 assert old.get("status")=="draft"
 updated=mutate(old["body"].strip())
 raw=photo()
 can=copy.deepcopy(old);can["body"]=updated
 if mode=="--audit":
  gate.CHECK_IDS=False
  errs,warns,_=gate.check_post(can,strict=True)
  unrelated=[e for e in errs if not (e[0]=="card-dead" and PHOTO in str(e[1]))]
  print("PREFLIGHT_NO_WRITE","PASS" if not unrelated else "FAIL",json.dumps(errs),flush=True)
  assert not unrelated;return
 upload(raw)
 gate.CHECK_IDS=True
 errs,warns,_=gate.check_post(can,strict=True)
 print("AFTER_UPLOAD_EDITORIAL_GATE",json.dumps(errs),flush=True)
 assert not errs
 others={str(p["id"]):digest(p) for p in before["posts"] if str(p["id"])!=ID}
 untouched={k:copy.deepcopy(v) for k,v in old.items() if k!="body"}
 latest=desk();cur=run.find_post(latest["posts"],ID)
 assert cur==old,"Concurrent owner edit; abort"
 if old["body"].strip()!=updated:
  cur["body"]=updated
  run.http(run.DESK_API,run.desk_key(),{"posts":latest["posts"]},method="POST")
 passes=0
 for i in range(45):
  now=desk();p=run.find_post(now["posts"],ID)
  same=(p["status"]=="draft" and p["body"].strip()==updated)
  passes=passes+1 if same else 0
  print("FRESH_READ",i+1,"MATCH",same,"STREAK",passes,flush=True)
  if passes>=3:break
  assert p["body"].strip() in (old["body"].strip(),updated),"Concurrent owner changes during save"
  time.sleep(2)
 else:raise RuntimeError("Three fresh saved-draft reads not achieved")
 assert {k:v for k,v in p.items() if k!="body"}==untouched
 assert {str(x["id"]):digest(x) for x in now["posts"] if str(x["id"])!=ID}==others
 for i in range(3):
  ok,logs=run.run_gate(ID,quiet=True)
  print("POSTWRITE_GATE",i+1,"PASS" if ok else "FAIL",flush=True)
  assert ok
 assert sha(hosted())==sha(raw)
 public=run.http(run.DESK_API+"?nocache="+str(time.time_ns()))
 assert not any(str(p.get("id"))==ID for p in public.get("posts",[]))
 print("NATIVE_20MP_CAYLEE_GUITAR_DRAFT_VERIFIED",PHOTO,"PIXELS",3648,5472,"CREDIT","https://www.cayleerobillard.com/","DRAFT_ONLY",True,"PUBLIC_VISIBLE",False,"RIGHTS_CLEARANCE_REQUIRED",True,flush=True)
if __name__=="__main__":main()
