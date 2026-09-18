// prot — minecraft 1.8.9 damage reduction kernel.
// facts: CONTEXT.md (armor/durability tables) and MCP-919 EntityLivingBase
// (armor -> resistance -> enchantment; EPF hard-capped at 20).
// loads in both browser (window.ProtCalc) and node (module.exports).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ProtCalc = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var SLOTS = ['helmet', 'chestplate', 'leggings', 'boots'];
  var MATERIALS = ['none', 'leather', 'gold', 'chainmail', 'iron', 'diamond'];

  var ARMOR = {
    none: { helmet: 0, chestplate: 0, leggings: 0, boots: 0 },
    leather: { helmet: 1, chestplate: 3, leggings: 2, boots: 1 },
    gold: { helmet: 2, chestplate: 5, leggings: 3, boots: 1 },
    chainmail: { helmet: 2, chestplate: 5, leggings: 4, boots: 1 },
    iron: { helmet: 2, chestplate: 6, leggings: 5, boots: 2 },
    diamond: { helmet: 3, chestplate: 8, leggings: 6, boots: 3 }
  };

  var DURABILITY = {
    leather: { helmet: 55, chestplate: 80, leggings: 75, boots: 65 },
    gold: { helmet: 77, chestplate: 112, leggings: 105, boots: 91 },
    chainmail: { helmet: 165, chestplate: 240, leggings: 225, boots: 195 },
    iron: { helmet: 165, chestplate: 240, leggings: 225, boots: 195 },
    diamond: { helmet: 363, chestplate: 528, leggings: 495, boots: 429 }
  };

  // state: { slots: {helmet: {material, prot}, ...}, resistance: 0..5 }
  function compute(state) {
    var armorPoints = 0;
    var epfRaw = 0;
    for (var i = 0; i < SLOTS.length; i++) {
      var piece = state.slots[SLOTS[i]];
      armorPoints += ARMOR[piece.material][SLOTS[i]];
      epfRaw += piece.prot; // prot on 'none' slots counts — hypothetical mode (ADR 0001)
    }
    var epf = Math.min(20, epfRaw);
    var armorPct = Math.min(20, armorPoints) * 0.04;
    var epfPct = epf * 0.04;
    var res = Math.max(0, Math.min(5, state.resistance | 0));
    var resPct = res * 0.2;

    var taken = (1 - armorPct) * (1 - epfPct) * (1 - resPct);
    return {
      armorPoints: armorPoints,
      armorPct: armorPct,
      epfRaw: epfRaw,
      epf: epf,
      epfCapped: epfRaw > 20,
      epfPct: epfPct,
      resistance: res,
      resPct: resPct,
      takenRatio: taken,
      reductionRatio: 1 - taken
    };
  }

  // damage in half-hearts; hearts = damage / 2
  function applyDamage(damage, result) {
    var out = damage * result.takenRatio;
    return { result: out, hearts: out / 2 };
  }

  function durabilityOf(slot, material) {
    if (material === 'none') return null;
    return DURABILITY[material][slot];
  }

  return {
    SLOTS: SLOTS,
    MATERIALS: MATERIALS,
    ARMOR: ARMOR,
    DURABILITY: DURABILITY,
    compute: compute,
    applyDamage: applyDamage,
    durabilityOf: durabilityOf
  };
});
