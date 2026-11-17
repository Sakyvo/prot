// prot — minecraft 1.8.9 damage reduction kernel.
// facts: CONTEXT.md (armor/durability tables) and the 1.8.9 decompile
// (armor -> resistance -> enchantment). protection is a random roll in game;
// this kernel returns its expectation. structure mirrors Polypatcher
// ArmorStatusRenderer (getEffProtPoints / calcProtection / addArmorProtResistance).
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

  var EPF_RAW_CAP = 25;   // EnchantmentHelper.getEnchantmentModifierDamage: if (m > 25) m = 25
  var EPF_EFFECTIVE_CAP = 20; // EntityLivingBase.applyPotionDamageCalculations: if (k > 20) k = 20

  // EnchantmentProtection.calcModifierDamage (protection type 0):
  // floor((6 + level^2) / 3 * 0.75). level 0 -> 0. (port of getEffProtPoints)
  function protectionEpfForLevel(level) {
    if (!level) return 0;
    return Math.floor((6 + level * level) * 0.75 / 3);
  }

  // four-piece sum, pre-capped at 25 before the random roll.
  function protectionModifier(epfRaw) {
    return Math.min(EPF_RAW_CAP, epfRaw);
  }

  // expected enchantment modifier: EnchantmentHelper.getEnchantmentModifierDamage returns
  // (m+1>>1) + rand.nextInt((m>>1)+1), i.e. uniformly over [ceil(m/2), m]. each point then
  // hits the effective cap of 20. returns the mean of min(k, 20) over that range.
  function protectionFactor(modifier) {
    var m = protectionModifier(modifier);
    if (m <= 0) return 0;
    var lo = Math.ceil(m / 2);
    var sum = 0;
    for (var k = lo; k <= m; k++) sum += Math.min(k, EPF_EFFECTIVE_CAP);
    return sum / (m - lo + 1);
  }

  // state: { slots: {helmet: {material, prot}, ...}, resistance: 0..5 }
  function compute(state) {
    var armorPoints = 0;
    var epfRaw = 0;
    for (var i = 0; i < SLOTS.length; i++) {
      var piece = state.slots[SLOTS[i]];
      armorPoints += ARMOR[piece.material][SLOTS[i]];
      // prot on 'none' slots counts too — hypothetical mode (ADR 0001)
      epfRaw += protectionEpfForLevel(piece.prot);
    }
    var epf = protectionModifier(epfRaw);
    var armorPct = Math.min(20, armorPoints) * 0.04;
    var epfPct = protectionFactor(epf) * 0.04;
    var epfPctMin = Math.min(Math.ceil(epf / 2), EPF_EFFECTIVE_CAP) * 0.04;
    var epfPctMax = Math.min(epf, EPF_EFFECTIVE_CAP) * 0.04;
    var res = Math.max(0, Math.min(5, state.resistance | 0));
    var resPct = res * 0.2;

    var taken = (1 - armorPct) * (1 - epfPct) * (1 - resPct);
    return {
      armorPoints: armorPoints,
      armorPct: armorPct,
      epfRaw: epfRaw,
      epf: epf,
      epfCapped: epfRaw > EPF_RAW_CAP,
      epfPct: epfPct,
      epfPctMin: epfPctMin,
      epfPctMax: epfPctMax,
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
    EPF_RAW_CAP: EPF_RAW_CAP,
    EPF_EFFECTIVE_CAP: EPF_EFFECTIVE_CAP,
    protectionEpfForLevel: protectionEpfForLevel,
    protectionModifier: protectionModifier,
    protectionFactor: protectionFactor,
    compute: compute,
    applyDamage: applyDamage,
    durabilityOf: durabilityOf
  };
});
