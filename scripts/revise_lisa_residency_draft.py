#!/usr/bin/env python3
from __future__ import annotations
import copy, json, re, sys, time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import post as runner
import gate

POST_ID = "lisa26vegas"
EXPECTED_TEMPLATE = r'''LISA has expanded VIVA LA LISA at The Colosseum at Caesars Palace to six shows after the original four dates sold out in under 10 minutes. The new performances are November 12 and 29, joining the previously announced November 13, 14, 27 and 28 dates. That gives each of the two Las Vegas weekends three shows instead of two.

The residency was first announced in March with four dates, and the September 29 expansion added one show to each weekend. Tickets for the two new performances went on sale September 30 through Ticketmaster. VIVA LA LISA is the first Las Vegas residency by a K-pop artist, and all six shows will take place at The Colosseum, the 4,300-seat theater inside Caesars Palace.

[apple:song:6807119565:6807119568]

The residency begins less than three weeks after *PRESS PLAY*, LISA's new six-track EP, arrives on October 23. "SaWaDiKa," released September 4, is the first song from the project. The official tracklist currently shows it followed by five tracks whose titles have not yet been revealed. The song's title comes from the Thai greeting for "hello," and the video takes LISA back to Bangkok, with references to Thai culture in the sets, styling and choreography. The video drew 70.8 million views in its first 24 hours.

LISA performed "SaWaDiKa" at the 2026 MTV Video Music Awards, with a tuk-tuk worked into the staging as another nod to Thailand. At the same ceremony, the video for "Dream" won Best Pop. The video was also nominated for Best K-Pop, while its cinematography and editing received separate nominations.

[youtube:FMX98ROVRCE]

"Dream" first appeared on LISA's debut full-length album, *Alter Ego*, and later received an official short film. LISA stars opposite Japanese actor Kentaro Sakaguchi in a story about love, loss and the memories of a relationship. The short film was directed by Ojun Kwon and released on LISA's LLOUD channel, with Sakaguchi playing her love interest.

[tickets:__TICKET__]

LISA's fall schedule also includes *Always Lalisa*, the feature documentary directed by Sue Kim that premiered at the Toronto International Film Festival in September. The film follows a year of solo work between BLACKPINK commitments, including recording and releasing *Alter Ego*, making her acting debut in *The White Lotus* and preparing for her 2025 Coachella solo set. Beginning October 12, *Always Lalisa* will play in IMAX and cinemas worldwide for a limited engagement. It will then stream globally and exclusively on YouTube Premium later in 2026.'''
BODY_TEMPLATE = r'''LISA has expanded VIVA LA LISA at The Colosseum at Caesars Palace to six shows after the original four dates sold out in under 10 minutes. The new performances are November 12 and 29, joining the previously announced November 13, 14, 27 and 28 dates. That gives each of the two Las Vegas weekends three shows instead of two.

The residency was first announced in March with four dates, and the September 29 expansion added one show to each weekend. Tickets for the two new performances went on sale September 30 through Ticketmaster. VIVA LA LISA is the first Las Vegas residency by a K-pop artist, and all six shows will take place at The Colosseum, the 4,300-seat theater inside Caesars Palace. The added dates keep the run within the same two November weekends, expanding each weekend from two shows to three rather than stretching the residency across a longer period.

[apple:song:6807119565:6807119568]

The residency begins less than three weeks after *PRESS PLAY*, LISA's new six-track EP, arrives on October 23. "SaWaDiKa," released September 4, is the first song from the project. The official tracklist currently shows it followed by five tracks whose titles have not yet been revealed. The song's title comes from the Thai greeting for "hello," and the video takes LISA back to Bangkok, with references to Thai culture in the sets, styling and choreography. The video drew 70.8 million views in its first 24 hours.

LISA performed "SaWaDiKa" at the 2026 MTV Video Music Awards, with a tuk-tuk worked into the staging as another nod to Thailand. At the same ceremony, the video for "Dream" won Best Pop, making LISA the first K-pop artist to win the category. The video was also nominated for Best K-Pop, while its cinematography and editing received separate nominations.

[youtube:FMX98ROVRCE]

"Dream" first appeared on LISA's debut full-length album, *Alter Ego*, and later received an official short film. LISA stars opposite Japanese actor Kentaro Sakaguchi in a bittersweet story about two people looking back on a relationship they can no longer return to. Written and directed by OJun Kwon, the film moves through quiet, cinematic scenes rather than treating the song as a conventional performance video. It was released through LISA's LLOUD channel in August 2025, several months after *Alter Ego*.

[tickets:__TICKET__]

LISA's fall schedule also includes *Always Lalisa*, the feature documentary directed by Sue Kim that premiered at the Toronto International Film Festival in September. The film follows a year in which her solo work moves to the foreground between BLACKPINK commitments, including the release of *Alter Ego*, her acting debut in *The White Lotus*, the growth of LLOUD and preparations for her 2025 Coachella solo set. It also looks at the pressure of building a solo career and a public identity outside the group while keeping the return to BLACKPINK in view. Beginning October 12, *Always Lalisa* will play in IMAX and cinemas worldwide for a limited engagement. It will then stream globally and exclusively on YouTube Premium later in 2026.'''

