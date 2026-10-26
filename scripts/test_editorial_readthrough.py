#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Regression tests for music98 editorial quality + two-pass read barrier."""
from __future__ import annotations

import sys
import tempfile
from pathlib import Path

import editorial_readthrough as er
import canon_checks as cc
import preflight as pf
from gate import check_post


SOURCE = """The opening section explains how the project changed during writing and recording, keeping the focus on the choices that matter to the listener rather than on every available production detail. The paragraph then connects those choices to the finished songs, giving the article a clear reason to move forward without repeating the same factual point in a second form.

The closing section adds a final piece of context about how the artist approached the finished work and why one late decision changed the final sequence. It avoids a list of dates, credits, formats or administrative details, and it ends on information the reader has not already been given in the opening paragraph."""
FINAL = SOURCE.replace(
    "changed during writing and recording",
    "took shape during writing and recording",
)

BAD_LOLA = {
    "id": "bad-lola",
    "type": "news",
    "artist": "Lola Young",
    "title": "Lola Young Announces 2027 Everything Begins Tour",
    "body": """Lola Young has announced a North American tour for 2027. The run follows her return to live performance and brings her back to the United States and Canada.

Radio City Music Hall, Massey Hall and the Greek Theatre are among the standout bookings. Those venues make the jump in scale clear, while the announced run gives the singer a broader platform for the next phase of her career.

Artist presales begin October 7 before the general sale. Tickets are available through the official tour channels.

The interruption remains part of the context, but the announcement is finally about what comes next. The tour, larger rooms and new material together tell the story of a new chapter."""
}

BAD_REPEAT_TITLE = {
    "id": "bad-repeat-title",
    "type": "news",
    "artist": "Lola Young",
    "title": "Lola Young Announces Everything Begins Tour",
    "body": """Lola Young has announced the Everything Begins Tour after returning to live work. The article establishes the news and gives enough context to make this a normal editorial paragraph rather than a stub.

The tour title comes from her tattoo and the phrase Everything Begins appears here as the subject. The following sentence repeats Everything Begins again without adding anything, creating the visible echo the checker should reject.

The final paragraph contains separate reporting and enough detail to keep the fixture structurally valid. It ends on a different fact so the repeated title phrase remains the isolated defect under test."""
}

BAD_SURNAME_BRIDGE = {
    "id": "bad-surname-bridge",
    "type": "news",
    "artist": "Lola Young",
    "title": "Lola Young Announces a Tour",
    "body": """Lola Young has announced a new tour after returning to live work. The article establishes her name once and then continues with ordinary context about the schedule and the year that led to it.

The first major marker came at the Grammys. "Messy" won Best Pop Solo Performance and Young performed the song on the broadcast before returning to headline shows later in the year.

The closing paragraph contains enough additional reporting to keep this fixture structurally valid. It ends on a different factual point and is intentionally written without another surname bridge so the test isolates the exact construction."""
}

BAD_NAME_RHYTHM = {
    "id": "bad-name-rhythm",
    "type": "news",
    "artist": "Lola Young",
    "title": "Lola Young Announces a Tour",
    "body": """Lola Young has announced a tour for next year. Young will return to North America after a break from touring. Young will bring new material to the shows before returning to Europe later in the year.

The second paragraph contains enough context to keep this fixture structurally valid while the name-rhythm check isolates the actual defect. It adds reporting rather than another repetition of the artist's surname and closes on a different factual point."""
}

