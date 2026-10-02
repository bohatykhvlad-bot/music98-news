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
