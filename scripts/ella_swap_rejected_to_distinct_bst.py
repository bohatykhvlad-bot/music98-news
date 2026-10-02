#!/usr/bin/env python3
"""Replace user's REJECTED Ella CMA-2024 still with DISTINCT full-resolution BST Hyde Park guitar photo.
Only existing unpublished Ella Draft. Preserve all original bytes, all other blocks and posts.
Unlicensed press handout remains in private draft until rights are verified for publication.
"""
from __future__ import annotations
import base64,copy,hashlib,io,json,time,urllib.request,sys
from pathlib import Path
from PIL import Image
sys.path.insert(0,str(Path(__file__).resolve().parent))
import post as runner,gate
ID="ella26choosintexas"
PHOTO="ella-bst-2024-kendall-vowels-original-2900.jpg"
URL="https://cdn.sanity.io/images/o6uq28nb/production/259331ea649293476d99429d614607c27da55c62-2900x1936.jpg"
CHECK="4960e2cbf6cff89a41581eab06ccc71d2a4561e3a058088084bc048628add2ba"
CREDIT="https://www.instagram.com/kendallvowels/"
MEDIA="[photo:photos/"+PHOTO+"|Kendall Vowels|"+CREDIT+"|50% 47%|1]"
REJECTED="ella-caylee-cma-2024-acoustic-native.jpg"
PARA=("An earlier stage photograph offers a different view of the musician behind this success. At BST Hyde Park "
"in London in 2024, Langley appeared before a crowd with an acoustic guitar and her name stitched into "
"its strap. Festival photographer Kendall Vowels captured her at the microphone in front of the open-air "
"stage, with the full instrument visible rather than disappearing into a tight portrait crop. The photograph "
"comes from the performances that preceded her mainstream breakthrough; it is not a picture from the 2026 "
"Dandelion Tour. It nevertheless shows the live performer who built her following well before \"Choosin' Texas\" "
"took off. The composition lets the guitar and her voice share the frame, bringing the article back to the "
"music and the way she presents it to an audience.")
def sha(x):return hashlib.sha256(x).hexdigest()
def fingerprint(x):return sha(json.dumps(x,sort_keys=True,ensure_ascii=False,separators=(",",":")).encode())
def get_bytes(url):
 with urllib.request.urlopen(urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0","Accept":"image/jpeg,*/*"}),timeout=65) as r:return r.read()
def desk():return runner.http(runner.DESK_API+"?fresh="+str(time.time_ns()),runner.desk_key())
def original():
 data=get_bytes(URL);im=Image.open(io.BytesIO(data));im.verify()
 im=Image.open(io.BytesIO(data));im.load()
 assert im.size==(2900,1936) and im.format=="JPEG" and sha(data)==CHECK,(im.size,sha(data))
 assert len(data)<2850000
 print("DISTINCT_NEW_BST_NATIVE_SOURCE",(im.width,im.height),"BYTES",len(data),"SHA",sha(data),flush=True)
 return data
def hosted():
 try:return get_bytes("https://music98.news/photos/"+PHOTO+"?fresh="+str(time.time_ns()))
 except Exception:return None
def ensure_uploaded(blob):
 old=hosted()
 if old:
  assert sha(old)==CHECK,"Refuse hosted file collision"
  print("ALREADY_UPLOADED_SAME_HASH",flush=True);return
 resp=runner.http("https://music98.news/api/photo",runner.desk_key(),
  {"name":PHOTO,"data":"data:image/jpeg;base64,"+base64.b64encode(blob).decode()},method="POST")
 assert resp.get("ok") and resp.get("url")=="photos/"+PHOTO,resp
 for _ in range(12):
  check=hosted()
  if check and sha(check)==CHECK:
   im=Image.open(io.BytesIO(check));assert im.size==(2900,1936)
   print("NATIVE_UNCROPPED_FILE_ON_SITE",im.size,"HASH",sha(check),flush=True);return
  time.sleep(2)
 raise RuntimeError("Uploaded file not publicly verifiable yet")
def mutate_current(body):
 b=body.strip().split(chr(10)*2)
 assert len(b)==31,("Article structure changed; refuse overwrite",len(b))
 if MEDIA==b[29]:
  assert "Kendall Vowels" in b[28]
  return body.strip()
 assert REJECTED in b[29],"Owner already changed photo; abort without overriding"
 assert b[28].startswith("Long before the summer when"),"Owner changed paragraph; abort"
 before=b[:]
 b[28]=PARA;b[29]=MEDIA
 changes=[i for i,(x,y) in enumerate(zip(before,b)) if x!=y]
 assert changes==[28,29],changes
 ps=[v for v in b if not v.startswith("[")]
 ms=[v for v in b if v.startswith("[")]
 assert len(ps)==21 and len(ms)==10 and all(80<=len(x.split())<=200 for x in ps),[len(x.split()) for x in ps]
 assert b[30]==before[30] and b[:28]==before[:28]
 print("ONLY_TWO_EXISTING_BLOCKS_REPLACED",changes,"WORDS",sum(len(x.split()) for x in ps),flush=True)
 return (chr(10)*2).join(b)
def main():
 mode=sys.argv[1] if len(sys.argv)>1 else "--audit";assert mode in ("--audit","--save")
 runner.load_env();gate.KEY=runner.desk_key()
 before=desk();target=runner.find_post(before["posts"],ID)
 assert target["status"]=="draft"
 old=target["body"].strip();candidate_text=mutate_current(old)
 data=original()
 candidate=copy.deepcopy(target);candidate["body"]=candidate_text
 if mode=="--audit":
  gate.CHECK_IDS=False
  bad,warn,_=gate.check_post(candidate,strict=True)
  unexpected=[x for x in bad if not (x[0]=="card-dead" and PHOTO in str(x[1]))]
  print("SOURCE_AND_ARTICLE_READONLY_AUDIT","PASS" if not unexpected else "FAIL",json.dumps(bad),flush=True)
  assert not unexpected
  return
 ensure_uploaded(data)
 gate.CHECK_IDS=True
 errors,warnings,_=gate.check_post(candidate,strict=True)
 print("POST_UPLOAD_PREFLIGHT",json.dumps(errors),flush=True);assert not errors
 pre_others={x["id"]:fingerprint(x) for x in before["posts"] if x["id"]!=ID}
 protected={k:copy.deepcopy(v) for k,v in target.items() if k!="body"}
 now=desk()
 assert runner.find_post(now["posts"],ID)==target,"Other owner edits arrived; abort"
 if old!=candidate_text:
  runner.find_post(now["posts"],ID)["body"]=candidate_text
  runner.http(runner.DESK_API,runner.desk_key(),{"posts":now["posts"]},method="POST")
 streak=0
 for i in range(45):
  current=desk();post=runner.find_post(current["posts"],ID)
  good=post.get("status")=="draft" and post.get("body","").strip()==candidate_text
  streak=streak+1 if good else 0
  print("FRESH_DESK_READ",i+1,"GOOD",good,"STREAK",streak,flush=True)
  if streak>=3:break
  assert post.get("body","").strip() in (old,candidate_text),"Concurrent edit during propagation"
  time.sleep(2)
 else:raise RuntimeError("No three stable postwrite reads")
 assert {k:v for k,v in post.items() if k!="body"}==protected
 assert {x["id"]:fingerprint(x) for x in current["posts"] if x["id"]!=ID}==pre_others
 for i in range(3):
  passed,report=runner.run_gate(ID,quiet=True)
  print("POSTWRITE_GATE",i+1,"PASS" if passed else "FAIL",flush=True)
  if not passed:raise RuntimeError(str(report)[-750:])
 assert sha(hosted())==CHECK
 public=runner.http(runner.DESK_API+"?fresh="+str(time.time_ns()))
 assert not any(x.get("id")==ID for x in public.get("posts",[]))
 print("DISTINCT_2024_BST_LIVE_GUITAR_DRAFT_SAVED","DIM",2900,1936,
       "PERSONAL_IG",CREDIT,"OLD_REJECTED_REMOVED",REJECTED not in candidate_text,
       "DRAFT_UNPUBLISHED",True,"RIGHTS_CLEARANCE_STILL_REQUIRED",True,flush=True)
if __name__=="__main__":main()
