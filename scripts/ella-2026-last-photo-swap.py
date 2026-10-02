#!/usr/bin/env python3
"""Replace only the existing Ella draft's last media and adjacent paragraph.
Use real full-resolution official 2026 Sony Music press original and exact 16:9
composition reviewed visually. --audit read-only; --save guarded draft update.
"""
from __future__ import annotations
import base64,copy,difflib,hashlib,io,json,sys,time,urllib.request
from pathlib import Path
from PIL import Image,ImageOps,ImageCms
sys.path.insert(0,str(Path(__file__).resolve().parent))
import post as runner,gate

HERE=Path(__file__).resolve().parent
ID="ella26choosintexas"
PREVIOUS=(HERE/"ella-20261002-editorial-reviewed-body.txt").read_text("utf-8").strip()
NEXT=(HERE/"ella-20261002-final-photo-2026-body.txt").read_text("utf-8").strip()
PHOTO="ella-caylee-dandelion-2026-final-landscape.jpg"
SOURCE="https://prowly-prod.s3.eu-west-1.amazonaws.com/uploads/landing_page_image/image/670237/c17d81243d0803daafa4cf95b07cc51c.jpg"
EXPECTED_MEDIA="[photo:photos/"+PHOTO+"|Caylee Robillard|https://www.cayleerobillard.com/|50% 50%|1]"
EXPECTED_OLD_MEDIA="[photo:photos/ella-caylee-2024-cma-duet-landscape.jpg|Caylee Robillard|https://www.cayleerobillard.com/|43% 45%|1]"

def request_binary(url):
 req=urllib.request.Request(url,headers={"User-Agent":runner.UA})
 with urllib.request.urlopen(req,timeout=60) as res:
  return res.read(),res.headers.get("Content-Type","")
def read():
 return runner.http(runner.DESK_API+"?nocache="+str(time.time_ns()),runner.desk_key())
def digest(obj):
 return hashlib.sha256(json.dumps(obj,ensure_ascii=False,sort_keys=True,separators=(",",":")).encode()).hexdigest()
def structure():
 blocks=[s.strip() for s in NEXT.split("\n\n") if s.strip()]
 paras=[s for s in blocks if not s.startswith("[")]
 media=[s for s in blocks if s.startswith("[")]
 gaps=[];n=0
 for item in blocks:
  if item.startswith("["):gaps.append(n);n=0
  else:n+=1
 gaps.append(n)
 assert len(paras)==21 and len(media)==10 and gaps==[2]*10+[1]
 assert all(80<=len(x.split())<=200 for x in paras)
 assert media[-1]==EXPECTED_MEDIA
 assert EXPECTED_OLD_MEDIA in PREVIOUS and EXPECTED_OLD_MEDIA not in NEXT
 assert NEXT.startswith(PREVIOUS.split(". ")[0]+".")
 # Only the immediately preceding paragraph and final image are changed.
 original=PREVIOUS.split("\n\n");updated=NEXT.split("\n\n")
 modified=[i for i,(a,b) in enumerate(zip(original,updated)) if a!=b]
 assert len(original)==len(updated) and modified==[len(original)-3,len(original)-2],modified
 print("LAYOUT_PASS",len(paras),"PARAGRAPHS",sum(len(x.split()) for x in paras),
       "PROSE_WORDS",len(media),"MEDIA","CHANGED_BLOCKS",modified,flush=True)
