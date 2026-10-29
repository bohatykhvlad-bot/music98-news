#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Regression tests for the fact-registry cross-check.

The registry is the mechanical link between canon section 1 ("keep a
source-backed registry of every checkable fact") and the publish path. These
tests pin the behaviour that matters:

- a body claim with no registry line is a FAIL
- a registry line without a source is a FAIL
- a registry line without a quote is a WARN
- a number written as a word is covered by a digit in the registry
- a person is covered by their surname alone
- an empty registry is a FAIL
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import factcheck as fc

BODY = (
    'Lana Del Rey has released "Lies" with Zach Bryan, a track from his EP. '
    "It arrived in 2026 and reached number one on the Official Albums Chart."
)

LEDGER = (
    "- Lana Del Rey and Zach Bryan released \"Lies\" | https://example.com/a | \"Lies\" out now\n"
    "- The album reached number one on the Official Albums Chart | https://example.com/b | "
    "\"No. 1 on the Official Albums Chart\"\n"
    "- The EP arrived in 2026 | https://example.com/c | \"2026\"\n"
)


def run():
    fails = []

    def expect(cond, msg):
        if not cond:
            fails.append(msg)

    # 1. covered body -> no fails
    f, w, i = fc.check(BODY, LEDGER)
    expect(not f, "expected no fails for a covered body, got: %s" % f)
    expect(len(i) >= 3, "expected covered claims, got %d" % len(i))

    # 2. a claim the registry cannot back is a FAIL
    body2 = BODY + " The duet was recorded at Easy Eye Sound in Nashville."
    f2, _, _ = fc.check(body2, LEDGER)
    expect(any("Easy Eye Sound" in x for x in f2),
           "expected an unbacked proper name to fail, got: %s" % f2)

    # 3. a registry line without a source is a FAIL
    bad = LEDGER + "- Some claim with no source | | \"quote\"\n"
    f3, _, _ = fc.check(BODY, bad)
    expect(any("without a source" in x for x in f3),
           "expected a source-less registry line to fail, got: %s" % f3)

    # 4. a registry line without the source's own words is a failure (29.10):
    # a claim nobody can check is not a fact.
    bad = LEDGER + "- Some claim with a source but no quote | https://example.com/d | \n"
    f4, w4, _ = fc.check(BODY, bad)
    expect(not any("without a source:" in x for x in f4),
           "expected a quote-less line not to be read as a missing source, got: %s" % f4)
    expect(any("registry-no-quote" in x for x in f4),
           "expected a quote-less line to fail, got: %s" % f4)

    # 5. a number written as a word is covered by the digit
    body5 = "The EP has eight songs."
    f5, _, _ = fc.check(body5, "- The EP has 8 songs | https://example.com/e | \"eight songs\"\n")
    expect(not f5, "expected a word/digit number match, got: %s" % f5)

    # 6. a surname alone covers the full name
    body6 = "Lana Del Rey and Zach Bryan released the duet."
    f6, _, _ = fc.check(body6, "- Del Rey and Bryan released it | https://example.com/f | \"it\"\n")
    expect(not f6, "expected surname matching to cover names, got: %s" % f6)

    # 7. an empty registry is a FAIL
    f7, _, _ = fc.check(BODY, "")
    expect(any("registry is empty" in x for x in f7),
           "expected an empty registry to fail, got: %s" % f7)

    # 8. a registry line without a source fails even when nothing is extracted
    f8, _, _ = fc.check("A short line.", "- claim | |\n")
    expect(any("without a source" in x for x in f8),
           "expected a source-less line to fail on a short body, got: %s" % f8)

    # 9. "The September 4 single" is a date, not a proper name.
    # The registry mentions the date but never the words "The September",
    # so a name claim for that phrase would fail the check.
    body9 = "The September 4 single came with a video."
    ledger9 = "- It came with a video | https://example.com/g | \"came with a video on September 4\"\n"
    f9, _, _ = fc.check(body9, ledger9)
    expect(not f9, "expected a month phrase not to be read as a name, got: %s" % f9)

    # 10. a surname that starts with s keeps its first letter.
    # strip("'s") turned "Smith" into "mith" and lost the match.
    body10 = "Sam Smith sang in 2009."
    ledger10 = "- Smith sang in 2009 | https://example.com/h | \"sang in 2009\"\n"
    f10, _, _ = fc.check(body10, ledger10)
    expect(not f10, "expected a surname starting with s to stay matchable, got: %s" % f10)

    # 11. a number is bound to the unit it counts. "43 regions" must not be
    # covered by any "30" that happens to sit in the registry.
    body11 = "The song reached the top 10 of iTunes charts in 43 regions."
    ledger11 = "- It came out on October 30 at 8 a.m. | https://example.com/i | \"October 30 at 8 a.m.\"\n"
    f11, _, _ = fc.check(body11, ledger11)
    expect(any("43 regions" in x for x in f11),
           "expected an unbound number to fail, got: %s" % f11)

    # 12. the same number with its unit IS covered.
    ledger12 = ("- The single reached the top 10 of iTunes charts in 43 regions"
                " | https://example.com/j | \"reached the top 10 of iTunes charts in 43 regions\"\n")
    f12, _, _ = fc.check(body11, ledger12)
    expect(not f12, "expected a bound number to be covered, got: %s" % f12)

    # 13. a number word counts with its unit too: "eight songs" is not any "eight".
    body13 = "It is an EP of eight songs."
    f13, _, _ = fc.check(body13, "- It is an eight-song EP | https://example.com/k | \"an eight-song EP\"\n")
    expect(not f13, "expected a hyphenated unit to be covered, got: %s" % f13)

    # 14. "the two close the song" is a back-reference, not a quantity to check.
    body14 = "The two close the song in harmony."
    f14, _, _ = fc.check(body14, "- They close the song in harmony | https://example.com/l | \"close the song in harmony\"\n")
    expect(not f14, "expected a back-reference not to be read as a quantity, got: %s" % f14)

    # 15. a compact figure is a figure. The owner writes "400K", and on
    # 29.10 the compact form was not extracted at all, so a figure no source
    # supports passed the check in silence.
    body15 = "The record sold 400K copies in its first week."
    ledger15 = ('- It sold 400,000 copies in its first week | https://example.com/m'
                ' | "sold 400,000 copies in its first week"\n')
    f15, _, _ = fc.check(body15, ledger15)
    expect(not f15, "expected a compact figure to be covered by the written-out one, got: %s" % f15)

    # 16. and a compact figure no source supports is a defect.
    body16 = "The record sold 250K copies in its first week."
    f16, _, _ = fc.check(body16, ledger15)
    expect(any("250000 copies" in x for x in f16),
           "expected an unsupported compact figure to fail, got: %s" % f16)

    # 17. the registry writes the figure the way the owner writes it
    # ("400K"), and the body may write it out. Both are the same claim.
    body17 = "The record sold 400,000 copies in its first week."
    ledger17 = ('- It sold 400K copies in its first week | https://example.com/m'
                ' | "sold 400K copies in its first week"\n')
    f17, _, _ = fc.check(body17, ledger17)
    expect(not f17, "expected 400,000 to be covered by a registry that says 400K, got: %s" % f17)

    # 18. a figure that is not a whole multiple keeps its decimal: "1.2M" is
    # not "1M", and a registry that says "1.2M" covers exactly that.
    ledger18 = ('- It sold 1.2M copies in its first week | https://example.com/m'
                ' | "sold 1.2M copies in its first week"\n')
    f18, _, _ = fc.check("The record sold 1.2M copies in its first week.", ledger18)
    expect(not f18, "expected 1.2M to be covered by a registry that says 1.2M, got: %s" % f18)
    f19, _, _ = fc.check("The record sold 1M copies in its first week.", ledger18)
    expect(any("1000000 copies" in x for x in f19),
           "expected 1M to fail against a registry that says 1.2M, got: %s" % f19)

    # 20. a claim whose own quote does not carry its figure is a defect:
    # this is the "600 Entertainment" line, where the quote was the copyright
    # line and the label came from somewhere else.
    ledger20 = ('- The record is released through 600 Entertainment and UnitedMasters'
                ' | https://example.com/m | "\u2117 2026 BigXthaPlug under exclusive '
                'license to UnitedMasters LLC"\n')
    missing, _ = fc.quote_supports_claim(
        "The record is released through 600 Entertainment and UnitedMasters",
        fc.ledger_claims(ledger20)[0]["quote"])
    expect(any("600" in x[0] for x in missing),
           "expected the unsupported figure to be reported, got: %s" % missing)

    # 21. the same claim with a quote that carries the figure passes.
    ledger21 = ('- The record is released through 600 Entertainment and UnitedMasters'
                ' | https://example.com/m | "arriving October 30 through 600 '
                'Entertainment and UnitedMasters"\n')
    missing21, _ = fc.quote_supports_claim(
        "The record is released through 600 Entertainment and UnitedMasters",
        fc.ledger_claims(ledger21)[0]["quote"])
    expect(not missing21,
           "expected a supported figure to pass, got: %s" % missing21)

    # 22. a paraphrase that drops the subject is not a defect: the source
    # says "he", the registry names him.
    missing22, _ = fc.quote_supports_claim(
        "Hamish Hamilton has directed every Super Bowl halftime show since 2010",
        '"He has directed every Super Bowl halftime show since 2010, as well as the '
        '2026 FIFA World Cup final halftime show."')
    expect(not missing22,
           "expected a paraphrased name to pass, got: %s" % missing22)

    # 23. a quote that writes the figure with its unit attached still carries it.
    missing23, _ = fc.quote_supports_claim(
        "In the United States the single releases at 7 p.m. ET",
        '"JISOO NEW SINGLE OUT THIS OCTOBER 30TH!! OCT 29 | 7PM EDT"')
    expect(not missing23,
           "expected 7PM to count as 7, got: %s" % missing23)

    # 24. a date written in ISO form is a date.
    missing24, _ = fc.quote_supports_claim(
        '"BURN" arrived on October 9', '"2026-10-09"')
    expect(not missing24,
           "expected an ISO date to carry the claim, got: %s" % missing24)

    # 25. a claim and its quote that disagree on the day are reported apart.
    missing25, mismatched25 = fc.quote_supports_claim(
        "The video premiered on October 26, 2026",
        '"Kesha released the official music video for the song, \"Backstabber\" on '
        'October 25, 2026."')
    expect(not missing25 and any("October 26" in x[0] for x in mismatched25),
           "expected a day mismatch, got missing=%s mismatched=%s" % (missing25, mismatched25))

    # 26. a registry line without a quote is a failure, not a note.
    findings26 = fc.registry_findings("- The album has 18 tracks | https://example.com/m\n")
    expect(any(code == "registry-no-quote" for _, code, _ in findings26),
           "expected registry-no-quote, got: %s" % findings26)

    # 27. a source that is not a link is a failure.
    findings27 = fc.registry_findings(
        '- The album has 18 tracks | the press release | "18 tracks"\n')
    expect(any(code == "registry-bad-source" for _, code, _ in findings27),
           "expected registry-bad-source, got: %s" % findings27)

    # 28. a photo line is not a claim.
    findings28 = fc.registry_findings(
        '## Photos\n- cover photos/x.jpg | https://example.com/p | Joshua Davis | '
        'BigXthaPlug | https://joshuadavis.example\n')
    expect(not any(code.startswith("registry-") for _, code, _ in findings28),
           "expected a photo line to be skipped, got: %s" % findings28)

    # 29. a body claim that no registry line carries is a defect.
    f29, _, _ = fc.check("The album has 18 tracks.", ledger21)
    expect(any("fact-uncovered" in x for x in f29),
           "expected fact-uncovered, got: %s" % f29)

    # 30. and a body claim the registry carries is not.
    f30, _, _ = fc.check("The record arrives through 600 Entertainment.", ledger21)
    expect(not f30, "expected a covered claim to pass, got: %s" % f30)

    # 31. a claim that puts two events in order needs two sources (29.10.2026).
    single = ('- He confirmed the full lineup on Instagram with the guests popping up '
              'on a stack of TV screens, and then billboards with the faces of each '
              'featured artist went up in the cities they represent | '
              'https://www.complex.com/music/a/x | "It started with an Instagram post '
              'featuring a stack of TVs"')
    f31 = fc.registry_findings(single)
    expect(any(code == "registry-order-single-source" for _, code, _ in f31),
           "expected a single-source sequence to fail, got: %s" % f31)

    two = ('- He confirmed the full lineup on Instagram with the guests popping up on a '
          'stack of TV screens, and then billboards with the faces of each featured '
          'artist went up in the cities they represent | '
          'https://www.broadwayworld.com/bwwmusic/article/x | "before BigX officially '
          'confirmed the full lineup with an Instagram post" / '
          'https://allhiphop.com/news/x | "Then BigX confirmed the full lineup on '
          'Instagram"')
    f31b = fc.registry_findings(two)
    expect(not any(code == "registry-order-single-source" for _, code, _ in f31b),
           "expected two sources to pass, got: %s" % f31b)

    # 32. a claim without a sequence is happy with one source.
    plain = ('- The album has 18 tracks | https://music.apple.com/us/album/x | '
             '"18 songs"')
    f32 = fc.registry_findings(plain)
    expect(not any(code == "registry-order-single-source" for _, code, _ in f32),
           "expected a plain claim to pass, got: %s" % f32)

    if fails:
        print("FACTCHECK: FAIL")
        for f in fails:
            print("  -", f)
        raise SystemExit(1)
    print("FACTCHECK: PASS")


if __name__ == "__main__":
    run()
