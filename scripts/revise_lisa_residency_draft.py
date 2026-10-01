#!/usr/bin/env python3
"""Apply the owner's cosmetic proofreading corrections to the existing live LISA post.

Executed by the existing music98 editorial runner. Authentication stays in its
pre-existing GitHub Actions secret. This script never extracts or prints a key.
"""
from __future__ import annotations
import copy
import hashlib
import json
import sys
import time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import post as runner
import gate

POST_ID = "lisa26vegas"
EXPECTED_BODY_SHA256 = "fd34dd9609942c5d64ed9763188beabc7e4ccda378d2f84e5a4c84639361b57c"
REPLACEMENTS = [['The full schedule is November 12, 13 and 14, followed by November 27, 28 and 29.', 'The two additional dates were announced September 29, following the sellout of the original four shows.'], ['*SaWaDiKa*', '"SaWaDiKa"'], ['Its name comes from the Thai greeting', "The song's title comes from the Thai greeting"], ['moving through locations around the city with Thai references woven into the sets, styling and choreography.', 'with references to Thai culture in the sets, styling and choreography.'], ['At the same ceremony, *Dream feat. Kentaro Sakaguchi* won Best Pop.', 'At the same ceremony, the video for "Dream" won Best Pop.'], ['*Dream* was released as an official short film from *Alter Ego*.', 'The official short film for "Dream" was released after the song appeared on LISA\'s debut full-length album, *Alter Ego*.'], ['in a story centered on a past relationship and the memories that remain after it ends.', 'in a story about love, loss and the memories of a relationship.'], ['The film gives the song a narrative treatment rather than presenting it as a performance video, with LISA and Sakaguchi carrying the story on screen.', "The short film was directed by Ojun Kwon and released on LISA's LLOUD channel, with Sakaguchi playing her love interest."], ['The film follows a year in which LISA stepped away from BLACKPINK, focused on her solo career, moved into acting and built her own brand before returning to the group.', 'The film follows a year of solo work between BLACKPINK commitments, as LISA records her debut album, moves into acting and builds her own brand while preparing to return to the group.'], ['It opens in cinemas worldwide, including IMAX, on October 12 and will be available on YouTube Premium later.', 'It opens for a limited run in cinemas worldwide on October 12, including IMAX screenings. A global streaming release on YouTube Premium will follow.'], ['"SaWaDiKa", released September 4', '"SaWaDiKa," released September 4']]


def fresh_read():
    return runner.http(runner.DESK_API + "?nocache=" + str(time.time_ns()), runner.desk_key())


def media_layout(body):
    return [(i, q) for i, q in enumerate(gate.paragraphs(body)) if gate.is_media(q)]


def edited_body(body):
    if hashlib.sha256(body.encode("utf-8")).hexdigest() != EXPECTED_BODY_SHA256:
        raise RuntimeError("Live text changed after review; refusing to overwrite it")
    original = body
    for old, new in REPLACEMENTS:
        if old not in body:
            raise RuntimeError("Reviewed fragment missing")
        body = body.replace(old, new)
    if len(gate.paragraphs(body)) != len(gate.paragraphs(original)):
        raise RuntimeError("Paragraph structure changed")
    if media_layout(body) != media_layout(original):
        raise RuntimeError("Media or its position changed")
    return body


def main():
    runner.load_env()
    runner.desk_read = fresh_read
    gate.KEY = runner.desk_key()
    before = fresh_read()
    current = runner.find_post(before["posts"], POST_ID)
    if current.get("status") != "live":
        raise RuntimeError("Target is not live")
    body = edited_body(current.get("body") or "")
    candidate = copy.deepcopy(current)
    candidate["body"] = body
    protected = {k: copy.deepcopy(v) for k, v in current.items() if k != "body"}

    # Existing deterministic gate, on the exact proposed text, BEFORE any write.
    gate.CHECK_IDS = True
    fails, warns, info = gate.check_post(candidate, strict=True)
    print("PREWRITE_GATE", "FAIL" if fails else "PASS")
    print("PREWRITE_WARNINGS", json.dumps(warns, ensure_ascii=True))
    for code, message in info:
        if code in {"youtube", "apple", "cover", "cover-image", "length", "state"}:
            print("CHECK", code, message)
    if fails:
        print("PREWRITE_FAILURES", json.dumps(fails, ensure_ascii=True))
        raise RuntimeError("Candidate failed the editorial gate")
    if len(gate.prose_of(body).split()) < len(gate.prose_of(current["body"]).split()):
        raise RuntimeError("Cosmetic review must not reduce prose volume")

    backup_dir = Path(".editorial-backups")
    backup_dir.mkdir(exist_ok=True)
    (backup_dir / (POST_ID + "-" + str(time.time_ns()) + ".json")).write_text(
        json.dumps(before, ensure_ascii=True), encoding="ascii")

    def mutate(posts):
        p = runner.find_post(posts, POST_ID)
        if p.get("status") != "live":
            raise RuntimeError("Publication state changed")
        if {k: v for k, v in p.items() if k != "body"} != protected:
            raise RuntimeError("Protected fields changed after review")
        p["body"] = edited_body(p.get("body") or "")
        return copy.deepcopy(p)

    saved = runner.guarded_write(mutate)
    for attempt in range(20):
        if saved.get("body") == body:
            break
        time.sleep(2)
        saved = runner.find_post(fresh_read()["posts"], POST_ID)
    if saved.get("body") != body:
        raise RuntimeError("Saved body differs from reviewed body")
    if {k: v for k, v in saved.items() if k != "body"} != protected:
        raise RuntimeError("Protected fields changed on save")

    for pass_no in (1, 2, 3):
        ok, lines = runner.run_gate(POST_ID, quiet=False)
        print("POSTWRITE_GATE_PASS", pass_no, "PASS" if ok else "FAIL")
        for line in lines:
            if "PASS" in line or "FAIL" in line or line.lstrip().startswith(("X ", "! ")):
                print(line)
        if not ok:
            raise RuntimeError("Live post failed the gate")

    live = None
    for attempt in range(20):
        public = runner.http(runner.DESK_API + "?nocache=" + str(time.time_ns()))["posts"]
        live = next((x for x in public if x.get("id") == POST_ID), None)
        if live and live.get("body") == body:
            break
        time.sleep(2)
    else:
        raise RuntimeError("Public post has not updated")
    if {k: v for k, v in live.items() if k != "body"} != protected:
        raise RuntimeError("Public protected fields changed")
    print("WORDS", len(gate.prose_of(current["body"]).split()), "->", len(gate.prose_of(body).split()))
    print("LAYOUT_PRESERVED", len(gate.paragraphs(body)), media_layout(body))
    print("ALL_NON_BODY_FIELDS_PRESERVED", True)
    print("DONE_COSMETIC_LIVE_REVIEW", POST_ID)


if __name__ == "__main__":
    main()
