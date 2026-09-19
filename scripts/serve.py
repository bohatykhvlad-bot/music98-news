#!/usr/bin/env python3
"""Local static server: chart rebuild, desk, subscribe, newsletter."""
from __future__ import annotations

import json
import os
import re
import runpy
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

PREVIEW_MAX = 5 * 1024 * 1024
PREVIEW_CACHE = {}
RESOLVE_CACHE = {}
ITUNNORM = b"iTunNORM"
ITUNSKIP = b"iTunSKIP"
PAGE_UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"
)
CONTENT_RE = re.compile(
    r'"contentUrl"\s*:\s*"(https://audio(?:-ssl)?\.itunes\.apple\.com[^"]+\.m4a)"',
    re.I,
)
CONTENT_ESC_RE = re.compile(
    r'"contentUrl"\s*:\s*"(https:\\/\\/audio(?:-ssl)?\.itunes\.apple\.com[^"]+\.m4a)"',
    re.I,
)

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
API = runpy.run_path(str(ROOT / "api" / "top50.py"))
DESK = PUBLIC / "data" / "desk.json"
MAIL_FILE = ROOT / ".mail.json"
TEST_FROM = "music98.news <onboarding@resend.dev>"
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
FAKE_HOST = re.compile(r"\.(invalid|test|localhost)$", re.I)
FAKE_EXACT = re.compile(r"^(example\.(com|net|org|invalid)|localhost)$", re.I)


def load_env():
    path = ROOT / ".env"
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


load_env()


def admin_password() -> str:
    return os.environ.get("ADMIN_PASSWORD", "music98")


def migrate_publish_at(d):
    posts = d.get("posts") or []
    n = len(posts)
    changed = False
    for i, p in enumerate(posts):
        if not isinstance(p, dict) or p.get("publishAt"):
            continue
        import datetime
        day = datetime.datetime.fromisoformat(p.get("date") or "2026-01-01")
        seed = bool(re.fullmatch(r"[a-z]{1,2}\d+", str(p.get("id") or "")))
        delta = datetime.timedelta(days=-1, seconds=i * 60) if seed else datetime.timedelta(seconds=(n - i) * 60)
        p["publishAt"] = (day + delta).isoformat()
        changed = True
    return changed


def desk_read() -> dict:
    try:
        data = json.loads(DESK.read_text(encoding="utf-8"))
    except Exception:
        data = {}
    if not isinstance(data.get("posts"), list):
        data["posts"] = []
    if not isinstance(data.get("subscribers"), list):
        data["subscribers"] = []
    return data


def desk_write(data: dict) -> None:
    DESK.parent.mkdir(exist_ok=True)
    out = {
        "posts": data.get("posts") or [],
        "subscribers": data.get("subscribers") or [],
    }
    DESK.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def mail_file_read() -> dict:
    try:
        data = json.loads(MAIL_FILE.read_text(encoding="utf-8"))
        if isinstance(data, dict):
            return data
    except Exception:
        pass
    return {}


def mail_config() -> tuple[str, str]:
    stored = mail_file_read()
    key = str(os.environ.get("RESEND_API_KEY") or stored.get("resendKey") or "").strip()
    sender = str(stored.get("fromEmail") or os.environ.get("FROM_EMAIL") or TEST_FROM).strip()
    return key, sender


def newsletter_recipients(desk: dict) -> list[str]:
    seen = set()
    out = []
    for raw in desk.get("subscribers") or []:
        email = str(raw or "").strip().lower()
        at = email.rfind("@")
        if at < 1:
            continue
        host = email[at + 1 :]
        if not host or FAKE_EXACT.match(host) or FAKE_HOST.search(host):
            continue
        if email in seen:
            continue
        seen.add(email)
        out.append(email)
    return out


def post_status(p: dict) -> str:
    return str((p or {}).get("status") or "live")


def parse_when(value):
    if not value:
        return None
    raw = str(value).strip().replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(raw)
    except Exception:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def promote_scheduled(data: dict) -> bool:
    now = datetime.now(timezone.utc)
    changed = False
    for p in data.get("posts") or []:
        if post_status(p) != "scheduled":
            continue
        at = parse_when(p.get("publishAt"))
        if at is None:
            continue
        if at <= now:
            p["status"] = "live"
            changed = True
    return changed


