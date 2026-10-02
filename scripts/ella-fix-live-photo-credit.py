#!/usr/bin/env python3
"""Remove publisher URL from the existing Ella live photo caption, leaving only
'Photo: Miriam Visser'. No image pixels, crop settings, other prose, cover,
other posts, or publication status are modified.
"""
import copy,hashlib,json,time
from pathlib import Path
import post as runner,gate
HERE=Path(__file__).resolve().parent
ID="ella26choosintexas"
OLD=(HERE/"ella-20261002-all-originals-final-body.txt").read_text("utf8").strip()
NEW=(HERE/"ella-20261002-miriam-credit-temporary-corrected.txt").read_text("utf8").strip()
EXPECTED_OLD="[photo:photos/ella-bluesfest-2026-miriam-visser-full-original.jpg|Miriam Visser|https://charlatan.ca/bluesfest-ella-langley-angine-de-poitrine-night-seven/|50% 50%|1]"
EXPECTED_NEW="[photo:photos/ella-bluesfest-2026-miriam-visser-full-original.jpg|Miriam Visser||50% 50%|1]"
assert OLD.count(EXPECTED_OLD)==1 and OLD.replace(EXPECTED_OLD,EXPECTED_NEW)==NEW
def get():return runner.http(runner.DESK_API+"?timestamp="+str(time.time_ns()),runner.desk_key())
def sig(x):return hashlib.sha256(json.dumps(x,sort_keys=True,ensure_ascii=False,separators=(",",":")).encode()).hexdigest()
def main():
 runner.load_env();gate.KEY=runner.desk_key()
 before=get();old=runner.find_post(before["posts"],ID)
 assert old["status"]=="draft"
 actual=old["body"].strip()
 print("ACTUAL_SHA",hashlib.sha256(actual.encode()).hexdigest(),"BASE_SHA",hashlib.sha256(OLD.encode()).hexdigest(),flush=True)
 if actual==NEW:
  print("ALREADY_CORRECTED",flush=True)
 elif actual!=OLD:raise RuntimeError("Owner changed Ella draft. Abort to protect manual edits.")
 else:
  cand=copy.deepcopy(old);cand["body"]=NEW
  gate.CHECK_IDS=True
  errors,warnings,_=gate.check_post(cand,strict=True)
  print("PREWRITE_GATE",json.dumps(errors),flush=True)
  assert not errors
  protected={k:copy.deepcopy(v) for k,v in old.items() if k!="body"}
  others={str(p["id"]):sig(p) for p in before["posts"] if str(p["id"])!=ID}
  now=get()
  assert runner.find_post(now["posts"],ID)==old
  runner.find_post(now["posts"],ID)["body"]=NEW
  runner.http(runner.DESK_API,runner.desk_key(),{"posts":now["posts"]},method="POST")
  for i in range(10):
   check=get();target=runner.find_post(check["posts"],ID)
   if target["body"].strip()==NEW:break
   if target["body"].strip()!=OLD:raise RuntimeError("Unexpected owner edit during save")
   time.sleep(2)
  else:raise RuntimeError("New credit not visible")
  assert {k:v for k,v in target.items() if k!="body"}==protected
  assert {str(p["id"]):sig(p) for p in check["posts"] if str(p["id"])!=ID}==others
  print("ONLY_ELLA_CAPTION_CHANGED",True,flush=True)
 for i in range(3):
  good,lines=runner.run_gate(ID,quiet=True)
  print("GATE",i+1,"PASS" if good else "FAIL",json.dumps(lines,ensure_ascii=True),flush=True)
  if not good:raise RuntimeError("Caption validation failed")
 final=runner.find_post(get()["posts"],ID)
 assert final["body"].strip()==NEW and final["status"]=="draft"
 public=runner.http(runner.DESK_API+"?timestamp="+str(time.time_ns()))
 assert not any(str(p.get("id"))==ID for p in public.get("posts",[]))
 print("FINAL_CREDIT_ONLY_MIRIAM_VISSSER",True,"DRAFT_ONLY",True,flush=True)
if __name__=="__main__":main()
