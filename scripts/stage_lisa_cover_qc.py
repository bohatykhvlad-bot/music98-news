#!/usr/bin/env python3
from __future__ import annotations

import io
import urllib.request
from pathlib import Path
from PIL import Image, ImageOps

OUT = Path("lisa-cover-qc")
OUT.mkdir(exist_ok=True)

CANDIDATES = [
    (
        "artist",
        "https://static.wixstatic.com/media/62f912_fe93876d913f424dad72c69a6c39c7c7f000.jpg",
    ),
    (
        "boss",
        "https://static.wixstatic.com/media/62f912_f1ddf672d4cc45d893e90bd9bcc86adc~mv2.jpg",
    ),
]

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/153 Safari/537.36"


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Referer": "https://www.lloud.co/"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def save_jpeg(im: Image.Image, path: Path) -> None:
    im.convert("RGB").save(path, "JPEG", quality=90, optimize=True, progressive=True)


def crop(im: Image.Image, size: tuple[int, int], centering=(0.5, 0.45)) -> Image.Image:
    return ImageOps.fit(im.convert("RGB"), size, method=Image.Resampling.LANCZOS, centering=centering)


for name, url in CANDIDATES:
    raw = fetch(url)
    im = Image.open(io.BytesIO(raw)).convert("RGB")
    print("CANDIDATE", name, im.size, len(raw), im.format)
    save_jpeg(im, OUT / f"{name}-original.jpg")
    save_jpeg(crop(im, (1600, 900), (0.5, 0.45)), OUT / f"{name}-hero-50x45.jpg")
    save_jpeg(crop(im, (1000, 1000), (0.5, 0.45)), OUT / f"{name}-card-50x45.jpg")
