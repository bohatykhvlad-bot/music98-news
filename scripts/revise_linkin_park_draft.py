#!/usr/bin/env python3
from __future__ import annotations
import copy, json, sys, time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import post as runner
import gate

POST_ID = "auleon930r1"\n# apply-final-review-20261001
EXPECTED_EXCERPT = r'''LINKIN PARK have released *UNSHATTER Film Soundtrack (Live in São Paulo)*, the live album tied to the band's new documentary.'''
EXPECTED_BODY = r'''LINKIN PARK have released *UNSHATTER Film Soundtrack (Live in São Paulo)*, the live album tied to the band's new documentary. Released September 25 through Warner Records, it captures the concert featured throughout the film. The album presents the performance as a complete live release, while the documentary uses selected moments from the show alongside studio footage and interviews.

The São Paulo set mixes *FROM ZERO* songs with material from across the band's catalog. "The Emptiness Machine," "Two Faced" and "Heavy Is the Crown" appear alongside older staples including "Numb," "In the End" and "Papercut." The live version of "Faint" was released ahead of the soundtrack with an official video from the same performance. The video shows the current lineup performing one of the band's best-known songs before the full live album arrives.

[youtube:zNYsw-cW8v8]

The soundtrack also contains more live material than the documentary itself. Several recordings on the album are not heard in *UNSHATTER*, so listeners get a broader version of the concert than viewers do in the film. The additional material also documents Emily Armstrong and Colin Brittain performing with the band across both the new material and songs from earlier LINKIN PARK albums.

*UNSHATTER* follows the group from private studio sessions in 2022 through the making and release of *FROM ZERO* and the return to live shows. The film uses archive footage, footage from sold-out shows and interviews with the band and fans to cover the period after LINKIN PARK's seven-year hiatus. It also shows the transition into the current lineup, with Armstrong on vocals and Brittain on drums as the band begins performing the new record in front of audiences.

Directed by Joe Hahn, *UNSHATTER* opened in theaters worldwide on September 30 for a limited run. The concert provides the film's main live section, while the studio material and interviews trace the years that led to it. The documentary follows the band's return from the studio to the stage, and the soundtrack preserves more of the Brazilian performance.

The physical editions use slightly different track lists. The CD has 20 tracks, with four short pieces placed between the 16 full performances. The two-LP edition keeps the 16 complete songs and leaves those interludes out. The CD comes in a gatefold softpak with a 12-panel accordion booklet, while the vinyl edition is housed in a gatefold jacket with a 12-by-24-inch insert.'''
EXCERPT = EXPECTED_EXCERPT
BODY = r'''LINKIN PARK have released *UNSHATTER Film Soundtrack (Live in São Paulo)*, the live album tied to the band's new documentary. The record arrived September 25 through Warner Records and draws from the band's *FROM ZERO* album-release show at Allianz Parque in São Paulo in November 2024. The concert also supplies the documentary's main live footage. While *UNSHATTER* cuts between the concert, studio sessions and interviews, the soundtrack gives that performance more room and includes live recordings that are not heard in the finished film.

The São Paulo set moves between *FROM ZERO* and earlier LINKIN PARK material throughout the night. "The Emptiness Machine," "Two Faced" and "Heavy Is the Crown" sit alongside "Somewhere I Belong," "Numb," "In the End," "Faint" and "Papercut," so the current lineup is heard across both the comeback record and songs from earlier eras. "Faint" was released ahead of the soundtrack with an official live video taken from the same performance, giving a direct preview of the show captured for the film and album.

[youtube:zNYsw-cW8v8]

The soundtrack extends the concert beyond what viewers hear in *UNSHATTER*. Several performances included on the album do not appear in the documentary, so the audio release preserves a broader section of the São Paulo show than the film does. That also gives Emily Armstrong and Colin Brittain a fuller live document with the band, moving from *FROM ZERO* material into songs recorded long before they joined and showing the current lineup move between both eras in the same concert.

*UNSHATTER* follows LINKIN PARK from private studio sessions in 2022 through the making and release of *FROM ZERO* and the return to live shows. Rare archive footage, performances from sold-out concerts and interviews with the band and fans cover the years after the group's seven-year hiatus and the process of starting again with new music. The film also follows the arrival of Emily Armstrong on vocals and Colin Brittain on drums as those early sessions develop into the lineup that eventually takes the new record onstage.

Directed by Joe Hahn, *UNSHATTER* opened in theaters worldwide on September 30 for a limited run. The film builds toward the São Paulo concert recorded on the day *FROM ZERO* was released, connecting the private sessions seen earlier in the documentary with the band's return in front of a full audience. The soundtrack stays with that performance for longer, preserving material the film leaves outside its final cut while keeping the concert tied to the same point in the band's comeback.

The physical editions use slightly different track lists. The CD has 20 tracks, adding four short intro or interlude pieces around the 16 full performances, while the two-LP edition keeps only those 16 complete songs across four sides. The CD comes in a gatefold softpak with a 12-panel accordion booklet. The vinyl editions use gatefold jackets and include a 12-by-24-inch insert, keeping the main difference between the formats in the extra short pieces included on the CD. Both formats were released for the soundtrack's September 25 launch.'''
RELEASE_TYPE = "Live album"

