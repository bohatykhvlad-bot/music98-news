#!/usr/bin/env python3
from __future__ import annotations

import copy
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import post as runner

PID = "aufike18r1"

EXCERPT = (
    'Dominic Fike has released "Small Town," the second lead single from his forthcoming album '
    '*How To Quit Smoking*, due October 9 through Columbia Records.'
)

BODY_TEMPLATE = """Dominic Fike has released "Small Town," the second lead single from his forthcoming album *How To Quit Smoking*, due October 9 through Columbia Records. The track follows "Wallflower" and arrives while Fike is in the middle of his Comedy Tragedy Parody tour across North America.

Fike has been writing and recording the album between shows, using hotel rooms, the tour bus and backstage spaces as temporary studios. "Small Town" came together during that stretch, with recording continuing as the tour crossed North America.

The video was shot in Detroit and Seattle. Fike released the track from Dallas, where Gabriel Jacoby joined him to help finish it. Emma Ogier and Jacoby both contribute vocals, tying the final recording to the same run of dates that shaped the song.

{youtube}

*How To Quit Smoking* will be Fike's third studio album, following *What Could Possibly Go Wrong* and *Sunburn*. His 2025 project *Rocket* was released as a mixtape. The new album contains 15 songs and includes both "Wallflower" and "Small Town."

Dominic Fike and Kevin Abstract are among the songwriters on "Small Town." Capi produced the track and also plays keyboards and drums. Devin Workman is another producer and contributes acoustic guitar and brass, while Nick Leonardo plays acoustic guitar and bass. Ogier and Jacoby are both credited on vocals.

The album has taken shape alongside the tour rather than during a separate studio block. Stops on the current run have included Detroit, Seattle, Dallas, Austin and Albuquerque, while writing and recording have continued between shows. That schedule has also fed directly into the visual side of the release, with the "Small Town" video filmed during the same run. Fike plays two nights at The Wiltern in Los Angeles on September 29 and September 30, and *How To Quit Smoking* arrives October 9."""

def main():
    runner.load_env()
    before = runner.desk_read()["posts"]
    current = next((p for p in before if p.get("id") == PID), None)
    if current is None:
        raise RuntimeError("Small Town post not found")
    if current.get("status") != "live":
        raise RuntimeError(f"expected live post, got {current.get('status')!r}")

    media = re.findall(r"^\[(?:youtube|apple|tiktok|instagram)[^\]]*\]$", current.get("body") or "", re.M | re.I)
    youtube = next((m for m in media if m.lower().startswith("[youtube:")), None)
    if not youtube:
        raise RuntimeError("existing Small Town YouTube marker not found")

    body = BODY_TEMPLATE.format(youtube=youtube)

    if not body.startswith(EXCERPT):
        raise RuntimeError("excerpt is not a literal prefix")
    if any(ch in body for ch in ("’", "‘")):
        raise RuntimeError("curly apostrophe found")
    if body.count(youtube) != 1:
        raise RuntimeError("YouTube marker count mismatch")
    if runner.words(body) < 290:
        raise RuntimeError(f"restored body too short: {runner.words(body)} words")

    preserved = {
        key: copy.deepcopy(current.get(key))
        for key in ("type", "tag", "rtype", "artist", "title", "date", "pinned", "status", "publishAt", "cover")
    }

    def mutate(posts):
        p = next((x for x in posts if x.get("id") == PID), None)
        if p is None:
            raise RuntimeError("Small Town post vanished before write")
        p["excerpt"] = EXCERPT
        p["body"] = body
        return p

    now = runner.guarded_write(mutate)

    for key, value in preserved.items():
        if now.get(key) != value:
            raise RuntimeError(f"preserved field changed: {key}")

    if runner.words(now.get("body") or "") < 290:
        raise RuntimeError("live post is still too short after write")

    print("SMALL_TOWN_RESTORED", runner.words(now["body"]), "words")
    print("MEDIA_PRESERVED", youtube)
    print("COVER_PRESERVED", now.get("cover") == preserved["cover"])

    ok = runner.cmd_gate(PID)
    if not ok:
        raise RuntimeError("gate failed after restoration")

    runner.cmd_verify(PID)
    runner.cmd_show(PID)

if __name__ == "__main__":
    main()
