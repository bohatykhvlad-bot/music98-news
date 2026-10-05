#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Second editorial barrier for music98.

This is intentionally different from gate.py and preflight.py.
It looks for editorial failures that are easy to miss when a text is checked
as facts + syntax instead of read as an article.

A body is not allowed to be saved/published through scripts/post.py until:
1) this script has been run on the exact current body,
2) all hard findings are fixed or explicitly waived with a reason,
3) --confirm-full-read was supplied after a complete top-to-bottom read,
4) the resulting body hash still matches at set/publish time.

The stamp is local and content-hashed. Any body edit invalidates it.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen

PROD="https://music98.news"
STATE=Path(os.environ.get("MUSIC98_EDITORIAL_STATE", os.path.join(os.environ.get("TEMP","/tmp"),"music98-editorial-readthrough.json")))
MEDIA=re.compile(r"^\[(?:photo|youtube|apple|instagram|ig|tiktok|tickets):[^\]]+\]$",re.I)
SENT_SPLIT=re.compile(r"(?<=[.!?])(?:[\"'’”])?\s+(?=[A-Z0-9\"'“])")
MONTH=r"(?:January|February|March|April|May|June|July|August|September|October|November|December)"
MONTH_DATE=re.compile(rf"\b{MONTH}\s+\d{{1,2}}\b",re.I)
SCHEDULE_RUN=re.compile(rf"\b{MONTH}\s+\d{{1,2}}\s*,\s*\d{{1,2}}(?:\s*,\s*\d{{1,2}}|\s+and\s+\d{{1,2}})+",re.I)
TECH_CREDIT=re.compile(r"\b(?:produced|co-produced|engineered|mixed|mastered)\s+by\b|\b(?:producer|engineer|mixer|mastering engineer)\b",re.I)
PHYSICAL=re.compile(r"\b(?:CD|vinyl|cassette|LP|2LP|pressing|physical edition|physical copy|poster|insert|color variant|colou?r variant|gatefold)\b",re.I)
SOURCE_PROOF=re.compile(r"\b(?:Apple Music|Spotify|Sony|RCA|Warner|official store|official website|release material)\s+(?:lists?|shows?|states?|describes?|says?)\b",re.I)
ARTIST_SHORT_FORMS={
    "Dua Lipa":("Dua","Lipa"),
    "Victoria Monét":("Victoria","Monét"),
    "Bruno Mars":("Bruno","Mars"),
    "Taylor Swift":("Taylor","Swift"),
    "Ella Langley":("Ella","Langley"),
}
OBVIOUS_EXPLAINER=re.compile(r"^(?:Therefore|Thus|This means|That means|In other words|Anyone buying|That gives|This gives)\b",re.I)
AI_BRIDGES=(
    "the idea expanded as",
    "the choice gave",
    "the wider definition helps explain",
    "the broadcast's standout collaboration",
    "effectively opened",
    "turning one night",
    "remains the center of the record",
    "makes the range clear",
    "part of that period was spent pursuing",
    "worth noting",
    "the finished album makes those turns quickly",
    "make the range clear",
    "makes the range clear",
    "the reference fits an album",
    "the title does not describe a record of",
    "giving the album a family connection",
    "the album followed that curiosity",
)
WAIVER_CHOICES={"technical-credit","physical-format","source-attribution","single-sentence"}

def body_hash(body:str)->str:
    return hashlib.sha256(body.encode("utf-8")).hexdigest()

def words(s:str)->int:
    return len(re.findall(r"\b[\w'’-]+\b",s))

def prose_paragraphs(body:str):
    return [p.strip() for p in body.split("\n\n") if p.strip() and not MEDIA.fullmatch(p.strip())]

def sentences(p:str):
    return [x.strip() for x in SENT_SPLIT.split(p.strip()) if x.strip()]

def load_remote(pid:str):
    key=(os.environ.get("MUSIC98_KEY") or os.environ.get("ADMIN_PASSWORD") or "").strip()
    h={"Accept":"application/json","User-Agent":"Mozilla/5.0","Cache-Control":"no-cache"}
    if key: h["X-Admin-Key"]=key
    req=Request(PROD+"/api/desk",headers=h)
    with urlopen(req,timeout=30) as r:
        data=json.loads(r.read().decode("utf-8"))
    matches=[p for p in data.get("posts",[]) if str(p.get("id"))==pid]
    if len(matches)!=1: raise ValueError("post not unique")
    return matches[0]

def load_state():
    if not STATE.exists(): return {}
    try: return json.loads(STATE.read_text(encoding="utf-8"))
    except Exception: return {}

def save_state(state):
    STATE.parent.mkdir(parents=True,exist_ok=True)
    STATE.write_text(json.dumps(state,ensure_ascii=False,indent=2),encoding="utf-8")