def public_posts(data: dict) -> list:
    now = datetime.now(timezone.utc)
    out = []
    for p in data.get("posts") or []:
        s = post_status(p)
        if s == "draft":
            continue
        if s == "scheduled":
            at = parse_when(p.get("publishAt"))
            if at is None or at > now:
                continue
        out.append(p)
    return out


def json_bytes(obj, status=200):
    body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
    return status, body


def allowed_preview_host(host: str) -> bool:
    h = (host or "").lower()
    return h in {"audio-ssl.itunes.apple.com", "audio.itunes.apple.com", "mzstatic.com"} or h.endswith(
        ".mzstatic.com"
    )


def fetch_preview(url: str):
    cached = PREVIEW_CACHE.get(url)
    if cached:
        return 200, cached
    req = urllib.request.Request(url, headers={"Accept": "audio/*,*/*;q=0.8"})
    with urllib.request.urlopen(req, timeout=20) as resp:
        data = resp.read(PREVIEW_MAX + 1)
    if len(data) > PREVIEW_MAX:
        return 413, b""
    data = data.replace(ITUNNORM, ITUNSKIP)
    if len(PREVIEW_CACHE) > 12:
        PREVIEW_CACHE.clear()
    PREVIEW_CACHE[url] = data
    return 200, data


def song_page_url(song: str) -> str:
    s = (song or "").strip()
    if re.fullmatch(r"\d+", s):
        return f"https://music.apple.com/us/song/{s}"
    try:
        u = urllib.parse.urlparse(s)
    except Exception:
        return ""
    host = (u.hostname or "").lower()
    if host not in {"music.apple.com", "itunes.apple.com"}:
        return ""
    qs = urllib.parse.parse_qs(u.query)
    iid = (qs.get("i") or [""])[0]
    if iid.isdigit():
        return f"https://music.apple.com/us/song/{iid}"
    m = re.search(r"/song/(?:[^/]+/)?(\d+)", u.path or "")
    if m:
        return f"https://music.apple.com/us/song/{m.group(1)}"
    if host == "music.apple.com":
        return urllib.parse.urlunparse((u.scheme, u.netloc, u.path, "", "", ""))
    return ""


def extract_extended(html: str) -> str:
    m = CONTENT_RE.search(html or "") or CONTENT_ESC_RE.search(html or "")
    if not m:
        return ""
    return m.group(1).replace("\\u002F", "/").replace("\\/", "/")


def resolve_clip(clip: str, song: str) -> str:
    page = song_page_url(song)
    if not page:
        return clip
    if page in RESOLVE_CACHE:
        return RESOLVE_CACHE[page]
    try:
        req = urllib.request.Request(page, headers={"User-Agent": PAGE_UA, "Accept": "text/html"})
        with urllib.request.urlopen(req, timeout=8) as resp:
            html = resp.read().decode("utf-8", "replace")
        ext = extract_extended(html)
        if ext:
            u = urllib.parse.urlparse(ext)
            host = (u.hostname or "").lower()
            if u.scheme == "https" and allowed_preview_host(host) and (
                (u.path or "").lower().endswith(".m4a") or "audiopreview" in ext.lower()
            ):
                if len(RESOLVE_CACHE) > 200:
                    RESOLVE_CACHE.clear()
                RESOLVE_CACHE[page] = ext
                return ext
    except Exception:
        pass
    return clip


APPLE_ALBUM_RE = re.compile(r"^/apple-embed/([a-z]{2})/album/(\d+)$")
APPLE_STATIC_RE = re.compile(r"^/apple-static/(build|assets)/([A-Za-z0-9._/-]+)$")
APPLE_GW_RE = re.compile(
    r"^/apple-gw/(amp-api\.music\.apple\.com|amp-api-edge\.music\.apple\.com|"
    r"api\.music\.apple\.com|play\.itunes\.apple\.com|sf-api-token-service\.itunes\.apple\.com)(/.*)?$"
)
APPLE_EMBED_CSP = (
    "default-src 'self' https://*.apple.com musics: itmss://*.apple.com; "
    "img-src 'self' https://*.apple.com https://*.mzstatic.com artwork: data:; "
    "style-src 'self' https://*.apple.com 'unsafe-inline'; "
    "script-src 'self' https://*.apple.com blob: 'unsafe-eval'; "
    "connect-src 'self' https://*.apple.com https://*.mzstatic.com; "
    "media-src 'self' https://*.apple.com https://*.mzstatic.com blob:; "
    "block-all-mixed-content"
)


