# prot

minecraft 1.8.9 damage reduction calculator — stack armor, protection enchantments and resistance, see the reduction/taken ratios live, and compute real damage taken.

**live:** <https://prot.loc.cc>

## formula (minecraft java 1.8.9, source-verified)

```
taken = damage * (1 - min(armor, 20) * 0.04)
               * (1 - min(epf, 20) * 0.04)
               * (1 - resistance * 0.20)
```

- armor: 4% per point, capped at 20 points (80%)
- epf: sum of protection levels across the four slots, 4% per epf, hard-capped at 20 (`if (k > 20) k = 20;` in `EntityLivingBase.applyPotionDamageCalculations`, mcp-919 decompile). vanilla full prot iv = epf 16 = 64%.
- resistance: 20% per level; level 5 = full immunity.

verified against mcp-919 (1.8.9 decompiled source) and the minecraft wiki.

## hypothetical mode

protection levels can be set on empty slots and **do** count toward epf. in-game an empty slot cannot hold an enchantment — this tool permits it deliberately as a what-if calculator. armor points, however, always come from the selected material.

## inputs

- armor: none / leather / gold / chainmail / iron / diamond per slot, with per-slot protection level (0–32767) and durability readout
- resistance: level 0–5
- damage input in half-hearts; output shows reduced damage and hearts

## run locally

zero build — open `index.html`, or any static server:

```
python -m http.server
```

tests: `node tests/calc.test.js`, and `tests/ui.test.html` in a headless browser. `tests/font-check.html` asserts the shipped face really loads and keeps its 12px advance width at 16px.

## assets

- textures from the `!!!!Eum3 Blue Revamp` resource pack (site-local copies under `assets/textures/`)
- font: minecraft ae **bold**, subset of `K:/PvP/MinecraftAE-Bold.ttf` into `assets/fonts/` via `tools/subset-font.sh` (ascii + the few punctuation glyphs the site uses, ~2 KB)
