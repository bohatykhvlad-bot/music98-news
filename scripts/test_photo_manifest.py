#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Tests for the photo manifest and the photo canon.

The failure these tests exist for: on 29.10.2026 the cover of a BigXthaPlug
post carried a portrait of Rosama, credited to "Apple Music". Every check
that existed at the time passed, because none of them asked who was in the
frame or who took the picture.

Each test writes the manifest and the desk post that must agree, then breaks
one thing and asserts the rule catches it.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import photo_lint as pl
import photo_manifest as pm


def codes(issues):
    return [code for code, _message in issues]


def messages(issues):
    return " ".join(message for _code, message in issues)


LEDGER = (
    "- The album has 18 tracks | https://music.apple.com/us/album/x/1 | \"18 songs\"\n"
    "\n"
    "## Photos\n"
    "- cover photos/bigxthaplug-press-2026.jpg | https://theneedledrop.com/news/x | "
    "Joshua Davis | BigXthaPlug\n"
)


def desk_post(cover=None):
    return {
        "id": "bigxthaplugbetter26",
        "type": "release",
        "artist": "BigXthaPlug",
        "title": "BETTER OVER TIME",
        "cover": cover or {
            "kind": "img",
            "src": "photos/bigxthaplug-press-2026.jpg",
            "credit": "Joshua Davis",
            "creditUrl": "https://www.deepshadowspictures.com/",
        },
        "body": "The album has 18 tracks and arrives on October 30.",
    }


def test_manifest_parsed():
    entries = pm.manifest(LEDGER)
    assert len(entries) == 1, entries
    assert entries[0]["src"] == "photos/bigxthaplug-press-2026.jpg"
    assert entries[0]["credit"] == "Joshua Davis"
    assert entries[0]["who"] == "BigXthaPlug"
    assert entries[0]["ok"] is True


def test_missing_manifest_fails():
    issues = pm.check(desk_post(), "- A claim | https://x/1 | \"quote\"")
    assert "photo-manifest-missing" in codes(issues), messages(issues)


def test_incomplete_manifest_line_fails():
    broken = LEDGER.replace(
        "- cover photos/bigxthaplug-press-2026.jpg | https://theneedledrop.com/news/x | "
        "Joshua Davis | BigXthaPlug",
        "- cover photos/bigxthaplug-press-2026.jpg | https://theneedledrop.com/news/x")
    issues = pm.check(desk_post(), broken)
    assert "photo-manifest-incomplete" in codes(issues), messages(issues)


def test_swapped_cover_is_caught():
    """The cover is replaced with another artist's file: the manifest does not list it."""
    swapped = dict(desk_post()["cover"])
    swapped["src"] = "photos/rosama-portrait.jpg"
    swapped["credit"] = "Joshua Davis"
    swapped["creditUrl"] = "https://www.deepshadowspictures.com/"
    issues = pm.check(desk_post(swapped), LEDGER)
    assert "photo-manifest-unlisted" in codes(issues), messages(issues)


def test_wrong_artist_in_frame_is_caught():
    """The manifest itself records the wrong artist for the post."""
    wrong = LEDGER.replace("| BigXthaPlug", "| Rosama")
    issues = pm.check(desk_post(), wrong)
    assert "photo-identity-mismatch" in codes(issues), messages(issues)


def test_credit_must_match_the_manifest():
    """The desk ships a credit the registry never verified."""
    changed = dict(desk_post()["cover"])
    changed["credit"] = "Apple Music"
    changed["creditUrl"] = "https://music.apple.com/us/artist/bigxthaplug/1482508209"
    issues = pm.check(desk_post(changed), LEDGER)
    assert "photo-credit-mismatch" in codes(issues), messages(issues)


def test_platform_credit_fails():
    issues = pl.check_credit("the cover", "Apple Music",
                             "https://music.apple.com/us/artist/bigxthaplug/1482508209")
    assert "photo-credit-platform" in codes(issues), messages(issues)


def test_identity_is_taken_from_the_manifest():
    """Who is in the frame is recorded in the registry, not on the image itself."""
    issues = pm.check(desk_post(), LEDGER)
    assert not [c for c in codes(issues) if c.startswith("photo-identity")], messages(issues)
    wrong = pm.check(desk_post(), LEDGER.replace("| BigXthaPlug", "| Rosama"))
    assert "photo-identity-mismatch" in codes(wrong), messages(wrong)


def test_same_frame_may_not_serve_two_posts():
    """The Rosama image was on one post; the same file must not be on another."""
    a = desk_post()
    a["id"] = "a"
    b = desk_post()
    b["id"] = "b"
    b["cover"] = dict(b["cover"], src="photos/shared.jpg")
    a["cover"] = dict(a["cover"], src="photos/shared.jpg")
    issues = pl.lint(a, all_posts=[a, b])
    assert "photo-reused" in codes(issues), messages(issues)


def test_article_credit_link_fails():
    issues = pl.check_credit("the cover", "Joshua Davis",
                             "https://www.dallasobserver.com/music/bigxthaplug-story/")
    assert "photo-credit-article" in codes(issues), messages(issues)


def test_stock_and_excluded_hosts_fail():
    stock = pl.check_credit("the cover", "Joshua Davis",
                            "https://www.shutterstock.com/image-photo/bigx")
    assert "photo-credit-stock" in codes(stock), messages(stock)
    excluded = pl.check_credit("the cover", "Joshua Davis", "https://apnews.com/article/x")
    assert "photo-credit-excluded" in codes(excluded), messages(excluded)


def test_owner_credit_is_the_last_resort_when_the_photo_is_on_record():
    """Key art made by a label has no photographer: the label is credited.

    The owner ruled on 29.10.2026 that the frame's owner is acceptable when
    nothing better exists - but only when the fact registry records the
    image, where it came from and who is in it.
    """
    post = {
        "id": "jisoo26addicted",
        "artist": "JISOO",
        "body": "",
        "cover": {"src": "photos/jisoo-addicted-keyart-2026.jpg",
                  "credit": "BLISSOO", "creditUrl": "https://blissoo.com/"},
    }
    registry_photos = pm.for_post(
        "## Photos\n"
        "- cover photos/jisoo-addicted-keyart-2026.jpg | "
        "https://biz.chosun.com/en/en-entertainment/2026/10/27/BTFQB5AZEZHQFLRZZNURPHSKGI/ | "
        "BLISSOO | JISOO | https://blissoo.com/\n")
    issues = pl.lint(post, registry_photos, [])
    assert "photo-credit-owner" in codes(issues), messages(issues)
    assert "photo-credit-platform" not in codes(issues), messages(issues)

    # The same credit without the registry stays a failure: the image is not
    # on record, so nobody can say who owns the frame.
    bare = pl.lint(post, [], [])
    assert "photo-credit-platform" in codes(bare), messages(bare)


def main():
    tests = [value for name, value in sorted(globals().items())
             if name.startswith("test_") and callable(value)]
    for test in tests:
        test()
        print("ok  %s" % test.__name__)
    print("PHOTO_MANIFEST_TESTS: PASS (%d tests)" % len(tests))


if __name__ == "__main__":
    main()
