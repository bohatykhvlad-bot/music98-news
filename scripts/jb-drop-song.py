#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""jb-drop-song.py - one "YUKON" carrier in the post, not two.

Owner, 24.09: "ЗАЧЕМ В ПОСТЕ 2 ЮКОНА ПЕСНИ, ДОСТАТОЧНО ВИДЕО ОСТАВИТЬ". The post carried the
studio recording (Apple song card, what the district attorney shared) *and* the Grammy
performance of the same song (YouTube card). Two cards for one song read as a repeat, so the
video stays and the audio card goes - together with the sentence that pointed at it, because a
lead-in that promises a card which is no longer there is worse than no lead-in.

Run:  python scripts/jb-drop-song.py [--apply]
"""
import json
import os
import subprocess
import sys
import time

PROD = os.environ.get("MUSIC98_PROD", "https://music98.news")
KEY = os.environ.get("MUSIC98_KEY", "RrrUuu181818@")
APPLY = "--apply" in sys.argv
PID = "aujb923n1"

DROP_CARD = "[apple:song:1825994646:1825994651]"
DROP_SENTENCE = " The \"YUKON\" recording Hochman shared is below."


def sh(a, data=None):
    r = subprocess.run(a, capture_output=True, input=data)
    return r.stdout.decode("utf-8", "ignore")


def desk(tag):
    for k in range(8):
        b = sh(["curl", "-s", "-m", "90", "-H", "X-Admin-Key: " + KEY,
                PROD + "/api/desk?cb=%s-%d-%d" % (tag, time.time(), k)])
        try:
            d = json.loads(b)
            if d.get("posts"):
                return d
        except Exception:
            pass
        time.sleep(2 + k)
    raise SystemExit("ABORT: stale read")


def main():
    d = desk("jb-song-read")
    post = [p for p in d["posts"] if p["id"] == PID][0]
    body = post.get("body") or ""
    if DROP_CARD not in body:
        print("card already gone - nothing to do")
        return 0
    blocks = [b for b in body.split("\n\n") if b.strip()]
    kept = [b for b in blocks if b.strip() != DROP_CARD]
    print("cards before:", sum(b.strip().startswith("[") for b in blocks),
          "-> after:", sum(b.strip().startswith("[") for b in kept))
    new = "\n\n".join(b.strip() for b in kept)
    if DROP_SENTENCE in new:
        new = new.replace(DROP_SENTENCE, "", 1)
        print("lead-in removed too")
    if "[youtube:" not in new:
        raise SystemExit("ABORT: the video card disappeared - that is not what was asked")
    print("words:", len(new.split()))
    for c in [b for b in new.split("\n\n") if b.strip().startswith("[")]:
        print("  carrier:", c.strip())
    tail = [b for b in new.split("\n\n") if b.strip()][-4:]
    for t in tail:
        print("  ...", t.strip()[:110])
    if not APPLY:
        print("dry run - nothing written")
        return 0

    back = desk("jb-song-apply")["posts"]
    for p in back:
        if p["id"] == PID:
            p["body"] = new
            p["excerpt"] = new.split("\n\n")[0]
    path = os.path.join(os.environ.get("TEMP", "/tmp"), "desk-jb-song.json")
    open(path, "wb").write(json.dumps({"posts": back, "touched": [PID]},
                                      ensure_ascii=True).encode())
    print("write :", sh(["curl", "-s", "-m", "240", "-X", "POST", "-H", "X-Admin-Key: " + KEY,
                         "-H", "Content-Type: application/json", "--data-binary", "@" + path,
                         PROD + "/api/desk"]).strip()[:140])
    time.sleep(8)
    chk = [p for p in desk("jb-song-verify")["posts"] if p["id"] == PID][0]
    b = chk.get("body") or ""
    print("card still on server:", DROP_CARD in b)
    print("status:", chk.get("status"), "| publishAt:", chk.get("publishAt"))
    others = [p["id"] for p in d["posts"] if p["id"] != PID and p.get("body") !=
              [x for x in back if x["id"] == p["id"]][0].get("body")]
    print("other posts changed by this write:", others or "none")
    return 0


if __name__ == "__main__":
    sys.exit(main())
