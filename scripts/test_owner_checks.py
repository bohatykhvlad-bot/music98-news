#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Owner checks added 2026-10-29, and the known-debt write lock.

These tests call the same functions the gate and preflight call. They do not
weaken an existing assertion.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import editorial_lint as el
import known_debt
import preflight as pf
from gate import check_post

REMOVED = (
    "jayzsuperbowllxi26",
    "jisoo26addicted",
    "kesha27backstabber",
    "lanazachlies27r",
    "rodrigoroanexpect26r",
)


def codes(issues):
    return [code for code, _message in issues]


def words(n):
    return " ".join(["note"] * (n - 1) + ["end."])


def body_with_player(count, after):
    paras = [words(80) for _ in range(count)]
    blocks = []
    for index, para in enumerate(paras, 1):
        blocks.append(para)
        if index == after:
            blocks.append("[youtube:abcdefghijk]")
    return "\n\n".join(blocks)


def release(**overrides):
    post = {
        "id": "owner-release",
        "type": "release",
        "status": "draft",
        "artist": "Olivia Rodrigo & Chappell Roan",
        "title": "expectations",
        "rtype": "Single",
        "excerpt": (
            "Olivia Rodrigo has released expectations, featuring Chappell Roan, "
            "after the two finished the vocal together."
        ),
        "body": "",
        "cover": {
            "src": "photos/example.jpg",
            "credit": "Ada Lovelace",
            "creditUrl": "https://adalovelace.example/",
        },
    }
    post.update(overrides)
    if not post["body"]:
        first = post["excerpt"]
        post["body"] = "\n\n".join([
            first,
            words(80),
            words(80),
            "[youtube:abcdefghijk]",
            words(80),
            words(80),
        ])
    return post


def test_collab_names_must_be_in_the_headline_and_the_first_sentence():
    ok = release()
    registry = {"registry": "Olivia Rodrigo recorded it with Chappell Roan."}
    assert codes(el.collab_issues(ok, registry)) == []

    hidden = release(
        excerpt="Olivia Rodrigo has released expectations after a long session in the studio.",
        body="",
    )
    hidden["body"] = hidden["body"]  # set by release() from the new excerpt
    found = codes(el.collab_issues(hidden, registry))
    assert found.count("collab") >= 1
    messages = " ".join(message for _code, message in el.collab_issues(hidden, registry))
    assert "Chappell Roan" in messages
    assert "first sentence" in messages or "headline/deck" in messages


def test_collab_without_a_registry_fails():
    post = release(id="no-such-registry-post")
    messages = " ".join(message for _c, message in el.collab_issues(post))
    assert "fact registry" in messages


def test_unresolved_player_fails_and_a_resolved_solo_player_does_not():
    missing = release(
        artist="Tate McRae",
        excerpt="Tate McRae has released Housewife with a video from the south of France.",
        body="\n\n".join([
            "Tate McRae has released Housewife with a video from the south of France.",
            words(80),
            "[apple:album:9999999999]",
            words(80),
            words(80),
        ]),
    )
    messages = " ".join(m for _c, m in el.collab_issues(missing))
    assert "9999999999" in messages
    assert "offline" in messages

    solo = release(
        artist="Taylor Swift",
        title="The Life of a Showgirl: The Encore",
        excerpt="Taylor Swift has released the encore after the album's first week.",
        body="\n\n".join([
            "Taylor Swift has released the encore after the album's first week.",
            words(80),
            "[apple:album:6814997249]",
            words(80),
            words(80),
        ]),
    )
    assert el.player_catalog().get("6814997249")
    assert codes(el.collab_issues(solo)) == []


def test_resolved_player_collab_must_name_every_artist():
    catalog = el.player_catalog()
    credit = catalog.get("4IAWZw00ZI9DLKDjesx86u")
    assert credit and len(el.split_artists(credit)) >= 2, credit
    post = release(
        artist="Drake",
        title="Solar Eclipse",
        excerpt="Drake has released Solar Eclipse, and the record is out now.",
        body="\n\n".join([
            "Drake has released Solar Eclipse, and the record is out now.",
            words(80),
            "[spotify:track:4IAWZw00ZI9DLKDjesx86u]",
            words(80),
            words(80),
        ]),
    )
    messages = " ".join(m for _c, m in el.collab_issues(post, {"registry": "Drake is on the song."}))
    assert "Don Toliver" in messages


def test_split_artists_keeps_band_names_and_splits_collabs():
    assert el.split_artists("Florence and the Machine") == ["Florence and the Machine"]
    assert el.split_artists("Charli xcx") == ["Charli xcx"]
    assert el.split_artists("Madonna and Charli xcx") == ["Madonna", "Charli xcx"]
    assert el.split_artists("Olivia Rodrigo & Chappell Roan") == ["Olivia Rodrigo", "Chappell Roan"]
    assert el.split_artists("Drake feat. Don Toliver") == ["Drake", "Don Toliver"]
    assert "Zach Bryan" in el.split_artists("Zach Bryan & Lana Del Rey")
    assert "Lana Del Rey" in el.split_artists("Zach Bryan & Lana Del Rey")


