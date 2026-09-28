#!/usr/bin/env python3
from __future__ import annotations
import copy, json, re, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import post as runner

VMA_ID="vmas26results"

def normalize_award_tags(body: str) -> str:
    # The live VMA audit found every en dash in this post inside the structured
    # artist/title award list, so normalize those separators directly.
    return body.replace(" — ", " - ").replace(" – ", " - ")

def normalize_title(title: str) -> str:
    # Display convention only: normalize artist/title separators in stored titles.
    return (title or "").replace(" — "," - ").replace(" – "," - ")

def normalize_release_title(artist: str, title: str) -> str:
    # Release cards prepend the artist in the renderer. Stored release titles must
    # therefore contain only the work title, never "Artist - Title".
    a=(artist or "").strip()
    t=(title or "").strip()
    if not a or not t:
        return t
    for sep in (" - "," — "," – "):
        prefix=a+sep
        if t.lower().startswith(prefix.lower()):
            t=t[len(prefix):].strip()
            if len(t)>=2 and t[0]==t[-1] and t[0] in ('"', "'"):
                t=t[1:-1].strip()
            return t
    return t

def main():
    runner.load_env()
    before=runner.desk_read()
    posts=copy.deepcopy(before["posts"])
    before_map={p["id"]:copy.deepcopy(p) for p in posts}
    changed=[]

    for p in posts:
        pid=p.get("id")
        old_title=p.get("title") or ""
        new_title=normalize_title(old_title)
        if p.get("type")=="release":
            new_title=normalize_release_title(p.get("artist") or "", new_title)
        if new_title!=old_title:
            p["title"]=new_title

        # Owner-selected display credit follows the official video title style.
        if pid=="aujlfire28r1" and p.get("artist")!="John Legend, Pharrell Williams":
            p["artist"]="John Legend, Pharrell Williams"

        if pid==VMA_ID:
            old_body=p.get("body") or ""
            new_body=normalize_award_tags(old_body)
            if new_body!=old_body:
                p["body"]=new_body

        if p!=before_map.get(pid):
            changed.append(pid)

    if not changed:
        print("NO_POST_CHANGES")
        return

    runner.http(runner.DESK_API, runner.desk_key(), {"posts":posts}, method="POST")
    after=runner.desk_read()["posts"]
    after_map={p["id"]:p for p in after}

    unexpected=[]
    for pid,old in before_map.items():
        if pid not in changed and after_map.get(pid)!=old:
            unexpected.append(pid)
    if unexpected:
        raise RuntimeError("unexpected post changes: "+repr(unexpected))

    vma=after_map.get(VMA_ID,{})
    award_tags=re.findall(r"\[(?:winner|nominee):[^\]]+\]",vma.get("body") or "")
    bad=[x for x in award_tags if " — " in x or " – " in x]
    if bad:
        raise RuntimeError("long artist/title separators remain in VMA: "+repr(bad[:5]))

    title_bad=[]
    release_dupes=[]
    for p in after:
        t=p.get("title") or ""
        if " — " in t or " – " in t:
            title_bad.append((p.get("id"),t))
        if p.get("type")=="release":
            a=(p.get("artist") or "").strip()
            if a and re.match(r'^'+re.escape(a)+r'\s+-\s+',t,re.I):
                release_dupes.append((p.get("id"),a,t))
    if title_bad:
        raise RuntimeError("long separators remain in post titles: "+repr(title_bad))
    if release_dupes:
        raise RuntimeError("release titles duplicate artist names: "+repr(release_dupes))

    print("CHANGED_POSTS",json.dumps(changed,ensure_ascii=False))
    for pid in changed:
        p=after_map[pid]
        print("POST",pid,p.get("status"),p.get("title"))
        ok,lines=runner.run_gate(pid)
        print("GATE",pid,"PASS" if ok else "FAIL")
        for line in lines:
            print(line)
        if p.get("status")=="live":
            runner.cmd_verify(pid)

if __name__=="__main__":
    main()
