#!/usr/bin/env python3
"""Extract status-effect icons from the resource pack into site assets.

The pack draws its effect sheet on a 36x40 grid: icon (col,row) starts at
(6 + 36*col, 396 + 40*row) inside gui/container/inventory.png. Column 6 of
row 1 is the resistance shield and reproduces assets/textures/effect_resistance.png
byte for byte, which is how the geometry was verified.

Icons are trimmed to their own pixels (some sprites overhang the cell), so the
site scales them into a fixed box via object-fit.

usage: tools/extract-effects.py
"""
import os

from PIL import Image

SRC = '!!!!Eum3 Blue Revamp/assets/minecraft/textures/gui/container/inventory.png'
OUT = 'assets/textures'
CELL = (6, 396, 36, 40)          # x0, y0, col pitch, row pitch
ICONS = {'strength': (4, 0), 'weakness': (5, 0)}
# effect_resistance.png predates this script and is already correct (col 6, row 1).


def first_run(flags):
    start = None
    for i, on in enumerate(flags):
        if on and start is None:
            start = i
        elif not on and start is not None:
            return start, i
    return (start, len(flags)) if start is not None else (0, len(flags))


def crop(im, col, row):
    """Trim to the first contiguous block of pixels, so a neighbour sprite that
    overhangs the cell boundary is not pulled in."""
    x = CELL[0] + CELL[2] * col
    y = CELL[1] + CELL[3] * row
    cell = im.crop((x, y, x + CELL[2], y + CELL[3] - 9))
    px = cell.load()
    w, h = cell.size
    left, right = first_run([any(px[i, j][3] > 8 for j in range(h)) for i in range(w)])
    top, bottom = first_run([any(px[i, j][3] > 8 for i in range(w)) for j in range(h)])
    return cell.crop((left, top, right, bottom))


def main():
    im = Image.open(SRC).convert('RGBA')
    for name, (col, row) in ICONS.items():
        path = os.path.join(OUT, 'effect_%s.png' % name)
        icon = crop(im, col, row)
        icon.save(path)
        print('%-12s %dx%d -> %s' % (name, icon.size[0], icon.size[1], path))


if __name__ == '__main__':
    main()
