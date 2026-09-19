"""Tint the site-local leather armor textures to vanilla leather brown.

The resource pack ships leather pieces as grayscale masks (vanilla tints them
at runtime with the leather color). Site copies are multiplied by #a06540 so
they read as vanilla leather without touching the source pack.
"""

import os
from PIL import Image

LEATHER = (0xA0, 0x65, 0x40)
SITE_TEXTURES = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "textures")
SLOTS = ("helmet", "chestplate", "leggings", "boots")


def tint(path, color):
    im = Image.open(path).convert("RGBA")
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            px[x, y] = (
                r * color[0] // 255,
                g * color[1] // 255,
                b * color[2] // 255,
                a,
            )
    im.save(path)
    return im.size


if __name__ == "__main__":
    for slot in SLOTS:
        p = os.path.join(SITE_TEXTURES, "leather_" + slot + ".png")
        print(slot, tint(p, LEATHER))