#!/usr/bin/env python3
from __future__ import annotations
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import post as runner
from draft_fireflies import PID, EXCERPT, BODY

def main():
    runner.load_env()
    before = runner.desk_read()["posts"]
    cur = runner.find_post(before, PID)
    if cur.get("status") != "live":
        raise RuntimeError(f"refusing live revision: {PID} status is {cur.get('status')!r}")

    def mutate(posts):
        p = runner.find_post(posts, PID)
        if p.get("status") != "live":
            raise RuntimeError("status changed during guarded write")
        p["body"] = BODY
        p["excerpt"] = EXCERPT
        return p

    now = runner.guarded_write(mutate)
    print("LIVE_REVISION", now["id"], now["status"], runner.words(now["body"]), "words")
    ok = runner.cmd_gate(PID)
    if not ok:
        raise SystemExit("gate failed after live revision")
    runner.cmd_verify(PID)

if __name__ == "__main__":
    main()
