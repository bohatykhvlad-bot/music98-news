#!/usr/bin/env python3
from __future__ import annotations
import copy, json, re, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import post as runner

VMA_ID="vmas26results"

def normalize_award_tags(body: str) -> str:
    def repl(m):
        inner=m.group(0)
        return inner.replace(" — "," - ").replace(" – "," - ")
    return re.sub(r"\[(?:winner|nominee):[^\]]+\]", repl, body)

def normalize_title(title: str) -> str:
    # Display convention only: artist + quoted work in a post title.
    if re.match(r'^.+\s[—–]\s["\']', title or ""):
        return (title or "").replace(" — "," - ").replace(" – "," - ")
    return title

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
        if new_title!=old_title:
            p["title"]=new_title

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
    for p in after:
        t=p.get("title") or ""
        if re.match(r'^.+\s[—–]\s["\']',t):
            title_bad.append((p.get("id"),t))
    if title_bad:
        raise RuntimeError("long artist/title separators remain in post titles: "+repr(title_bad))

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
