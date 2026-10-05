#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Second editorial barrier for music98.

This is intentionally different from gate.py and preflight.py.
It looks for editorial failures that are easy to miss when a text is checked
as facts + syntax instead of read as an article.

Existing-text edits use two separate full-read barriers:
1) PRE-EDIT: read the exact source top-to-bottom before changing anything.
2) POST-EDIT: after the last change, read the exact final body top-to-bottom again.

The pre-edit stamp proves the source was read before correction. It may contain
editorial findings because those findings are what the edit is supposed to fix.
The post-edit stamp is stricter: hard findings must be fixed or explicitly waived.

Both stamps are local and content-hashed. Any source change invalidates PRE-EDIT.
Any body edit invalidates POST-EDIT.
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
GUEST_SHORT_FORMS={
    "Dua Lipa":("Dua","Lipa"),
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
    fails=[]
    notes=[]

    # Name rhythm. The post's main artist may use the surname after the first
    # full mention, but never the first name alone. Guest artists with a
    # multi-word stage name stay full when named again.
    primary=(post.get("artist") or "").strip()
    if " " in primary and primary in body:
        first,surname=primary.split(" ",1)
        tail=body.split(primary,1)[1]
        if re.search(r"\b"+re.escape(first)+r"\b(?!\s+"+re.escape(surname)+r")",tail):
            fails.append(f"name style: do not use the main artist's first name alone ('{first}')")
    for full, shorts in GUEST_SHORT_FORMS.items():
        if full==primary or full not in body:
            continue
        tail=body.split(full,1)[1]
        first,surname=full.split(" ",1)
        if re.search(r"\b"+re.escape(first)+r"\b(?!\s+"+re.escape(surname)+r")",tail):
            fails.append(f"name style: guest artist '{full}' is shortened to '{first}'")
        if re.search(r"(?<!"+re.escape(first)+r"\s)\b"+re.escape(surname)+r"\b",tail):
            fails.append(f"name style: guest artist '{full}' is shortened to '{surname}'")

    paras=prose_paragraphs(body)
    if not paras:
        return ["no prose paragraphs"],[]
    if " " in primary:
        surname=primary.split(" ",1)[1]
        starts=sum(1 for p in paras if re.match(r"^(?:"+re.escape(primary)+r"|"+re.escape(surname)+r")\b",p))
        if starts>=3:
            fails.append(f"name rhythm: {starts} paragraphs open with the artist's name/surname; rewrite with pronouns or sentence restructuring")

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
        elif len(date_hits)>=3:
            notes.append(f"paragraph {idx}: date-heavy paragraph ({len(date_hits)} explicit dates); confirm every date earns its place")

        # Dense proper-name payloads often reveal research notes leaking into prose.
        # This is heuristic, so 4+ multi-word capitalized names is a review note,
        # while 6+ becomes a hard editorial failure.
        name_hits=re.findall(r"(?<![.!?]\s)\b[A-Z][a-zÀ-ÖØ-öø-ÿ'’-]+(?:\s+[A-Z][a-zÀ-ÖØ-öø-ÿ'’-]+)+\b",p)
        unique_names=[]
        for n in name_hits:
            if n not in unique_names:
                unique_names.append(n)
        if len(unique_names)>=6:
            fails.append(f"paragraph {idx}: name overload ({len(unique_names)} multi-word proper names); rewrite as narrative, not credits/list")
        elif len(unique_names)>=4:
            notes.append(f"paragraph {idx}: dense name payload ({len(unique_names)} multi-word proper names); reread for unnecessary names")
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
    ap.add_argument("--phase",choices=("pre-edit","post-edit"),default="post-edit")
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
    phase_key=a.phase.replace("-","_")
    if a.check_stamp:
        post_state=state.get(a.post) or {}
        rec=(post_state.get(phase_key) or {})
        ok=rec.get("sha256")==sha and rec.get("confirmed") is True
        pre=(post_state.get("pre_edit") or {})
        pre_ok=pre.get("confirmed") is True
        if a.phase=="post-edit" and (a.body_file or a.file) and pre_ok:
            try:
                source_body=load_remote(a.post).get("body") or ""
                source_sha=body_hash(source_body)
                pre_ok=pre.get("sha256")==source_sha
            except Exception as exc:
                print("FAIL cannot verify current desk source for pre-edit stamp:",type(exc).__name__,str(exc)[:120])
                raise SystemExit(1)
        if a.phase=="post-edit":
            ok=ok and pre_ok
        print(f"EDITORIAL_{a.phase.upper().replace('-','_')}_STAMP: {'PASS' if ok else 'FAIL'} sha={sha[:12]}")
        if not ok:
            if a.phase=="post-edit" and not pre_ok:
                print("FAIL pre-edit full-read stamp is missing or stale for the current desk source")
            else:
                print(f"FAIL {a.phase} full-read stamp is missing or stale for this exact body")
        raise SystemExit(0 if ok else 1)

    allows=set(a.allow)
    if allows and not a.reason.strip():
        print("FAIL waivers require --reason")
        raise SystemExit(1)
    fails,notes=inspect(post,allows)
    print(f"POST={a.post} PHASE={a.phase} WORDS={words(body)} SHA={sha[:12]}")
    for n in notes: print("REVIEW",n)
    for f in fails:
        print(("FINDING" if a.phase=="pre-edit" else "FAIL"),f)

    # PRE-EDIT is allowed to discover defects. Its purpose is to prove that the
    # entire source was read before editing, not to certify that the source is clean.
    if a.phase=="post-edit" and fails:
        print("EDITORIAL_READTHROUGH: FAIL")
        raise SystemExit(1)
    if not a.confirm_full_read:
        print("FAIL full uninterrupted top-to-bottom read not attested")
        print("READ CHECK: read the complete body in order; do not review only the requested paragraph or diff.")
        print("EDITORIAL_READTHROUGH: FAIL")
        raise SystemExit(1)

    post_state=state.setdefault(a.post,{})
    post_state[phase_key]={
        "sha256":sha,
        "confirmed":True,
        "confirmedAt":datetime.now(timezone.utc).isoformat(),
        "source":source,
        "allows":sorted(allows),
        "reason":a.reason.strip(),
        "findings":len(fails),
        "reviewNotes":len(notes),
    }
    save_state(state)
    print(f"EDITORIAL_READTHROUGH: PASS ({a.phase})")
    if a.phase=="pre-edit":
        print("STAMP: source hash locked as read-before-edit; changing/reloading the source requires a new pre-edit read")
        if fails:
            print(f"ISSUE_MAP: {len(fails)} mechanical finding(s) detected; fix in context after the full read")
    else:
        print("STAMP: final body hash locked as fully reread; any body edit invalidates it")

if __name__=="__main__":
    main()
