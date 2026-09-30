#!/usr/bin/env python3
from __future__ import annotations
import copy, sys, time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import post as runner

POST_ID = "auleon930r1"

BODY = '''LINKIN PARK have released *UNSHATTER Film Soundtrack (Live in São Paulo)*, a live record drawn from the São Paulo concert featured in the band's new *UNSHATTER* film. Released September 25 through Warner Records, it pairs songs from *FROM ZERO* with material from across the band's catalog.

The album follows the running order of one São Paulo performance rather than combining recordings from different tour stops. Its 16 full songs move between newer tracks including "The Emptiness Machine," "Casualty," "Two Faced," "Over Each Other" and "Heavy Is the Crown" and older material including "Somewhere I Belong," "The Catalyst," "Waiting for the End," "What I've Done," "Numb," "In the End," "Faint" and "Papercut." "Bleed It Out" closes the set.

[youtube:zNYsw-cW8v8]

The CD expands that sequence to 20 tracks with four short pieces placed between the performances. They are "Inception / Intro," "Creation / Interlude," "Break Collapse / Interlude" and "Resolution / Intro." The 2LP editions keep the 16 full songs and omit those four pieces. The CD comes in a gatefold softpak with a 12-panel accordion booklet, while the vinyl editions use a gatefold jacket with a 12-by-24-inch insert.

*UNSHATTER* traces the band's return from private studio sessions in 2022 through the making and release of *FROM ZERO* and the São Paulo concert. The film combines archive footage, performances and interviews with the band and fans, covering the period in which Emily Armstrong and Colin Brittain joined LINKIN PARK after the group's seven-year hiatus.

The official store says the soundtrack also includes live recordings that are not heard in the film. That gives the album a slightly different role from the documentary itself. The film follows the band's return and the making of *FROM ZERO*, while the soundtrack stays with the São Paulo stage and preserves more of that concert as an audio release.'''

EXCERPT = "LINKIN PARK have released *UNSHATTER Film Soundtrack (Live in São Paulo)*, a live album drawn from the São Paulo concert featured in the band's new *UNSHATTER* film."

def main():
    runner.load_env()

    def mutate(posts):
        p = next((x for x in posts if str(x.get("id")) == POST_ID), None)
        if not p:
            raise RuntimeError("LINKIN PARK draft not found")
        if (p.get("status") or "live") != "draft":
            raise RuntimeError("LINKIN PARK post is not a draft")
        p["body"] = BODY
        p["excerpt"] = EXCERPT
        return copy.deepcopy(p)

    runner.guarded_write(mutate)

    for attempt in range(12):
        desk = runner.http(runner.DESK_API + "?nocache=" + str(time.time_ns()), runner.desk_key())
        p = next((x for x in desk.get("posts", []) if str(x.get("id")) == POST_ID), None)
        if p and p.get("body") == BODY and p.get("excerpt") == EXCERPT and p.get("status") == "draft":
            break
        time.sleep(2)
    else:
        raise RuntimeError("revised LINKIN PARK draft did not propagate")

    for pass_no in (1, 2, 3):
        ok, lines = runner.run_gate(POST_ID, quiet=True)
        print("GATE_PASS", pass_no, "PASS" if ok else "FAIL")
        for line in lines:
            if "PASS" in line or "FAIL" in line or line.lstrip().startswith(("X ", "! ")):
                print(line)
        if not ok:
            raise RuntimeError(f"gate pass {pass_no} failed")

    print("LINKIN_REWRITE_OK", len(BODY.split()))

if __name__ == "__main__":
    main()
