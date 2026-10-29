#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Adversarial tests for the new lint rules.

Each test tries to DEFeat a rule: it writes prose that a careless writer
would produce, or that a determined writer would produce on purpose, and
asserts that the rule still catches it. The second half of every test writes
honest prose and asserts the rule stays silent.

A rule that cannot be fooled by any of these is a rule worth having. A rule
that fires on the honest prose is a rule that has to be removed.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import editorial_lint as el
import photo_lint as pl


def codes(issues):
    return [code for code, _message in issues]


def messages(issues):
    return " ".join(message for _code, message in issues)


def test_idea_repetition():
    """Two paragraphs that say the same thing in different words."""
    body = (
        "The album arrived on Friday through 600 Entertainment and UnitedMasters, "
        "and the first single from it had already been out for weeks.\n\n"
        "The record showed up on Friday through 600 Entertainment and UnitedMasters, "
        "with its first single out for weeks before that."
    )
    issues = el.lint({"body": body})
    assert "idea-repeat" in codes(issues), messages(issues)

    honest = (
        "The album arrived on Friday through 600 Entertainment and UnitedMasters, "
        "and the first single from it had already been out for weeks.\n\n"
        "The cover art is built from faces pulled out of his earlier releases, "
        "which fans had already noticed him removing from streaming services."
    )
    assert "idea-repeat" not in codes(el.lint({"body": honest})), messages(el.lint({"body": honest}))


def test_ordinal_tautology_is_caught():
    """A tautology in other words: the same ordinal fact stated twice.

    This is the defect the owner reported on 29.10.2026 - the two paragraphs
    share only three content words, so the word-overlap rule missed them and
    the restatement reached the desk.
    """
    body = (
        "The album is his fourth full-length studio record.\n\n"
        "It is his fourth full-length release as a solo rapper, and the pattern "
        "matches his earlier records."
    )
    issues = el.lint({"body": body})
    assert "idea-repeat" in codes(issues), messages(issues)

    honest = (
        "The album is his fourth full-length studio record.\n\n"
        "The cover art is built from faces pulled out of his earlier releases, "
        "which fans had already noticed him removing from streaming services."
    )
    assert "idea-repeat" not in codes(el.lint({"body": honest})), messages(el.lint({"body": honest}))


def test_phrase_repetition():
    """The same three-word formulation in two paragraphs."""
    body = (
        "BigXthaPlug announced the album from a football field in Dallas, and the "
        "trailer opens on that turf.\n\n"
        "In a later interview he said the football field in Dallas shaped the record."
    )
    issues = el.lint({"body": body})
    assert "phrase-repeat" in codes(issues), messages(issues)


def test_tautology():
    """A sentence that says its meaning twice."""
    body = (
        "It is not just a cover photo, it is the whole campaign in one frame, "
        "and the label leans on that idea.\n\n"
        "The release date is set for October 30."
    )
    issues = el.lint({"body": body})
    assert "tautology" in codes(issues), messages(issues)

    # A deliberate parallel echo is not a tautology.
    honest = (
        "She was the first to play it, the first to headline it, and the first to "
        "say what the song meant.\n\n"
        "The release date is set for October 30."
    )
    assert "tautology" not in codes(el.lint({"body": honest})), messages(el.lint({"body": honest}))


def test_quote_fidelity():
    """A quotation the registry does not contain is a fabricated quote."""
    registry = (
        "- The album has 18 tracks | https://music.apple.com/us/album/x/1 | "
        "\"BETTER OVER TIME - Album by BigXthaPlug\""
    )
    body = (
        "He told the room \"Dallas made me who I am\".\n\n"
        "The record lands on October 30 with 18 tracks."
    )
    issues = el.lint({"body": body}, registry_text=registry)
    assert "quote-unverified" in codes(issues), messages(issues)

    honest = (
        "The record lands on October 30 with 18 tracks.\n\n"
        "Apple Music lists it as \"BETTER OVER TIME - Album by BigXthaPlug\"."
    )
    assert "quote-unverified" not in codes(el.lint({"body": honest}, registry_text=registry)), \
        messages(el.lint({"body": honest}, registry_text=registry))


