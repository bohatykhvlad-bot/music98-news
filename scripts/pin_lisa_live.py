#!/usr/bin/env python3
from __future__ import annotations
import copy
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import post as runner

POST_ID = "lisa26vegas"

def main():
    runner.load_env()
    before = runner.desk_read()["posts"]
    current = copy.deepcopy(runner.find_post(before, POST_ID))
    if (current.get("status") or "live") != "live":
        raise RuntimeError("LISA post is not live")
    if current.get("pinned") is True:
        print("ALREADY_PINNED", POST_ID)
        return

    def mutate(posts):
        p = runner.find_post(posts, POST_ID)
        p["pinned"] = True
        return copy.deepcopy(p)

    now = runner.guarded_write(mutate)
    expected = copy.deepcopy(current)
    expected["pinned"] = True
    if now != expected:
        keys = sorted(set(now) | set(expected))
        changed = [k for k in keys if now.get(k) != expected.get(k)]
        raise RuntimeError("unexpected LISA field changes: " + repr(changed))
    print("PINNED_OK", POST_ID, now.get("pinned"), now.get("status"), now.get("title"))

if __name__ == "__main__":
    main()
