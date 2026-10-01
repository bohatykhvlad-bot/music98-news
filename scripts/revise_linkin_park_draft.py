#!/usr/bin/env python3
from __future__ import annotations
import copy, sys, time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import post as runner

POST_ID = "auleon930r1"
TARGET_TYPE = "Album"

def fresh_read():
    return runner.http(runner.DESK_API + "?nocache=" + str(time.time_ns()), runner.desk_key())

def main():
    runner.load_env()
    runner.desk_read = fresh_read
    before = fresh_read()
    current = runner.find_post(before["posts"], POST_ID)
    if current.get("status") != "live":
        raise RuntimeError("LINKIN PARK target is not live")

    old_type = current.get("rtype") or ""
    if old_type == TARGET_TYPE:
        print("RELEASE_TYPE_ALREADY", TARGET_TYPE)
        return
    if old_type != "Live album":
        raise RuntimeError("Unexpected current release type: " + repr(old_type))

    protected = {k: copy.deepcopy(v) for k, v in current.items() if k != "rtype"}

    def mutate(posts):
        p = runner.find_post(posts, POST_ID)
        if p.get("status") != "live":
            raise RuntimeError("Publication state changed")
        if (p.get("rtype") or "") not in {"Live album", TARGET_TYPE}:
            raise RuntimeError("Unexpected release type during write")
        if {k: v for k, v in p.items() if k != "rtype"} != protected:
            raise RuntimeError("A non-rtype field changed; refusing write")
        p["rtype"] = TARGET_TYPE
        return copy.deepcopy(p)

    saved = runner.guarded_write(mutate)
    for _ in range(20):
        if saved.get("rtype") == TARGET_TYPE:
            break
        time.sleep(2)
        saved = runner.find_post(fresh_read()["posts"], POST_ID)

    if saved.get("rtype") != TARGET_TYPE:
        raise RuntimeError("Album type did not propagate")
    if {k: v for k, v in saved.items() if k != "rtype"} != protected:
        raise RuntimeError("A non-rtype field changed on save")

    for pass_no in (1, 2, 3):
        ok, lines = runner.run_gate(POST_ID, quiet=False)
        print("POSTWRITE_GATE_PASS", pass_no, "PASS" if ok else "FAIL")
        if not ok:
            raise RuntimeError("Live LINKIN PARK post failed gate")

    print("RELEASE_TYPE", old_type, "->", TARGET_TYPE)
    print("ONLY_RTYPE_CHANGED", True)

if __name__ == "__main__":
    main()
