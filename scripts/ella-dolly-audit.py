#!/usr/bin/env python3
import urllib.request,json,hashlib,sys,time
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
import post
post.load_env()
src=Path(__file__).with_name("ella-oct02-longread-body.txt").read_text("utf-8").strip()
q="https://itunes.apple.com/lookup?id=1062400323&entity=song&country=us"
try:
 req=urllib.request.Request(q,headers={"User-Agent":"Mozilla/5.0","Accept":"application/json"})
 data=json.loads(urllib.request.urlopen(req,timeout=25).read())
 for v in data.get("results",[]):
  if v.get("kind")=="song" and "jolene" in v.get("trackName","").lower():
   print("APPLE_DOLLY",json.dumps({k:v.get(k) for k in ("collectionId","trackId","trackName","artistName","trackViewUrl")}),flush=True)
except Exception as e:print("APPLE_ERROR",str(e),flush=True)
desk=post.http(post.DESK_API+"?nocache="+str(time.time_ns()),post.desk_key())
p=next((p for p in desk.get("posts",[]) if p.get("id")=="ella26choosintexas"),None)
print("DRAFT_FOUND",bool(p))
if p:
 live=(p.get("body") or "").strip()
 print("DRAFT_STATUS",p.get("status"),"BODY_MATCHES_REPO",live==src)
 print("DRAFT_BODY_HASH",hashlib.sha256(live.encode()).hexdigest(),"REPO_BODY_HASH",hashlib.sha256(src.encode()).hexdigest())
 print("DRAFT_MEDIA",[(i,x[:250]) for i,x in enumerate(live.split("\n\n")) if x.startswith("[")],flush=True)
 if live!=src or p.get("status")!="draft":raise RuntimeError("Current draft does not match reviewed native-photo master")
 assert p.get("cover",{}).get("credit")=="Caylee Robillard"
 assert p.get("cover",{}).get("creditUrl")=="https://www.cayleerobillard.com/"
 assert "ella-caylee-2024-cma-guitar-native-3648.jpg" in live
 assert "ella-crs2026-guitar-amy-harris.jpg" not in live
 assert live.count("Nashville")==2
 for k in range(1,4):
  ok,lines=post.run_gate("ella26choosintexas",quiet=True)
  print("FINAL_EDITORIAL_GATE",k,"PASS" if ok else "FAIL","RELEVANT",json.dumps([v for v in lines if "PASS" in v or "FAIL" in v or "media-late" in v]),flush=True)
  if not ok:raise RuntimeError("Current saved native-photo draft gate failed")
 public=post.http(post.DESK_API+"?fresh="+str(time.time_ns()))
 assert not any(str(x.get("id"))=="ella26choosintexas" for x in public.get("posts",[]))
 print("FINAL_NATIVE_ELLA_DRAFT_VALIDATED",len(live.split()),"WORDS","TWO_NASHVILLE",True,"GUITAR_PHOTOGRAPH",True,"PUBLIC",False,flush=True)