def inspect(post,allows):
    body=post.get("body") or ""
    title=post.get("title") or ""
    for full, shorts in ARTIST_SHORT_FORMS.items():
        if full in body:
            tail=body.split(full,1)[1]
            for short in shorts:
                if re.search(r"\b"+re.escape(short)+r"\b",tail):
                    fails.append(f"name style: write the artist's full name '{full}' instead of shortened '{short}'")
    paras=prose_paragraphs(body)
    fails=[]
    notes=[]
    if not paras:
        return ["no prose paragraphs"],[]

    for idx,p in enumerate(paras,1):
        ss=sentences(p)
        wc=words(p)
        if len(ss)==1 and wc<45 and "single-sentence" not in allows:
            fails.append(f"paragraph {idx}: one-sentence paragraph is only {wc} words")
        if SCHEDULE_RUN.search(p):
            fails.append(f"paragraph {idx}: schedule-style date list belongs out of prose")
        date_hits=MONTH_DATE.findall(p)
        if len(date_hits)>=4:
            fails.append(f"paragraph {idx}: calendar overload ({len(date_hits)} explicit dates)")
        if TECH_CREDIT.search(p) and "technical-credit" not in allows:
            fails.append(f"paragraph {idx}: technical production credit needs an explicit editorial reason")
        if PHYSICAL.search(p) and "physical-format" not in allows:
            fails.append(f"paragraph {idx}: physical-format/store metadata needs an explicit editorial reason")
        m=SOURCE_PROOF.search(p)
        if m and "source-attribution" not in allows:
            brand=m.group(0).split()[0].lower()
            if brand not in title.lower():
                fails.append(f"paragraph {idx}: source/checking language leaked into reader-facing prose")
        for s in ss:
            if OBVIOUS_EXPLAINER.search(s):
                fails.append(f"paragraph {idx}: sentence explains an obvious consequence instead of adding information")
            low=s.lower()
            for phrase in AI_BRIDGES:
                if phrase in low:
                    fails.append(f"paragraph {idx}: generic/AI bridge '{phrase}'")
        # repeated exact numeric payload in adjacent sentences often signals re-explaining
        for a,b in zip(ss,ss[1:]):
            na=set(re.findall(r"\b\d+(?:\.\d+)?\b",a))
            nb=set(re.findall(r"\b\d+(?:\.\d+)?\b",b))
            if len(na & nb)>=2:
                notes.append(f"paragraph {idx}: adjacent sentences repeat the same numbers; reread for tautology")

    last=paras[-1]
    last_s=sentences(last)
    if len(last_s)==1 and words(last)<55 and "single-sentence" not in allows:
        fails.append(f"final paragraph: single-sentence ending is only {words(last)} words")
    if re.search(r"\b\d+(?:st|nd|rd|th)?[.!?]?[\"'’”]?$",last.strip()):
        fails.append("ending: article ends on a bare number/ordinal")
    if words(last)<45:
        fails.append(f"ending: final paragraph is too thin ({words(last)} words)")

    # Repeating the same calendar date in the last two paragraphs is usually a patch, not an ending.
    if len(paras)>=2:
        a=set(x.lower() for x in MONTH_DATE.findall(paras[-2]))
        b=set(x.lower() for x in MONTH_DATE.findall(paras[-1]))
        if a & b:
            fails.append("ending: same explicit date repeats across the final two paragraphs")

    return fails,notes

def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--post",required=True)
    ap.add_argument("--file",type=Path,help="JSON post or {posts:[...]} payload")
    ap.add_argument("--body-file",type=Path)
    ap.add_argument("--title",default="")
    ap.add_argument("--confirm-full-read",action="store_true")
    ap.add_argument("--check-stamp",action="store_true")
    ap.add_argument("--allow",action="append",default=[],choices=sorted(WAIVER_CHOICES))
    ap.add_argument("--reason",default="")
    a=ap.parse_args()

    if a.file and a.body_file:
        raise SystemExit("choose --file or --body-file, not both")
    if a.body_file:
        post={"id":a.post,"title":a.title,"body":a.body_file.read_text(encoding="utf-8")}
        source=str(a.body_file)
    elif a.file:
        data=json.loads(a.file.read_text(encoding="utf-8"))
        if isinstance(data,dict) and isinstance(data.get("posts"),list):
            matches=[p for p in data["posts"] if str(p.get("id"))==a.post]
            if len(matches)!=1: raise SystemExit("post not unique in file")
            post=matches[0]
        else:
            post=data
        source=str(a.file)
    else:
        post=load_remote(a.post)
        source="desk"

    body=post.get("body") or ""
    sha=body_hash(body)
    state=load_state()
    if a.check_stamp:
        rec=state.get(a.post) or {}
        ok=rec.get("sha256")==sha and rec.get("confirmed") is True
        print(f"EDITORIAL_STAMP: {'PASS' if ok else 'FAIL'} sha={sha[:12]}")
        if not ok:
            print("FAIL full-read stamp is missing or stale; run editorial_readthrough.py --confirm-full-read on this exact body")
        raise SystemExit(0 if ok else 1)

    allows=set(a.allow)
    if allows and not a.reason.strip():
        print("FAIL waivers require --reason")
        raise SystemExit(1)
    fails,notes=inspect(post,allows)
    print(f"POST={a.post} WORDS={words(body)} SHA={sha[:12]}")
    for n in notes: print("REVIEW",n)
    for f in fails: print("FAIL",f)
    if fails:
        print("EDITORIAL_READTHROUGH: FAIL")
        raise SystemExit(1)
    if not a.confirm_full_read:
        print("FAIL full uninterrupted top-to-bottom read not attested")
        print("READ CHECK: remove anything that is merely verified, repeated, scheduled, technical, store-like, or obvious.")
        print("EDITORIAL_READTHROUGH: FAIL")
        raise SystemExit(1)

    state[a.post]={
        "sha256":sha,
        "confirmed":True,
        "confirmedAt":datetime.now(timezone.utc).isoformat(),
        "source":source,
        "allows":sorted(allows),
        "reason":a.reason.strip(),
    }
    save_state(state)
    print("EDITORIAL_READTHROUGH: PASS")
    print("STAMP: written for exact body hash; any body edit invalidates it")

if __name__=="__main__":
    main()
