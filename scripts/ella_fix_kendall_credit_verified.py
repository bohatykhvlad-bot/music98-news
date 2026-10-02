#!/usr/bin/env python3
"""Replace guessed Instagram in the existing private Ella draft with photographer's own project IG.
Do not change image, composition, article copy, or publication state.
Kendall Vowels identification: Holler/Outside Organisation for original BST July 2024 photo.
Own creative account identification: 2023 Destinations Beyond Expectations podcast names
Kendall Vowels as creator of The Traveller's Timelapse and links its Instagram.
"""
import copy,hashlib,json,re,sys,time
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
import post as runner,gate
ID="ella26choosintexas"
PIC="photos/ella-bst-2024-kendall-vowels-original-2900.jpg"
INCORRECT="https://www.instagram.com/kendallvowels/"
VERIFIED="https://www.instagram.com/thetravellerstimelapse/"
OLD=f"[photo:{PIC}|Kendall Vowels|{INCORRECT}|50% 47%|1]"
NEW=f"[photo:{PIC}|Kendall Vowels|{VERIFIED}|50% 47%|1]"
def sig(p): return hashlib.sha256(json.dumps(p,sort_keys=True,ensure_ascii=False,separators=(",",":")).encode()).hexdigest()
def get(): return runner.http(runner.DESK_API+"?source_check="+str(time.time_ns()),runner.desk_key())
def main():
 runner.load_env()
 before=get(); p=runner.find_post(before["posts"],ID)
 assert p.get("status")=="draft","Refuse to edit a published post"
 body=p["body"].strip(); parts=body.split("\n\n")
 assert len(parts)==31 and parts[29] in (OLD,NEW),"Owner changed closing photo; abort"
 assert "BST Hyde Park" in parts[28] and "2024" in parts[28],"Closing event prose changed; abort"
 if parts[29]==NEW:
  print("ALREADY_CORRECT_VERIFIED_PHOTOGRAPHER_IG",VERIFIED,flush=True)
  return
 assert body.count(OLD)==1
 proposed=body.replace(OLD,NEW)
 assert proposed.count(NEW)==1 and proposed.count(OLD)==0
 candidate=copy.deepcopy(p);candidate["body"]=proposed
 gate.KEY=runner.desk_key()
 errs,warnings,_=gate.check_post(candidate,strict=True)
 assert not errs, errs
 unaffected={str(q["id"]):sig(q) for q in before["posts"] if str(q.get("id"))!=ID}
 keep={k:copy.deepcopy(v) for k,v in p.items() if k!="body"}
 fresh=get();old=runner.find_post(fresh["posts"],ID)
 assert old==p,"Concurrent modification; abort"
 runner.find_post(fresh["posts"],ID)["body"]=proposed
 runner.http(runner.DESK_API,runner.desk_key(),{"posts":fresh["posts"]},method="POST")
 for attempt in range(1,13):
  time.sleep(2)
  curr=get();cp=runner.find_post(curr["posts"],ID)
  if cp["body"].strip()!=proposed:
   if cp["body"].strip()!=body:raise AssertionError("Concurrent owner edit; investigate")
   continue
  assert {k:v for k,v in cp.items() if k!="body"}==keep
  assert {str(q["id"]):sig(q) for q in curr["posts"] if str(q.get("id"))!=ID}==unaffected
  if attempt<3:continue
  print("SUCCESS_CORRECTED_CURRENT_DRAFT_PHOTO_IG",VERIFIED,"READBACK",attempt,"DRAFT_ONLY","OTHER_POSTS_UNCHANGED",flush=True)
  return
 raise AssertionError("Draft post-write verification timed out")
if __name__=="__main__":main()
