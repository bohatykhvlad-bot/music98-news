#!/usr/bin/env python3
import copy, hashlib, json, os, re, subprocess, sys, time, urllib.request
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
POST_ID="ella26choosintexas"
EXPECTED_SHA="6a0af97897c1423ae6b67ee418027c0744bad6d21899832687bbcd815219071c"
KEY=(os.environ.get("ADMIN_PASSWORD") or "").strip()
if not KEY: raise SystemExit("NO_KEY")

raw=(ROOT/"editorial"/"ella-final-polished-20261005.md").read_text(encoding="utf-8").strip()
title,body=raw.split("\n\n",1)
title=title.removeprefix("# ")
MEDIA=re.compile(r'\[(?:photo|youtube|apple|instagram|tiktok):[^\]]+\]',re.I)

def desk():
    req=urllib.request.Request("https://music98.news/api/desk?nocache="+str(time.time()),
      headers={"X-Admin-Key":KEY,"Accept":"application/json","Cache-Control":"no-cache","User-Agent":"Mozilla/5.0"})
    return json.loads(urllib.request.urlopen(req,timeout=45).read())

def save(posts):
    data=json.dumps({"posts":posts},ensure_ascii=True,separators=(",",":")).encode("ascii")
    req=urllib.request.Request("https://music98.news/api/desk",data=data,method="POST",
      headers={"X-Admin-Key":KEY,"Content-Type":"application/json","Accept":"application/json","User-Agent":"Mozilla/5.0"})
    with urllib.request.urlopen(req,timeout=60) as r: return r.status

def stable(x):
    return hashlib.sha256(json.dumps(x,sort_keys=True,ensure_ascii=True,separators=(",",":")).encode("ascii")).hexdigest()

data=desk()
posts=data["posts"]
hits=[i for i,p in enumerate(posts) if p.get("id")==POST_ID and p.get("status")=="draft"]
if len(hits)!=1: raise SystemExit("DRAFT_TARGET_NOT_UNIQUE")
idx=hits[0]
old_posts=copy.deepcopy(posts)
old=copy.deepcopy(posts[idx])
old_body=old.get("body") or ""
if hashlib.sha256(old_body.encode()).hexdigest()!=EXPECTED_SHA: raise SystemExit("DRAFT_CHANGED")
if old.get("title")!=title: raise SystemExit("TITLE_CHANGED")
if not body.startswith(old.get("excerpt") or ""): raise SystemExit("EXCERPT_PREFIX_BROKEN")
if MEDIA.findall(body)!=MEDIA.findall(old_body): raise SystemExit("MEDIA_CHANGED")
if any(c in body for c in "’‘“”"): raise SystemExit("TYPOGRAPHIC_QUOTES")
if ";" in MEDIA.sub("",body) or "—" in body: raise SystemExit("HOUSE_STYLE_PUNCTUATION")

candidate=copy.deepcopy(old)
candidate["body"]=body

sys.path.insert(0,str(ROOT/"scripts"))
import gate, preflight
gate.CHECK_IDS=False
fails,warns,info=gate.check_post(candidate,True)
print("LOCAL_FAILS="+json.dumps(fails,ensure_ascii=False))
print("LOCAL_WARNS="+json.dumps(warns,ensure_ascii=False))
if fails: raise SystemExit("LOCAL_GATE_FAILED")
if not preflight.check(candidate,old,len(MEDIA.findall(old_body)),1300): raise SystemExit("LOCAL_PREFLIGHT_FAILED")

posts[idx]=candidate
print("SAVE_STATUS="+str(save(posts)))

fresh=desk()["posts"]
saved=[(i,p) for i,p in enumerate(fresh) if p.get("id")==POST_ID and p.get("status")=="draft"]
if len(saved)!=1: raise SystemExit("SAVED_TARGET_NOT_UNIQUE")
sidx,post=saved[0]
if post.get("body")!=body: raise SystemExit("BODY_MISMATCH")
if post.get("cover")!=old.get("cover"): raise SystemExit("COVER_CHANGED")
if MEDIA.findall(post.get("body") or "")!=MEDIA.findall(old_body): raise SystemExit("SAVED_MEDIA_CHANGED")
if [stable(p) for i,p in enumerate(old_posts) if i!=idx] != [stable(p) for i,p in enumerate(fresh) if i!=sidx]:
    raise SystemExit("OTHER_POST_CHANGED")

env=os.environ.copy(); env["MUSIC98_KEY"]=KEY
g=subprocess.run([sys.executable,str(ROOT/"scripts"/"gate.py"),"--post",POST_ID,"--ids"],cwd=ROOT,env=env,text=True,capture_output=True)
print(g.stdout)
if g.returncode: raise SystemExit("REMOTE_GATE_FAILED")
p=subprocess.run([sys.executable,str(ROOT/"scripts"/"preflight.py"),"--post",POST_ID,"--expected-media",str(len(MEDIA.findall(old_body))),"--min-words","1300"],cwd=ROOT,env=env,text=True,capture_output=True)
print(p.stdout)
if p.returncode: raise SystemExit("REMOTE_PREFLIGHT_FAILED")
print("ELLA_FINAL_POLISH_VERIFIED")
print("STATUS=draft")
print("BODY_SHA="+hashlib.sha256(body.encode()).hexdigest())
print("PHOTO_FRAMING_UNCHANGED=true")
print("NON_TARGET_POSTS_STABLE=true")
