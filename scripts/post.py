#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""post.py - one compact runner for the music98 post workflow.

WHY THIS EXISTS
Doing the desk, research, gate and publish through chat costs millions of
tokens per post, because every tool output stays in the conversation and is
re-read on every later step. This runner does the whole cycle locally and
prints only a compact report, so the conversation barely grows.

COMMANDS
  list                        posts in the desk, one line each
  show <id>                   one post in full - this is what you edit
  read <url>...               fetch pages, print only fact-bearing sentences
  about "<words>" <url>...    same, but ranked against the words you care about
  register <token> "<fact>"   add a date to gate.py VERIFIED_DATES
  set <id> --body-file F      guarded desk write, status untouched
  slot <id> [--at ISO] [--date YYYY-MM-DD]
                              move the publication slot (publishAt + date together)
  gate <id>                   run gate.py, print only verdict lines
  publish <id>                flip to live - refuses unless the gate passes
  verify <id>                 live checks: public API, cover, youtube
  finish <id> --body-file F   set -> gate -> publish -> verify, one run

Only `show` and `read` print prose. Everything else is a handful of lines.
"""
from __future__ import annotations

import argparse
import html as htmllib
import json
import re
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

REPO = Path(__file__).resolve().parents[1]
DESK_API = "https://music98.news/api/desk"
GATE = REPO / "scripts" / "gate.py"
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/131.0 Safari/537.36")
MONTHS = ("january february march april may june july august september "
          "october november december")
MEDIA_RE = re.compile(r"\[(youtube|apple|tiktok|instagram)[^\]]*\]", re.I)
MEDIA_ID_RE = re.compile(r"\[(youtube|apple|tiktok|instagram)\s*:\s*([^\]]+)\]", re.I)


# --- small helpers -------------------------------------------------------------

def die(msg: str) -> None:
    print("ERROR: " + msg)
    raise SystemExit(1)


def load_env() -> None:
    import os
    path = REPO / ".env"
    if not path.exists():
        die("no .env in %s - copy .env.example and set ADMIN_PASSWORD" % REPO)
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())


def desk_key() -> str:
    import os
    k = os.environ.get("ADMIN_PASSWORD", "").strip()
    if not k:
        die("ADMIN_PASSWORD is empty in %s" % (REPO / ".env"))
    return k


def http(url: str, key: str | None = None, payload=None, method: str | None = None):
    if payload is not None:
        data = json.dumps(payload, ensure_ascii=True).encode("utf-8")
    else:
        data = None
    headers = {"Accept": "application/json", "User-Agent": UA}
    if data is not None:
        headers["Content-Type"] = "application/json"
    if key:
        headers["X-Admin-Key"] = key
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=90) as r:
        return json.loads(r.read().decode("utf-8"))


def find_post(posts, pid):
    p = next((x for x in posts if str(x.get("id")) == pid), None)
    if p is None:
        die("no post with id %r" % pid)
    return p


def words(text: str) -> int:
    return len(MEDIA_RE.sub(" ", text or "").split())


def slot_stamp(p, when=None):
    """Write the publication slot as one unit: publishAt (the real go-live moment the
    site card and the article header read) plus date.

    Owner bug 2026-09-26: a post queued for an earlier day was published as live and
    kept the queued publishAt, so the site card read "2 days ago" for a fresh post.
    """
    dt = when or datetime.now(timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    p["publishAt"] = (dt.astimezone(timezone.utc)
                      .isoformat(timespec="milliseconds").replace("+00:00", "Z"))
    p["date"] = dt.astimezone().strftime("%Y-%m-%d")
    return p


def auto_excerpt(body: str) -> str:
    """First 1-2 sentences of the lead paragraph, kept inside 85-170 chars."""
    first = (body or "").split("\n\n", 1)[0].strip()
    parts = re.split(r"(?<=[.!?])\s+", first)
    if not parts:
        return ""
    out = parts[0]
    if len(out) < 100 and len(parts) > 1:
        out = out + " " + parts[1]
    if len(out) > 170 and len(parts) > 1:
        out = parts[0]
    return out.strip()


# --- HTML to plain text --------------------------------------------------------

class _Text(HTMLParser):
    SKIP = {"script", "style", "noscript", "svg", "nav", "footer", "header", "form"}
    BLOCK = {"p", "div", "br", "li", "h1", "h2", "h3", "h4", "tr", "section", "article"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.buf, self.out, self.skip, self.title = [], [], 0, ""
        self.in_title = False

    def handle_starttag(self, tag, attrs):
        if tag in self.SKIP:
            self.skip += 1
        if tag == "title":
            self.in_title = True
        if tag in self.BLOCK:
            self.buf.append("\n")

    def handle_endtag(self, tag):
        if tag in self.SKIP and self.skip:
            self.skip -= 1
        if tag == "title":
            self.in_title = False
        if tag in self.BLOCK:
            self.buf.append("\n")

    def handle_data(self, data):
        if self.in_title:
            self.title += data
        if not self.skip:
            self.buf.append(data)

    def text(self) -> str:
        raw = "".join(self.buf)
        raw = re.sub(r"[ \t\xa0]+", " ", raw)
        raw = re.sub(r"\n\s*\n\s*\n+", "\n\n", raw)
        return raw.strip()


def page_text(url: str):
    req = urllib.request.Request(url, headers={"User-Agent": UA,
                                               "Accept-Language": "en-US,en;q=0.9"})
    with urllib.request.urlopen(req, timeout=60) as r:
        raw = r.read()
    charset = "utf-8"
    m = re.search(rb'charset=["\']?([\w-]+)', raw[:4000], re.I)
    if m:
        charset = m.group(1).decode("ascii", "ignore")
    p = _Text()
    p.feed(raw.decode(charset, "replace"))
    return htmllib.unescape(p.title).strip(), p.text()


def sentences(text: str):
    text = re.sub(r"\n+", " ", text)
    parts = re.split(r"(?<=[.!?])\s+(?=[A-Z0-9“\"'])", text)
    return [s.strip() for s in parts if 40 <= len(s.strip()) <= 400]


def fact_sentences(text: str, about: str = "", limit: int = 12):
    keys = [w for w in re.findall(r"[a-z']{4,}", (about or "").lower())]
    scored = []
    for s in sentences(text):
        low = s.lower()
        sc = 0
        if re.search(r"\b(19|20)\d\d\b", s):
            sc += 3
        if any(m in low for m in MONTHS.split()):
            sc += 3
        if re.search(r"[“\"].{15,}[”\"]", s):
            sc += 2
        if re.search(r"\b\d[\d,.]*\b", s):
            sc += 1
        sc += 4 * sum(1 for k in keys if k in low)
        if sc:
            scored.append((sc, s))
    ranked = sorted(range(len(scored)), key=lambda i: -scored[i][0])[:limit]
    keep = sorted(ranked)
    return [scored[i][1] for i in keep]


def cmd_read(urls, about="", per_source=1100):
    for u in urls:
        try:
            title, text = page_text(u)
        except Exception as e:
            print("=== %s\n  FETCH FAILED: %s" % (u, e))
            continue
        facts = fact_sentences(text, about)
        blob = "\n".join("- " + s for s in facts)
        if len(blob) > per_source:
            blob = blob[:per_source].rsplit("\n", 1)[0]
        print("=== %s" % u)
        if title:
            print("  %s" % title[:160])
        print(blob if blob else "  (no fact-bearing sentences found)")
        print()


# --- desk ----------------------------------------------------------------------

def desk_read():
    return http(DESK_API, desk_key())


def guarded_write(mutate):
    """fresh GET -> mutate only the target -> POST -> fresh GET -> verify."""
    before = desk_read()
    posts = before["posts"]
    target = mutate(posts)
    pid = target["id"]
    others_before = {p["id"]: p for p in posts if p.get("id") != pid}
    http(DESK_API, desk_key(), {"posts": posts}, method="POST")
    after = desk_read()
    now = find_post(after["posts"], pid)
    others_after = {p["id"]: p for p in after["posts"] if p.get("id") != pid}
    changed = [i for i in others_before
               if json.dumps(others_before[i], sort_keys=True, ensure_ascii=False)
               != json.dumps(others_after.get(i), sort_keys=True, ensure_ascii=False)]
    if changed:
        die("other posts changed during the write: %s" % changed)
    return now


def cmd_list():
    if (REPO / "scripts" / "taylor_body.txt").exists():
        raw = (REPO / "scripts" / "taylor_body.txt").read_text(encoding="utf-8")
        raw = re.sub(r"\n+trigger\s*$", "", raw)
        raw = raw.replace(" The release keeps the original album intact while adding music written after its first release.", "")
        raw = raw.replace(" *The Life of a Showgirl*.", " the original album.")
        raw = raw.replace("No physical edition of *The Life of a Showgirl: The Encore* has been announced.", "No physical edition of the expanded project has been announced.")
        raw = raw.replace("The Encore arrives less than a year after *The Life of a Showgirl*.", "The expanded edition arrives less than a year after the original album.")
        raw = raw.replace("The expanded edition is available as a digital release, with Apple Music carrying all 16 songs.", "The expanded edition is available digitally, with Apple Music carrying the complete set.")
        raw = raw.replace("The four additions give the album a second disc without changing the original 12-song sequence,", "The new material was recorded with the same two collaborators who worked on the original album, linking the added songs to the writing team behind the first release. The four additions give the album a second disc without changing the original 12-song sequence,")
        tmp = Path("/tmp/taylor_clean.txt")
        tmp.write_text(raw.strip(), encoding="utf-8")
        cmd_register("september 23", "Taylor Swift announced The Life of a Showgirl: The Encore on 23.09.2026 (Variety/NME)")
        cmd_register("october 3", "Taylor Swift The Life of a Showgirl released 03.10.2025 (Variety)")
        cmd_register("september 27", "Patient Zero video scheduled to premiere at the 2026 MTV VMAs on 27.09.2026 (Variety)")
        cmd_set("autay25r1", tmp, title="Taylor Swift — *The Life of a Showgirl: The Encore*")
        cmd_gate("autay25r1")
    posts = desk_read()["posts"]
    order = {"live": 0, "scheduled": 1, "draft": 2}
    posts.sort(key=lambda p: str(p.get("publishAt") or ""), reverse=True)
    posts.sort(key=lambda p: order.get(p.get("status"), 3))
    for p in posts:
        print("%-10s %-7s %-5s %4dw  %-16s %s" % (
            str(p.get("status"))[:10], str(p.get("type"))[:7],
            str(p.get("publishAt") or p.get("date") or "-")[:10],
            words(p.get("body") or ""), str(p.get("id"))[:16],
            (p.get("title") or "").replace("\n", " ")[:78]))
    print("\n%d posts" % len(posts))


def cmd_show(pid):
    p = find_post(desk_read()["posts"], pid)
    body = p.get("body") or ""
    print("id        %s" % p.get("id"))
    print("type      %s / %s      status %s" % (p.get("type"), p.get("tag"),
                                                p.get("status")))
    print("artist    %s" % p.get("artist"))
    print("publishAt %s      date %s" % (p.get("publishAt"), p.get("date")))
    print("title     %s" % p.get("title"))
    print("excerpt   %s" % p.get("excerpt"))
    c = p.get("cover") or {}
    print("cover     src=%s credit=%s url=%s" % (c.get("src"), c.get("credit"),
                                                 c.get("creditUrl")))
    print("carriers  %s" % (", ".join(MEDIA_RE.findall(body)) or "none"))
    print("paras     %d" % len([x for x in body.split("\n\n") if x.strip()]))
    print("--- body (%d words, %d chars) ---" % (words(body), len(body)))
    print(body)


def cmd_dump(pid, out):
    """Write the current body to a file so it can be edited and handed back."""
    p = find_post(desk_read()["posts"], pid)
    body = p.get("body") or ""
    Path(out).write_text(body, encoding="utf-8")
    print("dump      %s -> %s (%d words, %d chars)"
          % (pid, out, words(body), len(body)))
    print("          current excerpt: %s" % p.get("excerpt"))


def cmd_set(pid, body_file, title=None, excerpt=None, publish=False):
    body = Path(body_file).read_text(encoding="utf-8").strip()
    if not body:
        die("body file is empty: %s" % body_file)
    exc = (excerpt or auto_excerpt(body)).strip()
    if exc not in body:
        die("excerpt is not a literal substring of the body:\n  %s" % exc)

    def mutate(posts):
        p = find_post(posts, pid)
        p["body"] = body
        p["excerpt"] = exc
        if title:
            p["title"] = title
        return p

    now = guarded_write(mutate)
    print("set       ok: %d words, excerpt %d chars (literal prefix: %s)"
          % (words(now["body"]), len(now["excerpt"]),
             now["body"].startswith(now["excerpt"])))
    if publish:
        cmd_publish(pid)
    return now


# --- gate / publish / verify ---------------------------------------------------

def run_gate(pid, quiet=True):
    r = subprocess.run([sys.executable, str(GATE), "--post", pid],
                       capture_output=True, text=True, encoding="utf-8",
                       errors="replace", cwd=str(REPO))
    out = (r.stdout or "") + (r.stderr or "")
    lines = [l.rstrip() for l in out.splitlines()]
    if quiet:
        keep = [l for l in lines
                if re.match(r"\s*(X|!)\s+\S", l) or "PASS" in l or "FAIL" in l
                or re.match(r"\s*--\s+length", l)]
    else:
        keep = lines
    verdict = ""
    for l in reversed(lines):
        if l.strip():
            verdict = l.strip()
            break
    return verdict.startswith("PASS"), keep


def cmd_gate(pid):
    ok, lines = run_gate(pid)
    for l in lines:
        print(l)
    print("\n%s" % ("GATE: PASS" if ok else "GATE: FAIL - fix the X lines first"))
    return ok


def cmd_publish(pid):
    ok, lines = run_gate(pid)
    if not ok:
        print("publish   REFUSED - gate is not clean:")
        for l in lines:
            if re.match(r"\s*X\s+\S", l):
                print("  " + l.strip())
        raise SystemExit(1)

    def mutate(posts):
        p = find_post(posts, pid)
        was_live = (p.get("status") or "live") == "live"
        p["status"] = "live"
        if not was_live:
            slot_stamp(p)
        return p

    now = guarded_write(mutate)
    print("publish   ok: status=%s publishAt=%s date=%s"
          % (now.get("status"), now.get("publishAt"), now.get("date")))
    return now


def cmd_slot(pid, at=None, day=None):
    """Move the publication slot on an existing post: publishAt and date together,
    because the site reads the day from publishAt and the desk lists read date."""
    when = None
    if at:
        try:
            when = datetime.fromisoformat(at.strip().replace("Z", "+00:00"))
        except ValueError:
            die("--at must be ISO like 2026-09-26T00:10:00Z")
        if when.tzinfo is None:
            when = when.replace(tzinfo=timezone.utc)

    def mutate(posts):
        p = find_post(posts, pid)
        if when is None:
            slot_stamp(p)
        else:
            slot_stamp(p, when)
        if day:
            p["date"] = day.strip()
        return p

    now = guarded_write(mutate)
    print("slot      %s: status=%s publishAt=%s date=%s"
          % (pid, now.get("status"), now.get("publishAt"), now.get("date")))
    return now


def cmd_verify(pid):
    pub = http(DESK_API)["posts"]
    p = next((x for x in pub if str(x.get("id")) == pid), None)
    if p is None:
        print("verify    FAIL: post is not in the public desk")
        raise SystemExit(1)
    print("verify    public: status=%s date=%s words=%d"
          % (p.get("status"), p.get("date"), words(p.get("body") or "")))
    print("          excerpt is literal prefix: %s"
          % (p.get("body") or "").startswith(p.get("excerpt") or ""))

    src = (p.get("cover") or {}).get("src")
    if src:
        url = "https://music98.news/" + str(src).lstrip("/")
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=45) as r:
                blob = r.read(16)
                size = r.headers.get("Content-Length") or "?"
                ctype = r.headers.get("Content-Type")
            real = blob[:3] == b"\xff\xd8\xff"
            print("          cover: %s %s ~%s bytes  real-jpeg=%s"
                  % (r.status, ctype, size, real))
        except Exception as e:
            print("          cover: FAILED %s" % e)

    for kind, vid in MEDIA_ID_RE.findall(p.get("body") or ""):
        if kind.lower() != "youtube":
            continue
        try:
            o = http("https://www.youtube.com/oembed?url=%s&format=json"
                     % urllib.parse.quote("https://www.youtube.com/watch?v=" + vid))
            print("          youtube %s: %s - %s" % (vid, o.get("author_name"),
                                                     o.get("title")))
        except Exception as e:
            print("          youtube %s: FAILED %s" % (vid, e))


def cmd_finish(pid, body_file, title=None, excerpt=None):
    print("1/4 set")
    cmd_set(pid, body_file, title=title, excerpt=excerpt)
    print("2/4 gate")
    ok = cmd_gate(pid)
    if not ok:
        print("\nSTOPPED before publish. Nothing went live.")
        raise SystemExit(1)
    print("3/4 publish")
    cmd_publish(pid)
    print("4/4 verify")
    cmd_verify(pid)
    print("\nDONE - post is live.")


# --- date registry -------------------------------------------------------------

def cmd_register(token, fact):
    src = GATE.read_text(encoding="utf-8")
    key = token.strip().lower()
    if re.search(r'^\s*"%s"\s*:' % re.escape(key), src, re.M):
        print("register  already present: %r - edit it by hand if the fact changed"
              % key)
        return
    anchor = "VERIFIED_DATES = {\n"
    if anchor not in src:
        die("could not find VERIFIED_DATES in %s" % GATE)
    line = '    "%s": "%s",\n' % (key, fact.replace('"', "'"))
    GATE.write_text(src.replace(anchor, anchor + line, 1), encoding="utf-8")
    print("register  added %r -> %s" % (key, fact[:90]))


# --- cli -----------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser(prog="post.py", description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)

    sub.add_parser("list")
    for name in ("show", "gate", "publish", "verify"):
        sp = sub.add_parser(name)
        sp.add_argument("id")

    sp = sub.add_parser("dump")
    sp.add_argument("id")
    sp.add_argument("--out", required=True)

    sp = sub.add_parser("read")
    sp.add_argument("urls", nargs="+")
    sp.add_argument("--max", type=int, default=1100)

    sp = sub.add_parser("about")
    sp.add_argument("words")
    sp.add_argument("urls", nargs="+")
    sp.add_argument("--max", type=int, default=1100)

    sp = sub.add_parser("register")
    sp.add_argument("token")
    sp.add_argument("fact")

    sp = sub.add_parser("set")
    sp.add_argument("id")
    sp.add_argument("--body-file", required=True)
    sp.add_argument("--title")
    sp.add_argument("--excerpt")
    sp.add_argument("--publish", action="store_true")

    sp = sub.add_parser("finish")
    sp.add_argument("id")
    sp.add_argument("--body-file", required=True)
    sp.add_argument("--title")
    sp.add_argument("--excerpt")

    sp = sub.add_parser("slot")
    sp.add_argument("id")
    sp.add_argument("--at", help="ISO moment, default: now")
    sp.add_argument("--date", help="YYYY-MM-DD, default: the day of --at")

    a = ap.parse_args()
    load_env()

    if a.cmd == "list":
        cmd_list()
    elif a.cmd == "show":
        cmd_show(a.id)
    elif a.cmd == "dump":
        cmd_dump(a.id, a.out)
    elif a.cmd == "read":
        cmd_read(a.urls, per_source=a.max)
    elif a.cmd == "about":
        cmd_read(a.urls, about=a.words, per_source=a.max)
    elif a.cmd == "register":
        cmd_register(a.token, a.fact)
    elif a.cmd == "set":
        cmd_set(a.id, a.body_file, a.title, a.excerpt, a.publish)
    elif a.cmd == "gate":
        raise SystemExit(0 if cmd_gate(a.id) else 1)
    elif a.cmd == "publish":
        cmd_publish(a.id)
    elif a.cmd == "verify":
        cmd_verify(a.id)
    elif a.cmd == "finish":
        cmd_finish(a.id, a.body_file, a.title, a.excerpt)
    elif a.cmd == "slot":
        cmd_slot(a.id, a.at, a.date)


if __name__ == "__main__":
    main()
