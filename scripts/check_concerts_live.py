#!/usr/bin/env python3
import json
import urllib.parse
import urllib.request

UA = "music98-concerts-check/1.0"
BASE = "https://music98.news"

def get(path):
    req = urllib.request.Request(BASE + path, headers={"User-Agent": UA, "Accept":"application/json,text/html"})
    with urllib.request.urlopen(req, timeout=60) as r:
        raw = r.read()
        return r.status, r.headers, raw

def api(label, lat, lng, radius=50):
    q = urllib.parse.urlencode({"lat":lat,"lng":lng,"radius":radius})
    status, headers, raw = get("/api/concerts?" + q)
    data = json.loads(raw)
    events = data.get("events") or []
    print("CITY", label, "status", status, "events", len(events))
    if not events:
        raise SystemExit(f"no events returned for {label}")
    e = events[0]
    url = e.get("url") or ""
    parsed = urllib.parse.urlparse(url)
    qs = urllib.parse.parse_qs(parsed.query)
    print("SAMPLE", json.dumps({
        "artist":e.get("artist"),
        "date":e.get("date"),
        "venue":e.get("venue"),
        "city":e.get("city"),
        "countryCode":e.get("countryCode"),
        "lat":e.get("lat"),
        "lng":e.get("lng"),
        "image":bool(e.get("image")),
        "ticketHost":parsed.netloc,
        "ticketQueryKeys":sorted(qs.keys()),
        "status":e.get("status"),
    }, ensure_ascii=False))
    for k in ("id","artist","date","venue","city","lat","lng","url"):
        if e.get(k) in (None,""):
            raise SystemExit(f"{label}: missing {k}")
    return events


status, headers, raw = get("/")
home = raw.decode("utf-8","replace")
print("HOME", status, "concerts_nav", 'href="/concerts"' in home)
if status != 200 or 'href="/concerts"' not in home:
    raise SystemExit("homepage Concerts nav missing")

status, headers, raw = get("/sitemap.xml")
sitemap = raw.decode("utf-8","replace")
print("SITEMAP", status, "concerts", "https://music98.news/concerts" in sitemap)
if status != 200 or "https://music98.news/concerts" not in sitemap:
    raise SystemExit("concerts sitemap entry missing")

status, headers, raw = get("/concerts")
html = raw.decode("utf-8","replace")
print("PAGE", status, "bytes", len(raw), "mapbox", "mapboxgl.Map" in html, "concerts_api", "/api/concerts" in html)
if status != 200 or "Concerts Near You" not in html or "mapboxgl.Map" not in html:
    raise SystemExit("concerts page failed")

all_events = []
all_events += api("London", 51.5074, -0.1278, 40)
all_events += api("New York", 40.7128, -74.0060, 40)
all_events += api("Berlin", 52.5200, 13.4050, 50)
all_events += api("Sydney", -33.8688, 151.2093, 50)

artist = next((e.get("artist") for e in all_events if e.get("artist")), None)
if artist:
    q = urllib.parse.urlencode({"artist":artist})
    status, headers, raw = get("/api/concerts?" + q)
    data = json.loads(raw)
    events = data.get("events") or []
    print("ARTIST", artist, "status", status, "events", len(events))

print("CONCERTS_CHECK PASS")
