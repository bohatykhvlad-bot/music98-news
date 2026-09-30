#!/usr/bin/env python3
from __future__ import annotations
import copy, sys, time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import post as runner

POST_ID = "auleon930r1"

BODY = '''LINKIN PARK have released *UNSHATTER Film Soundtrack (Live in São Paulo)*, a live record drawn from the concert featured in the band's new *UNSHATTER* film. Released September 25 through Warner Records, the album combines *FROM ZERO* material with songs from earlier albums.

The soundtrack centers on the São Paulo performance featured in the film. Its 16 full songs place newer tracks including "The Emptiness Machine," "Casualty," "Two Faced," "Over Each Other" and "Heavy Is the Crown" alongside "Somewhere I Belong," "The Catalyst," "Waiting for the End," "What I've Done," "Numb," "In the End," "Faint" and "Papercut." "Bleed It Out" closes the set.

[youtube:zNYsw-cW8v8]

The CD expands that sequence to 20 tracks with four short pieces placed between the performances. They are "Inception / Intro," "Creation / Interlude," "Break Collapse / Interlude" and "Resolution / Intro." The 2LP tracklist keeps the 16 full songs and omits those four pieces. The CD comes in a gatefold softpak with a 12-panel accordion booklet. The Citrus 2LP is housed in a gatefold jacket with a 12-by-24-inch insert.

*UNSHATTER* traces the band's return from private studio sessions in 2022 through the making and release of *FROM ZERO* and its album-release show in Brazil. The film combines archive footage, performances and interviews with the band and fans, covering the period in which Emily Armstrong and Colin Brittain joined LINKIN PARK after the group's seven-year hiatus. The band's official store says some live recordings on the soundtrack are not heard in the film. Directed by Joe Hahn, *UNSHATTER* opened in theaters worldwide on September 30 for a limited run.'''

EXCERPT = "LINKIN PARK have released *UNSHATTER Film Soundtrack (Live in São Paulo)*, a live record drawn from the concert featured in the band's new *UNSHATTER* film."

def main():
    runner.load_env()

    def mutate(posts):
        p = next((x for x in posts if str(x.get("id")) == POST_ID), None)
        if not p:
            raise RuntimeError("LINKIN PARK draft not found")
        p["body"] = BODY
        p["excerpt"] = EXCERPT
        return copy.deepcopy(p)

    before = runner.desk_read()
    original = next((x for x in before.get("posts", []) if str(x.get("id")) == POST_ID), None)
    if not original:
        raise RuntimeError("LINKIN PARK post not found before write")
    original_status = original.get("status")
    runner.guarded_write(mutate)

    for attempt in range(12):
        desk = runner.http(runner.DESK_API + "?nocache=" + str(time.time_ns()), runner.desk_key())
        p = next((x for x in desk.get("posts", []) if str(x.get("id")) == POST_ID), None)
        if p and p.get("body") == BODY and p.get("excerpt") == EXCERPT and p.get("status") == original_status:
            break
        time.sleep(2)
    else:
        raise RuntimeError("revised LINKIN PARK draft did not propagate")

    # KV propagation can briefly expose the previous body to a different edge.
    # Require three clean gate reads, retrying only propagation-era failures.
    clean = 0
    attempts = 0
    while clean < 3 and attempts < 15:
        attempts += 1
        ok, lines = runner.run_gate(POST_ID, quiet=True)
        print("GATE_ATTEMPT", attempts, "PASS" if ok else "FAIL")
        for line in lines:
            if "PASS" in line or "FAIL" in line or line.lstrip().startswith(("X ", "! ")):
                print(line)
        if ok:
            clean += 1
        else:
            clean = 0
        if clean < 3:
            time.sleep(3)
    if clean < 3:
        raise RuntimeError("gate did not produce three consecutive clean reads")

    print("LINKIN_REWRITE_OK", len(BODY.split()))

if __name__ == "__main__":
    main()
