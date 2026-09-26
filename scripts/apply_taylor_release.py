#!/usr/bin/env python3
from __future__ import annotations
import base64, json, os, subprocess, sys, urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
DESK = "https://music98.news/api/desk"
PHOTO = "https://music98.news/api/photo"
IMAGE_URL = "https://www.taylorswift.com/wp-content/uploads/sites/2529/2025/08/c6aKvzeQm_png.png"
PID = "autay25r1"
TITLE = 'Taylor Swift Releases *The Life of a Showgirl: The Encore* With Four New Songs'
EXCERPT = ('Taylor Swift, the singer and songwriter, has released *The Life of a Showgirl: The Encore*, an expanded edition '
           'of her 2025 album that adds four new songs to the original 12-track record.')
BODY = r'''Taylor Swift, the singer and songwriter, has released *The Life of a Showgirl: The Encore*, an expanded edition of her 2025 album that adds four new songs to the original 12-track record. The new edition arrived on September 25, 2026, with "Patient Zero," "Cleveland!," "Pink Clouding," and "Babylon" forming a second disc on the digital release. Swift announced the project before its release, after first introducing "Patient Zero" as a new song, and described the extra material as coming from a return to the studio with Max Martin and Shellback, the producers and songwriters who worked with her on the original album. The release gives *Showgirl* four additional recordings without replacing the album's original tracklist.

The four songs came out of a trip Swift made to Sweden with Martin and Shellback after the original album's release. According to Swift's announcement, the trip was meant to celebrate the album's response, but the three collaborators ended up working in a nearby studio and wrote more music. The result is an expanded 16-song edition that keeps the original sequence intact before moving into the four new tracks. "Patient Zero" leads the new material, followed by "Cleveland!," "Pink Clouding," and "Babylon." Apple Music lists the release as a 16-song, two-disc edition, with the four new songs grouped on Disc 2.

[photo:photos/taylor-swift-showgirl-encore.png|Taylor Swift|https://www.taylorswift.com]

The new material also arrives with a visual project already attached to it. "Patient Zero" is set to receive an official music video directed by Swift, with actors Dakota Johnson and Colin Farrell starring. The video is scheduled to premiere during the 2026 MTV Video Music Awards on September 27, 2026. Cinematographer Emmanuel Lubezki, the Academy Award winner known for *The Revenant*, *Birdman*, and *Gravity*, shot the video. The premiere gives the first new song from the Encore edition another major public appearance two days after the album expansion arrived.

[apple:album:6814997249]

For Swift, *The Life of a Showgirl: The Encore* is also her first new music release since "I Knew It, I Knew You," the original song she released for *Toy Story 5* on June 5, 2026. The Encore adds four newly recorded tracks to an album that originally arrived on October 3, 2025. Swift worked with Martin and Shellback on the original album as well, making the new songs a continuation of the same collaboration rather than a separate project. The expanded edition is available digitally, while Swift's official store has also listed "Patient Zero" collector editions alongside the digital release.

*The Life of a Showgirl: The Encore* keeps the focus on the same album while extending it with four songs that were written after its original release. "Patient Zero" is the lead track from the new material, while "Cleveland!," "Pink Clouding," and "Babylon" complete the second disc. The full "Patient Zero" video will follow on September 27, giving the Encore release both a new set of recordings and a new visual premiere.'''

def load_env():
    p = REPO / ".env"
    if p.exists():
        for line in p.read_text(encoding="utf-8").splitlines():
            if "=" in line and not line.lstrip().startswith("#"):
                k,v=line.split("=",1)
                os.environ.setdefault(k.strip(), v.strip())

def key():
    load_env()
    k=os.environ.get("ADMIN_PASSWORD","").strip()
    if not k: raise SystemExit("ADMIN_PASSWORD missing")
    return k

def http(url, method="GET", payload=None):
    headers={"Accept":"application/json","User-Agent":"music98-editorial-runner"}
    data=None
    if payload is not None:
        data=json.dumps(payload, ensure_ascii=True).encode()
        headers["Content-Type"]="application/json"
    headers["X-Admin-Key"]=key()
    req=urllib.request.Request(url,data=data,headers=headers,method=method)
    with urllib.request.urlopen(req,timeout=90) as r:
        return json.loads(r.read().decode())

def set_body():
    f=REPO/"tmp_taylor_body.txt"
    f.write_text(BODY,encoding="utf-8")
    subprocess.run([
        sys.executable,str(REPO/"scripts/post.py"),"set",PID,
        "--body-file",str(f),"--title",TITLE,"--excerpt",EXCERPT
    ],check=True)

def upload_photo():
    req=urllib.request.Request(IMAGE_URL,headers={"User-Agent":"music98-editorial-runner"})
    with urllib.request.urlopen(req,timeout=90) as r:
        raw=r.read()
        ctype=(r.headers.get("Content-Type") or "image/png").split(";")[0]
    if not raw.startswith(b"\x89PNG"):
        raise SystemExit("downloaded photo is not PNG")
    b64=base64.b64encode(raw).decode()
    res=http(PHOTO,"POST",{"name":"taylor-swift-showgirl-encore.png","data":f"data:{ctype};base64,{b64}"})
    print("photo upload:",res)

def set_cover_guarded():
    before=http(DESK)
    posts=before["posts"]
    target=next(p for p in posts if str(p.get("id"))==PID)
    target["cover"]={
        "src":"photos/taylor-swift-showgirl-encore.png",
        "credit":"Taylor Swift",
        "creditUrl":"https://www.taylorswift.com"
    }
    target["artist"]="Taylor Swift"
    target["type"]="release"
    target["tag"]="release"
    target["status"]="draft"
    payload={"posts":posts}
    http(DESK,"POST",payload)
    after=http(DESK)
    a={p["id"]:p for p in before["posts"] if p["id"]!=PID}
    b={p["id"]:p for p in after["posts"] if p["id"]!=PID}
    changed=[i for i in a if json.dumps(a[i],sort_keys=True,ensure_ascii=False)!=json.dumps(b.get(i),sort_keys=True,ensure_ascii=False)]
    if changed: raise SystemExit("other posts changed: "+",".join(map(str,changed)))
    print("cover update: ok")

def gate():
    subprocess.run([sys.executable,str(REPO/"scripts/post.py"),"register","october 3","Taylor Swift The Life of a Showgirl released 03.10.2025 (Universal Music Japan: https://www.universal-music.co.jp/taylor-swift/ ; Apple Music: https://music.apple.com/us/album/the-life-of-a-showgirl-the-encore/6814997249 )"],check=True)
    subprocess.run([sys.executable,str(REPO/"scripts/post.py"),"gate",PID],check=True)

if __name__=="__main__":
    set_body()
    upload_photo()
    set_cover_guarded()
    gate()
