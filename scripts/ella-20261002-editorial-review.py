#!/usr/bin/env python3
"""Scoped, guarded Ella draft review + original landscape concert photo replacement.
Modes: --audit (read-only desk+photo QC), --save (write Ella draft only).
Do not publish or modify unrelated posts. Runs in existing editorial GitHub Actions.
"""
from __future__ import annotations
import base64,copy,difflib,hashlib,io,json,sys,time,urllib.request
from pathlib import Path
from PIL import Image,ImageOps
sys.path.insert(0,str(Path(__file__).resolve().parent))
import post as runner,gate

ROOT=Path(__file__).resolve().parents[1]
ID="ella26choosintexas"
OLD=(ROOT/"scripts/ella-oct02-longread-body.txt").read_text(encoding="utf-8").strip()
# Owner's current manual last-photo crop confirmed by authorized desk diff.
# Preserve that edit in the exact expected prewrite snapshot; the final media
# itself is being replaced, so this crop applies only to the stale photo.
OLD=OLD.replace("ella-caylee-2024-cma-guitar-native-3648.jpg|Caylee Robillard|https://www.cayleerobillard.com/|50% 52%|1",
                "ella-caylee-2024-cma-guitar-native-3648.jpg|Caylee Robillard|https://www.cayleerobillard.com/|47.7% 48.2%|1")
NEW=(ROOT/"scripts/ella-20261002-editorial-reviewed-body.txt").read_text(encoding="utf-8").strip()
PHOTO="ella-caylee-2024-cma-duet-landscape.jpg"
SOURCE="https://imgix.bustle.com/uploads/image/2024/7/2/fcd53eef/dsc03118.jpg"
PHOTO_LINK="https://www.elitedaily.com/entertainment/ella-langley-weekend-in-the-life-cma-fest-2024"
NEW_MEDIA="[photo:photos/"+PHOTO+"|Caylee Robillard|https://www.cayleerobillard.com/|43% 45%|1]"

def http_get(url):
 req=urllib.request.Request(url,headers={"User-Agent":runner.UA})
 with urllib.request.urlopen(req,timeout=65) as r:return r.read(),r.headers.get("Content-Type","")
def digest(p):
 return hashlib.sha256(json.dumps(p,sort_keys=True,ensure_ascii=False,separators=(",",":")).encode()).hexdigest()
def read():
 return runner.http(runner.DESK_API+"?nocache="+str(time.time_ns()),runner.desk_key())
def image_source():
 raw,ctype=http_get(SOURCE)
 original=Image.open(io.BytesIO(raw));original.load()
 original=ImageOps.exif_transpose(original).convert("RGB")
 assert original.width>=8192 and original.height>=5400,("Unexpected changed native asset",original.size,ctype)
 # Landscape native photo (already 3:2). Deliberate 16:9 crop with both performers
 # and a small amount of audience foreground; preview before saving.
 crop=ImageOps.fit(original,(3600,2025),method=Image.Resampling.LANCZOS,centering=(.48,.43))
 assert crop.size==(3600,2025)
 out=io.BytesIO();crop.save(out,"JPEG",quality=88,optimize=True)
 if len(out.getvalue())>2_900_000:
  out=io.BytesIO();crop.save(out,"JPEG",quality=82,optimize=True)
 raw=out.getvalue()
 assert 180_000<len(raw)<2_950_000,("Unexpected new photo bytes",len(raw))
 print("PHOTO_SOURCE_CONFIRMED",original.size,"NEW",crop.size,"BYTES",len(raw),"AUTHOR","Caylee Robillard","ATTRIBUTION",PHOTO_LINK,flush=True)
 return raw,crop
def preview(crop):
 a=crop.resize((960,540),Image.Resampling.LANCZOS)
 b=io.BytesIO();a.save(b,"JPEG",quality=82)
 output=ROOT/".editorial/ella-20261002-new-last-photo-preview.b64"
 output.write_text(base64.b64encode(b.getvalue()).decode("ascii"),encoding="ascii")
 print("NEW_CROP_PREVIEW_READY",str(output.relative_to(ROOT)),flush=True)
def media_structure(text):
 a=[x.strip() for x in text.split("\n\n") if x.strip()]
 p=[x for x in a if not x.startswith("[")]
 m=[x for x in a if x.startswith("[")]
 gaps=[];n=0
 for item in a:
  if item.startswith("["):
   gaps.append(n);n=0
  else:n+=1
 gaps.append(n)
 lengths=[len(x.split()) for x in p]
 assert len(p)==21 and len(m)==10 and gaps==([2]*10+[1]),(len(p),len(m),gaps)
 assert all(80<=x<=200 for x in lengths),lengths
 assert NEW_MEDIA==m[-1] and "[youtube:4QIZE708gJ4]" in text
 print("LAYOUT",len(p),"PARAGRAPHS",sum(lengths),"WORDS",len(m),"MEDIA","GAPS",gaps,flush=True)
def hosted():
 try:
  raw,ctype=http_get("https://music98.news/photos/"+PHOTO+"?nocache="+str(time.time_ns()))
  image=Image.open(io.BytesIO(raw)); image.load()
  return raw,image
 except Exception:return None,None
