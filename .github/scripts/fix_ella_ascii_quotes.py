from __future__ import annotations

import json
import os
import re
import urllib.request

KEY=os.environ.get("ADMIN_PASSWORD","").strip()
if not KEY:
    raise SystemExit("NO_EDITOR_CREDENTIAL")

DESK="https://music98.news/api/desk"
PID="ella26choosintexas"
TITLE="The Ella Langley Phenomenon and Country's New Boom"
UA="music98-ella-ascii-quotes-2026-10-06"
SMART=("“","”","‘","’")
REPL=str.maketrans({"“":'"',"”":'"',"‘":"'","’":"'"})

def get(auth=True):
    headers={"Accept":"application/json","Cache-Control":"no-cache","User-Agent":UA}
    if auth:
        headers["X-Admin-Key"]=KEY
    req=urllib.request.Request(DESK,headers=headers)
    with urllib.request.urlopen(req,timeout=45) as r:
        return json.load(r)

before=get(True)
posts=before.get("posts") or []
matches=[p for p in posts if p.get("id")==PID]
if len(matches)!=1:
    raise SystemExit("ELLA_TARGET_COUNT_"+str(len(matches)))
p=matches[0]
if p.get("status")!="live" or p.get("title")!=TITLE:
    raise SystemExit("ELLA_IDENTITY_OR_STATUS_MISMATCH")

body=p.get("body") or ""
excerpt=p.get("excerpt") or ""
media_before=len(re.findall(r"\[(?:photo|youtube|apple|instagram|tiktok):[^\]]+\]",body,re.I))
word_before=len(re.findall(r"\b[\w’'-]+\b",body))
body_counts={ch:body.count(ch) for ch in SMART}
excerpt_counts={ch:excerpt.count(ch) for ch in SMART}
expected_body={"“":1,"”":1,"‘":0,"’":4}
expected_excerpt={"“":1,"”":1,"‘":0,"’":3}
print("PRECHECK body_counts="+json.dumps(body_counts,ensure_ascii=False,sort_keys=True))
print("PRECHECK excerpt_counts="+json.dumps(excerpt_counts,ensure_ascii=False,sort_keys=True))
print("PRECHECK words="+str(word_before)+" media="+str(media_before))
if body_counts!=expected_body or excerpt_counts!=expected_excerpt:
    raise SystemExit("LIVE_TEXT_CHANGED_ABORT")
if media_before!=10:
    raise SystemExit("MEDIA_COUNT_UNEXPECTED_"+str(media_before))

new_body=body.translate(REPL)
new_excerpt=excerpt.translate(REPL)
if new_body==body or new_excerpt==excerpt:
    raise SystemExit("NO_QUOTE_CHANGE")
if any(ch in new_body or ch in new_excerpt for ch in SMART):
    raise SystemExit("SMART_QUOTES_REMAIN_BEFORE_SAVE")
if len(re.findall(r"\b[\w'-]+\b",new_body))!=word_before:
    raise SystemExit("WORD_COUNT_CHANGED")
if len(re.findall(r"\[(?:photo|youtube|apple|instagram|tiktok):[^\]]+\]",new_body,re.I))!=media_before:
    raise SystemExit("MEDIA_CHANGED")

other_snapshot=json.dumps(
    [x for x in posts if x.get("id")!=PID],
    sort_keys=True,ensure_ascii=False,separators=(",",":")
)
target_snapshot={k:v for k,v in p.items() if k not in ("body","excerpt")}
p["body"]=new_body
p["excerpt"]=new_excerpt

payload=json.dumps({"posts":posts},ensure_ascii=False).encode("utf-8")
req=urllib.request.Request(
    DESK,data=payload,method="POST",
    headers={"X-Admin-Key":KEY,"Content-Type":"application/json","Accept":"application/json","User-Agent":UA},
)
with urllib.request.urlopen(req,timeout=90) as r:
    saved=json.load(r)
if not saved.get("ok"):
    raise SystemExit("SAVE_FAILED")

after=get(True)
ap=after.get("posts") or []
q=next((x for x in ap if x.get("id")==PID),None)
if not q:
    raise SystemExit("ELLA_MISSING_AFTER_SAVE")
if q.get("body")!=new_body or q.get("excerpt")!=new_excerpt:
    raise SystemExit("TEXT_VERIFY_FAILED")
if {k:v for k,v in q.items() if k not in ("body","excerpt")}!=target_snapshot:
    raise SystemExit("NON_TEXT_ELLA_FIELD_CHANGED")
if json.dumps(
    [x for x in ap if x.get("id")!=PID],
    sort_keys=True,ensure_ascii=False,separators=(",",":")
)!=other_snapshot:
    raise SystemExit("OTHER_POST_CHANGED")
if any((q.get("body") or "").count(ch) or (q.get("excerpt") or "").count(ch) for ch in SMART):
    raise SystemExit("SMART_QUOTES_REMAIN_AFTER_SAVE")

public=get(False)
pub=next((x for x in public.get("posts",[]) if x.get("id")==PID),None)
if not pub or pub.get("status")!="live":
    raise SystemExit("PUBLIC_ELLA_MISSING")
if any((pub.get("body") or "").count(ch) or (pub.get("excerpt") or "").count(ch) for ch in SMART):
    raise SystemExit("PUBLIC_SMART_QUOTES_REMAIN")

print("ELLA_ASCII_QUOTES_PASS body_replacements=6 excerpt_replacements=5")
print("ELLA_FIELDS_PRESERVED true")
print("OTHER_POSTS_UNCHANGED true")
print("PUBLIC_VERIFY true")
