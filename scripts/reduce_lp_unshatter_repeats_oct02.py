#!/usr/bin/env python3
"""Remove redundant full documentary title repetitions, editing current LP live body only."""
from __future__ import annotations
import copy, hashlib, json, sys, time
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
import post as runner, gate
import revise_lp_context_20261002 as prev
ID=prev.ID
OLD=prev.BODY
assert OLD.count("*UNSHATTER*")==3
BODY=OLD.replace(
 "The same show provides most of the live footage in *UNSHATTER*, which moves between the concert, studio sessions and interviews.",
 "That performance anchors the documentary, which also includes studio sessions and interviews."
).replace(
 "*UNSHATTER* follows that process from private studio sessions in 2022 through the writing of *FROM ZERO* and the band's renewed relationship with audiences.",
 "The film follows that process from private studio sessions in 2022 through the writing of *FROM ZERO* and the band's renewed relationship with audiences."
)
assert BODY != OLD and BODY.count("UNSHATTER")==2, BODY.count("UNSHATTER")
assert BODY.count("[youtube:zNYsw-cW8v8]")==1
assert len([p for p in BODY.split("\n\n") if p])==7
def read():
 return runner.http(runner.DESK_API+"?nocache="+str(time.time_ns()),runner.desk_key())
def fp(v):
 return hashlib.sha256(json.dumps(v,sort_keys=True,ensure_ascii=False).encode()).hexdigest()
def main():
 runner.load_env();runner.desk_read=read;gate.KEY=runner.desk_key();gate.CHECK_IDS=True
 before=read()
 old=runner.find_post(before["posts"],ID)
 if old.get("body")!=OLD or old.get("status")!="live":
  raise RuntimeError("LP live copy changed: no overwrite")
 updated=copy.deepcopy(old);updated["body"]=BODY
 fails,warns,_=gate.check_post(updated,strict=True)
 print("LP_TITLE_AUDIT","OLD",OLD.count("UNSHATTER"),"NEW",BODY.count("UNSHATTER"),"STATUS",old.get("status"),"FAILS",json.dumps(fails,ensure_ascii=True),"WARNINGS",json.dumps(warns,ensure_ascii=True),flush=True)
 if fails:raise RuntimeError("Gate failure")
 if len(sys.argv)<2 or sys.argv[1]=="--audit":
  print("LP_TITLE_AUDIT_ONLY_PASS",flush=True);return
 if sys.argv[1]!="--save":raise RuntimeError("invalid mode")
 protected={k:copy.deepcopy(v) for k,v in old.items() if k!="body"}
 others={str(p["id"]):fp(p) for p in before["posts"] if p.get("id")!=ID}
 def mutate(posts):
  p=runner.find_post(posts,ID)
  if p.get("body")!=OLD or p.get("status")!="live" or {k:v for k,v in p.items() if k!="body"}!=protected:
   raise RuntimeError("LP changed while preparing; no overwrite")
  p["body"]=BODY
  return copy.deepcopy(p)
 saved=runner.guarded_write(mutate)
 assert saved["body"]==BODY
 after=read()
 assert {str(p["id"]):fp(p) for p in after["posts"] if p.get("id")!=ID}==others
 for i in range(1,4):
  ok,lines=runner.run_gate(ID,quiet=True)
  print("LP_TITLE_POSTWRITE",i,"PASS" if ok else "FAIL",json.dumps(lines,ensure_ascii=True),flush=True)
  if not ok:raise RuntimeError("Postwrite validation failed")
 final=runner.find_post(read()["posts"],ID)
 assert final["body"]==BODY and final["status"]=="live"
 print("LP_TITLE_LIVE_VERIFIED","OLD",OLD.count("UNSHATTER"),"NEW",BODY.count("UNSHATTER"),"OTHER_POSTS_UNCHANGED",True,flush=True)
if __name__=="__main__":main()
