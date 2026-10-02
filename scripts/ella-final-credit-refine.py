#!/usr/bin/env python3
"""Narrow Ella draft cleanup after final upload. Requires exact source-body equality."""
from __future__ import annotations
import copy,hashlib,json,sys,time
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
import post as runner,gate
ID="ella26choosintexas"
OLD=(Path(__file__).resolve().parent/"ella-oct02-longread-body.txt").read_text("utf-8").strip()
ORIGINAL="Together, their audiences make the familiar division between a country listener and an ordinary pop listener increasingly difficult to maintain."
EDITED="Their combined audiences increasingly blur the division between country and mainstream pop listeners."
SITE="https://thetraveladdict.com/continents/northamerica/new-faces-of-country-music-show-shines-at-crs-2026-with-breakout-performances-and-industry-honors/"
PORTFOLIO="https://www.amyharrisphotos.com/bio"
assert ORIGINAL in OLD and SITE in OLD
BODY=OLD.replace(ORIGINAL,EDITED).replace(SITE,PORTFOLIO)
def get():return runner.http(runner.DESK_API+"?fresh="+str(time.time_ns()),runner.desk_key())
def digest(x):return hashlib.sha256(json.dumps(x,sort_keys=True,ensure_ascii=False,separators=(",",":")).encode()).hexdigest()
def audit(candidate):
 a=[x.strip() for x in BODY.split("\n\n") if x.strip()]
 w=[len(x.split()) for x in a if not x.startswith("[")]
 gap=[];n=0
 for x in a:
  if x.startswith("["):gap.append(n);n=0
  else:n+=1
 gap.append(n)
 assert gap==[2]*10+[0],gap
 assert all(80<=m<=200 for m in w),w
 assert "[photo:photos/ella-crs2026-guitar-amy-harris.jpg|Amy Harris|"+PORTFOLIO in a[-1]
 assert "[apple:song:1062400323:1062400330]" in BODY
 assert "[youtube:4QIZE708gJ4]" in BODY and "post-malone-morgan-wallen-official-bts" not in BODY
 gate.CHECK_IDS=True;fails,warns,_=gate.check_post(candidate,strict=True)
 print("QC_GATE","PASS" if not fails else "FAIL","ERRORS",json.dumps(fails),"WARNINGS",json.dumps(warns),flush=True)
 if fails:raise RuntimeError("Candidate gate failed")
 print("QC_BODY",sum(w),"PROSE WORDS","MEDIA",len(a)-len(w),"GAPS",gap,flush=True)
def main():
 runner.load_env();runner.desk_read=get;gate.KEY=runner.desk_key()
 before=get();old=runner.find_post(before["posts"],ID)
 if old.get("status")!="draft" or old.get("body","").strip()!=OLD:raise RuntimeError("Ella draft no longer matches inspected master: no changes")
 candidate=copy.deepcopy(old);candidate["body"]=BODY
 audit(candidate)
 if len(sys.argv)<2 or sys.argv[1]=="--audit":print("READONLY_PASS",flush=True);return
 if sys.argv[1]!="--save":raise RuntimeError("Unsupported mode")
 Path("/tmp/ella-finale-before-credit-refine.json").write_text(json.dumps(before,ensure_ascii=False),encoding="utf8")
 other={str(p["id"]):digest(p) for p in before["posts"] if str(p["id"])!=ID}
 protected={k:copy.deepcopy(v) for k,v in old.items() if k!="body"}
 def mutate(posts):
  p=runner.find_post(posts,ID)
  if p.get("status")!="draft" or p.get("body","").strip()!=OLD or {k:v for k,v in p.items() if k!="body"}!=protected:raise RuntimeError("Draft edited while preparing")
  p["body"]=BODY;return copy.deepcopy(p)
 now=runner.guarded_write(mutate)
 assert now["status"]=="draft" and now["body"]==BODY
 after=get()
 assert {str(p["id"]):digest(p) for p in after["posts"] if str(p["id"])!=ID}==other
 for i in range(1,4):
  ok,lines=runner.run_gate(ID,quiet=True);print("GATE",i,"PASS" if ok else "FAIL",json.dumps(lines),flush=True)
  if not ok:raise RuntimeError("Gate failed after save")
 final=runner.find_post(get()["posts"],ID)
 assert final["body"]==BODY and final["status"]=="draft" and final["cover"]==old["cover"]
 print("ELLA_FINAL_REFINEMENT_VERIFIED","NEW_BODY_SHA",hashlib.sha256(BODY.encode()).hexdigest(),"UNCHANGED_OTHER_POSTS",True,flush=True)
if __name__=="__main__":main()
