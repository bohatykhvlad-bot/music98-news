#!/usr/bin/env python3
"""Cross-check a post body against its fact registry.

The registry is a markdown file in `editorial/facts/<post-id>.md`. One claim per
line, so a human can read it and a machine can diff it against the article:

    - <claim> | <source url> | <exact quote from the source>

Why this exists
---------------
`editorial/CANON.md` section 1 already asks for a source-backed registry of every
checkable fact before writing, and section 6 asks for a final check of the facts.
Neither was mechanically enforced: the gate only reads prose, so a fact that never
reached the registry looked exactly like a fact that was verified. This module is
that missing link. It extracts every checkable claim from the body (years,
numbers, quoted titles, multi-word proper names, dates) and requires each one to
be covered by the registry. Anything missing is a FAIL: the article says something
the registry cannot back.

It proves nothing about truth. It proves coverage, which is the part that silently
used to fail.
"""
from __future__ import annotations

import re
from pathlib import Path

MONTHS = ("january february march april may june july august september "
          "october november december")

# Function words that must not be treated as the noun of a quantified claim.
NON_NOUN_AFTER_NUMBER = {
    "of", "and", "or", "but", "to", "in", "on", "at", "for", "with", "by",
    "from", "as", "is", "was", "were", "are", "be", "been", "it", "its", "that",
    "this", "than", "then", "there", "here", "who", "what", "when", "where",
    "which", "while", "after", "before", "over", "under", "again", "still",
    "also", "just", "not", "no", "if", "so", "because", "both", "each", "every",
    "other", "another", "any", "all", "more", "most", "some", "many", "much",
    "own", "same", "very", "into", "out", "up", "down", "off", "about", "i",
    "he", "she", "they", "we", "you", "his", "her", "their", "these", "those",
}

NUMBER_WORDS = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7,
    "eight": 8, "nine": 9, "ten": 10, "eleven": 11, "twelve": 12,
    "thirteen": 13, "fourteen": 14, "fifteen": 15, "sixteen": 16,
    "seventeen": 17, "eighteen": 18, "nineteen": 19, "twenty": 20,
    "thirty": 30, "forty": 40, "fifty": 50, "sixty": 60, "seventy": 70,
    "eighty": 80, "ninety": 90, "hundred": 100, "thousand": 1000,
    "million": 1000000, "billion": 1000000000, "dozen": 12,
}

# Multi-word proper names. Single capitalised words are ignored on purpose:
# "Kesha", "Usher" and "Rihanna" are also ordinary words, and a false FAIL on a
# first name teaches the writer to ignore the checker.
PROPER_NAME_RE = re.compile(
    r"(?<![.!?]\s)(?<!\*)\b[A-Z][a-zÀ-ÖØ-öø-ÿ'’-]+(?:\s+[A-Z][a-zÀ-ÖØ-öø-ÿ'’-]+)+\b"
)
QUOTED_RE = re.compile(r'"([^"]{2,90})"')
YEAR_RE = re.compile(r"\b(?:19|20)\d{2}\b")
DIGIT_RE = re.compile(r"\b\d{1,3}(?:,\d{3})*(?:\.\d+)?\b")
DATE_RE = re.compile(
    r"\b(%s)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?\b" % "|".join(MONTHS.split()),
    re.I,
)

# Names that are part of the site's own furniture, not of the story.
KNOWN_NON_FACTS = {"super bowl", "monday night football"}