def store(raw):
 old,img=hosted()
 if old:
  if hashlib.sha256(raw).digest()!=hashlib.sha256(old).digest():
   raise RuntimeError("Image filename collision; change PHOTO filename before retry")
  print("IMAGE_PREEXISTS_EXACT_MATCH",img.size,flush=True)
  return
 answer=runner.http("https://music98.news/api/photo",runner.desk_key(),
                    {"name":PHOTO,"data":"data:image/jpeg;base64,"+base64.b64encode(raw).decode()},method="POST")
 assert answer.get("ok") and answer.get("url")=="photos/"+PHOTO,answer
 for i in range(15):
  now,img=hosted()
  if now and hashlib.sha256(raw).digest()==hashlib.sha256(now).digest():
   assert img.size==(3600,2025)
   print("PHOTO_UPLOAD_AND_PIXELS_VERIFIED",img.size,len(now),flush=True)
   return
  time.sleep(2)
 raise RuntimeError("Photo missing or incorrect after upload")

def main():
 mode=sys.argv[1] if len(sys.argv)>1 else "--audit"
 if mode not in ("--audit","--save"):raise RuntimeError("Invalid mode")
 runner.load_env();gate.KEY=runner.desk_key()
 media_structure(NEW)
 before=read()
 old=runner.find_post(before["posts"],ID)
 print("CURRENT_DRAFT",old.get("status"),"CURRENT_BODY_SHA256",hashlib.sha256(old.get("body","").strip().encode()).hexdigest(),
       "BASE_SHA256",hashlib.sha256(OLD.encode()).hexdigest(),"COVER_SHA256",digest(old.get("cover",{})),flush=True)
 print("CURRENT_LAST_MEDIA",[x for x in old.get("body","").splitlines() if x.startswith("[photo:")][-1:],flush=True)
 if old.get("status")!="draft":raise RuntimeError("Ella post is not a draft; stop")
 if old.get("body","").strip()!=OLD:
  print("BODY_CONFLICT_STORED_TEXT_NO_LONGER_MATCHES_MASTER",flush=True)
  difference="\\n".join(difflib.unified_diff(OLD.splitlines(),old.get("body","").strip().splitlines(),fromfile="repo-master",tofile="current-desk",lineterm=""))
  print("OWNER_EDITS_DIFF_BEGIN\\n"+difference+"\\nOWNER_EDITS_DIFF_END",flush=True)
  raise RuntimeError("Need fresh snapshot before editing; no overwriting owner's changes")
 raw,crop=image_source()
 preview(crop)
 if mode=="--audit":
  cand=copy.deepcopy(old);cand["body"]=NEW
  gate.CHECK_IDS=False
  errors,warnings,_=gate.check_post(cand,strict=True)
  print("CANDIDATE_GATE_ERRORS",json.dumps(errors),flush=True)
  print("CANDIDATE_GATE_WARNINGS",json.dumps(warnings),flush=True)
  print("READONLY_AUDIT_COMPLETE",flush=True)
  return
 # Audit and preview crop must have been reviewed separately before running --save.
 store(raw)
 cand=copy.deepcopy(old);cand["body"]=NEW
 gate.CHECK_IDS=True
 errors,warnings,_=gate.check_post(cand,strict=True)
 print("PREFLIGHT_GATE",errors,warnings,flush=True)
 if errors:raise RuntimeError("Candidate rejected before desk write")
 Path("/tmp/ella-editorial-20261002-before.json").write_text(json.dumps(before,ensure_ascii=False),encoding="utf-8")
 others={str(p["id"]):digest(p) for p in before["posts"] if str(p["id"])!=ID}
 protected={k:copy.deepcopy(v) for k,v in old.items() if k!="body"}
 # Guard against simultaneous edits. Preserve all other fields and all other posts.
 fresh=read()
 current=runner.find_post(fresh["posts"],ID)
 if current!=old:raise RuntimeError("Owner edited Ella during preparation; abort")
 for p in fresh["posts"]:
  if str(p.get("id"))==ID:
   p["body"]=NEW
   break
 runner.http(runner.DESK_API,runner.desk_key(),{"posts":fresh["posts"]},method="POST")
 after=read()
 target=runner.find_post(after["posts"],ID)
 assert target["body"].strip()==NEW and target["status"]=="draft"
 assert {k:v for k,v in target.items() if k!="body"}==protected
 assert {str(p["id"]):digest(p) for p in after["posts"] if str(p["id"])!=ID}==others
 print("POSTWRITE_DRAFT_VERIFIED",True,"OTHER_POSTS_UNCHANGED",True,"BODY_SHA256",hashlib.sha256(NEW.encode()).hexdigest(),"PHOTO",PHOTO,flush=True)
 for i in range(3):
  good,lines=runner.run_gate(ID,quiet=True)
  print("GATE_REPEAT",i+1,"PASS" if good else "FAIL",json.dumps(lines,ensure_ascii=True),flush=True)
  if not good:raise RuntimeError("Postwrite editorial gate failed")
 public=runner.http(runner.DESK_API+"?nocache="+str(time.time_ns()))
 assert not any(str(p.get("id"))==ID for p in public.get("posts",[]))
 print("ELLA_DRAFT_ONLY_CONFIRMED",flush=True)
if __name__=="__main__":main()
