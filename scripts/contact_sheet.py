#!/usr/bin/env python3
"""Build a numbered contact sheet of the downloaded Showgirl photoshoot thumbs."""
import cv2
import os
import shutil
import numpy as np

TMP = os.environ["TEMP"]
CELL = 220
COLS = 8

cells = []
for i in range(59):
    p = os.path.join(TMP, "fs%02d.jpg" % i)
    img = cv2.imread(p)
    if img is None:
        continue
    h, w = img.shape[:2]
    s = CELL / max(h, w)
    img = cv2.resize(img, (int(w * s), int(h * s)))
    ch, cw = img.shape[:2]
    pad_top = (CELL - ch) // 2
    pad_bottom = CELL - ch - pad_top
    pad_left = (CELL - cw) // 2
    pad_right = CELL - cw - pad_left
    canvas = cv2.copyMakeBorder(img, pad_top, pad_bottom, pad_left, pad_right,
                                cv2.BORDER_CONSTANT, value=(30, 30, 30))
    canvas = canvas[:CELL, :CELL]
    cv2.putText(canvas, str(i), (5, 30), cv2.FONT_HERSHEY_SIMPLEX, 1.0,
                (0, 255, 255), 2)
    cells.append(canvas)

rows_needed = (len(cells) + COLS - 1) // COLS
while len(cells) < rows_needed * COLS:
    cells.append(np.zeros((CELL, CELL, 3), dtype="uint8"))

rows_img = [np.hstack(cells[r * COLS:(r + 1) * COLS]) for r in range(rows_needed)]
sheet = np.vstack(rows_img)

out = os.path.join(TMP, "contact-sheet.jpg")
cv2.imwrite(out, sheet, [cv2.IMWRITE_JPEG_QUALITY, 82])
print("sheet:", out, sheet.shape, os.path.getsize(out))
shutil.copy(out, os.path.join("public", "_tmp-sheet.jpg"))
