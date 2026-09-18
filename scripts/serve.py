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
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

PREVIEW_MAX = 3 * 1024 * 1024
PREVIEW_CACHE = {}
ITUNNORM = b"iTunNORM"
ITUNSKIP = b"iTunSKIP"

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
API = runpy.run_path(str(ROOT / "api" / "top50.py"))
DESK = PUBLIC / "data" / "desk.json"
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


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
    DESK.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


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
    if len(PREVIEW_CACHE) > 80:
        PREVIEW_CACHE.clear()
    PREVIEW_CACHE[url] = data
    return 200, data


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(PUBLIC), **kwargs)

    def _send(self, status, body, content_type="application/json; charset=utf-8"):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

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

    def do_GET(self):
        path = self.path.split("?", 1)[0].rstrip("/") or "/"
        if path == "/api/preview":
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
            try:
                status, body = fetch_preview(raw)
            except Exception:
                return self._send(502, b"upstream", "text/plain; charset=utf-8")
            if status != 200:
                return self._send(status, b"too large" if status == 413 else b"upstream", "text/plain; charset=utf-8")
            return self._send(200, body, "audio/mp4")
        if path == "/api/top50":
            try:
                payload = API["build_payload"](enrich=False)
                status, body = json_bytes(payload)
            except Exception as exc:
                status, body = json_bytes({"error": "rebuild_failed", "detail": str(exc)}, 502)
            return self._send(status, body)
        if path == "/api/desk":
            d = desk_read()
            return self._send(*json_bytes({"posts": d["posts"]}))
        if path == "/api/subscribers":
            if not self._authed():
                return self._send(*json_bytes({"error": "unauthorized"}, 401))
            d = desk_read()
            return self._send(*json_bytes({"subscribers": d["subscribers"]}))
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
            key = os.environ.get("RESEND_API_KEY", "").strip()
            sender = os.environ.get("FROM_EMAIL", "music98.news <news@music98.news>").strip()
            d = desk_read()
            emails = d["subscribers"]
            if not emails:
                return self._send(*json_bytes({"error": "no_subscribers"}, 400))
            if not key:
                return self._send(
                    *json_bytes(
                        {
                            "error": "missing_resend_key",
                            "saved": len(emails),
                            "hint": "Add RESEND_API_KEY to .env. Addresses are already stored.",
                        },
                        400,
                    )
                )
            sent, failed = 0, 0
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
                    },
                    method="POST",
                )
                try:
                    with urllib.request.urlopen(req, timeout=20) as resp:
                        if 200 <= resp.status < 300:
                            sent += 1
                        else:
                            failed += 1
                except Exception:
                    failed += 1
            return self._send(*json_bytes({"ok": True, "sent": sent, "failed": failed}))
        self.send_error(404)

    def log_message(self, fmt, *args):
        print(self.address_string(), "-", fmt % args)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "43123"))
    httpd = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"music98.news → http://127.0.0.1:{port}")
    print("Desk → http://127.0.0.1:%s/m98desk.html" % port)
    httpd.serve_forever()
