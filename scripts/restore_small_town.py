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

Fike has been writing and recording the album between shows, using hotel rooms, the tour bus and backstage spaces as temporary studios. The road schedule has become part of the recording process rather than something separate from it, and "Small Town" came together during that stretch of touring.

The song and its video were developed across several cities. The visual was shot in Detroit and Seattle, while the release was completed from Dallas. Emma Ogier and Gabriel Jacoby contribute vocals, and Jacoby traveled in to help finish the track between shows.

{youtube}

*How To Quit Smoking* will be Fike's third studio album, following *What Could Possibly Go Wrong* and *Sunburn*. His 2025 project *Rocket* was released as a mixtape. The new album runs 15 tracks and includes both "Wallflower" and "Small Town."

Dominic Fike and Kevin Abstract are among the songwriters on "Small Town." Capi produced the track and also plays keyboards and drums. Devin Workman is another producer and contributes acoustic guitar and brass, while Nick Leonardo plays acoustic guitar and bass. Ogier and Jacoby are both credited on vocals.

The production keeps the arrangement relatively open around Fike's voice, with the additional vocals widening the chorus without turning the song into a full duet. Guitar, bass, drums, keyboards and brass all appear in the credits, but the track stays compact and direct rather than stacking every part at once.

The album campaign continues alongside the tour. Fike is scheduled for two Los Angeles shows at The Wiltern on September 29 and September 30 after dates in cities including Detroit, Seattle, Dallas, Austin and Albuquerque. *How To Quit Smoking* arrives October 9, bringing the touring and recording cycle into the same final stretch before release."""

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
    if runner.words(body) < 330:
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

    if runner.words(now.get("body") or "") < 330:
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