def _norm(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").replace("’", "'")).strip().lower()


# Units that make a number mean something specific: "43 regions" is not the
# same claim as "43 songs". The word right after the number is the unit.
_UNIT_STOP = {
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "of", "for", "to",
    "from", "with", "by", "as", "is", "was", "were", "are", "be", "been",
    "that", "which", "who", "when", "where", "while", "after", "before",
    "it", "its", "he", "she", "they", "them", "his", "her", "their", "you",
    "not", "no", "if", "than", "then", "so", "up", "out", "over", "into",
}


def _date_owns(text: str, pos: int) -> bool:
    """True when the number at pos belongs to a date ("September 4")."""
    for m in DATE_RE.finditer(text or ""):
        if m.start(2) == pos:
            return True
    return False


def _definite_before(text: str, pos: int) -> bool:
    """True when a number word is preceded by "the" - a back-reference."""
    before = (text or "")[:pos].rstrip().lower()
    return before.endswith("the") or before.endswith("these") or before.endswith("those")


def _unit_of(text: str) -> str:
    """The word a number counts, so "43 regions" binds to "43 regions"."""
    m = re.match(r"\s*(?:[0-9][0-9,]*|(?:%s))\s+([A-Za-z][A-Za-z'’-]*)" % "|".join(NUMBER_WORDS),
                 (text or "").strip(), re.I)
    if not m:
        return ""
    unit = m.group(1).lower()
    if unit in _UNIT_STOP or unit.endswith("ing") or unit.endswith("ed"):
        return ""
    return unit


def _unit_after(text: str, pos: int) -> str:
    """The unit word right after a number in the body, if it is a real unit.

    A clock time ("7 p.m.") and a date ("the September 4 single") carry no
    unit: the number is bound by the date, not by the next noun.
    """
    tail = (text or "")[pos:pos + 40].lstrip()
    # "7 p.m." / "7 pm" / "7 a.m." - a clock time, not a counted thing.
    if re.match(r"(?:p|a)\.?\s?m\.?", tail, re.I):
        return ""
    m = re.match(r"([A-Za-z][A-Za-z'’-]*)", tail)
    if not m:
        return ""
    unit = m.group(1)
    low = unit.lower()
    if low in _UNIT_STOP or low in NON_NOUN_AFTER_NUMBER:
        return ""
    if low.endswith("ing") or low.endswith("ed"):
        return ""
    return low


def _needles(kind: str, text: str):
    """Acceptable ways for the registry to mention this claim."""
    norm = _norm(text)
    out = [norm]
    if kind == "number":
        # A number may be written as a digit or a word in the registry.
        value = NUMBER_WORDS.get(norm.split(" ")[0])
        if value is None:
            raw = norm.split(" ")[0].replace(",", "")
            try:
                value = int(raw)
            except ValueError:
                value = None
        if value is not None:
            out.append(str(value))
            # A bare digit proves nothing: "43 regions" must not be covered by
            # any "30" that happens to sit in the registry (a release date, a
            # clock time). Bind the number to the unit it counts, so the
            # registry has to say "43 regions" to cover "43 regions".
            unit = _unit_of(text)
            if unit:
                out.append("%s %s" % (str(value), unit))
    if kind == "name":
        # A surname alone identifies the person. Only a trailing possessive is
        # dropped: strip("'s") would also eat the first letter of a surname
        # that starts with s ("September" -> "eptember").
        parts = norm.split(" ")
        if len(parts) > 1:
            out.append(re.sub(r"'s$", "", parts[-1]))
    if kind == "title":
        out.append(norm.rstrip("."))
        out.append(norm.rstrip(".,"))
        out.append(norm.rstrip(".,!?"))
    return [n for n in out if n]


def _covered(kind: str, text: str, searchable: str) -> bool:
    # A number with a unit must be found together with that unit. A bare
    # digit match is not enough: "30 regions" was covered by any "30" in the
    # registry, which is how a wrong figure slipped past the check.
    if kind == "number":
        unit = _unit_of(text)
        if unit:
            needles = [n for n in _needles(kind, text) if n.strip() != str(_norm(text).split(" ")[0])]
            value = NUMBER_WORDS.get(_norm(text).split(" ")[0])
            if value is None:
                try:
                    value = int(_norm(text).split(" ")[0].replace(",", ""))
                except ValueError:
                    value = None
            if value is not None:
                # The pair may be written with a hyphen ("an eight-song EP"),
                # and the number may be a word there ("eight" for 8).
                spellings = {str(value)}
                # The registry may spell the number out ("an eight-song EP").
                for word, num in NUMBER_WORDS.items():
                    if num == value:
                        spellings.add(word)
                for spelling in spellings:
                    # The unit may be singular in the registry where the body
                    # has the plural ("an eight-song EP" vs "eight songs").
                    unit_pat = re.escape(unit)
                    if unit.endswith("s") and len(unit) > 3:
                        unit_pat = r"(?:%s|%s)" % (unit_pat, re.escape(unit[:-1]))
                    pair = re.compile(r"(?<![0-9a-z])%s[\s-]+%s(?![0-9a-z])" % (re.escape(spelling), unit_pat))
                    if pair.search(searchable):
                        return True
            for needle in needles:
                if re.search(r"(?<![0-9a-z])%s(?![0-9a-z])" % re.escape(needle), searchable):
                    return True
            return False
    for needle in _needles(kind, text):
        if re.search(r"(?<![0-9a-z])%s(?![0-9a-z])" % re.escape(needle), searchable):
            return True
    return False


def extract_claims(body: str):
    """Return the checkable claims in a post body.

    Each claim is a dict with `kind` and `text`. The list is de-duplicated, so
    two runs over the same body produce the same report.
    """
    claims = []
    seen = set()

    def add(kind, text):
        text = (text or "").strip()
        key = (kind, _norm(text))
        if not text or key in seen:
            return
        seen.add(key)
        claims.append({"kind": kind, "text": text})

    text = body or ""

    for m in DATE_RE.finditer(text):
        month, day, year = m.group(1), m.group(2), m.group(3)
        label = "%s %s" % (month.title(), day)
        if year:
            label += ", %s" % year
        add("date", label)
        if year:
            add("year", year)

    for m in YEAR_RE.finditer(text):
        add("year", m.group(0))

    for m in QUOTED_RE.finditer(text):
        q = m.group(1).strip()
        if q and not q.startswith("http"):
            add("title", q)

    for m in PROPER_NAME_RE.finditer(text):
        name = m.group(0).strip()
        if "*" in name or "http" in name:
            continue
        # "The September 4 single" is a date, not a name. A phrase whose last
        # word is a month is read as a date and covered by the date claim.
        if name.split()[-1].lower() in MONTHS.split():
            continue
        if _norm(name) in KNOWN_NON_FACTS:
            continue
        add("name", name)

    for m in DIGIT_RE.finditer(text):
        raw = m.group(0)
        if YEAR_RE.fullmatch(raw):
            continue
        # Keep the unit with the number: "43 regions" is one claim, and the
        # registry has to back that pair, not any 43 in the file. A number that
        # belongs to a date ("the September 4 single") keeps no unit.
        if _date_owns(text, m.start()):
            add("number", raw)
            continue
        unit = _unit_after(text, m.end())
        if unit:
            add("number", "%s %s" % (raw, unit))
        else:
            add("number", raw)

    # Number words used as a quantity ("eight albums", "two days").
    for m in re.finditer(r"\b(%s)\b" % "|".join(NUMBER_WORDS), text, re.I):
        word = m.group(1).lower()
        unit = _unit_after(text, m.end())
        if not unit:
            continue
        # "the two close the song" is a back-reference to two people already
        # named, not a quantity to verify. "an EP of eight songs" is.
        if _definite_before(text, m.start()):
            continue
        # Bind the word to its unit too, so "six nights" cannot be covered by
        # any "six" in the registry.
        add("number", "%s %s" % (word, unit))

    return claims


def read_ledger(path) -> str:
    p = Path(path)
    if not p.exists():
        return ""
    return p.read_text(encoding="utf-8", errors="replace")


def ledger_claims(ledger_text: str):
    """Parse the registry into claims.

    A line looks like `- <claim> | <source url> | <exact quote>`. The claim part
    is what the writer asserted; the quote is what the source actually said.
    Both are searchable, because a number often lives in the quote and a name
    often lives in the claim.
    """
    out = []
    for raw in (ledger_text or "").splitlines():
        line = raw.strip()
        if not line.startswith("- "):
            continue
        parts = [p.strip() for p in line[2:].split("|")]
        if not parts:
            continue
        claim = parts[0]
        source = parts[1] if len(parts) > 1 else ""
        quote = parts[2] if len(parts) > 2 else ""
        out.append({
            "claim": claim,
            "source": source,
            "quote": quote,
            "has_source": bool(source),
            "has_quote": bool(quote),
        })
    return out


def check(body: str, ledger_text: str):
    """Return (fails, warns, info) for one body against one registry."""
    entries = ledger_claims(ledger_text)
    searchable = _norm(ledger_text)
    fails, warns, info = [], [], []

    if not entries:
        fails.append("registry is empty: no '- <claim> | <source> | <quote>' lines")

    for entry in entries:
        if not entry["has_source"]:
            fails.append("registry line without a source: %s" % entry["claim"][:70])
        if not entry["has_quote"]:
            warns.append("registry line without a source quote: %s" % entry["claim"][:70])

    for claim in extract_claims(body):
        if _covered(claim["kind"], claim["text"], searchable):
            info.append("%-6s %s" % (claim["kind"], claim["text"]))
        else:
            fails.append("%-6s %s" % (claim["kind"], claim["text"]))

    return fails, warns, info


def render(fails, warns, info) -> str:
    lines = []
    for f in fails:
        lines.append("  X %s" % f)
    for w in warns:
        lines.append("  ! %s" % w)
    lines.append("  registry covers %d claim(s)" % len(info))
    return "\n".join(lines)