def source_crop():
 raw,ctype=request_binary(SOURCE)
 original=Image.open(io.BytesIO(raw)); original.load()
 assert original.size==(2730,3631) and original.mode=="RGB" and original.format=="JPEG",(original.size,original.mode,original.format,ctype)
 im=ImageOps.exif_transpose(original)
 # Preserve original pixels; output is a strict crop, never enlarged.
 # If color-managed, normalize to sRGB for browser color consistency.
 icc=im.info.get("icc_profile")
 if icc:
  try:
   srcprofile=ImageCms.ImageCmsProfile(io.BytesIO(icc))
   im=ImageCms.profileToProfile(im,srcprofile,ImageCms.createProfile("sRGB"),outputMode="RGB")
  except Exception as e: raise RuntimeError("Unverified embedded color profile: "+str(e))
 else:im=im.convert("RGB")
 crop=ImageOps.fit(im,(2730,1536),method=Image.Resampling.LANCZOS,centering=(.5,.4))
 out=io.BytesIO();crop.save(out,"JPEG",quality=92,optimize=True)
 data=out.getvalue()
 if len(data)>2_850_000:
  out=io.BytesIO();crop.save(out,"JPEG",quality=88,optimize=True)
  data=out.getvalue()
 assert crop.size==(2730,1536) and 150_000<len(data)<2_900_000,(crop.size,len(data))
 check=Image.open(io.BytesIO(data));check.load();assert check.size==(2730,1536)
 print("SOURCE_VERIFIED","SOURCE",original.size,"ORIGINAL_BYTES",len(raw),
       "RESULT",check.size,"RESULT_BYTES",len(data),"NO_UPSCALE",True,
       "SONY_PRESS_ORIGINAL",SOURCE,flush=True)
 return data,crop
def hosted():
 try:
  raw,ctype=request_binary("https://music98.news/photos/"+PHOTO+"?fresh="+str(time.time_ns()))
  img=Image.open(io.BytesIO(raw));img.load()
  return raw,img
 except Exception:return None,None
def upload(data):
 old,im=hosted()
 if old:
  if hashlib.sha256(old).digest()!=hashlib.sha256(data).digest():
   raise RuntimeError("Filename collision, not overwriting existing image")
  print("EXISTING_IMAGE_IDENTICAL",im.size,flush=True);return
 result=runner.http("https://music98.news/api/photo",runner.desk_key(),
    {"name":PHOTO,"data":"data:image/jpeg;base64,"+base64.b64encode(data).decode("ascii")},method="POST")
 assert result.get("ok") and result.get("url")=="photos/"+PHOTO,result
 for _ in range(12):
  now,im=hosted()
  if now and hashlib.sha256(now).digest()==hashlib.sha256(data).digest():
   assert im.size==(2730,1536)
   print("NEW_IMAGE_LIVE_HASH_VERIFIED",im.size,len(now),flush=True);return
  time.sleep(2)
 raise RuntimeError("New image missing or altered after upload")