BAD_CHOPPY = {
    "id": "bad-choppy",
    "type": "news",
    "artist": "Example Artist",
    "title": "Example Artist Announces New Project",
    "body": """Example Artist has announced a new project after a long period of writing and recording, with the first part of the article explaining what changed and why the new work matters. The opening has enough reporting and context to function as a proper paragraph instead of a teaser stretched into the body. It establishes the subject without turning the article into a list of dates or credits.

This paragraph is deliberately short even though the article around it is substantial. It behaves like a patch rather than a developed idea and should be rejected by the rhythm check.

The middle section contains another full paragraph with enough detail to carry its own editorial job. It develops a separate part of the story, adds context the reader did not already have and avoids repeating the opening in different words. The point of this fixture is not style but structure, so this paragraph stays deliberately conventional while giving the checker enough article-length material to evaluate rhythm across the complete body.

Another short paragraph interrupts the flow and exists mainly to prove that repeated two-or-three-line blocks should not pass just because each individual sentence is grammatical and factual.

The final section is again fully developed, adding a concrete closing detail that has not already been stated and giving the piece a natural end. It is long enough to show that the problem is the repeated short blocks in the middle, not a globally short article or an artificially low word count. The checker should identify the chopped rhythm even though the surrounding paragraphs are healthy. To keep the fixture safely above the article-length threshold, this final section also adds more ordinary context about sequencing, pacing and the difference between a developed paragraph and a patch. None of those extra sentences introduces a separate defect. They simply ensure that the test represents a normal-length news article whose overall word count cannot be blamed for the short blocks in the middle. The expected failure must therefore come from paragraph rhythm itself rather than from a globally brief draft."""
}


BAD_QUAVO = {
    "id": "bad-quavo",
    "type": "release",
    "artist": "Quavo",
    "title": "QRÖMELIFE",
    "body": """Quavo has released QRÖMELIFE, a new solo album shaped by work with Pharrell Williams and by the years since Takeoff's death. The project also includes a reunion with Offset.

The record moves between rap and club music while returning to the melodic instincts associated with his earlier work. Fatherhood adds another layer to the album's new direction.

A 16-track extended version followed a day after the standard edition, adding two versions of "HOTEL LOBBY (Unc & Phew)" with Takeoff. QRÖMELIFE does not try to rebuild Migos or repeat Rocket Power. It catches Quavo at a point where the past remains visible, while reconciliation, fatherhood and a renewed creative partnership are beginning to carry equal weight. &#x20;"""
}


def run(args, remote_body=None):
    old_argv = sys.argv[:]
    old_loader = er.load_remote
    if remote_body is not None:
        er.load_remote = lambda pid: {"id": pid, "body": remote_body}
    sys.argv = ["editorial_readthrough.py", *args]
    try:
        er.main()
        return 0
    except SystemExit as exc:
        return int(exc.code or 0)
    finally:
        sys.argv = old_argv
        er.load_remote = old_loader


def assert_quality_regressions():
    lola_fails, _ = er.inspect(BAD_LOLA, set())
    joined = "\n".join(lola_fails)
    assert "venue roll call" in joined
    assert "platform ticketing jargon" in joined
    assert "administrative ticketing language" in joined
    assert "canned recap construction" in joined or "generic PR abstraction" in joined

    quavo_fails, _ = er.inspect(BAD_QUAVO, set())
    joined = "\n".join(quavo_fails)
    assert "HTML entity leaked" in joined
    assert "administrative/release-format metadata" in joined
    assert "canned recap construction" in joined
    assert "canned transition" in joined or "generic PR abstraction" in joined

    repeat_fails, _ = er.inspect(BAD_REPEAT_TITLE, set())
    assert "repeated title/proper-name phrase" in "\n".join(repeat_fails)

    bridge_fails, _ = er.inspect(BAD_SURNAME_BRIDGE, set())
    assert "mechanical surname bridge" in "\n".join(bridge_fails)

    name_fails, _ = er.inspect(BAD_NAME_RHYTHM, set())
    assert "three consecutive sentences" in "\n".join(name_fails)

    choppy_fails, choppy_notes = er.inspect(BAD_CHOPPY, set())
    joined = "\n".join(choppy_notes)
    assert "choppy article paragraph" in joined
    assert "paragraph rhythm" in joined
    assert not any("choppy article paragraph" in x for x in choppy_fails)