def test_registry_usage():
    """A registry line the article never uses is a line from another story."""
    registry = (
        "- Rosama signed to the same label in the spring | https://example.com/a | "
        "\"Rosama signed with the label\"\n"
        "- The album has 18 tracks | https://music.apple.com/us/album/x/1 | "
        "\"18 songs\""
    )
    body = "The album has 18 tracks and lands on October 30."
    issues = el.lint({"body": body}, registry_text=registry)
    assert "registry-unused" in codes(issues), messages(issues)

    used = (
        "- The album has 18 tracks | https://music.apple.com/us/album/x/1 | \"18 songs\"\n"
        "- BigXthaPlug dropped the project on October 30 | https://example.com/b | "
        "\"The project dropped on October 30\""
    )
    assert "registry-unused" not in codes(el.lint({"body": body}, registry_text=used))


def test_cross_post_contamination():
    """A name from another live post is not silently allowed."""
    issues = el.lint({"body": "The night also featured Rosama on the same bill."},
                     other_artists=["Rosama", "BigXthaPlug"])
    assert "cross-post-name" in codes(issues), messages(issues)

    own = el.lint({"body": "BigXthaPlug brought Rosama out for the closer."},
                  other_artists=["Rosama", "BigXthaPlug"])
    # The post's own artist is excluded from the other-artist list by the
    # caller, so this case is about a genuinely different artist.
    assert "cross-post-name" in codes(own), messages(own)


def test_credit_platform():
    """A distributor is not a photographer."""
    issues = pl.check_credit("the cover", "Apple Music", "https://music.apple.com/us/artist/x/1")
    assert "photo-credit-platform" in codes(issues), messages(issues)

    issues = pl.check_credit("the cover", "Getty Images", "https://www.gettyimages.com/detail/1")
    assert "photo-credit-platform" in codes(issues), messages(issues)

    good = pl.check_credit("the cover", "Mert Alas & Marcus Piggott",
                           "https://www.artpartner.com/mert-alas-marcus-piggott")
    assert not [c for c in codes(good) if c.startswith("photo-credit")], messages(good)

    studio = pl.check_credit("the cover", "Joshua Davis, Deep Shadows Pictures",
                             "https://www.deepshadowspictures.com/")
    assert not [c for c in codes(studio) if c.startswith("photo-credit")], messages(studio)


def test_credit_source():
    """A credit may not point at an article, a stock library or an excluded source."""
    article = pl.check_credit("the cover", "Joshua Davis",
                              "https://www.dallasobserver.com/music/some-story/")
    assert "photo-credit-article" in codes(article), messages(article)

    stock = pl.check_credit("the cover", "Joshua Davis", "https://www.shutterstock.com/image-photo/x")
    assert "photo-credit-stock" in codes(stock), messages(stock)

    excluded = pl.check_credit("the cover", "Joshua Davis", "https://apnews.com/article/x")
    assert "photo-credit-excluded" in codes(excluded), messages(excluded)


def test_photo_credit_rules_apply_to_every_image():
    """Both the cover and an inline photo are checked."""
    post = {"id": "p1",
            "cover": {"kind": "img", "src": "photos/a.jpg",
                      "credit": "Joshua Davis",
                      "creditUrl": "https://www.deepshadowspictures.com/"},
            "body": "Prose.\n\n[photo:photos/b.jpg|Apple Music|https://music.apple.com/x/1]"}
    issues = pl.lint(post, all_posts=[])
    assert "photo-credit-platform" in codes(issues), messages(issues)