AI_STYLE_FLAGS = (
    "marks a new chapter","comes at a time","not only","rather than simply",
    "serves as a","underscores","showcases","the announcement lands",
    "in a move that","signals a","cementing","further solidifies",
    "setting the stage","against the backdrop","in the wake of",
    "at a time when","a testament to","pivotal year","beyond the residency",
    "playing her love interest"
)

def fresh_read():
    return runner.http(runner.DESK_API + "?nocache=" + str(time.time_ns()), runner.desk_key())

def ticket_from(body):
    m = re.search(r"(?im)^\s*\[tickets:(https?://[^\]]+)\]\s*$", body or "")
    if not m:
        raise RuntimeError("Existing LISA ticket CTA not found")
    return m.group(1)

def media_layout(body):
    return [(i, q) for i, q in enumerate(gate.paragraphs(body)) if gate.is_media(q)]

def main():
    runner.load_env()
    runner.desk_read = fresh_read
    gate.KEY = runner.desk_key()
    before = fresh_read()
    current = runner.find_post(before["posts"], POST_ID)
    if current.get("status") != "live":
        raise RuntimeError("LISA target is not live")

    ticket = ticket_from(current.get("body") or "")
    expected = EXPECTED_TEMPLATE.replace("__TICKET__", ticket)
    body = BODY_TEMPLATE.replace("__TICKET__", ticket)
    if current.get("body") != expected:
        raise RuntimeError("Live LISA copy changed after review; refusing to overwrite it")

    protected = {k: copy.deepcopy(v) for k, v in current.items() if k != "body"}
    candidate = copy.deepcopy(current)
    candidate["body"] = body

    bad = [x for x in AI_STYLE_FLAGS if x in body.lower()]
    print("AI_STYLE_SCAN", bad)
    if bad:
        raise RuntimeError(f"AI-style phrase(s) remain: {bad}")
    if len(gate.paragraphs(body)) != len(gate.paragraphs(expected)):
        raise RuntimeError("Paragraph structure changed")
    if media_layout(body) != media_layout(expected):
        raise RuntimeError("Media layout changed")
    old_words = len(gate.prose_of(expected).split())
    new_words = len(gate.prose_of(body).split())
    if not (old_words + 90 <= new_words <= old_words + 110):
        raise RuntimeError(f"Expected about +100 words, got {old_words} -> {new_words}")

    gate.CHECK_IDS = True
    fails, warns, info = gate.check_post(candidate, strict=True)
    print("PREWRITE_GATE", "FAIL" if fails else "PASS")
    print("PREWRITE_WARNINGS", json.dumps(warns, ensure_ascii=True))
    if fails:
        print("PREWRITE_FAILURES", json.dumps(fails, ensure_ascii=True))
        raise RuntimeError("LISA candidate failed gate")

    def mutate(posts):
        p = runner.find_post(posts, POST_ID)
        live_ticket = ticket_from(p.get("body") or "")
        if p.get("status") != "live" or live_ticket != ticket or p.get("body") != expected:
            raise RuntimeError("LISA live state changed during write")
        if {k: v for k, v in p.items() if k != "body"} != protected:
            raise RuntimeError("Protected LISA fields changed")
        p["body"] = body
        return copy.deepcopy(p)

    saved = runner.guarded_write(mutate)
    for _ in range(20):
        if saved.get("body") == body:
            break
        time.sleep(2)
        saved = runner.find_post(fresh_read()["posts"], POST_ID)
    if saved.get("body") != body:
        raise RuntimeError("LISA revision did not propagate")

    for pass_no in (1, 2, 3):
        ok, lines = runner.run_gate(POST_ID, quiet=False)
        print("POSTWRITE_GATE_PASS", pass_no, "PASS" if ok else "FAIL")
        if not ok:
            raise RuntimeError("Live LISA post failed gate")
    runner.cmd_verify(POST_ID)
    print("WORDS", old_words, "->", new_words)
    print("LAYOUT_PRESERVED", len(gate.paragraphs(body)), media_layout(body))
    print("DONE_LISA_PLUS_100")

if __name__ == "__main__":
    main()
