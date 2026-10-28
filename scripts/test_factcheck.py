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

    # 4. a registry line without a quote is a WARN, not a fail
    bad = LEDGER + "- Some claim with a source but no quote | https://example.com/d | \n"
    f4, w4, _ = fc.check(BODY, bad)
    expect(not any("without a source" in x for x in f4),
           "expected a quote-less line to stay a warning, got: %s" % f4)
    expect(any("without a source quote" in x for x in w4),
           "expected a quote-less line to warn, got: %s" % w4)

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

    if fails:
        print("FACTCHECK: FAIL")
        for f in fails:
            print("  -", f)
        raise SystemExit(1)
    print("FACTCHECK: PASS")


if __name__ == "__main__":
    run()
