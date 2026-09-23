#!/usr/bin/env bash
# Subset the Minecraft AE Bold face into the site assets.
#
# Source: K:/PvP/MinecraftAE-Bold.ttf (11 MB, full Unicode).
# The site only ever renders ASCII plus a handful of punctuation; subsetting
# keeps the shipped font at ~2 KB. Re-run after changing the source face or the
# character set below.
set -euo pipefail

SRC="${1:-K:/PvP/MinecraftAE-Bold.ttf}"
OUT_DIR="$(cd "$(dirname "$0")/.." && pwd)/assets/fonts"
UNICODES='U+0020-007E,U+00B7,U+2014,U+2192,U+2661,U+2665,U+2764'

pyftsubset "$SRC" --unicodes="$UNICODES" --layout-features='' --no-hinting \
  --desubroutinize --flavor=woff2 --output-file="$OUT_DIR/minecraft-ae.woff2"
pyftsubset "$SRC" --unicodes="$UNICODES" --layout-features='' --no-hinting \
  --output-file="$OUT_DIR/minecraft-ae.ttf"

ls -l "$OUT_DIR"