def test_media_position():
    early = {"body": body_with_player(6, 1)}
    assert "media-position" in codes(el.media_position_issues(early))
    late = {"body": body_with_player(6, 6)}
    assert "media-position" in codes(el.media_position_issues(late))
    # Paragraph 2 of 6 is about 33% of the words and is not the middle.
    off = {"body": body_with_player(6, 2)}
    assert "media-position" in codes(el.media_position_issues(off))
    mid = {"body": body_with_player(6, 3)}
    assert codes(el.media_position_issues(mid)) == []
    # Odd count: after paragraph 2 of 5 is the middle by paragraph count.
    odd = {"body": body_with_player(5, 2)}
    assert codes(el.media_position_issues(odd)) == []
    none = {"body": words(80) + "\n\n" + words(80)}
    assert codes(el.media_position_issues(none)) == []


def test_release_times_fail():
    samples = [
        "The single arrives at 7 p.m. on Thursday.",
        "It goes up at 19:00.",
        "The premiere is at 8pm.",
        "Listeners in ET hear it first.",
        "The countdown ends at midnight.",
        "The label sent a release timetable.",
        "London hears it at 9 a.m. BST.",
    ]
    for sample in samples:
        post = {"title": "Headline", "excerpt": sample, "body": sample + "\n\n" + words(80)}
        assert "release-time" in codes(el.release_time_issues(post)), sample
    quiet = {"title": "Headline", "excerpt": words(20), "body": words(80)}
    assert codes(el.release_time_issues(quiet)) == []
    clock = {"title": "", "excerpt": "", "body": "The clips appeared around 1:45 p.m. According to the paper."}
    message = " ".join(m for _c, m in el.release_time_issues(clock))
    assert "1:45" in message
    assert "45 p.m" not in message


def test_card_src_requires_a_second_credit():
    bare = {"cover": {"cardSrc": "photos/card.jpg", "credit": "Ada Lovelace"}}
    assert "card-src" in codes(el.card_src_issues(bare))
    diptych = {"cover": {"cardSrc": "photos/card.jpg", "credit2": "Neil Krug"}}
    assert codes(el.card_src_issues(diptych)) == []
    assert codes(el.card_src_issues({"cover": {"src": "photos/a.jpg"}})) == []


def test_credit_padding_and_short_paragraphs_are_warnings():
    only = {
        "title": "A record",
        "excerpt": words(20),
        "body": "Brooke Waggoner plays the piano and arranged the strings with Kaleb Clarke.\n\n" + words(80),
    }
    warned = " ".join(m for _c, m in el.credit_padding_warnings(only))
    assert "Brooke Waggoner" in warned
    assert "Kaleb Clarke" in warned
    again = {
        "title": "A record",
        "excerpt": words(20),
        "body": (
            "Brooke Waggoner plays the piano on the opening.\n\n"
            "Brooke Waggoner also sings the second verse, which changes the song."
        ),
    }
    assert "Brooke Waggoner" not in " ".join(m for _c, m in el.credit_padding_warnings(again))
    produced = {
        "title": "A record",
        "excerpt": words(20),
        "body": "The 12 tracks were produced by Jacknife Lee in the same room.\n\n" + words(80),
    }
    assert "Jacknife Lee" in " ".join(m for _c, m in el.credit_padding_warnings(produced))
    short = {"body": words(40) + "\n\n" + words(80)}
    assert "short-paragraph" in codes(el.owner_warnings(short))
    assert "short-paragraph" not in codes(el.owner_failures(short))
    assert "credit-padding" not in codes(el.owner_failures(only))


def test_known_debt_does_not_waive_the_new_checks():
    post = release(id="aujb923n1")
    post["excerpt"] = "Nobody billed is named in this opening sentence at all here."
    post["body"] = "\n\n".join([
        post["excerpt"], words(80), "[youtube:abcdefghijk]", words(80), words(80),
    ])
    assert "collab" in codes(el.owner_failures(post))
    fails, _warns, _info = check_post(post, strict=True)
    assert "collab" in codes(fails)


def test_removed_posts_are_not_grandfathered():
    debt = json.loads(Path("editorial/known-debt.json").read_text(encoding="utf-8"))
    for pid in REMOVED:
        # The five posts the owner rewrote on 2026-10-26 inherit no debt from
        # the versions that were removed. A waiver the owner signs LATER is a
        # different thing: it is recorded with a reason, it is owner-approved,
        # and it never covers the codes that would have been inherited.
        entry = debt.get(pid)
        if entry is not None:
            assert entry.get("_ownerApproved") is True, pid
            assert entry.get("_reason"), pid
            for code in entry:
                if code.startswith("_"):
                    continue
                assert code not in ("quote-unverified", "photo-manifest-missing"), (pid, code)
        assert known_debt.allowance({"id": pid, "date": "2026-10-27"}, "quote-unverified") == 0
        old, new = known_debt.split(
            {"id": pid, "date": "2026-10-26"},
            [("quote-unverified", "a quote"), ("photo-manifest-missing", "a photo")],
        )
        assert old == []
        assert len(new) == 2
    # A date on or after 2026-10-26 does not exempt a post by itself.
    assert known_debt.allowance({"id": "brand-new-post", "date": "2026-10-29"}, "phrase-repeat") == 0


