#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Regression tests for music98 editorial quality + two-pass read barrier."""
from __future__ import annotations

import sys
import tempfile
from pathlib import Path

import editorial_readthrough as er


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

    bridge_fails, _ = er.inspect(BAD_SURNAME_BRIDGE, set())
    assert "mechanical surname bridge" in "\n".join(bridge_fails)

    name_fails, _ = er.inspect(BAD_NAME_RHYTHM, set())
    assert "three consecutive sentences" in "\n".join(name_fails)

    choppy_fails, _ = er.inspect(BAD_CHOPPY, set())
    joined = "\n".join(choppy_fails)
    assert "choppy article paragraph" in joined
    assert "paragraph rhythm" in joined


def main():
    assert_quality_regressions()

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
