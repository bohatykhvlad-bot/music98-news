#!/usr/bin/env python3
import base64, json, os, urllib.request
REPO="https://music98.news"
PID="autay25r1"
IMG_URL="https://images.squarespace-cdn.com/content/v1/6616cae0172b170a8dd0818d/91551088-581d-4dd7-b328-6556d0a7dc5a/0923%2BTaylor%2BSwift%2BThe%2BLife%2Bof%2Ba%2BShowgirl%2BThe%2BEncore%2BSeptember%2B23%2B2026%2BFeature.png"
KEY=os.environ["ADMIN_PASSWORD"]
UA="Mozilla/5.0"
body="""Taylor Swift, the singer and songwriter, has expanded *The Life of a Showgirl* with *The Life of a Showgirl: The Encore*, a four-song addition released on September 25, 2026. The digital edition keeps the original 12-song album and adds "Patient Zero," "Cleveland!," "Pink Clouding," and "Babylon." Swift announced the project on September 23, one day after revealing "Patient Zero" as a new single, turning what initially appeared to be a standalone song release into a larger extension of the album. The new edition is available digitally, with Apple Music listing 16 songs across two discs. Swift's announcement also introduced updated artwork for the expanded edition, giving the project a new visual identity while keeping the original album at its center.

The extra material came from a trip Swift made to Sweden with Max Martin and Shellback, the producer and songwriter collaborators from the original album. Swift said the trip was planned as a chance to celebrate the response to *The Life of a Showgirl*, which was released on October 3, 2025. A studio was nearby, and the three returned to writing together. Swift said the four songs were made out of gratitude for the reception to the album. The additional recordings therefore came from the same collaboration that shaped the original record, rather than from a separate project. The release also follows "I Knew It, I Knew You," which Swift released on June 5, 2026 for *Toy Story 5*.

[photo:photos/taylor-swift-encore-sept-2026.png|Mert Alas & Marcus Piggott|https://theagents.club/mert-alas]

The Encore keeps the original album sequence before moving into the additional recordings on Disc 2. "Patient Zero" opens that second disc, followed by "Cleveland!," "Pink Clouding," and "Babylon." Apple Music lists the edition at 16 songs and 41 minutes. The updated artwork uses an image from the original *Showgirl* photo shoot, photographed by Mert Alas and Marcus Piggott, with Swift in a metallic gold-and-silver fringe look against a magenta stage backdrop. The photograph was previously part of the album's visual material and was used for the new Encore cover announced on September 23.

The new release also arrives with a music video already scheduled for its first track. "Patient Zero" will receive an official video directed by Swift, starring Dakota Johnson and Colin Farrell. The video is set to premiere during the 2026 MTV Video Music Awards on September 27, 2026. Emmanuel Lubezki, the Oscar-winning cinematographer, shot the video. CBS and MTV announced the premiere on September 24, and a first teaser was shown on "CBS Mornings" that day. The video gives the first song on the expanded edition a separate visual release tied to one of the year's major music television events.

[apple:album:6814997249]

*The Life of a Showgirl: The Encore* is a digital release, while Swift's official store also listed physical "Patient Zero" collector editions. The four new recordings bring the project to 16 tracks without changing the original 12-song sequence. "Patient Zero" leads the added material and will be followed by its full video premiere on September 27. The Encore extends the existing album with songs created after its original release, while keeping the original record and its collaborators at the center of the project."""
def http(url,method="GET",payload=None):
    data=None; headers={"Accept":"application/json","User-Agent":UA,"X-Admin-Key":KEY}
    if payload is not None:
        data=json.dumps(payload,ensure_ascii=True).encode(); headers["Content-Type"]="application/json"
    req=urllib.request.Request(url,data=data,headers=headers,method=method)
    with urllib.request.urlopen(req,timeout=90) as r: return json.loads(r.read().decode())
req=urllib.request.Request(IMG_URL,headers={"User-Agent":UA})
with urllib.request.urlopen(req,timeout=90) as r: raw=r.read()
b64=base64.b64encode(raw).decode()
print("photo",http(REPO+"/api/photo","POST",{"name":"taylor-swift-encore-sept-2026.png","data":"data:image/png;base64,"+b64}))
desk=http(REPO+"/api/desk"); posts=desk["posts"]
p=next(x for x in posts if str(x.get("id"))==PID)
p["title"]="Taylor Swift — *The Life of a Showgirl: The Encore*"
p["body"]=body
p["excerpt"]="Taylor Swift, the singer and songwriter, has expanded *The Life of a Showgirl* with *The Life of a Showgirl: The Encore*, a four-song addition released on September 25, 2026."
p["cover"]={"src":"photos/taylor-swift-encore-sept-2026.png","credit":"Mert Alas & Marcus Piggott","creditUrl":"https://theagents.club/mert-alas"}
print("desk",http(REPO+"/api/desk","POST",{"posts":posts}))
