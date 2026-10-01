#!/usr/bin/env python3
from __future__ import annotations
import copy, sys, time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import post as runner

POST_ID = "auleon930r1"
# Final reviewed revision.

EXCERPT = r'''LINKIN PARK have released *UNSHATTER Film Soundtrack (Live in São Paulo)*, the live album tied to the band's new documentary.'''

BODY = r'''LINKIN PARK have released *UNSHATTER Film Soundtrack (Live in São Paulo)*, the live album tied to the band's new documentary. The record arrived September 25 through Warner Records and captures the São Paulo concert at the center of the film.

The show brings the *FROM ZERO* era together with songs from across the band's catalog rather than treating the new lineup as a separate chapter. Recent tracks such as "The Emptiness Machine," "Two Faced" and "Heavy Is the Crown" sit alongside "Numb," "In the End," "Papercut" and other older material. "Faint" was released ahead of the soundtrack with an official live video from the same São Paulo performance.

[youtube:zNYsw-cW8v8]

The soundtrack is also more than an audio copy of the documentary. Several live recordings included on the album are not heard in *UNSHATTER*, so the release preserves more of the São Paulo show than the film itself. That makes the album a companion to the movie rather than simply its audio track, with the concert able to stand on its own from beginning to end.

*UNSHATTER* follows LINKIN PARK from private studio sessions in 2022 through the making and release of *FROM ZERO* and the band's return to the stage. Archive footage, sold-out performances and interviews with the band and fans are used to trace the years leading up to the comeback, including the arrival of Emily Armstrong on vocals and Colin Brittain on drums after the group's seven-year hiatus.

Directed by Joe Hahn, the film opened in theaters worldwide on September 30 for a limited run. The São Paulo concert becomes the point where the documentary's studio footage and the band's return to live performance meet, with the new songs and older catalog sharing the same stage.

The physical editions keep the differences simple. The CD has 20 tracks, adding four short pieces between the 16 full performances, while the two-LP edition carries the 16 complete songs without those interludes. The CD comes with a 12-panel accordion booklet, and the vinyl edition includes a 12-by-24-inch insert.'''

AI_STYLE_FLAGS = ("marks a new chapter","comes at a time","not only","rather than simply","serves as a","underscores","showcases","official store says","the band's official store says")

def main():
    runner.load_env()
    def mutate(posts):
        p = next((x for x in posts if str(x.get("id")) == POST_ID), None)
        if not p:
            raise RuntimeError("draft not found")
        if (p.get("status") or "live") != "live":
            raise RuntimeError("post is not live")
        p["excerpt"] = EXCERPT
        p["body"] = BODY
        return copy.deepcopy(p)

    low = BODY.lower()
    bad = [x for x in AI_STYLE_FLAGS if x in low]
    print("AI_STYLE_SCAN", bad)
    if bad:
        raise RuntimeError(f"AI-style phrase(s) remain: {bad}")

    runner.guarded_write(mutate)

    # Wait for the exact revision to propagate, then run the normal editorial gate.
    for attempt in range(12):
        desk = runner.http(runner.DESK_API + "?nocache=" + str(time.time_ns()), runner.desk_key())
        p = next((x for x in desk.get("posts", []) if str(x.get("id")) == POST_ID), None)
        if p and p.get("excerpt") == EXCERPT and p.get("body") == BODY and p.get("status") == "live":
            break
        time.sleep(2)
    else:
        raise RuntimeError("revised draft did not propagate")

    for pass_no in (1, 2, 3):
        ok = False
        lines = []
        for gate_attempt in range(6):
            ok, lines = runner.run_gate(POST_ID, quiet=False)
            print("GATE_PASS", pass_no, "ATTEMPT", gate_attempt + 1, "PASS" if ok else "FAIL")
            for line in lines:
                if "PASS" in line or "FAIL" in line or line.lstrip().startswith(("X ", "! ")):
                    print(line)
            if ok:
                break
            time.sleep(3)
        if not ok:
            raise RuntimeError(f"gate failed on pass {pass_no}")
    runner.cmd_verify(POST_ID)

if __name__ == "__main__":
    main()
