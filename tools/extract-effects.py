#!/usr/bin/env python3
"""Extract status-effect icons from the resource pack into site assets.

The pack draws effect icons that overhang the nominal 36x40 grid cell, so each
sprite is taken from its measured pixel bounds in
gui/container/inventory.png rather than from a fixed cell — a cell crop shears
the sword tips off. Bounds were read off the alpha mask (connected components);
weakness keeps its four blue shard fragments, which are part of the icon.

usage: tools/extract-effects.py
"""
import os

from PIL import Image

SRC = '!!!!Eum3 Blue Revamp/assets/minecraft/textures/gui/container/inventory.png'
OUT = 'assets/textures'
# x0, y0, x1, y1 — measured, inclusive-exclusive
ICONS = {
    'strength': (145, 400, 178, 431),
    'weakness': (181, 399, 209, 431),
}
# effect_resistance.png predates this script: (222, 436, 246, 464), unchanged.


def crop(im, box):
    return im.crop(box)


def main():
    im = Image.open(SRC).convert('RGBA')
    for name, box in ICONS.items():
        path = os.path.join(OUT, 'effect_%s.png' % name)
        icon = crop(im, box)
        icon.save(path)
        print('%-12s %dx%d -> %s' % (name, icon.size[0], icon.size[1], path))


if __name__ == '__main__':
    main()