def test_photo_reuse():
    """One frame may not serve two posts."""
    posts = [
        {"id": "a", "cover": {"kind": "img", "src": "photos/x.jpg", "credit": "Joshua Davis",
                              "creditUrl": "https://www.deepshadowspictures.com/", "who": "BigXthaPlug"}},
        {"id": "b", "cover": {"kind": "img", "src": "photos/x.jpg", "credit": "Joshua Davis",
                              "creditUrl": "https://www.deepshadowspictures.com/", "who": "Rosama"}},
    ]
    issues = pl.lint(posts[0], all_posts=posts)
    assert "photo-reused" in codes(issues), messages(issues)


def test_evasions():
    """Attempts to slip a defect past the rules."""
    # 1. The same thought, restated with a synonym and a fresh sentence.
    #    Several rules can catch this one; the test asks that the defect is
    #    caught, not which rule caught it.
    body = (
        "The picture shows BigXthaPlug standing at a microphone in a black tracksuit "
        "on a stage washed in light.\n\n"
        "The photograph catches BigXthaPlug at a mic in a black tracksuit on a stage "
        "lit up by floodlights."
    )
    repetition_codes = {"idea-repeat", "phrase-repeat", "sentence-repeat"}
    assert repetition_codes & set(codes(el.lint({"body": body}))), messages(el.lint({"body": body}))

    # 1b. The same fact in two paragraphs, reworded.
    body = (
        "The album is out on October 30 through UnitedMasters.\n\n"
        "UnitedMasters put the record out on October 30, with the label's own "
        "release date given in the same announcement."
    )
    assert "idea-repeat" in codes(el.lint({"body": body})), messages(el.lint({"body": body}))

    # 2. The same phrase split across a paragraph break.
    body = (
        "He said the album was the result of a year spent in the studio writing.\n\n"
        "The result of a year spent in the studio writing is the record he released."
    )
    found = codes(el.lint({"body": body}))
    assert "phrase-repeat" in found or "idea-repeat" in found, messages(el.lint({"body": body}))

    # 3. A tautology hidden behind a synonym.
    body = "It is not merely a photo, it is the entire campaign in a single frame."
    assert "tautology" in codes(el.lint({"body": body})), messages(el.lint({"body": body}))

    # 4. A fabricated quote that differs from the registry by one word.
    registry = "- She said the room was small | https://example.com/a | \"the room was small\""
    body = "She said \"the room was tiny.\""
    assert "quote-unverified" in codes(el.lint({"body": body}, registry_text=registry)), \
        messages(el.lint({"body": body}, registry_text=registry))

    # 5. A credit that hides a platform behind a person's name.
    issues = pl.check_credit("the cover", "Photo by Apple Music",
                             "https://music.apple.com/us/artist/x/1")
    assert "photo-credit-platform" in codes(issues), messages(issues)

    # 6. A credit that links to the photographer's Instagram - allowed.
    ig = pl.check_credit("the cover", "Gabe Medina", "https://www.instagram.com/gabexphoto/")
    assert not [c for c in codes(ig) if c.startswith("photo-credit")], messages(ig)


def test_honest_prose_is_silent():
    """The rules must not fire on good music journalism."""
    body = (
        "BigXthaPlug announced BETTER OVER TIME on September 26, a solo album that "
        "arrives through 600 Entertainment and UnitedMasters on October 30. The "
        "announcement came with a football-themed trailer that traces his childhood "
        "in Dallas through the gridiron and onto stages in Europe.\n\n"
        "The cover art is assembled from the faces he had scrubbed from his earlier "
        "streaming covers, a detail fans noticed before the announcement. The record "
        "carries 18 tracks and opens with LITE, a collaboration with Belly Gang "
        "Kushington.\n\n"
        "He described the album as a return to rap after a year spent on country "
        "radio, and said the writing started in sessions with Kurrco."
    )
    issues = el.lint({"body": body})
    assert not issues, messages(issues)


def main():
    tests = [value for name, value in sorted(globals().items())
             if name.startswith("test_") and callable(value)]
    for test in tests:
        test()
        print("ok  %s" % test.__name__)
    print("ADVERSARIAL_LINT_TESTS: PASS (%d tests)" % len(tests))


if __name__ == "__main__":
    main()