def prose_until(target, artist="Example Artist", song="North Star"):
    lede = (
        '%s has released "%s," a new single that arrived with a short film '
        "and a clear release plan." % (artist, song)
    )
    paras = [lede]
    index = 0
    while cc.prose_word_count("\n\n".join(paras)) < target:
        index += 1
        paras.append(
            "Session %d kept one unused vocal from the first week of recording. "
            "Take %d changed the bridge and left the melody intact for the chorus. "
            "Note %d from the studio log explains why the last overdub stayed quiet."
            % (index, index, index)
        )
    return paras


def assemble(paras, embeds=1):
    if embeds == 1:
        return "\n\n".join(paras[:-1]) + "\n\n[youtube:abcdefghijk]\n\n" + paras[-1]
    middle = max(1, len(paras) // 2)
    return (
        "\n\n".join(paras[:middle])
        + "\n\n[youtube:abcdefghijk]\n\n"
        + "\n\n".join(paras[middle:-1])
        + "\n\n[youtube:bbcdefghijk]\n\n"
        + paras[-1]
    )


def healthy(target=430, ptype="news", embeds=1, artist="Example Artist", song="North Star"):
    paras = prose_until(target, artist, song)
    lede = paras[0]
    post = {
        "id": "healthy-" + ptype,
        "status": "draft",
        "type": ptype,
        "artist": artist,
        "title": '%s Releases "%s" With a Short Film' % (artist, song) if ptype == "news" else song,
        "excerpt": lede,
        "body": assemble(paras, embeds=embeds),
        "cover": {
            "kind": "img",
            "src": "photos/example.jpg",
            "credit": "Ada Lovelace",
            "creditUrl": "https://adalovelace.example/",
        },
    }
    if ptype == "release":
        post["rtype"] = "Single"
    return post


def assert_news_word_floor():
    short = healthy(320)
    assert pf.check(short, None, None) is False
    ready = healthy(430)
    assert cc.prose_word_count(ready["body"]) >= 400
    assert pf.check(ready, None, None) is True
    assert not any(code == "colon" for code, _message in cc.mechanical_issues(ready))



def assert_single_release_format():
    original = healthy(430, ptype="release", artist="Tate McRae", song="Housewife")
    original["title"] = "Housewife"
    original["excerpt"] = original["body"].split("\n\n", 1)[0]
    assert "Housewife" in original["excerpt"]
    assert pf.check(original, None, None), "Single + video must pass without duplicate Apple embed"
    invalid = dict(original, title="Tate McRae releases Housewife with a new video")
    assert not pf.check(invalid, None, None), "Release title must not contain artist or news headline"


def codes(post, **kwargs):
    return [code for code, _message in cc.mechanical_issues(post, **kwargs)]


def assert_canon_rules():
    ready = healthy(430)
    assert "excerpt" not in codes(ready)
    assert "word-count" not in codes(ready)
    assert "media-count" not in codes(ready)
    assert "first-person" not in codes(ready)
    assert "colon" not in codes(ready)

    clipped = dict(ready, excerpt="Example Artist has released")
    assert "excerpt" in codes(clipped)
    later = dict(ready, excerpt="Take 1 changed the bridge and left the melody intact for the chorus.")
    assert "excerpt" in codes(later)

    long_short = healthy(1100, ptype="longread", embeds=2)
    assert "word-count" in codes(long_short)
    long_ready = healthy(1220, ptype="longread", embeds=2)
    assert "word-count" not in codes(long_ready)
    assert pf.check(long_ready, None, None) is True
    assert pf.check(long_ready, None, None, min_words=1300) is False

    thin_media = healthy(430, embeds=1)
    thin_media["type"] = "longread"
    thin_media["body"] = thin_media["body"] + "\n\n[youtube:bbcdefghijk]"
    assert "media-end" in codes(thin_media)
    assert "media-count" not in codes(thin_media)

    bare = healthy(430)
    bare["body"] = bare["body"].replace("[youtube:abcdefghijk]", "")
    assert "media-count" in codes(bare)
    crowded = healthy(430)
    crowded["body"] = crowded["body"].replace(
        "[youtube:abcdefghijk]",
        "[youtube:abcdefghijk]\n\n[youtube:bbcdefghijk]\n\n[photo:photos/x.jpg|Ada Lovelace|https://adalovelace.example/]",
    )
    assert "media-count" in codes(crowded)
    adjacent = healthy(430)
    adjacent["body"] = adjacent["body"].replace(
        "[youtube:abcdefghijk]",
        "[youtube:abcdefghijk]\n\n[youtube:bbcdefghijk]",
    )
    assert "media-pair" in codes(adjacent)

    person = healthy(430)
    person["body"] = person["body"].replace("Session 1 kept", "I kept", 1)
    assert "first-person" in codes(person)
    quoted = healthy(430)
    quoted["body"] = quoted["body"].replace(
        "Session 1 kept one unused vocal",
        'Session 1 kept one unused vocal and she said "I kept the first take"',
        1,
    )
    assert "first-person" not in codes(quoted)

    for phrase, token in (
        ("moving forward", "moving forward"),
        ("this highlights", "this highlights"),
        ("a new chapter", "new chapter"),
    ):
        tainted = healthy(430)
        tainted["body"] = tainted["body"].replace("Session 1 kept", "Session 1 kept " + phrase + " after", 1)
        assert "ai-filler" in codes(tainted), phrase

    colon = healthy(430)
    colon["body"] = colon["body"].replace("Session 1 kept", "Session 1 kept this: a", 1)
    assert "colon" in codes(colon)
    clock = healthy(430)
    clock["body"] = clock["body"].replace("Session 1 kept", "Session 1 kept the 8:30", 1)
    assert "colon" not in codes(clock)
    semi = healthy(430)
    semi["body"] = semi["body"].replace("Session 1 kept", "Session 1 kept one vocal; another", 1)
    assert "semicolon" in codes(semi)
    dash = healthy(430)
    dash["body"] = dash["body"].replace("Session 1 kept", "Session 1 kept one vocal — another", 1)
    assert "em-dash" in codes(dash)

    repeated = healthy(430)
    repeated["body"] = "Example Artist will open in Austin with the full band on night one.\n\n" + repeated["body"].replace(
        "Session 2 kept",
        "Example Artist will open in Dallas with the same band",
        1,
    )
    assert "opening-repeat" in codes(repeated)

    listed = healthy(430)
    listed["body"] = listed["body"].replace(
        "Session 1 kept one unused vocal from the first week of recording. "
        "Take 1 changed the bridge and left the melody intact for the chorus. "
        "Note 1 from the studio log explains why the last overdub stayed quiet.",
        "Austin, Dallas, Denver, Phoenix and Tucson.",
        1,
    )
    assert "list-like" in codes(listed)

    for replacement, label in (
        ("In short, the tour is a new chapter.", "recap"),
        ("May 4, 2027.", "date"),
        ("The crowd hit 40000.", "number"),
        ("Tickets are available now.", "purchase"),
    ):
        ended = healthy(430)
        ended["body"] = ended["body"].rsplit("\n\n", 1)[0] + "\n\n" + replacement
        assert "ending" in codes(ended), label

    untitled = healthy(430)
    untitled["body"] = untitled["body"].replace('has released "North Star,"', "has released the single North Star,", 1)
    assert "song-title" in codes(untitled)
    boat = healthy(430)
    boat["body"] = boat["body"].replace("Session 1 kept", "Session 1 kept a yacht named Tati and", 1)
    assert "song-title" not in codes(boat)
    quoted_title = healthy(430)
    assert "song-title" not in codes(quoted_title)

    linked = healthy(430)
    linked["body"] = linked["body"].replace(
        "Session 1 kept",
        "Session 1 kept a note from https://pitchfork.com/news/example/ about",
        1,
    )
    assert "competing-link" in codes(linked)
    apple = healthy(430)
    apple["body"] = apple["body"].replace(
        "Session 1 kept",
        "Session 1 kept the page https://music.apple.com/us/album/example/1 in",
        1,
    )
    assert "competing-link" not in codes(apple)

    chart = healthy(430)
    chart["title"] = "Example Artist Debuts at No. 1 on the Billboard Hot 100"
    assert "chart-news" in codes(chart)

    courtesy = healthy(430)
    courtesy["body"] = courtesy["body"].replace(
        "[youtube:abcdefghijk]",
        "[photo:photos/x.jpg|Courtesy|https://www.instagram.com/ada/]",
    )
    assert "photo-credit" in codes(courtesy)
    article = healthy(430)
    article["cover"] = dict(article["cover"], creditUrl="https://www.billboard.com/music/pop/example-photo/")
    assert "photo-credit" in codes(article)
    portfolio = healthy(430)
    portfolio["cover"] = dict(portfolio["cover"], creditUrl="https://www.instagram.com/adalovelace/")
    assert "photo-credit" not in codes(portfolio)

    dated = healthy(430)
    dated["body"] = dated["body"].replace(
        "Session 1 kept",
        "Session 1 kept the biggest week after a demo finished in March 2019 and",
        1,
    )
    fails, _warns, info = check_post(dated, strict=True)
    assert not any(code == "date-unregistered" for code, _message in fails)
    date_lines = [message for code, message in info if code == "dates"]
    assert date_lines and all("NOT RUN" in message and "PASS" not in message for message in date_lines)
    assert not any(code == "superlative" for code, _message in fails)

    for line in cc.manual_not_run():
        assert line.startswith("NOT RUN")
        assert "PASS" not in line

    manual_gate = [message for code, message in info if "NOT RUN" in message]
    assert manual_gate

def main():
    assert_quality_regressions()
    assert_news_word_floor()
    assert_single_release_format()
    assert_canon_rules()

    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        er.STATE = root / "state.json"
        source = root / "source.txt"
        final = root / "final.txt"
        source.write_text(SOURCE, encoding="utf-8")
        final.write_text(FINAL, encoding="utf-8")
        pid = "workflow-test"

        # A final read alone must never authorize a write.
        assert run([
            "--post", pid, "--body-file", str(final), "--phase", "post-edit",
            "--confirm-full-read",
        ]) == 0
        assert run([
            "--post", pid, "--body-file", str(final), "--phase", "post-edit",
            "--check-stamp",
        ], remote_body=SOURCE) == 1

        # Read exact source, then exact final body.
        assert run([
            "--post", pid, "--body-file", str(source), "--phase", "pre-edit",
            "--confirm-full-read",
        ]) == 0
        assert run([
            "--post", pid, "--body-file", str(final), "--phase", "post-edit",
            "--confirm-full-read",
        ]) == 0
        assert run([
            "--post", pid, "--body-file", str(final), "--phase", "post-edit",
            "--check-stamp",
        ], remote_body=SOURCE) == 0

        # Any final edit invalidates the post-edit stamp.
        final.write_text(FINAL + " A later local edit makes the final hash stale.", encoding="utf-8")
        assert run([
            "--post", pid, "--body-file", str(final), "--phase", "post-edit",
            "--check-stamp",
        ], remote_body=SOURCE) == 1

        # A changed desk source invalidates PRE_EDIT.
        final.write_text(FINAL, encoding="utf-8")
        assert run([
            "--post", pid, "--body-file", str(final), "--phase", "post-edit",
            "--check-stamp",
        ], remote_body=SOURCE + "\n\nChanged source.") == 1

    print("EDITORIAL_WORKFLOW_TESTS: PASS")


if __name__ == "__main__":
    main()