def main():
 mode=sys.argv[1] if len(sys.argv)>1 else "--audit"
 assert mode in ("--audit","--save")
 runner.load_env();gate.KEY=runner.desk_key()
 structure()
 before=read()
 target=runner.find_post(before["posts"],ID)
 assert target["status"]=="draft","Refuse changes to non-draft Ella article"
 actual=target.get("body","").strip()
 print("CURRENT_BODY_SHA",hashlib.sha256(actual.encode()).hexdigest(),
       "EXPECTED_PREVIOUS",hashlib.sha256(PREVIOUS.encode()).hexdigest(),flush=True)
 if actual==NEXT:
  print("ALREADY_UPDATED_DRAFT_DETECTED",flush=True)
  data,_=source_crop()
  hostedraw,hostimg=hosted()
  assert hostedraw and hashlib.sha256(hostedraw).digest()==hashlib.sha256(data).digest()
  assert hostimg.size==(2730,1536)
  for i in range(3):
   ok,lines=runner.run_gate(ID,quiet=True)
   print("EXISTING_DRAFT_GATE",i+1,"PASS" if ok else "FAIL",json.dumps(lines,ensure_ascii=True),flush=True)
   if not ok:raise RuntimeError("Existing updated Ella draft fails editorial gate")
  public=runner.http(runner.DESK_API+"?nocache="+str(time.time_ns()))
  assert not any(str(x.get("id"))==ID for x in public.get("posts",[]))
  print("FINAL_2026_IMAGE_AND_ELLA_DRAFT_CONFIRMED",PHOTO,(2730,1536),
        "EXISTING_ALREADY_SAVED",True,"PUBLISHED",False,flush=True)
  return
 if actual!=PREVIOUS:
  print("CONCURRENT_OWNER_EDITS_DIFF_BEGIN",flush=True)
  print("\n".join(difflib.unified_diff(PREVIOUS.splitlines(),actual.splitlines(),fromfile="previous-reviewed",tofile="actual-desk",lineterm="")),flush=True)
  raise RuntimeError("Abort: actual Ella draft differs from reviewed snapshot; protect owner's edits")
 photo,crop=source_crop()
 if mode=="--audit":
  sample=crop.resize((960,540),Image.Resampling.LANCZOS)
  out=io.BytesIO();sample.save(out,"JPEG",quality=75)
  file=HERE.parent/".editorial/ella-2026-selected-final-photo-preview.b64"
  file.parent.mkdir(exist_ok=True)
  file.write_text(base64.b64encode(out.getvalue()).decode(),encoding="ascii")
  candidate=copy.deepcopy(target);candidate["body"]=NEXT
  gate.CHECK_IDS=False
  fails,warnings,_=gate.check_post(candidate,strict=True)
  # New photo will return card-dead until uploaded; all other failures block.
  unrelated=[e for e in fails if not (e[0]=="card-dead" and PHOTO in str(e[1]))]
  print("PREWRITE_AUDIT","PASS" if not unrelated else "FAIL",
        "ERRORS",json.dumps(fails),"WARNINGS",json.dumps(warnings),flush=True)
  if unrelated:raise RuntimeError("Non-photo prewrite editorial failures")
  print("READONLY_SELECTED_CROP_VERIFIED",file,flush=True);return
 upload(photo)
 cand=copy.deepcopy(target);cand["body"]=NEXT
 gate.CHECK_IDS=True
 fails,warns,_=gate.check_post(cand,strict=True)
 print("PREFLIGHT_GATES",json.dumps(fails),json.dumps(warns),flush=True)
 if fails:raise RuntimeError("Prewrite gate failed")
 backup=Path("/tmp/ella-before-new-last-photo-20261002.json")
 backup.write_text(json.dumps(before,ensure_ascii=False),encoding="utf-8")
 otherhash={str(p["id"]):digest(p) for p in before["posts"] if str(p["id"])!=ID}
 protected={k:copy.deepcopy(v) for k,v in target.items() if k!="body"}
 def update(posts):
  p=runner.find_post(posts,ID)
  if p!=target:raise RuntimeError("Concurrent edit: abort")
  p["body"]=NEXT
  return copy.deepcopy(p)
 saved=runner.guarded_write(update)
 if saved.get("body","").strip()!=NEXT:
  print("DESK_RETURN_MAY_BE_STALE_AFTER_WRITE; checking fresh cache-busted reads",flush=True)
 for attempt in range(12):
  after=read();post=runner.find_post(after["posts"],ID)
  if post.get("body","").strip()==NEXT and post.get("status")=="draft":
   print("DESK_PROPAGATION_CONFIRMED","ATTEMPT",attempt+1,flush=True)
   break
  if post.get("body","").strip()!=PREVIOUS:
   raise RuntimeError("Unexpected owner body changes during propagation")
  time.sleep(2)
 else:raise RuntimeError("New draft content not visible after guarded POST")
 assert {k:v for k,v in post.items() if k!="body"}==protected
 assert {str(p["id"]):digest(p) for p in after["posts"] if str(p["id"])!=ID}==otherhash
 for i in range(3):
  ok,lines=runner.run_gate(ID,quiet=True)
  print("POSTWRITE_GATE",i+1,"PASS" if ok else "FAIL",
        json.dumps(lines,ensure_ascii=True),flush=True)
  if not ok:raise RuntimeError("Postwrite editorial gate failed")
 final=runner.find_post(read()["posts"],ID)
 assert final["status"]=="draft" and final["body"].strip()==NEXT
 public=runner.http(runner.DESK_API+"?nocache="+str(time.time_ns()))
 assert not any(str(x.get("id"))==ID for x in public.get("posts",[]))
 print("FINAL_2026_IMAGE_AND_ELLA_DRAFT_CONFIRMED",PHOTO,(2730,1536),
       "OTHER_POSTS_UNCHANGED",True,"COVER_AND_OTHER_FIELDS_UNCHANGED",True,"PUBLISHED",False,
       flush=True)
if __name__=="__main__":main()
