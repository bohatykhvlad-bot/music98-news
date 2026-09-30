#!/usr/bin/env python3
from __future__ import annotations
import copy, re, sys, time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import post as runner

LIVE_ID = "auleon930r1"
YOUTUBE = "[youtube:zNYsw-cW8v8]"

def is_linkin_unshatter(p):
    artist = str(p.get("artist") or "").strip().upper()
    title = str(p.get("title") or "").strip().upper()
    body = str(p.get("body") or "").upper()
    return artist == "LINKIN PARK" and ("UNSHATTER" in title or "UNSHATTER" in body)

def clean_live_body(body):
    lines = body.splitlines()
    out = []
    youtube_seen = False
    for line in lines:
        t = line.strip()
        if re.match(r"^\[apple:", t, re.I):
            continue
        if re.match(r"^\[youtube:", t, re.I):
            if youtube_seen:
                continue
            out.append(YOUTUBE)
            youtube_seen = True
            continue
        out.append(line)
    if not youtube_seen:
        # Place the single video after the second prose paragraph.
        blocks = "\n\n".join(out).split("\n\n")
        insert_at = min(2, len(blocks))
        blocks.insert(insert_at, YOUTUBE)
        return "\n\n".join(blocks)
    return "\n".join(out)

def main():
    runner.load_env()
    before = runner.desk_read()["posts"]
    matches = [(str(p.get("id")), p.get("status"), p.get("title")) for p in before if is_linkin_unshatter(p)]
    print("MATCHES_BEFORE", matches)

    def mutate(posts):
        live = runner.find_post(posts, LIVE_ID)
        if live.get("status") != "live":
            raise RuntimeError(f"{LIVE_ID} is not live")
        # Remove duplicate draft(s) for this same LINKIN PARK release, preserve the live post.
        posts[:] = [
            p for p in posts
            if not (str(p.get("id")) != LIVE_ID and (p.get("status") or "live") == "draft" and is_linkin_unshatter(p))
        ]
        live = runner.find_post(posts, LIVE_ID)
        live["body"] = clean_live_body(str(live.get("body") or ""))
        return copy.deepcopy(live)

    now = runner.guarded_write(mutate)
    print("LIVE_AFTER", now["id"], now["status"])
    print("APPLE_BLOCKS", len(re.findall(r"(?im)^\s*\[apple:", now.get("body") or "")))
    print("YOUTUBE_BLOCKS", len(re.findall(r"(?im)^\s*\[youtube:", now.get("body") or "")))

    ok = runner.cmd_gate(LIVE_ID)
    if not ok:
        raise SystemExit("gate failed")
    runner.cmd_verify(LIVE_ID)

    final = runner.desk_read()["posts"]
    matches = [(str(p.get("id")), p.get("status"), p.get("title")) for p in final if is_linkin_unshatter(p)]
    print("MATCHES_AFTER", matches)
    if any(pid != LIVE_ID and status == "draft" for pid, status, _ in matches):
        raise RuntimeError("duplicate LINKIN PARK draft still exists")
    live = runner.find_post(final, LIVE_ID)
    if re.search(r"(?im)^\s*\[apple:", live.get("body") or ""):
        raise RuntimeError("Apple media remains")
    if len(re.findall(r"(?im)^\s*\[youtube:", live.get("body") or "")) != 1:
        raise RuntimeError("live post must contain exactly one YouTube block")

if __name__ == "__main__":
    main()
