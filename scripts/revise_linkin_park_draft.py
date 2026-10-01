#!/usr/bin/env python3
from __future__ import annotations
import copy, json, sys, time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import post as runner
import gate

POST_ID = "auleon930r1"
EXPECTED_BODY = r'''LINKIN PARK have released *UNSHATTER Film Soundtrack (Live in São Paulo)*, the live album tied to the band's new documentary. The album arrived September 25 through Warner Records and draws from the band's *FROM ZERO* album-release show at Allianz Parque in São Paulo. The concert also supplies the documentary's main live footage. While *UNSHATTER* cuts between the concert, studio sessions and interviews, the soundtrack gives that performance more room and includes live recordings that are not heard in the finished film.

The São Paulo set moves between *FROM ZERO* and earlier LINKIN PARK material throughout the night. "The Emptiness Machine," "Two Faced" and "Heavy Is the Crown" sit alongside "Somewhere I Belong," "Numb," "In the End," "Faint" and "Papercut," so the current lineup is heard across both the comeback record and songs from earlier eras. "Faint" was released ahead of the soundtrack with an official live video taken from the same performance, giving a direct preview of the show captured for the film and album.

[youtube:zNYsw-cW8v8]

The soundtrack extends the concert beyond what viewers hear in *UNSHATTER*. Several performances included on the album do not appear in the documentary, so the audio release preserves a broader section of the São Paulo show than the film does. That also gives Emily Armstrong and Colin Brittain a fuller live document with the band, moving from *FROM ZERO* material into songs recorded long before they joined and showing the current lineup move between both eras in the same concert.

*UNSHATTER* follows LINKIN PARK from private studio sessions in 2022 through the making and release of *FROM ZERO* and the return to live shows. Rare archive footage, performances from sold-out concerts and interviews with the band and fans cover the years after the group's seven-year hiatus and the process of starting again with new music. The film also follows the arrival of Emily Armstrong on vocals and Colin Brittain on drums as those early sessions develop into the lineup that eventually takes the new record onstage.

Directed by Joe Hahn, *UNSHATTER* opened in theaters worldwide on September 30 for a limited run. The film builds toward the São Paulo concert recorded on the day *FROM ZERO* was released, connecting the private sessions seen earlier in the documentary with the band's return in front of a full audience. The soundtrack stays with that performance for longer, preserving material the film leaves outside its final cut while keeping the concert tied to the same point in the band's comeback.

The physical editions use slightly different track lists. The CD has 20 tracks, adding four short intro or interlude pieces around the 16 full performances, while the two-LP edition keeps only those 16 complete songs across four sides. The CD comes in a gatefold softpak with a 12-panel accordion booklet. The vinyl editions use gatefold jackets and include a 12-by-24-inch insert, keeping the main difference between the formats in the extra short pieces included on the CD. Both formats were released for the soundtrack's September 25 launch.'''
BODY = r'''LINKIN PARK have released *UNSHATTER Film Soundtrack (Live in São Paulo)*, the live album tied to the band's new documentary. Released September 25 through Warner Records, it comes from the *FROM ZERO* album-release concert at Allianz Parque in São Paulo, Brazil. The same show provides most of the documentary's live footage. *UNSHATTER* moves between the concert, studio sessions and interviews, while the soundtrack stays with the stage and includes recordings that do not appear in the finished film. It works as a companion to the documentary, with the film and album using the same night in different ways.

The São Paulo set moves back and forth between *FROM ZERO* and earlier LINKIN PARK material. "The Emptiness Machine," "Two Faced" and "Heavy Is the Crown" are heard alongside "Somewhere I Belong," "Numb," "In the End," "Faint" and "Papercut." "Faint" was released ahead of the soundtrack with an official live video from the same night, showing Emily Armstrong and the current lineup taking on one of the band's long-standing live staples before the full album arrived. The older songs are not grouped into a separate nostalgia section; they sit throughout the set beside material that was new at the time.

[youtube:zNYsw-cW8v8]

The soundtrack includes more of the concert than *UNSHATTER* does. Several performances on the album are absent from the documentary, so the audio release preserves a larger part of the São Paulo show. Armstrong and drummer Colin Brittain are heard across the band's catalog, including songs recorded long before they joined. The album lets those performances run as a set, while the documentary uses only the songs it needs for the story.

*UNSHATTER* begins with private studio sessions from 2022 and follows the band through the writing and release of *FROM ZERO* and the return to live shows. Rare archive footage, sold-out performances and interviews with the band and fans fill in the years after LINKIN PARK's seven-year hiatus. The film also covers the arrival of Armstrong on vocals and Brittain on drums, following the lineup from those early sessions to the stage. By the time the film reaches São Paulo, those early sessions have become a stadium show.

Directed by Joe Hahn, *UNSHATTER* opened in theaters worldwide on September 30 for a limited run. Its live centerpiece is the São Paulo show held on the day *FROM ZERO* was released. The documentary reaches that concert after tracing the studio sessions and the band's return. The soundtrack does the opposite: it removes that documentary structure and keeps the focus on the performance, including songs that were left out of the final film.

The physical editions use slightly different track lists. The CD has 20 tracks: 16 complete performances plus four short intro or interlude pieces. The two-LP edition keeps the 16 full songs and leaves those shorter pieces out. The CD comes in a gatefold softpak with a 12-panel accordion booklet, while the vinyl editions use gatefold jackets with a 12-by-24-inch insert. Both formats were released September 25 alongside the digital soundtrack.'''
AI_STYLE_FLAGS = (
    "marks a new chapter","comes at a time","rather than simply",
    "serves as a","underscores","showcases","fuller live document",
    "keeping the concert tied","setting the stage","a testament to",
    "in the wake of","against the backdrop"
)

