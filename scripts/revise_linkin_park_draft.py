#!/usr/bin/env python3
from __future__ import annotations
import copy, sys, time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import post as runner

POST_ID = "auleon930r1"
# Final reviewed revision.

EXCERPT = r'''LINKIN PARK have released *UNSHATTER Film Soundtrack (Live in São Paulo)*, the live album tied to the band's new documentary.'''

BODY = r'''LINKIN PARK have released *UNSHATTER Film Soundtrack (Live in São Paulo)*, the live album tied to the band's new documentary. The record arrived September 25 through Warner Records and captures the São Paulo concert featured throughout the film. The album presents the performance as a complete live release, while the documentary uses selected moments from the show alongside studio footage and interviews.

The São Paulo set mixes *FROM ZERO* songs with material from across the band's catalog. "The Emptiness Machine," "Two Faced" and "Heavy Is the Crown" appear alongside older staples including "Numb," "In the End" and "Papercut." The live version of "Faint" was released ahead of the soundtrack with an official video from the same performance. The clip puts the current lineup on one of the band's best-known songs before the full live album arrives.

[youtube:zNYsw-cW8v8]

The soundtrack also contains more live material than the documentary itself. Several recordings on the album are not heard in *UNSHATTER*, so listeners get a broader version of the São Paulo show than viewers do in the film. The additional material also documents Emily Armstrong and Colin Brittain performing with the band across both the new material and songs from earlier LINKIN PARK albums.

*UNSHATTER* follows the group from private studio sessions in 2022 through the making and release of *FROM ZERO* and the return to live shows. The film uses archive footage, sold-out performances and interviews with the band and fans to cover the period after LINKIN PARK's seven-year hiatus. It also shows the transition into the current lineup, with Armstrong on vocals and Brittain on drums as the band begins performing the new record in front of audiences.

Directed by Joe Hahn, *UNSHATTER* opened in theaters worldwide on September 30 for a limited run. The São Paulo concert provides the film's main live section, while the studio material and interviews trace the years that led to it. The documentary follows the band's return from the studio to the stage, and the soundtrack preserves more of that final performance.

The physical editions use slightly different track lists. The CD has 20 tracks, with four short pieces placed between the 16 full performances. The two-LP edition keeps the 16 complete songs and leaves those interludes out. The CD comes in a gatefold softpak with a 12-panel accordion booklet, while the vinyl edition is housed in a gatefold jacket with a 12-by-24-inch insert.'''

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
