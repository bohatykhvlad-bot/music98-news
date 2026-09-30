#!/usr/bin/env python3
from pathlib import Path
from PIL import Image, ImageOps
import gdown

FILE_ID = "1MAJ5rXUa92P6BK_SZPKiNxQYtxNgN1HG"
OUT = Path("leon-cover-qc")
OUT.mkdir(exist_ok=True)
raw_path = OUT / "leon-joshua-kissi-original.jpg"

gdown.download(id=FILE_ID, output=str(raw_path), quiet=False)

im = Image.open(raw_path).convert("RGB")
print("CANDIDATE", im.size, raw_path.stat().st_size, Image.open(raw_path).format)
if max(im.size) < 1920:
    raise SystemExit("official Joshua Kissi source below 1920px floor")

def save_crop(name, size, centering, zoom=1.0):
    # approximate site fitCover for visual inspection with optional extra zoom.
    sw, sh = size
    iw, ih = im.size
    base = max(sw/iw, sh/ih) * zoom
    dw, dh = iw*base, ih*base
    fx, fy = centering
    left = sw/2 - fx*dw
    top = sh/2 - fy*dh
    left = min(0, max(sw-dw, left))
    top = min(0, max(sh-dh, top))
    # source coordinates
    x0 = max(0, -left/base)
    y0 = max(0, -top/base)
    x1 = min(iw, (sw-left)/base)
    y1 = min(ih, (sh-top)/base)
    crop = im.crop((round(x0),round(y0),round(x1),round(y1))).resize(size, Image.Resampling.LANCZOS)
    crop.save(OUT / name, "JPEG", quality=90, optimize=True, progressive=True)

# Several plausible hero/card positions; review artifact before writing to desk.
for y in (0.38,0.42,0.46,0.50,0.54):
    save_crop(f"hero-y{int(y*100)}.jpg",(1600,900),(0.5,y),1.0)
for y in (0.35,0.40,0.45,0.50):
    for z in (1.0,1.4,1.8):
        save_crop(f"card-y{int(y*100)}-z{str(z).replace('.','')}.jpg",(1000,1000),(0.5,y),z)
