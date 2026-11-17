# prot

minecraft 1.8.9 damage reduction calculator — stack armor, protection enchantments and resistance, see the reduction/taken ratios live, and compute real damage taken.

**live:** <https://prot.loc.cc>

## formula (minecraft java 1.8.9, source-verified)

```
taken = damage * (1 - min(armor, 20) * 0.04)
               * (1 - epf_expectation)
               * (1 - resistance * 0.20)
```

- **armor**: 4% per point, capped at 20 points (80%). deterministic in 1.8.9 (`damage * (25 - armor) / 25`, no roll — the randomization arrived in 1.9).
- **protection** is a *random roll* in game, so this tool shows its **expectation**. four steps, all from the 1.8.9 decompile:
  1. per piece: `floor((6 + level²) / 3 * 0.75)` (`EnchantmentProtection.calcModifierDamage`, all-round protection = type 0). level 0/1/2/3/4 → 0/1/2/3/5.
  2. sum the four pieces, then pre-cap at 25: `if (m > 25) m = 25;` (`EnchantmentHelper.getEnchantmentModifierDamage`).
  3. random roll: the modifier is uniform over `[ceil(m/2), m]`.
  4. effective cap at 20: `if (k > 20) k = 20;` (`EntityLivingBase.applyPotionDamageCalculations`), each point = 4%.

  so vanilla full prot iv = 4 × 5 = raw 20 (under the pre-cap), roll expectation 15 → **60%** (not the 64% of the old linear model). a single protection segment tops out near **71.38%** and never reaches the 80% ceiling. absurd levels saturate at the 25 pre-cap — no overflow, never negative damage. the UI flags `epf capped` once the raw four-piece sum passes 25.
- **resistance**: 20% per level; level 5 = full immunity.

verified against the 1.8.9 decompile ([MavenMCP-1.8.9](https://github.com/Marcelektro/MavenMCP-1.8.9); `RealmsSharedConstants` reports 1.8.9 / protocol 47) and the minecraft wiki. the local `CheatBreaker` tree used in earlier notes is **1.7.10** and is not valid evidence for 1.8.9 numbers. the randomization-to-expectation shape is ported from Polypatcher's `ArmorStatusRenderer`.

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