def rewrite_apple_embed(html: str) -> str:
    out = html.replace('"/build/', '"/apple-static/build/').replace(
        "'/build/", "'/apple-static/build/"
    )
    out = out.replace('"/assets/', '"/apple-static/assets/').replace(
        "'/assets/", "'/apple-static/assets/"
    )
    out = re.sub(r"<script[^>]*static\.cloudflareinsights\.com[^>]*>\s*</script>", "", out)  # Apple analytics: blocked by our CSP anyway
    tag = '<script src="/apple-player-fix.js?v=editorial-85"></script>'
    if os.environ.get("M98_NO_FIX") == "1":
        tag = ""  # QA: vanilla Apple embed through the proxy, no injected script
    if re.search(r"<head([^>]*)>", out, re.I):
        out = re.sub(r"<head([^>]*)>", r"<head\1>" + tag, out, count=1, flags=re.I)
    else:
        out = tag + out
    return out


def fetch_apple_album_html(cc: str, album_id: str, query: str) -> tuple[int, bytes]:
    apple = f"https://embed.music.apple.com/{cc}/album/{album_id}"
    if query:
        apple += "?" + query
    req = urllib.request.Request(
        apple,
        headers={"User-Agent": PAGE_UA, "Accept": "text/html"},
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            raw = resp.read().decode("utf-8", "replace")
    except Exception:
        return 502, b"apple embed unavailable"
    html = rewrite_apple_embed(raw)
    return 200, html.encode("utf-8")


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(PUBLIC), **kwargs)

    def _send(self, status, body, content_type="application/json; charset=utf-8"):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def _send_audio(self, body: bytes):
        total = len(body)
        start, end, status = 0, total - 1 if total else 0, 200
        rng = (self.headers.get("Range") or "").strip()
        if rng.lower().startswith("bytes=") and total:
            spec = rng.split("=", 1)[1].split(",", 1)[0].strip()
            left, _, right = spec.partition("-")
            try:
                if left == "" and right:
                    n = int(right)
                    start = max(0, total - n)
                    end = total - 1
                    status = 206
                elif left != "":
                    start = int(left)
                    end = int(right) if right else total - 1
                    end = min(max(end, start), total - 1)
                    if 0 <= start < total:
                        status = 206
                    else:
                        start, end, status = 0, total - 1, 200
            except ValueError:
                start, end, status = 0, total - 1, 200
        if total == 0:
            start, end, status = 0, 0, 200
            chunk = b""
        else:
            chunk = body[start : end + 1]
        self.send_response(status)
        self.send_header("Content-Type", "audio/mp4")
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(chunk)))
        if status == 206:
            self.send_header("Content-Range", f"bytes {start}-{end}/{total}")
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(chunk)

    def _preview(self):
        qs = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        raw = (qs.get("u") or [""])[0]
        try:
            target = urllib.parse.urlparse(raw)
        except Exception:
            return self._send(400, b"bad url", "text/plain; charset=utf-8")
        host = (target.hostname or "").lower()
        href = raw.lower()
        if (
            target.scheme != "https"
            or not allowed_preview_host(host)
            or not (target.path.lower().endswith(".m4a") or "audiopreview" in href)
        ):
            return self._send(400, b"bad url", "text/plain; charset=utf-8")
        clip = resolve_clip(raw, (qs.get("song") or [""])[0])
        try:
            status, body = fetch_preview(clip)
        except Exception:
            return self._send(502, b"upstream", "text/plain; charset=utf-8")
        if status != 200:
            return self._send(status, b"too large" if status == 413 else b"upstream", "text/plain; charset=utf-8")
        return self._send_audio(body)

    def _read_json(self):
        n = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(n) if n else b"{}"
        try:
            return json.loads(raw.decode("utf-8") or "{}")
        except Exception:
            return {}

    def _authed(self) -> bool:
        got = (self.headers.get("X-Admin-Key") or "").strip()
        return bool(got) and got == admin_password()

    def _apple_embed(self, path: str):
        m = APPLE_ALBUM_RE.match(path)
        if not m:
            return self._send(404, b"not found", "text/plain; charset=utf-8")
        query = urllib.parse.urlparse(self.path).query
        status, body = fetch_apple_album_html(m.group(1), m.group(2), query)
        self.send_response(status)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Cache-Control", "public, max-age=60")
        self.send_header("Content-Security-Policy", APPLE_EMBED_CSP)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def _apple_static(self, path: str):
        m = APPLE_STATIC_RE.match(path)
        if not m or ".." in path:
            return self._send(404, b"not found", "text/plain; charset=utf-8")
        apple = f"https://embed.music.apple.com/{m.group(1)}/{m.group(2)}"
        req = urllib.request.Request(apple, headers={"User-Agent": PAGE_UA})
        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                body = resp.read()
                ctype = resp.headers.get("Content-Type") or "application/octet-stream"
        except Exception:
            return self._send(404, b"not found", "text/plain; charset=utf-8")
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Cache-Control", "public, max-age=3600")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def _apple_gw(self, path: str):
        m = APPLE_GW_RE.match(path)
        if not m or ".." in path:
            return self._send(404, b"not found", "text/plain; charset=utf-8")
        dest = f"https://{m.group(1)}{m.group(2) or '/'}"
        query = urllib.parse.urlparse(self.path).query
        if query:
            dest += "?" + query
        headers = {
            "User-Agent": PAGE_UA,
            "Origin": "https://embed.music.apple.com",
            "Referer": "https://embed.music.apple.com/",
        }
        for name in ("Authorization", "Accept", "Accept-Language", "Content-Type", "Range", "Music-User-Token"):
            val = self.headers.get(name)
            if val:
                headers[name] = val
        for k, v in self.headers.items():
            if k.lower().startswith("x-apple-"):
                headers[k] = v
        req = urllib.request.Request(dest, headers=headers, method=self.command)
        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                body = resp.read()
                ctype = resp.headers.get("Content-Type") or "application/octet-stream"
                status = resp.status
        except urllib.error.HTTPError as exc:
            body = exc.read() if exc.fp else b""
            ctype = exc.headers.get("Content-Type") if exc.headers else "text/plain"
            status = exc.code
        except Exception:
            return self._send(502, b"upstream", "text/plain; charset=utf-8")
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def do_HEAD(self):
        path = self.path.split("?", 1)[0].rstrip("/") or "/"
        if path == "/api/preview":
            return self._preview()
        if APPLE_ALBUM_RE.match(path):
            return self._apple_embed(path)
        if APPLE_STATIC_RE.match(path):
            return self._apple_static(path)
        if APPLE_GW_RE.match(path):
            return self._apple_gw(path)
        return super().do_HEAD()

    def do_GET(self):
        path = self.path.split("?", 1)[0].rstrip("/") or "/"
        if APPLE_ALBUM_RE.match(path):
            return self._apple_embed(path)
        if APPLE_STATIC_RE.match(path):
            return self._apple_static(path)
        if APPLE_GW_RE.match(path):
            return self._apple_gw(path)
        if path == "/api/preview":
            return self._preview()
        if path == "/api/top50":
            try:
                payload = API["build_payload"](enrich=False)
                status, body = json_bytes(payload)
            except Exception as exc:
                status, body = json_bytes({"error": "rebuild_failed", "detail": str(exc)}, 502)
            return self._send(status, body)
        if path == "/api/desk":
            qs = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            if (qs.get("auth") or [""])[0] == "1":
                if not self._authed():
                    return self._send(*json_bytes({"error": "unauthorized"}, 401))
                return self._send(*json_bytes({"ok": True}))
            d = desk_read()
            dirty = promote_scheduled(d)
            if migrate_publish_at(d):
                dirty = True
            if dirty:
                desk_write(d)
            posts = d["posts"] if self._authed() else public_posts(d)
            return self._send(*json_bytes({"posts": posts}))
        if path == "/api/subscribers":
            if not self._authed():
                return self._send(*json_bytes({"error": "unauthorized"}, 401))
            d = desk_read()
            return self._send(*json_bytes({"subscribers": d["subscribers"]}))
        if path == "/api/mail":
            if not self._authed():
                return self._send(*json_bytes({"error": "unauthorized"}, 401))
            key, sender = mail_config()
            return self._send(*json_bytes({"ok": True, "configured": bool(key), "from": sender}))
        if path in ("/m98desk", "/m98desk.html"):
            self.send_response(301)
            self.send_header("Location", "/admin-desk")
            self.end_headers()
            return
        if path == "/admin-desk":
            self.path = "/admin-desk.html"
        return super().do_GET()

    def do_POST(self):
        path = self.path.split("?", 1)[0].rstrip("/")
        if path == "/api/subscribe":
            payload = self._read_json()
            email = str(payload.get("email") or "").strip().lower()
            if not EMAIL_RE.match(email):
                return self._send(*json_bytes({"error": "invalid_email"}, 400))
            d = desk_read()
            if email not in d["subscribers"]:
                d["subscribers"].append(email)
                desk_write(d)
            return self._send(*json_bytes({"ok": True}))
        if path == "/api/desk":
            if not self._authed():
                return self._send(*json_bytes({"error": "unauthorized"}, 401))
            payload = self._read_json()
            posts = payload.get("posts")
            if not isinstance(posts, list):
                return self._send(*json_bytes({"error": "posts_required"}, 400))
            d = desk_read()
            d["posts"] = posts
            desk_write(d)
            return self._send(*json_bytes({"ok": True, "count": len(posts)}))
        if path == "/api/broadcast":
            if not self._authed():
                return self._send(*json_bytes({"error": "unauthorized"}, 401))
            payload = self._read_json()
            subject = str(payload.get("subject") or "").strip()
            text = str(payload.get("text") or "").strip()
            if not subject or not text:
                return self._send(*json_bytes({"error": "subject_and_text_required"}, 400))
            key, sender = mail_config()
            d = desk_read()
            emails = newsletter_recipients(d)
            if not emails:
                return self._send(*json_bytes({"error": "no_subscribers"}, 400))
            if not key:
                return self._send(
                    *json_bytes(
                        {
                            "error": "missing_resend_key",
                            "saved": len(emails),
                        },
                        400,
                    )
                )
            sent, failed = 0, 0
            last_err = ""
            html = "<pre style='font-family:Georgia,serif;font-size:16px;white-space:pre-wrap'>" + (
                text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            ) + "</pre>"
            for email in emails:
                req = urllib.request.Request(
                    "https://api.resend.com/emails",
                    data=json.dumps(
                        {"from": sender, "to": [email], "subject": subject, "html": html, "text": text}
                    ).encode(),
                    headers={
                        "Authorization": f"Bearer {key}",
                        "Content-Type": "application/json",
                        "User-Agent": PAGE_UA,
                    },
                    method="POST",
                )
                try:
                    with urllib.request.urlopen(req, timeout=20) as resp:
                        if 200 <= resp.status < 300:
                            sent += 1
                        else:
                            failed += 1
                except Exception as exc:
                    failed += 1
                    if not last_err:
                        body = ""
                        if hasattr(exc, "read"):
                            try:
                                body = exc.read().decode("utf-8", "replace")
                            except Exception:
                                body = ""
                        last_err = (body or str(exc))[:280]
                        if key:
                            last_err = last_err.replace(key, "[key]")
                        last_err = re.sub(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", "[email]", last_err, flags=re.I)
            return self._send(*json_bytes({"ok": True, "sent": sent, "failed": failed, "from": sender, "detail": last_err or None}))
        if path == "/api/mail":
            if not self._authed():
                return self._send(*json_bytes({"error": "unauthorized"}, 401))
            payload = self._read_json()
            stored = mail_file_read()
            next_key = str(payload.get("resendKey") or payload.get("RESEND_API_KEY") or "").strip()
            next_from = str(payload.get("fromEmail") or payload.get("FROM_EMAIL") or "").strip()
            if next_key:
                stored["resendKey"] = next_key
            if next_from:
                stored["fromEmail"] = next_from
            MAIL_FILE.write_text(json.dumps(stored) + "\n", encoding="utf-8")
            key, sender = mail_config()
            return self._send(*json_bytes({"ok": True, "configured": bool(key), "from": sender}))
        self.send_error(404)

    def log_message(self, fmt, *args):
        print(self.address_string(), "-", fmt % args)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "43123"))
    httpd = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"music98.news → http://127.0.0.1:{port}")
    print("Desk → http://127.0.0.1:%s/admin-desk" % port)
    httpd.serve_forever()
