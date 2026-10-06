#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Regression tests for music98 editorial quality + two-pass read barrier."""
from __future__ import annotations

import sys
import tempfile
from pathlib import Path

import editorial_readthrough as er


SOURCE = """The opening section explains how the project changed during writing and recording, keeping the focus on the choices that matter to the listener rather than on every available production detail. The paragraph then connects those choices to the finished songs, giving the article a clear reason to move forward without repeating the same factual point in a second form.

The closing section adds a final piece of context about how the artist approached the finished work. It avoids a list of dates, credits, formats or administrative details and ends on information the reader has not already been given in the opening paragraph."""
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