def fresh_read():
    return runner.http(runner.DESK_API + "?nocache=" + str(time.time_ns()), runner.desk_key())

def media_layout(body):
    return [(i, q) for i, q in enumerate(gate.paragraphs(body)) if gate.is_media(q)]

def main():
    runner.load_env()
    runner.desk_read = fresh_read
    gate.KEY = runner.desk_key()
    before = fresh_read()
    current = runner.find_post(before["posts"], POST_ID)
    if current.get("status") != "live":
        raise RuntimeError("LINKIN PARK target is not live")
    if current.get("rtype") != "Album":
        raise RuntimeError("Release type must remain Album")
    if current.get("body") != EXPECTED_BODY:
        raise RuntimeError("Live LINKIN PARK copy changed after review; refusing overwrite")

    protected = {k: copy.deepcopy(v) for k, v in current.items() if k != "body"}
    candidate = copy.deepcopy(current)
    candidate["body"] = BODY

    bad = [x for x in AI_STYLE_FLAGS if x in BODY.lower()]
    print("AI_STYLE_SCAN", bad)
    if bad:
        raise RuntimeError(f"AI-style phrase(s) remain: {bad}")
    if len(gate.paragraphs(BODY)) != len(gate.paragraphs(EXPECTED_BODY)):
        raise RuntimeError("Paragraph structure changed")
    if media_layout(BODY) != media_layout(EXPECTED_BODY):
        raise RuntimeError("Media layout changed")
    old_words = len(gate.prose_of(EXPECTED_BODY).split())
    new_words = len(gate.prose_of(BODY).split())
    if new_words < old_words:
        raise RuntimeError(f"LINKIN PARK text may not shrink: {old_words} -> {new_words}")

    gate.CHECK_IDS = True
    fails, warns, info = gate.check_post(candidate, strict=True)
    print("PREWRITE_GATE", "FAIL" if fails else "PASS")
    print("PREWRITE_WARNINGS", json.dumps(warns, ensure_ascii=True))
    if fails:
        print("PREWRITE_FAILURES", json.dumps(fails, ensure_ascii=True))
        raise RuntimeError("LINKIN PARK candidate failed gate")

    def mutate(posts):
        p = runner.find_post(posts, POST_ID)
        if p.get("status") != "live" or p.get("rtype") != "Album" or p.get("body") != EXPECTED_BODY:
            raise RuntimeError("LINKIN PARK live state changed during write")
        if {k: v for k, v in p.items() if k != "body"} != protected:
            raise RuntimeError("Protected LINKIN PARK fields changed")
        p["body"] = BODY
        return copy.deepcopy(p)

    saved = runner.guarded_write(mutate)
    for _ in range(20):
        if saved.get("body") == BODY:
            break
        time.sleep(2)
        saved = runner.find_post(fresh_read()["posts"], POST_ID)
    if saved.get("body") != BODY:
        raise RuntimeError("LINKIN PARK revision did not propagate")

    for pass_no in (1,2,3):
        ok, lines = runner.run_gate(POST_ID, quiet=False)
        print("POSTWRITE_GATE_PASS", pass_no, "PASS" if ok else "FAIL")
        if not ok:
            raise RuntimeError("Live LINKIN PARK post failed gate")
    runner.cmd_verify(POST_ID)
    print("WORDS", old_words, "->", new_words)
    print("RELEASE_TYPE", current.get("rtype"))
    print("LAYOUT_PRESERVED", len(gate.paragraphs(BODY)), media_layout(BODY))
    print("DONE_LINKIN_PARK_LANGUAGE_PASS")

if __name__ == "__main__":
    main()
