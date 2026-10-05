#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Regression tests for the music98 two-pass editorial read barrier."""
from __future__ import annotations

import sys
import tempfile
from pathlib import Path

import editorial_readthrough as er


SOURCE = """The opening section explains how the project changed during writing and recording, keeping the focus on the choices that matter to the listener rather than on every available production detail. The paragraph then connects those choices to the finished songs, giving the article a clear reason to move forward without repeating the same factual point in a second form.

The closing section returns to the central idea and explains what the finished work adds to the artist's story, while avoiding a list of dates, credits, formats, or administrative details. It ends with a complete editorial thought that follows naturally from the reporting and leaves the reader with context rather than a bare statistic or a forced summary line."""
FINAL = SOURCE.replace(
    "changed during writing and recording",
    "took shape during writing and recording",
)


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


def main():
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        er.STATE = root / "state.json"
        source = root / "source.txt"
        final = root / "final.txt"
        source.write_text(SOURCE, encoding="utf-8")
        final.write_text(FINAL, encoding="utf-8")
        pid = "workflow-test"

        # A final read alone must never authorize a write.
        assert run(["--post", pid, "--body-file", str(final), "--phase", "post-edit",
                    "--confirm-full-read"]) == 0
        assert run(["--post", pid, "--body-file", str(final), "--phase", "post-edit",
                    "--check-stamp"], remote_body=SOURCE) == 1

        # Read the exact source before editing, then reread the exact final body.
        assert run(["--post", pid, "--body-file", str(source), "--phase", "pre-edit",
                    "--confirm-full-read"]) == 0
        assert run(["--post", pid, "--body-file", str(final), "--phase", "post-edit",
                    "--confirm-full-read"]) == 0
        assert run(["--post", pid, "--body-file", str(final), "--phase", "post-edit",
                    "--check-stamp"], remote_body=SOURCE) == 0

        # Any final edit invalidates the post-edit stamp.
        final.write_text(FINAL + " A later local edit makes the final hash stale.", encoding="utf-8")
        assert run(["--post", pid, "--body-file", str(final), "--phase", "post-edit",
                    "--check-stamp"], remote_body=SOURCE) == 1

        # The correct final body still cannot pass if the desk source changed
        # after the pre-edit read.
        final.write_text(FINAL, encoding="utf-8")
        assert run(["--post", pid, "--body-file", str(final), "--phase", "post-edit",
                    "--check-stamp"], remote_body=SOURCE + "\n\nChanged source.") == 1

    print("EDITORIAL_WORKFLOW_TESTS: PASS")


if __name__ == "__main__":
    main()