def test_existing_debt_still_counts_and_unsigned_entries_do_not():
    assert known_debt.allowance({"id": "aujb923n1"}, "photo-credit-article") == 1
    old, new = known_debt.split(
        {"id": "aujb923n1"},
        [("photo-credit-article", "one"), ("photo-credit-article", "two")],
    )
    assert len(old) == 1 and len(new) == 1
    with tempfile.TemporaryDirectory() as td:
        path = Path(td) / "debt.json"
        path.write_text(json.dumps({
            "sneaky": {"phrase-repeat": 4, "_ownerApproved": False, "_reason": ""},
        }), encoding="utf-8")
        assert known_debt.allowance({"id": "sneaky"}, "phrase-repeat", path=path) == 0
        try:
            known_debt.record("sneaky", {"phrase-repeat": 2}, "", False, path=path)
            raise AssertionError("record without a flag should refuse")
        except SystemExit:
            pass
        try:
            known_debt.record("sneaky", {"phrase-repeat": 2}, "because", False, path=path)
            raise AssertionError("record without --owner-approved should refuse")
        except SystemExit:
            pass
        stored = json.loads(path.read_text(encoding="utf-8"))
        assert stored["sneaky"]["phrase-repeat"] == 4
        assert stored["sneaky"]["_ownerApproved"] is False
        known_debt.record(
            "kept-post", {"phrase-repeat": 2}, "owner signed the exception", True, path=path,
        )
        assert known_debt.allowance({"id": "kept-post"}, "phrase-repeat", path=path) == 2
        saved = json.loads(path.read_text(encoding="utf-8"))
        assert saved["kept-post"]["_ownerApproved"] is True
        assert "owner signed" in saved["kept-post"]["_reason"]


def test_debt_cli_refuses_without_the_flag():
    script = Path(__file__).resolve().parent / "known_debt.py"
    with tempfile.TemporaryDirectory() as td:
        path = str(Path(td) / "debt.json")
        refused = subprocess.run(
            [sys.executable, str(script), "add", "post-1", "--code", "phrase-repeat",
             "--count", "1", "--file", path],
            capture_output=True, text=True,
        )
        assert refused.returncode != 0
        assert "owner-approved" in (refused.stderr + refused.stdout)
        assert not Path(path).exists()
        accepted = subprocess.run(
            [sys.executable, str(script), "add", "post-1", "--code", "phrase-repeat",
             "--count", "1", "--owner-approved", "--reason", "the owner said so",
             "--file", path],
            capture_output=True, text=True,
        )
        assert accepted.returncode == 0, accepted.stderr
        saved = json.loads(Path(path).read_text(encoding="utf-8"))
        assert saved["post-1"]["phrase-repeat"] == 1
        assert saved["post-1"]["_reason"] == "the owner said so"


def test_cover_change_requires_a_reason_and_prints_the_crop():
    import test_editorial_readthrough as fixture
    current = fixture.healthy(430)
    current["cover"] = dict(current["cover"], pos="50% 38%", zoom=1, cardX=0.2, cardY=0.4, cardZoom=1.6)
    staged = json.loads(json.dumps(current))
    staged["cover"] = dict(staged["cover"], pos="48% 22%", zoom=1.4, cardX=0.55, cardY=0.61, cardZoom=2.2)
    import io
    from contextlib import redirect_stdout
    buf = io.StringIO()
    with redirect_stdout(buf):
        refused = pf.check(staged, current, None, allow_cover_change=True, change_reason="")
    text = buf.getvalue()
    assert refused is False
    assert "requires --reason" in text
    assert "COVER before pos=50% 38% zoom=1 cardX=0.2 cardY=0.4 cardZoom=1.6" in text
    assert "COVER after pos=48% 22% zoom=1.4 cardX=0.55 cardY=0.61 cardZoom=2.2" in text
    buf = io.StringIO()
    with redirect_stdout(buf):
        allowed = pf.check(
            staged, current, None, allow_cover_change=True, change_reason="owner reframed the face",
        )
    text = buf.getvalue()
    assert "cover changed" not in text
    assert "COVER before pos=50% 38%" in text
    assert allowed is True, text


def main():
    tests = [value for name, value in sorted(globals().items())
             if name.startswith("test_") and callable(value)]
    for test in tests:
        test()
        print("ok  %s" % test.__name__)
    print("OWNER_CHECKS: PASS (%d tests)" % len(tests))


if __name__ == "__main__":
    main()
