#!/usr/bin/env python3
"""Correct only the Ella draft's Andrew photo credit URL to his actual portfolio."""
from __future__ import annotations
import copy,time,sys,hashlib,json
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
import post as run,gate
ID="ella26choosintexas"
OLD="https://musicmayhemmagazine.com/author/awendowskiphoto/"
NEW="https://www.awendowskiphoto.com/"
PHOTO="ella-crs2026-andrew-wendowski-live-guitar-1200.jpg"
def fresh():return run.http(run.DESK_API+"?fresh="+str(time.time_ns()),run.desk_key())
def hashobj(x):return hashlib.sha256(json.dumps(x,ensure_ascii=False,sort_keys=True,separators=(",",":")).encode()).hexdigest()
def main():
 run.load_env();gate.KEY=run.desk_key();gate.CHECK_IDS=True
 before=fresh();post=run.find_post(before["posts"],ID)
 assert post.get("status")=="draft"
 body=post["body"]
 if PHOTO not in body:
  print("CURRENT_PHOTO_WAS_CHANGED_NO_ACTION",flush=True);return
 old="[photo:photos/"+PHOTO+"|Andrew Wendowski|"+OLD+"|50% 50%|1]"
 new="[photo:photos/"+PHOTO+"|Andrew Wendowski|"+NEW+"|50% 50%|1]"
 assert body.count(old)==1 or body.count(new)==1, "Unexpected owner photo format, refuse update"
 if new in body:print("PERSONAL_PORTFOLIO_ALREADY_CORRECT",flush=True);return
 revised=body.replace(old,new)
 assert revised.count(new)==1 and len(revised.split(chr(10)*2))==len(body.split(chr(10)*2))
 original_others={x["id"]:hashobj(x) for x in before["posts"] if x["id"]!=ID}
 keep={k:copy.deepcopy(v) for k,v in post.items() if k!="body"}
 recent=fresh();assert run.find_post(recent["posts"],ID)==post,"Concurrent owner edit"
 run.find_post(recent["posts"],ID)["body"]=revised
 run.http(run.DESK_API,run.desk_key(),{"posts":recent["posts"]},method="POST")
 seen=0
 for i in range(24):
  latest=fresh();target=run.find_post(latest["posts"],ID)
  if target["body"]==revised and target["status"]=="draft":
   seen+=1
   print("FRESH_CORRECT_CREDIT",seen,flush=True)
   if seen==3:break
  else:
   assert target["body"]==body,"Someone else changed draft during credit repair"
   seen=0
  time.sleep(1)
 else:raise RuntimeError("Credit edit not visible 3 times")
 assert {k:v for k,v in target.items() if k!="body"}==keep
 assert {x["id"]:hashobj(x) for x in latest["posts"] if x["id"]!=ID}==original_others
 for n in range(3):
  ok,logs=run.run_gate(ID,quiet=True);print("CREDIT_POSTWRITE_GATE",n+1,ok,flush=True);assert ok
 print("VERIFIED_ANDREW_PERSONAL_PORTFOLIO_CREDIT",NEW,flush=True)
if __name__=="__main__":main()
