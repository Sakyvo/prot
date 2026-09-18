// shared assertion cases for js/calc.js — run by tests/calc.test.js (node)
// and by index.html (browser console) so page and CI verify the same behavior.
// expected values are independent facts (CONTEXT.md / MCP-919 source), never
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

    // empty loadout: everything passes through
    var r = Calc.compute(state(none4(0)));
    check('empty loadout: taken ratio = 1', r.takenRatio, 1);
    check('empty loadout: reduction = 0', r.reductionRatio, 0);

    // full diamond: 20 armor points -> 80% reduction
    r = Calc.compute(state(dia4(0)));
    check('full diamond: armor points = 20', r.armorPoints, 20);
    check('full diamond: taken = 0.2', r.takenRatio, 0.2);

    // full diamond + protection IV: EPF = 4*4 = 16 (protection modifier is 1x level)
    r = Calc.compute(state(dia4(4)));
    check('diamond + prot4x4: epf = 16', r.epf, 16);
    check('diamond + prot4x4: taken = 0.072', r.takenRatio, 0.072);

    // resistance V alone -> total immunity
    r = Calc.compute(state(none4(0), 5));
    check('resistance V: taken = 0', r.takenRatio, 0);

    // EPF above 20 hard-caps at 20 (source: if (k > 20) k = 20;)
    var a = Calc.compute(state(none4(10)));
    var b = Calc.compute(state(none4(5)));
    check('epf 40 capped: epf = 20', a.epf, 20);
    check('epf 40 == epf 20 taken', a.takenRatio, b.takenRatio);
    checkTrue('epf 40 flagged capped', a.epfCapped === true);

    // hypothetical mode: prot on empty slots counts (ADR 0001)
    r = Calc.compute(state(none4(4)));
    check('none slots + prot4x4: taken = 0.36', r.takenRatio, 0.36);

    // mixed: iron (15 pts -> 60%), epf 10 (40%), res 2 (40%) -> 0.4 * 0.6 * 0.6
    r = Calc.compute(state(slots(mat('iron', 1), mat('iron', 2), mat('iron', 3), mat('iron', 4)), 2));
    check('iron mix: armor points = 15', r.armorPoints, 15);
    check('iron mix: taken = 0.144', r.takenRatio, 0.144);

    // breakdown segments
    r = Calc.compute(state(dia4(0), 1));
    check('breakdown armorPct = 0.8', r.armorPct, 0.8);
    check('breakdown epfPct = 0', r.epfPct, 0);
    check('breakdown resPct = 0.2', r.resPct, 0.2);

    // damage conversion: half-hearts in, hearts out
    var out = Calc.applyDamage(7, Calc.compute(state(dia4(0))));
    check('damage 7 @ 80% red -> 1.4', out.result, 1.4);
    check('1.4 damage = 0.7 hearts', out.hearts, 0.7);

    log(failures === 0 ? 'all green' : failures + ' failing');
    return failures;
  };
});
