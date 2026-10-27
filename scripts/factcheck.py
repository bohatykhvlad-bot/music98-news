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
    if kind == "name":
        # A surname alone identifies the person.
        parts = norm.split(" ")
        if len(parts) > 1:
            out.append(parts[-1].strip("'s"))
    if kind == "title":
        out.append(norm.rstrip("."))
        out.append(norm.rstrip(".,"))
        out.append(norm.rstrip(".,!?"))
    return [n for n in out if n]


def _covered(kind: str, text: str, searchable: str) -> bool:
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
        if _norm(name) in KNOWN_NON_FACTS:
            continue
        add("name", name)

    for m in DIGIT_RE.finditer(text):
        raw = m.group(0)
        if YEAR_RE.fullmatch(raw):
            continue
        add("number", raw)

    # Number words used as a quantity ("eight albums", "two days").
    for m in re.finditer(r"\b(%s)\b" % "|".join(NUMBER_WORDS), text, re.I):
        word = m.group(1).lower()
        tail = text[m.end():m.end() + 40].lstrip()
        unit_match = re.match(r"([A-Za-z][A-Za-z'’-]*)", tail)
        unit = unit_match.group(1) if unit_match else ""
        if not unit or _norm(unit) in NON_NOUN_AFTER_NUMBER:
            continue
        if unit.endswith("ing") or unit.endswith("ed"):
            continue
        add("number", word)

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