AI_STYLE_FLAGS = (
    "marks a new chapter","comes at a time","not only","rather than simply",
    "serves as a","underscores","showcases","official store says",
    "the band's official store says","setting the stage","cementing",
    "a testament to","in the wake of","against the backdrop"
)

def fresh_read():
    return runner.http(runner.DESK_API + "?nocache=" + str(time.time_ns()), runner.desk_key())

def main():
    runner.load_env()
    runner.desk_read = fresh_read
    gate.KEY = runner.desk_key()
    before = fresh_read()
    current = runner.find_post(before["posts"], POST_ID)
    if current.get("status") != "live":
        raise RuntimeError("LINKIN PARK target is not live")
    if current.get("body") != EXPECTED_BODY or current.get("excerpt") != EXPECTED_EXCERPT:
        raise RuntimeError("Live LINKIN PARK copy changed after review; refusing to overwrite it")

    allowed = {"body", "excerpt", "rtype"}
    protected = {k: copy.deepcopy(v) for k, v in current.items() if k not in allowed}
    candidate = copy.deepcopy(current)
    candidate["excerpt"] = EXCERPT
    candidate["body"] = BODY
    candidate["rtype"] = RELEASE_TYPE

    low = BODY.lower()
    bad = [x for x in AI_STYLE_FLAGS if x in low]
    print("AI_STYLE_SCAN", bad)
    if bad:
        raise RuntimeError(f"AI-style phrase(s) remain: {bad}")

    gate.CHECK_IDS = True
    fails, warns, info = gate.check_post(candidate, strict=True)
    print("PREWRITE_GATE", "FAIL" if fails else "PASS")
    print("PREWRITE_WARNINGS", json.dumps(warns, ensure_ascii=True))
    if fails:
        print("PREWRITE_FAILURES", json.dumps(fails, ensure_ascii=True))
        raise RuntimeError("Candidate failed editorial gate")

    old_media = [q for q in gate.paragraphs(EXPECTED_BODY) if gate.is_media(q)]
    new_media = [q for q in gate.paragraphs(BODY) if gate.is_media(q)]
    if old_media != new_media:
        raise RuntimeError("Media markers changed")
    if len(gate.paragraphs(EXPECTED_BODY)) != len(gate.paragraphs(BODY)):
        raise RuntimeError("Paragraph structure changed")
    if len(gate.prose_of(BODY).split()) < len(gate.prose_of(EXPECTED_BODY).split()):
        raise RuntimeError("Revision unexpectedly reduced prose volume")

    def mutate(posts):
        p = runner.find_post(posts, POST_ID)
        if p.get("status") != "live":
            raise RuntimeError("Publication state changed")
        if p.get("body") != EXPECTED_BODY or p.get("excerpt") != EXPECTED_EXCERPT:
            raise RuntimeError("Live copy changed during guarded write")
        if {k: v for k, v in p.items() if k not in allowed} != protected:
            raise RuntimeError("Protected LINKIN PARK fields changed")
        p["excerpt"] = EXCERPT
        p["body"] = BODY
        p["rtype"] = RELEASE_TYPE
        return copy.deepcopy(p)

    saved = runner.guarded_write(mutate)
    for _ in range(20):
        if saved.get("body") == BODY and saved.get("rtype") == RELEASE_TYPE:
            break
        time.sleep(2)
        saved = runner.find_post(fresh_read()["posts"], POST_ID)
    if saved.get("body") != BODY or saved.get("excerpt") != EXCERPT or saved.get("rtype") != RELEASE_TYPE:
        raise RuntimeError("LINKIN PARK revision did not propagate")
    if {k: v for k, v in saved.items() if k not in allowed} != protected:
        raise RuntimeError("Protected fields changed on save")

    for pass_no in (1, 2, 3):
        ok, lines = runner.run_gate(POST_ID, quiet=False)
        print("POSTWRITE_GATE_PASS", pass_no, "PASS" if ok else "FAIL")
        for line in lines:
            if "PASS" in line or "FAIL" in line or line.lstrip().startswith(("X ", "! ")):
                print(line)
        if not ok:
            raise RuntimeError("Live LINKIN PARK post failed gate")

    runner.cmd_verify(POST_ID)
    live = runner.find_post(fresh_read()["posts"], POST_ID)
    print("WORDS", len(gate.prose_of(EXPECTED_BODY).split()), "->", len(gate.prose_of(BODY).split()))
    print("RELEASE_TYPE", live.get("rtype"))
    print("LAYOUT_PRESERVED", len(gate.paragraphs(BODY)), new_media)
    print("DONE_LINKIN_PARK_REVIEW")

if __name__ == "__main__":
    main()
