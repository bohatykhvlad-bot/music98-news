#!/usr/bin/env python3
"""Guarded, draft-only visual replacement of Ella Langley's final photo with
the photographer's own published 2026 CRS guitar stage frame. Do not publish.
The photographer owns copyright; separate republication permission still needs review.
"""
from __future__ import annotations
import base64,copy,hashlib,io,json,sys,time,urllib.request
from pathlib import Path
from PIL import Image
sys.path.insert(0,str(Path(__file__).resolve().parent))
import post as runner,gate

ID="ella26choosintexas"
SOURCE_TEXT=Path(__file__).with_name("ella-20261002-amy-harris-proofread-body.txt").read_text("utf8").strip()
PHOTO="ella-crs2026-andrew-wendowski-live-guitar-1200.jpg"
SOURCE="https://musicmayhemmagazine.com/wp-content/uploads/2026/03/Ella-Langley-Photo-by-Andrew-Wendowski.jpg"
CREDIT="https://musicmayhemmagazine.com/author/awendowskiphoto/"
MEDIA="[photo:photos/"+PHOTO+"|Andrew Wendowski|"+CREDIT+"|50% 50%|1]"
PREV_MEDIA="[photo:photos/ella-crs2026-amy-harris-00419-original.jpg|Amy Harris|https://www.amyharrisphotos.com/bio|50% 50%|1]"
NEW_PARA=("At the 2026 New Faces of Country Music show in Nashville, Langley closed the evening in "
"a red-and-black fringe outfit, with the songs from her forthcoming album already drawing attention. "
"Her set opened with \"Dandelion\" and included \"Choosin' Texas,\" \"Be Her\" and \"Loving Life Again.\" "
"Photographer Andrew Wendowski captured Langley at the microphone, an acoustic guitar across her front "
"and her name illuminated behind the band. The stage lights and the drummer place her squarely in the "
"live performance that helped build her following. Rather than another carefully arranged promotional "
"portrait, this is a working singer surrounded by her musicians. Taken in March, the picture predates "
"her record-breaking summer and gives the story a fitting return to the stage.")
def prepare():
 blocks=SOURCE_TEXT.split("\n\n")
 assert len(blocks)==31 and blocks[-2]==PREV_MEDIA
 assert blocks[-3].startswith("At the 2026 New Faces of Country Music show in Nashville")
 assert "Amy Harris" in blocks[-3]
 blocks[-3]=NEW_PARA;blocks[-2]=MEDIA
 new="\n\n".join(blocks)
 ps=[x for x in blocks if not x.startswith("[")]
 carriers=[x for x in blocks if x.startswith("[")]
 assert len(ps)==21 and len(carriers)==10
 assert all(80<=len(x.split())<=200 for x in ps),[len(x.split()) for x in ps]
 assert len(new.split("Nashville")) == len(SOURCE_TEXT.split("Nashville"))
 assert new.count(MEDIA)==1 and PREV_MEDIA not in new
 assert new.startswith(SOURCE_TEXT.split(". ")[0]+".")
 assert len(blocks[-1].split())>=80 and blocks[-1]==SOURCE_TEXT.split("\n\n")[-1]
 assert sum("[photo:" in x for x in carriers)==2
 assert not any(a.startswith("[") and b.startswith("[") for a,b in zip(blocks,blocks[1:]))
 changed=[i for i,(a,b) in enumerate(zip(SOURCE_TEXT.split("\n\n"),blocks)) if a!=b]
 assert changed==[28,29],changed
 print("PREPARED","paragraphs",len(ps),"media",len(carriers),"changed_blocks",changed,
       "new_words",sum(len(x.split()) for x in ps),"old_words",
       sum(len(x.split()) for x in SOURCE_TEXT.split("\n\n") if not x.startswith("[")),flush=True)
 return new
