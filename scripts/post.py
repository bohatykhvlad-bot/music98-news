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
  photo --url URL --name FILE upload one verified source image to site photo storage
  about "<words>" <url>...    same, but ranked against the words you care about
  register <token> "<fact>"   add a date to gate.py VERIFIED_DATES
  create --file POST.json     create a new draft only after editorial + gate + preflight
  replace-draft <id> --file POST.json
                              replace one existing draft after pre/post read + gate + preflight
  set <id> --body-file F      guarded desk write, status untouched
  slot <id> [--at ISO] [--date YYYY-MM-DD]
                              move the publication slot (publishAt + date together)
  gate <id>                   run gate.py, print only verdict lines
  preflight <id>              run mandatory saved-draft preflight
  editorial <id> [--body-file F] [--phase pre-edit|post-edit]
                              mandatory full-read barrier before and after editing
  publish <id>                flip to live - refuses unless gate + editorial stamp pass
  verify <id>                 live checks: public API, cover, youtube
  finish <id> --body-file F   set -> gate -> publish -> verify, one run

Only `show` and `read` print prose. Everything else is a handful of lines.
"""
from __future__ import annotations

import argparse
import base64
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
PHOTO_API = "https://music98.news/api/photo"
GATE = REPO / "scripts" / "gate.py"
PREFLIGHT = REPO / "scripts" / "preflight.py"
READTHROUGH = REPO / "scripts" / "editorial_readthrough.py"
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/131.0 Safari/537.36")
MONTHS = ("january february march april may june july august september "
          "october november december")
MEDIA_RE = re.compile(r"\[(youtube|apple|tiktok|instagram|tickets)[^\]]*\]", re.I)
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


def cmd_photo(url, name):
    """Download one source image and store the exact bytes in site photo storage."""
    req=urllib.request.Request(url,headers={"User-Agent":UA,"Accept":"image/jpeg,image/png,image/webp,image/*"})
    with urllib.request.urlopen(req,timeout=60) as r:
        raw=r.read()
        ctype=(r.headers.get("Content-Type") or "").split(";",1)[0].lower()
    if ctype not in ("image/jpeg","image/png","image/webp"):
        die("photo source returned unsupported type: %s" % ctype)
    if len(raw)<100000 or len(raw)>3_000_000:
        die("photo source size outside allowed range: %d bytes" % len(raw))
    data="data:%s;base64,%s" % (ctype,base64.b64encode(raw).decode("ascii"))
    result=http("https://music98.news/api/photo",desk_key(),{"name":name,"data":data},method="POST")
    if not result.get("ok"):
        die("photo upload failed: %s" % result)
    url=result.get("url")
    print("photo     ok: %s bytes=%d url=%s" % (name,len(raw),url))
    return url


def cmd_list():
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


def _local_gate(post):
    sys.path.insert(0, str(REPO / "scripts"))
    from gate import check_post
    fails, warns, _ = check_post(post, strict=True)
    for code, msg, *rest in fails:
        print("GATE FAIL", code, msg)
    for code, msg, *rest in warns:
        print("GATE WARN", code, msg)
    return not fails


def _local_preflight(post, baseline=None, expected_media=None, min_words=None):
    sys.path.insert(0, str(REPO / "scripts"))
    from preflight import check
    return check(post, baseline, expected_media, min_words)


def run_preflight(pid, file=None, baseline=None, expected_media=None, min_words=None):
    cmd=[sys.executable, str(PREFLIGHT), "--post", pid]
    if file:
        cmd += ["--file", str(file)]
    if baseline:
        cmd += ["--baseline", str(baseline)]
    if expected_media is not None:
        cmd += ["--expected-media", str(expected_media)]
    if min_words is not None:
        cmd += ["--min-words", str(min_words)]
    r=subprocess.run(cmd,capture_output=True,text=True,encoding="utf-8",errors="replace",cwd=str(REPO))
    out=(r.stdout or "")+(r.stderr or "")
    return r.returncode==0,[line.rstrip() for line in out.splitlines() if line.strip()]


def cmd_preflight(pid):
    ok,lines=run_preflight(pid)
    for line in lines: print(line)
    if not ok:
        raise SystemExit(1)
    return True


def cmd_create(post_file, allows=None, reason=None):
    path=Path(post_file)
    data=json.loads(path.read_text(encoding="utf-8"))
    if isinstance(data,dict) and isinstance(data.get("posts"),list):
        if len(data["posts"])!=1:
            die("create --file must contain exactly one post")
        post=data["posts"][0]
    else:
        post=data
    if not isinstance(post,dict):
        die("create --file must contain a post object")
    pid=str(post.get("id") or "").strip()
    if not pid:
        die("new draft is missing id")
    if post.get("status")!="draft":
        die("create accepts draft status only")
    body=(post.get("body") or "").strip()
    excerpt=(post.get("excerpt") or "").strip()
    if not body or not excerpt or not body.startswith(excerpt):
        die("new draft needs non-empty body and literal-prefix excerpt")

    # Full final read is an explicit barrier for new posts. Unlike an existing
    # edit, there is no pre-edit source, so only the post-edit phase applies.
    cmd=[sys.executable,str(READTHROUGH),"--post",pid,"--file",str(path),
         "--phase","post-edit","--confirm-full-read"]
    for item in (allows or []):
        cmd += ["--allow",item]
    if reason:
        cmd += ["--reason",reason]
    r=subprocess.run(cmd,capture_output=True,text=True,encoding="utf-8",errors="replace",cwd=str(REPO))
    print((r.stdout or "")+(r.stderr or ""),end="")
    if r.returncode!=0:
        die("new draft failed editorial full-read barrier")

    if not _local_gate(post):
        die("new draft failed gate before desk write")
    if not _local_preflight(post):
        die("new draft failed preflight before desk write")

    before=desk_read()
    posts=before["posts"]
    if any(str(x.get("id"))==pid for x in posts):
        die("post id already exists: %s" % pid)
    snapshot={x["id"]:x for x in posts}
    posts.insert(0,post)
    http(DESK_API,desk_key(),{"posts":posts},method="POST")
    after=desk_read()
    now=find_post(after["posts"],pid)
    others={x["id"]:x for x in after["posts"] if str(x.get("id"))!=pid}
    changed=[i for i in snapshot if json.dumps(snapshot[i],sort_keys=True,ensure_ascii=False)
             != json.dumps(others.get(i),sort_keys=True,ensure_ascii=False)]
    if changed:
        die("other posts changed during create: %s" % changed)
    for field in ("id","type","title","excerpt","body","status","artist"):
        if now.get(field)!=post.get(field):
            die("created draft field changed: %s" % field)
    print("create    ok: %s status=draft words=%d" % (pid, words(now.get("body") or "")))
    return now


def import_photo(source_url, name):
    req=urllib.request.Request(source_url,headers={"User-Agent":UA,"Accept":"image/jpeg,image/png,image/webp,image/*"})
    with urllib.request.urlopen(req,timeout=90) as r:
        blob=r.read()
        ctype=(r.headers.get("Content-Type") or "").split(";",1)[0].lower()
    if ctype not in ("image/jpeg","image/png","image/webp"):
        die("cover import is not a supported image: %s" % ctype)
    if len(blob)<100000:
        die("cover import is suspiciously small: %d bytes" % len(blob))
    import base64
    payload={"name":name,"data":"data:%s;base64,%s" % (ctype,base64.b64encode(blob).decode("ascii"))}
    result=http(PHOTO_API,desk_key(),payload,method="POST")
    if not result.get("ok") or not result.get("url"):
        die("photo import failed")
    print("photo     imported: %s (%d bytes)" % (result["url"],len(blob)))
    return result["url"]


def cmd_replace_draft(pid, post_file, allows=None, reason=None):
    path=Path(post_file)
    data=json.loads(path.read_text(encoding="utf-8"))
    if isinstance(data,dict) and isinstance(data.get("posts"),list):
        matches=[x for x in data["posts"] if str(x.get("id"))==pid]
        if len(matches)!=1:
            die("replace-draft file must contain exactly one matching post")
        staged=matches[0]
    else:
        staged=data
    if not isinstance(staged,dict) or str(staged.get("id"))!=pid:
        die("replace-draft file has wrong post id")
    if staged.get("status")!="draft":
        die("replace-draft accepts draft status only")
    cover_import=staged.pop("coverImport",None)
    if cover_import:
        if not isinstance(cover_import,dict) or not cover_import.get("url") or not cover_import.get("name"):
            die("coverImport requires url and name")
        cover=staged.get("cover")
        if not isinstance(cover,dict):
            die("coverImport requires cover object")
        cover["src"]=import_photo(str(cover_import["url"]),str(cover_import["name"]))

    body=(staged.get("body") or "").strip()
    excerpt=(staged.get("excerpt") or "").strip()
    if not body or not excerpt or not body.startswith(excerpt):
        die("replace-draft needs non-empty body and literal-prefix excerpt")

    current=find_post(desk_read()["posts"],pid)
    if current.get("status")!="draft":
        die("replace-draft refuses non-draft current post")

    # Require PRE-EDIT stamp on exact current desk body.
    pre_ok,pre_lines=run_editorial(pid,check_stamp=True,phase="pre-edit")
    if not pre_ok:
        print("replace-draft REFUSED - pre-edit full-read stamp missing or stale:")
        for line in pre_lines: print("  "+line)
        raise SystemExit(1)

    # Require POST-EDIT stamp on exact staged full-post body and verify its pre
    # stamp against the current desk source.
    cmd=[sys.executable,str(READTHROUGH),"--post",pid,"--file",str(path),
         "--phase","post-edit","--check-stamp"]
    r=subprocess.run(cmd,capture_output=True,text=True,encoding="utf-8",errors="replace",cwd=str(REPO))
    out=(r.stdout or "")+(r.stderr or "")
    for line in out.splitlines():
        if line.strip(): print(line.rstrip())
    if r.returncode!=0:
        die("replace-draft refused: final full-read stamp missing or stale")

    if not _local_gate(staged):
        die("replace-draft failed gate before desk write")
    if not _local_preflight(staged):
        die("replace-draft failed preflight before desk write")

    allowed_fields={"type","tag","rtype","artist","title","excerpt","body","cover","date","pinned","status"}
    unknown=[k for k in staged if k not in allowed_fields and k not in current]
    if unknown:
        die("replace-draft contains unsupported fields: %s" % unknown)

    def mutate(posts):
        p=find_post(posts,pid)
        if p.get("status")!="draft":
            raise RuntimeError("target stopped being a draft")
        for key in allowed_fields:
            if key in staged:
                p[key]=staged[key]
        return p

    now=guarded_write(mutate)
    for field in ("id","type","title","excerpt","body","status","artist","cover"):
        want=staged.get(field,current.get(field))
        got=now.get(field)
        if got!=want:
            if field=="body":
                import hashlib
                gs=str(got or "")
                ws=str(want or "")
                ghash=hashlib.sha256(gs.encode("utf-8")).hexdigest()[:16]
                whash=hashlib.sha256(ws.encode("utf-8")).hexdigest()[:16]
                first=next((i for i,(a,b) in enumerate(zip(gs,ws)) if a!=b),min(len(gs),len(ws)))
                print("replace   body mismatch got_len=%d want_len=%d got_sha=%s want_sha=%s first_diff=%d" %
                      (len(gs),len(ws),ghash,whash,first))
                print("          got_context=%r" % gs[max(0,first-30):first+70])
                print("          want_context=%r" % ws[max(0,first-30):first+70])
            die("replace-draft post-save mismatch: %s" % field)
    print("replace   ok: %s status=draft words=%d media=%d" %
          (pid,words(now.get("body") or ""),len(MEDIA_RE.findall(now.get("body") or ""))))
    return now


def cmd_set(pid, body_file, title=None, excerpt=None, publish=False):
    require_editorial_stamp(pid, body_file=body_file, title=title)
    body = Path(body_file).read_text(encoding="utf-8").strip()
    if not body:
        die("body file is empty: %s" % body_file)
    exc = (excerpt or auto_excerpt(body)).strip()
    if exc not in body:
        die("excerpt is not a literal substring of the body:\n  %s" % exc)

    current=find_post(desk_read()["posts"],pid)
    candidate=json.loads(json.dumps(current))
    candidate["body"]=body
    candidate["excerpt"]=exc
    if title:
        candidate["title"]=title
    if not _local_preflight(candidate, baseline=current):
        die("set refused: staged body failed preflight before desk write")

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
    # gate.py is the authority and returns 0 for a clean gate, 1 for defects.
    # Do not infer success from the last merged stdout/stderr line: a harmless
    # runtime warning written to stderr after "PASS - gate clean" used to turn
    # a clean gate into a false failure.
    return r.returncode == 0, keep


def cmd_gate(pid):
    ok, lines = run_gate(pid)
    for l in lines:
        print(l)
    print("\n%s" % ("GATE: PASS" if ok else "GATE: FAIL - fix the X lines first"))
    return ok


def run_editorial(pid, body_file=None, title=None, confirm=False, check_stamp=False,
                  allows=None, reason=None, phase="post-edit"):
    cmd=[sys.executable, str(READTHROUGH), "--post", pid, "--phase", phase]
    if body_file:
        cmd += ["--body-file", str(body_file)]
    if title:
        cmd += ["--title", title]
    if confirm:
        cmd.append("--confirm-full-read")
    if check_stamp:
        cmd.append("--check-stamp")
    for item in (allows or []):
        cmd += ["--allow", item]
    if reason:
        cmd += ["--reason", reason]
    r=subprocess.run(cmd,capture_output=True,text=True,encoding="utf-8",errors="replace",cwd=str(REPO))
    out=(r.stdout or "")+(r.stderr or "")
    return r.returncode==0,[line.rstrip() for line in out.splitlines() if line.strip()]


def cmd_editorial(pid, body_file=None, title=None, allows=None, reason=None, phase="post-edit"):
    ok,lines=run_editorial(pid,body_file=body_file,title=title,confirm=True,
                           allows=allows,reason=reason,phase=phase)
    for line in lines:
        print(line)
    if not ok:
        print("\nEDITORIAL: FAIL - fix the reader-facing defects, then reread the whole text.")
        raise SystemExit(1)
    return True


def require_editorial_stamp(pid, body_file=None, title=None):
    ok,lines=run_editorial(pid,body_file=body_file,title=title,check_stamp=True)
    if not ok:
        print("editorial REFUSED - mandatory full-read stamp is missing or stale:")
        for line in lines:
            print("  "+line)
        print("  Run: python scripts/post.py editorial %s%s" %
              (pid, (" --body-file "+str(body_file)) if body_file else ""))
        raise SystemExit(1)
    return True


def cmd_publish(pid):
    require_editorial_stamp(pid)
    pf_ok,pf_lines=run_preflight(pid)
    if not pf_ok:
        print("publish   REFUSED - preflight is not clean:")
        for line in pf_lines: print("  "+line)
        raise SystemExit(1)
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
        src = str(src)
        url = src if re.match(r"^https?://", src, re.I) else "https://music98.news/" + src.lstrip("/")
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
    print("1/5 set")
    cmd_set(pid, body_file, title=title, excerpt=excerpt)
    print("2/5 gate")
    ok = cmd_gate(pid)
    if not ok:
        print("\nSTOPPED before publish. Nothing went live.")
        raise SystemExit(1)
    print("3/5 preflight")
    cmd_preflight(pid)
    print("4/5 publish")
    cmd_publish(pid)
    print("5/5 verify")
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
    for name in ("show", "gate", "preflight", "publish", "verify"):
        sp = sub.add_parser(name)
        sp.add_argument("id")

    sp = sub.add_parser("editorial")
    sp.add_argument("id")
    sp.add_argument("--body-file")
    sp.add_argument("--title")
    sp.add_argument("--phase", choices=["pre-edit","post-edit"], default="post-edit")
    sp.add_argument("--allow", action="append", choices=["technical-credit","physical-format","source-attribution","single-sentence"])
    sp.add_argument("--reason")

    sp = sub.add_parser("dump")
    sp.add_argument("id")
    sp.add_argument("--out", required=True)

    sp = sub.add_parser("photo")
    sp.add_argument("--url", required=True)
    sp.add_argument("--name", required=True)

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

    sp = sub.add_parser("create")
    sp.add_argument("--file", required=True)
    sp.add_argument("--allow", action="append", choices=["technical-credit","physical-format","source-attribution","single-sentence"])
    sp.add_argument("--reason")

    sp = sub.add_parser("replace-draft")
    sp.add_argument("id")
    sp.add_argument("--file", required=True)
    sp.add_argument("--allow", action="append", choices=["technical-credit","physical-format","source-attribution","single-sentence"])
    sp.add_argument("--reason")

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
    elif a.cmd == "photo":
        cmd_photo(a.url, a.name)
    elif a.cmd == "read":
        cmd_read(a.urls, per_source=a.max)
    elif a.cmd == "about":
        cmd_read(a.urls, about=a.words, per_source=a.max)
    elif a.cmd == "register":
        cmd_register(a.token, a.fact)
    elif a.cmd == "create":
        cmd_create(a.file, a.allow, a.reason)
    elif a.cmd == "replace-draft":
        cmd_replace_draft(a.id, a.file, a.allow, a.reason)
    elif a.cmd == "set":
        cmd_set(a.id, a.body_file, a.title, a.excerpt, a.publish)
    elif a.cmd == "gate":
        raise SystemExit(0 if cmd_gate(a.id) else 1)
    elif a.cmd == "preflight":
        cmd_preflight(a.id)
    elif a.cmd == "editorial":
        cmd_editorial(a.id, a.body_file, a.title, a.allow, a.reason, a.phase)
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
