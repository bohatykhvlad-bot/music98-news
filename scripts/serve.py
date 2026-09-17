#!/usr/bin/env python3
"""Local static server with /api/top50 daily rebuild."""
from __future__ import annotations

import json
import runpy
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
API = runpy.run_path(str(ROOT / "api" / "top50.py"))


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path.rstrip("/") == "/api/top50":
            try:
                payload = API["build_payload"](enrich=False)
                body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
                status = 200
            except Exception as exc:
                body = json.dumps({"error": "rebuild_failed", "detail": str(exc)}).encode()
                status = 502
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Cache-Control", "public, max-age=0")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        return super().do_GET()

    def log_message(self, fmt, *args):
        print(self.address_string(), "-", fmt % args)


if __name__ == "__main__":
    port = 43123
    httpd = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"music98.news → http://127.0.0.1:{port}")
    httpd.serve_forever()
