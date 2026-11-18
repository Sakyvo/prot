// shared assertion cases for js/calc.js — run by tests/calc.test.js (node)
// and by index.html (browser console) so page and CI verify the same behavior.
// expected values are independent facts (CONTEXT.md / 1.8.9 decompile), never
// recomputed from the implementation.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ProtSelftest = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  return function run(Calc, log) {
    var failures = 0;
    function check(name, actual, expected) {
      var ok = Math.abs(actual - expected) < 1e-9;
      if (!ok) failures++;
      log((ok ? 'pass' : 'FAIL') + '  ' + name + '  (got ' + actual + ', want ' + expected + ')');
    }
    function checkTrue(name, v) {
      if (!v) failures++;
      log((v ? 'pass' : 'FAIL') + '  ' + name);
    }

    var slots = function (helmet, chestplate, leggings, boots) {
      return { helmet: helmet, chestplate: chestplate, leggings: leggings, boots: boots };
    };
    var mat = function (material, prot) { return { material: material, prot: prot || 0 }; };
    var state = function (s, resistance) { return { slots: s, resistance: resistance || 0 }; };
    var none4 = function (p) { return slots(mat('none', p), mat('none', p), mat('none', p), mat('none', p)); };
    var dia4 = function (p) { return slots(mat('diamond', p), mat('diamond', p), mat('diamond', p), mat('diamond', p)); };

    check('armor table: leather helmet', Calc.ARMOR.leather.helmet, 1);
    check('armor table: leather chestplate', Calc.ARMOR.leather.chestplate, 3);
    check('armor table: gold boots', Calc.ARMOR.gold.boots, 1);
    check('armor table: chainmail leggings', Calc.ARMOR.chainmail.leggings, 4);
    check('armor table: iron chestplate', Calc.ARMOR.iron.chestplate, 6);
    check('armor table: diamond helmet', Calc.ARMOR.diamond.helmet, 3);
    check('armor table: diamond boots', Calc.ARMOR.diamond.boots, 3);
    check('armor table: none contributes 0', Calc.ARMOR.none.chestplate, 0);

    check('durability: leather helmet', Calc.DURABILITY.leather.helmet, 55);
    check('durability: gold chestplate', Calc.DURABILITY.gold.chestplate, 112);
    check('durability: chainmail boots', Calc.DURABILITY.chainmail.boots, 195);
    check('durability: iron leggings', Calc.DURABILITY.iron.leggings, 225);
    check('durability: diamond helmet', Calc.DURABILITY.diamond.helmet, 363);
    checkTrue('durability: none absent', Calc.DURABILITY.none === undefined);

    // per-piece EPF: floor((6 + level^2) / 3 * 0.75) — protection enchantment, type 0
    check('epf level 0 = 0', Calc.protectionEpfForLevel(0), 0);
    check('epf level 1 = 1', Calc.protectionEpfForLevel(1), 1);
    check('epf level 2 = 2', Calc.protectionEpfForLevel(2), 2);
    check('epf level 3 = 3', Calc.protectionEpfForLevel(3), 3);
    check('epf level 4 = 5', Calc.protectionEpfForLevel(4), 5);

    // pre-cap at 25 (before the roll) and effective cap at 20 (after it)
    check('raw sum pre-capped at 25', Calc.protectionModifier(60), 25);
    check('raw sum below 25 untouched', Calc.protectionModifier(11), 11);
    check('roll expectation clamps at 20', Calc.protectionFactor(25), 232 / 13);
    check('roll expectation of 5', Calc.protectionFactor(5), 4);

    // empty loadout: everything passes through
    var r = Calc.compute(state(none4(0)));
    check('empty loadout: taken ratio = 1', r.takenRatio, 1);
    check('empty loadout: reduction = 0', r.reductionRatio, 0);

    // full diamond, no enchants: 20 armor points -> 80% reduction
    r = Calc.compute(state(dia4(0)));
    check('full diamond: armor points = 20', r.armorPoints, 20);
    check('full diamond: armor pct = 0.8', r.armorPct, 0.8);
    check('full diamond: taken = 0.2', r.takenRatio, 0.2);

    // full diamond + protection IV: 4 * floor(22/3*0.75) = 4 * 5 = 20 raw (under the 25 pre-cap)
    r = Calc.compute(state(dia4(4)));
    check('prot4 x4: raw epf = 20', r.epfRaw, 20);
    check('prot4 x4: modifier = 20', r.epf, 20);
    checkTrue('prot4 x4: not flagged capped', r.epfCapped === false);
    check('prot4 x4: epf pct = 0.6', r.epfPct, 0.6);
    check('prot4 x4: taken = 0.08', r.takenRatio, 0.08);

    // single protection IV piece: raw 5 -> roll mean (3+4+5)/3 = 4 -> 16%
    r = Calc.compute(state(slots(mat('none', 4), mat('none', 0), mat('none', 0), mat('none', 0))));
    check('single prot IV: raw epf = 5', r.epfRaw, 5);
    check('single prot IV: epf pct = 0.16', r.epfPct, 0.16);
    check('single prot IV: taken = 0.84', r.takenRatio, 0.84);

    // hypothetical mode: prot on empty slots counts (ADR 0001)
    r = Calc.compute(state(none4(4)));
    check('none slots + prot4x4: taken = 0.4', r.takenRatio, 0.4);
    check('none slots + prot4x4: same epf pct as full diamond', r.epfPct, 0.6);

    // mixed: iron armor 15 pts (60%), epf raw 1+2+3+5=11 -> roll mean 8.5 (34%), res 2 (40%)
    r = Calc.compute(state(slots(mat('iron', 1), mat('iron', 2), mat('iron', 3), mat('iron', 4)), 2));
    check('iron mix: armor points = 15', r.armorPoints, 15);
    check('iron mix: raw epf = 11', r.epfRaw, 11);
    check('iron mix: epf pct = 0.34', r.epfPct, 0.34);
    check('iron mix: taken = 0.1584', r.takenRatio, 0.1584);

    // resistance V alone -> total immunity
    r = Calc.compute(state(none4(0), 5));
    check('resistance V: taken = 0', r.takenRatio, 0);

    // breakdown segments
    r = Calc.compute(state(dia4(0), 1));
    check('breakdown armorPct = 0.8', r.armorPct, 0.8);
    check('breakdown epfPct = 0', r.epfPct, 0);
    check('breakdown resPct = 0.2', r.resPct, 0.2);

    // saturation: absurd levels pre-cap at 25, effective 20 -> protection tops out near 71.38%
    var maxed = Calc.compute(state(none4(32767)));
    // a config whose raw epf is exactly the pre-cap 25: level 7 (13) + 5 (7) + 4 (5) + 0
    var exact = Calc.compute(state(slots(mat('none', 7), mat('none', 5), mat('none', 4), mat('none', 0))));
    check('maxed: raw epf far above cap', maxed.epfRaw > 25, true);
    check('maxed: modifier = 25', maxed.epf, 25);
    checkTrue('maxed: flagged capped', maxed.epfCapped === true);
    check('raw-25 fixture: raw epf = 25', exact.epfRaw, 25);
    checkTrue('raw-25 fixture: not flagged capped', exact.epfCapped === false);
    check('maxed: epf pct = 232/13*0.04', maxed.epfPct, (232 / 13) * 0.04);
    check('maxed: matches raw-25 config', maxed.takenRatio, exact.takenRatio);
    checkTrue('maxed: reduction finite and below 80%', isFinite(maxed.reductionRatio) && maxed.reductionRatio < 0.8);
    checkTrue('maxed: no NaN anywhere', isFinite(maxed.takenRatio) && isFinite(maxed.epfPct) && isFinite(maxed.resPct));

    // no negative damage: every reachable ratio stays within [0, 1]
    [none4(0), none4(4), none4(32767), dia4(0), dia4(4), dia4(32767),
      slots(mat('iron', 32767), mat('iron', 32767), mat('iron', 32767), mat('iron', 32767))]
      .forEach(function (cfg, i) {
        [0, 1, 5].forEach(function (resLvl) {
          var rr = Calc.compute(state(cfg, resLvl));
          checkTrue('ratio bounds cfg#' + i + ' res' + resLvl,
            rr.takenRatio >= 0 && rr.takenRatio <= 1 && rr.reductionRatio >= 0 && rr.reductionRatio <= 1);
        });
      });

    // saturation damage: positive output, exactly damage * takenRatio
    var maxOut = Calc.applyDamage(50, maxed);
    checkTrue('maxed: 50 half-hearts still deals damage', maxOut.result > 0);
    check('maxed: 50 out = 50 * taken', maxOut.result, 50 * maxed.takenRatio);

    // damage conversion: half-hearts in, hearts out
    var out = Calc.applyDamage(7, Calc.compute(state(dia4(0))));
    check('damage 7 @ 80% red -> 1.4', out.result, 1.4);
    check('1.4 damage = 0.7 hearts', out.hearts, 0.7);

    // ---- attack side (1.8.9 attribute semantics, ADR 0003) ----
    // expected values are facts from the decompile, not recomputed here.
    check('fist: bare hand attribute is 1', Calc.attackAttribute({}), 1);
    check('fist: bare hand damage is 1', Calc.attackDamage({}), 1);

    // wooden shovel: ItemSpade passes 1.0 + ToolMaterial.WOOD 0.0 = +1 on the 1.0 base
    check('wooden shovel attribute = 2', Calc.attackAttribute({ weapon: 1 }), 2);
    check('wooden shovel: four hits clear 8 hp', 4 * Calc.attackDamage({ weapon: 1 }), 8);

    // strength is operation 2 on the attribute: (1+6) * (1 + 1.3 * amp)
    check('strength I multiplies by 2.3', Calc.attackAttribute({ weapon: 6, strength: 1 }), 16.1);
    check('strength II multiplies by 3.6', Calc.attackAttribute({ weapon: 6, strength: 2 }), 25.2);
    check('strength III multiplies by 4.9', Calc.attackAttribute({ strength: 3 }), 4.9);

    // weakness is a flat -0.5 per level, applied before the strength multiplier
    check('weakness I shaves 0.5', Calc.attackAttribute({ weapon: 6, weakness: 1 }), 6.5);
    check('weakness clamps the attribute at 0', Calc.attackAttribute({ weakness: 4 }), 0);
    check('weakness IV keeps sharpness damage', Calc.attackDamage({ sharpness: 5, weakness: 4 }), 6.25);

    // sharpness: 1.25 per level, added after the crit multiplier
    check('diamond sword sharp V + strength II = 31.45', Calc.attackDamage({ weapon: 6, sharpness: 5, strength: 2 }), 31.45);
    check('crit multiplies the attribute only', Calc.attackDamage({ weapon: 6, sharpness: 5, strength: 2, crit: true }), 44.05);

    // the 2048 cap belongs to the attribute, not to the final damage
    check('attribute caps at 2048', Calc.attackAttribute({ weapon: 100, strength: 100 }), 2048);
    check('sharpness still adds past the cap', Calc.attackDamage({ weapon: 100, strength: 100, sharpness: 5 }), 2048 + 6.25);

    // taken damage: 8% passes through full diamond + protection IV
    var diaProt4 = Calc.compute(state(dia4(4)));
    check('31.45 through 8% = 2.516', Calc.applyDamage(Calc.attackDamage({ weapon: 6, sharpness: 5, strength: 2 }), diaProt4).result, 2.516);
    check('44.05 crit through 8% = 3.524', Calc.applyDamage(Calc.attackDamage({ weapon: 6, sharpness: 5, strength: 2, crit: true }), diaProt4).result, 3.524);

    log(failures === 0 ? 'all green' : failures + ' failing');
    return failures;
  };
});