def raw(url):
 with urllib.request.urlopen(urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0","Accept":"image/jpeg,*/*"}),timeout=45) as r:return r.read()
def verified_source():
 src=raw(SOURCE)
 im=Image.open(io.BytesIO(src));im.verify()
 im=Image.open(io.BytesIO(src));im.load()
 assert im.size==(1200,800) and im.format=="JPEG" and im.mode=="RGB", (im.size,im.format,im.mode)
 assert 40000<len(src)<1000000
 print("PHOTOGRAPHER_ORIGINAL_CHECKED",im.size,len(src),hashlib.sha256(src).hexdigest(),flush=True)
 return src
def current():
 return runner.http(runner.DESK_API+"?fresh="+str(time.time_ns()),runner.desk_key())
def hosted():
 try:return raw("https://music98.news/photos/"+PHOTO+"?fresh="+str(time.time_ns()))
 except Exception:return None
def upload(src):
 before=hosted()
 if before:
  assert hashlib.sha256(before).digest()==hashlib.sha256(src).digest(),"Refuse filename collision"
  print("PHOTOGRAPH_ALREADY_HOSTED_MATCHES_SOURCE",flush=True)
  return
 val=runner.http("https://music98.news/api/photo",runner.desk_key(),
 {"name":PHOTO,"data":"data:image/jpeg;base64,"+base64.b64encode(src).decode("ascii")},method="POST")
 assert val.get("ok") and val.get("url")=="photos/"+PHOTO,val
 for i in range(12):
  seen=hosted()
  if seen and hashlib.sha256(seen).digest()==hashlib.sha256(src).digest():
   pic=Image.open(io.BytesIO(seen))
   assert pic.size==(1200,800)
   print("PHOTO_BYTE_FOR_BYTE_UPLOADED",pic.size,len(seen),flush=True);return
  time.sleep(2)
 raise RuntimeError("New photographer's file did not propagate")
def digest(v):
 return hashlib.sha256(json.dumps(v,sort_keys=True,ensure_ascii=False,separators=(",",":")).encode()).hexdigest()
def main():
 mode=sys.argv[1] if len(sys.argv)>1 else "--audit"
 assert mode in ("--audit","--save")
 runner.load_env();gate.KEY=runner.desk_key()
 new=prepare()
 before=current();target=runner.find_post(before["posts"],ID)
 assert target["status"]=="draft","Never edit a published article by this script"
 actual=target.get("body","").strip()
 print("DESK_CURRENT",hashlib.sha256(actual.encode()).hexdigest(),"SOURCE_BASELINE",hashlib.sha256(SOURCE_TEXT.encode()).hexdigest(),flush=True)
 assert actual in (SOURCE_TEXT,new),"Owner made newer edits; abort instead of overwriting"
 src=verified_source()
 can=copy.deepcopy(target);can["body"]=new
 if mode=="--audit":
  gate.CHECK_IDS=False
  errors,warnings,_=gate.check_post(can,strict=True)
  unexpected=[e for e in errors if not (e[0]=="card-dead" and PHOTO in str(e[1]))]
  print("READ_ONLY_PREFLIGHT","PASS" if not unexpected else "FAIL", "errors",json.dumps(errors), "warnings",json.dumps(warnings),flush=True)
  assert not unexpected
  print("AUDIT_COMPLETE_NO_DESK_WRITE",flush=True)
  return
 # Draft-only; publisher clearance of copyrighted photographer image is outstanding.
 upload(src)
 gate.CHECK_IDS=True
 errors,warnings,_=gate.check_post(can,strict=True)
 print("PREFLIGHT_AFTER_UPLOAD","PASS" if not errors else "FAIL",json.dumps(errors),json.dumps(warnings),flush=True)
 assert not errors
 if actual!=new:
  previous_others={p["id"]:digest(p) for p in before["posts"] if p["id"]!=ID}
  protected={k:copy.deepcopy(v) for k,v in target.items() if k!="body"}
  read=current()
  assert runner.find_post(read["posts"],ID)==target,"Concurrent owner edit before write"
  runner.find_post(read["posts"],ID)["body"]=new
  runner.http(runner.DESK_API,runner.desk_key(),{"posts":read["posts"]},method="POST")
  for n in range(15):
   now=current()
   fresh=runner.find_post(now["posts"],ID)
   if fresh.get("body","").strip()==new:break
   assert fresh.get("body","").strip()==SOURCE_TEXT,"Unknown concurrent edit"
   time.sleep(2)
  else:raise RuntimeError("Desk write did not propagate")
  assert fresh.get("status")=="draft"
  assert {k:v for k,v in fresh.items() if k!="body"}==protected
  assert {p["id"]:digest(p) for p in now["posts"] if p["id"]!=ID}==previous_others
 else: print("REPEAT_SAVE_CURRENT_DRAFT_ALREADY_MATCHES",flush=True)
 for n in range(3):
  ok,lines=runner.run_gate(ID,quiet=True)
  print("POSTWRITE_EDITORIAL_GATE",n+1,"PASS" if ok else "FAIL",json.dumps(lines[-8:]),flush=True)
  assert ok
 final=runner.find_post(current()["posts"],ID)
 assert final["status"]=="draft" and final["body"].strip()==new
 assert hosted() and hashlib.sha256(hosted()).digest()==hashlib.sha256(src).digest()
 public=runner.http(runner.DESK_API+"?nocache="+str(time.time_ns()))
 assert not any(str(p.get("id"))==ID for p in public.get("posts",[]))
 print("VERIFIED_DRAFT_LAST_PHOTO_CHANGED","photographer","Andrew Wendowski",
       "origin","photographer-own-website","pixels",(1200,800),
       "only_last_photo_and_neighbor_paragraph",True,"published",False,
       "rights_clearance","required",flush=True)
if __name__=="__main__":main()
