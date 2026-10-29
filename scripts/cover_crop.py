#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Pick cover crop values for one image and render both card shapes.

This is the offline twin of `fitCover()` in public/index.html. It exists so
the crop that ships to the desk is computed, not guessed: the owner rejected
a cover that cut the artist's head, and a face box measured from the image
is the only honest way to keep the head inside both card shapes.

Usage:
    python scripts/cover_crop.py <image> --face X0,Y0,X1,Y1 [--out-dir DIR]
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image

# The site's own stage and card sizes, taken from public/index.html.
STAGE = (1132, 637)
CARD = (600, 600)


def fit_cover(src, out, sw, sh, fx=0.5, fy=0.5, z=1.0):
    """Exact mirror of fitCover() in public/index.html."""
    im = Image.open(src).convert("RGB")
    iw, ih = im.size
    base = max(sw / iw, sh / ih) * z
    dw, dh = iw * base, ih * base
    left = sw / 2 - fx * dw
    top = sh / 2 - fy * dh
    left = min(0, max(sw - dw, left))
    top = min(0, max(sh - dh, top))
    x0, x1 = max(0, -left), min(dw, -left + sw)
    y0, y1 = max(0, -top), min(dh, -top + sh)
    scaled = im.resize((max(1, int(round(dw))), max(1, int(round(dh)))), Image.LANCZOS)
    crop = scaled.crop((int(x0), int(y0), int(x1), int(y1)))
    outim = Image.new("RGB", (sw, sh), (0, 0, 0))
    outim.paste(crop, (0, 0))
    outim.save(out)
    return {"x0": x0, "y0": y0, "x1": x1, "y1": y1, "scaled": (dw, dh)}


def _window(sw, sh, iw, ih, fx, fy, z):
    """The visible source rectangle for one set of crop values."""
    base = max(sw / iw, sh / ih) * z
    dw, dh = iw * base, ih * base
    left = sw / 2 - fx * dw
    top = sh / 2 - fy * dh
    left = min(0, max(sw - dw, left))
    top = min(0, max(sh - dh, top))
    return (max(0, -left), max(0, -top),
            min(dw, -left + sw), min(dh, -top + sh))


def score(face, win, iw, ih, headroom=0.06):
    """How well a window holds the face.

    The face must be fully inside the window, and there must be a little
    space above the head so the crop does not look decapitated.
    """
    x0, y0, x1, y1 = win
    fx0, fy0, fx1, fy1 = face
    if fx0 < x0 or fx1 > x1 or fy0 < y0 or fy1 > y1:
        return -1.0
    above = (fy0 - y0) / float(ih)
    below = (y1 - fy1) / float(ih)
    width = (fx1 - fx0) / float(win[2] - win[0])
    # Prefer a face that fills the frame, with space above and some below.
    value = width * 1.0
    value -= abs(above - headroom) * 2.0
    value -= max(0.0, below - 0.55) * 0.6
    return value


def search(src, face, sw, sh):
    im = Image.open(src)
    iw, ih = im.size
    best = None
    steps = [round(0.02 * i, 2) for i in range(0, 51)]  # 0.00 .. 1.00
    zooms = [round(1.0 + 0.05 * i, 2) for i in range(0, 41)]  # 1.00 .. 3.00
    for z in zooms:
        for fx in steps:
            for fy in steps:
                win = _window(sw, sh, iw, ih, fx, fy, z)
                s = score(face, win, iw, ih)
                if s < 0:
                    continue
                if best is None or s > best[0]:
                    best = (s, fx, fy, z)
    return best


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("image")
    ap.add_argument("--face", required=True, help="face box X0,Y0,X1,Y1 in pixels")
    ap.add_argument("--out-dir", default=".")
    ap.add_argument("--out", help="single output file (json with the values)")
    args = ap.parse_args()

    face = tuple(float(v) for v in args.face.split(","))
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    stage = search(args.image, face, *STAGE)
    card = search(args.image, face, *CARD)
    if not stage or not card:
        raise SystemExit("no crop keeps the face inside the frame")

    fit_cover(args.image, str(out_dir / "card_16x9.jpg"), STAGE[0], STAGE[1],
              stage[1], stage[2], stage[3])
    fit_cover(args.image, str(out_dir / "card_1x1.jpg"), CARD[0], CARD[1],
              card[1], card[2], card[3])
    result = {
        "image": args.image,
        "face": face,
        "stage": {"pos": "%d%% %d%%" % (round(stage[1] * 100), round(stage[2] * 100)),
                  "zoom": stage[3], "fx": stage[1], "fy": stage[2]},
        "card": {"cardX": stage and card[1], "cardY": card[2], "cardZoom": card[3]},
    }
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
