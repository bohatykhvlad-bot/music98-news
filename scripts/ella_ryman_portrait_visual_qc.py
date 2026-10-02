#!/usr/bin/env python3
"""Read-only visual proof of uncropped native 2025 tour photographer's alternative Ella guitar frame."""
import urllib.request,io,base64,hashlib
from pathlib import Path
from PIL import Image,ImageOps
u="https://entertaining-options.com/wp-content/uploads/2025/11/ryman-night-1_-4.jpg"
with urllib.request.urlopen(urllib.request.Request(u,headers={"User-Agent":"Mozilla/5.0"}),timeout=45) as r:data=r.read()
im=Image.open(io.BytesIO(data));im.load()
assert im.size==(1440,1920)
thumb=ImageOps.contain(im.convert("RGB"),(600,800))
out=io.BytesIO();thumb.save(out,"JPEG",quality=83)
p=Path(".editorial");p.mkdir(exist_ok=True)
(p/"ella-ryman-2025-alternative-uncropped-preview.b64").write_text(base64.b64encode(out.getvalue()).decode())
print("UNTOUCHED_RYMAN_ALT",im.size,len(data),hashlib.sha256(data).hexdigest(),flush=True)
