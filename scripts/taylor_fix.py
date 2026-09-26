#!/usr/bin/env python3
import base64, io, json, os, re, urllib.request
from pathlib import Path
from PIL import Image

DESK="https://music98.news/api/desk"
PHOTO="https://music98.news/api/photo"
KEY=os.environ["ADMIN_PASSWORD"]
POST_ID="autay25r1"
IMG_PAGE="https://www.aol.com/articles/taylor-swifts-life-showgirl-deluxe-144402000.html"
BODY="Taylor Swift has released *The Life of a Showgirl: The Encore*, adding four songs to the 12-track album she released in 2025. The expanded edition arrived on September 25, 2026, with \"Patient Zero,\" \"Cleveland!,\" \"Pink Clouding\" and \"Babylon\" placed after the original sequence. Apple Music lists the project at 16 songs and 41 minutes, with the added material grouped on Disc 2. Swift announced the edition on September 23, one day after revealing \"Patient Zero\" and its September 25 release date. Rather than revising the first album's tracklist, the new edition keeps those 12 songs intact and adds a separate four-song section.\n\n[apple:album:6814997249]\n\nThe extra recordings came out of a trip Swift took to Sweden with Max Martin, a producer and songwriter, and Shellback, a producer and songwriter who worked with her on the original album. Swift said the trip was planned to celebrate the response to *The Life of a Showgirl*, but a studio was nearby and the three returned to making music. In her announcement, she wrote that they \"wrote more songs\" and described the new material as coming from gratitude for the way listeners had embraced the album. The original *The Life of a Showgirl* was released on October 3, 2025. The four additions were therefore made after the original album had already been completed and released.\n\nThe new artwork uses a photograph from the original *The Life of a Showgirl* shoot by Mert Alas and Marcus Piggott. Taylor Swift Style identified the image as a previously unseen photograph from the album shoot that had appeared only in booklet material before being used as the Encore cover. Swift is pictured in a textured orange-and-silver mini dress with crystal sock heels, against a magenta backdrop. The image gives the expanded edition its own cover while keeping the photographers who created the original visual campaign attached to the project. The cover image is separate from the music itself, but it also makes clear that the new edition is being presented as an extension of the same album era.\n\n\"Patient Zero\" is the first of the four new songs to receive a full music video, with its world premiere scheduled for the 2026 MTV Video Music Awards on September 27. Swift directed the video and appears in it with Dakota Johnson, an actor, and Colin Farrell, an actor. Emmanuel Lubezki, a cinematographer, handled the cinematography. A 13-second preview was shown on \"CBS Mornings\" on September 24 before Swift shared the teaser on social media. Paramount and CBS confirmed that the complete video will premiere during the VMAs, two days after the expanded album became available to stream.\n\nThe release also gives the 2025 album a new closing section without changing what came before it. The four songs are grouped together rather than inserted into the original 12-track sequence, making the project easy to read as an extension of the first album. \"Patient Zero\" leads that addition, followed by \"Cleveland!,\" \"Pink Clouding\" and \"Babylon,\" while the upcoming video gives one of the new tracks a visual chapter of its own. With the full 16-song edition now available, the next public step for the project is the September 27 premiere of the \"Patient Zero\" video at the VMAs."

def req(url, method="GET", payload=None):
    data=json.dumps(payload).encode() if payload is not None else None
    headers={"Accept":"application/json","User-Agent":"music98-editorial-runner"}
    if data is not None:
        headers["Content-Type"]="application/json"
    if url.startswith(DESK) or url.startswith(PHOTO):
        headers["X-Admin-Key"]=KEY
    r=urllib.request.Request(url,data=data,headers=headers,method=method)
    with urllib.request.urlopen(r,timeout=90) as x:
        return x.status, x.headers, x.read()

page=urllib.request.urlopen(urllib.request.Request(IMG_PAGE,headers={"User-Agent":"Mozilla/5.0"}),timeout=90).read().decode("utf-8","replace")
m=re.search(r'<meta[^>]+property=["\\\']og:image["\\\'][^>]+content=["\\\']([^"\\\']+)',page,re.I)
if not m:
    m=re.search(r'<meta[^>]+content=["\\\']([^"\\\']+)["\\\'][^>]+property=["\\\']og:image["\\\']',page,re.I)
if not m:
    raise SystemExit("og:image not found")
IMG_URL=m.group(1).replace("&amp;","&")
print("PHOTO URL:",IMG_URL)
raw=urllib.request.urlopen(urllib.request.Request(IMG_URL,headers={"User-Agent":"Mozilla/5.0"}),timeout=90).read()
im=Image.open(io.BytesIO(raw)).convert("RGB")
orig=im.size
if im.height >= im.width:
    raise SystemExit(f"bad cover geometry: {im.width}x{im.height}")
if im.width < 1920:
    im=im.resize((1920, round(im.height*1920/im.width)), Image.Resampling.LANCZOS)
if im.width > 2200:
    im.thumbnail((2200,2200), Image.Resampling.LANCZOS)
buf=io.BytesIO()
im.save(buf,"JPEG",quality=88,optimize=True,progressive=True)
jpg=buf.getvalue()
print(f"PHOTO SOURCE: {orig[0]}x{orig[1]}; UPLOAD: {im.width}x{im.height}; {len(jpg)} bytes")
if im.width < 1920 or im.height >= im.width:
    raise SystemExit(f"bad cover geometry: {im.width}x{im.height}")
if len(jpg) > 2_900_000:
    raise SystemExit(f"cover too large: {len(jpg)}")

name="taylor-swift-encore-sept-2026.jpg"
data="data:image/jpeg;base64,"+base64.b64encode(jpg).decode()
status,_,resp=req(PHOTO,"POST",{"name":name,"data":data})
print("PHOTO UPLOAD:",status,resp.decode())
if status != 200:
    raise SystemExit("photo upload failed")

status,_,resp=req(DESK,"GET")
desk=json.loads(resp)
posts=desk["posts"]
target=next(p for p in posts if str(p.get("id"))==POST_ID)
target["body"]=BODY
target["excerpt"]="Taylor Swift has released *The Life of a Showgirl: The Encore*, adding four songs to the 12-track album she released in 2025. The expanded edition arrived on September 25, 2026."
target["title"]="Taylor Swift — *The Life of a Showgirl: The Encore*"
target["cover"]={
    "kind":"img",
    "src":"photos/"+name,
    "credit":"Mert Alas & Marcus Piggott",
    "creditUrl":"https://www.artpartner.com/mert-alas-marcus-piggott/bio",
    "pos":"50% 50%",
    "zoom":1,
    "cardY":0.5,
    "cardZoom":1,
    "lockX":0.5
}
status,_,resp=req(DESK,"POST",{"posts":posts,"touched":[POST_ID]})
print("DESK WRITE:",status,resp.decode())
if status != 200:
    raise SystemExit("desk write failed")

# Fresh read verifies the target and leaves all other posts under the desk's touched guard.
status,_,resp=req(DESK,"GET")
after=json.loads(resp)["posts"]
p=next(p for p in after if str(p.get("id"))==POST_ID)
print("POST CHECK:", p.get("status"), len(re.sub(r"\\[(youtube|apple|tiktok|instagram)[^\\]]*\\]"," ",p.get("body","")).split()), p.get("cover"))
print("APPLE:", "[apple:album:6814997249]" in p.get("body",""))
print("BODY PHOTO:", "[photo:" in p.get("body",""))
