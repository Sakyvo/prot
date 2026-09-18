// prot — ui mount. builds the whole dom from ProtCalc data and keeps it in sync.
(function (root) {
  'use strict';
  var Calc = root.ProtCalc;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function mount(container) {
    var state = { slots: {}, resistance: 0 };
    Calc.SLOTS.forEach(function (s) { state.slots[s] = { material: 'none', prot: 0 }; });

    var controls = el('section', 'controls');
    var durabilityEls = {};

    Calc.SLOTS.forEach(function (slot) {
      var row = el('section', 'equip-row');
      row.dataset.slot = slot;

      var head = el('header', 'equip-head');
      head.appendChild(el('h2', 'slot-label', slot));
      var dur = el('span', 'durability', '');
      durabilityEls[slot] = dur;
      head.appendChild(dur);
      row.appendChild(head);

      var mats = el('div', 'mats');
      Calc.MATERIALS.forEach(function (material) {
        var b = el('button', 'mat' + (material === 'none' ? ' is-active' : ''));
        b.type = 'button';
        b.dataset.material = material;
        b.title = material;
        var img = document.createElement('img');
        img.src = 'assets/textures/' + (material === 'none'
          ? 'empty_armor_slot_' + slot
          : material + '_' + slot) + '.png';
        img.alt = material;
        img.draggable = false;
        b.appendChild(img);
        b.addEventListener('click', function () {
          state.slots[slot].material = material;
          row.querySelectorAll('.mat').forEach(function (m) {
            m.classList.toggle('is-active', m === b);
          });
          render();
        });
        mats.appendChild(b);
      });
      row.appendChild(mats);

      var protWrap = el('div', 'prot');
      protWrap.appendChild(el('span', 'prot-label', 'protection'));
      var dec = el('button', 'prot-dec', '-');
      var input = el('input', 'prot-input');
      input.type = 'number';
      input.min = '0';
      input.max = '32767';
      input.value = '0';
      var inc = el('button', 'prot-inc', '+');
      dec.type = inc.type = 'button';

      function setProt(v) {
        v = parseInt(v, 10);
        if (isNaN(v) || v < 0) v = 0;
        if (v > 32767) v = 32767;
        state.slots[slot].prot = v;
        input.value = String(v);
        render();
      }
      dec.addEventListener('click', function () { setProt(state.slots[slot].prot - 1); });
      inc.addEventListener('click', function () { setProt(state.slots[slot].prot + 1); });
      input.addEventListener('input', function () { setProt(input.value); });
      protWrap.appendChild(dec);
      protWrap.appendChild(input);
      protWrap.appendChild(inc);
      row.appendChild(protWrap);

      controls.appendChild(row);
    });

    var res = el('section', 'resistance');
    res.appendChild(el('span', 'res-label', 'resistance'));
    var resDec = el('button', 'res-dec', '-');
    var resInput = el('input', 'res-input');
    resInput.type = 'number';
    resInput.min = '0';
    resInput.max = '5';
    resInput.value = '0';
    var resInc = el('button', 'res-inc', '+');
    resDec.type = resInc.type = 'button';
    function setRes(v) {
      v = parseInt(v, 10);
      if (isNaN(v) || v < 0) v = 0;
      if (v > 5) v = 5;
      state.resistance = v;
      resInput.value = String(v);
      render();
    }
    resDec.addEventListener('click', function () { setRes(state.resistance - 1); });
    resInc.addEventListener('click', function () { setRes(state.resistance + 1); });
    resInput.addEventListener('input', function () { setRes(resInput.value); });
    res.appendChild(resDec);
    res.appendChild(resInput);
    res.appendChild(resInc);
    controls.appendChild(res);

    // ---- results panel ----
    var results = el('aside', 'results');
    var redNum = el('div', 'big reduction', '100.00%');
    var redCap = el('div', 'big-caption', 'reduction');
    var takenNum = el('div', 'big taken', '100.00%');
    var takenCap = el('div', 'big-caption', 'taken');
    var breakdown = el('p', 'breakdown', '');
    var capped = el('p', 'epf-capped', 'epf capped at 20 — max');
    capped.hidden = true;
    var dmgWrap = el('div', 'damage');
    dmgWrap.appendChild(el('label', 'damage-label', 'damage'));
    var dmgInput = el('input', 'damage-input');
    dmgInput.type = 'number';
    dmgInput.min = '0';
    dmgInput.step = 'any';
    dmgInput.value = '';
    dmgInput.placeholder = 'in half-hearts';
    var dmgOut = el('p', 'damage-output', '');
    dmgWrap.appendChild(dmgInput);
    dmgWrap.appendChild(dmgOut);

    var redBox = el('div', 'big-box'); redBox.appendChild(redNum); redBox.appendChild(redCap);
    var takenBox = el('div', 'big-box'); takenBox.appendChild(takenNum); takenBox.appendChild(takenCap);
    results.appendChild(redBox);
    results.appendChild(takenBox);
    results.appendChild(breakdown);
    results.appendChild(capped);
    results.appendChild(dmgWrap);

    function pct(x) { return (x * 100).toFixed(2) + '%'; }

    function render() {
      var r = Calc.compute(state);
      redNum.textContent = pct(r.reductionRatio);
      takenNum.textContent = pct(r.takenRatio);
      breakdown.textContent =
        'armor ' + pct(r.armorPct) + ' · prot ' + pct(r.epfPct) +
        ' · resistance ' + pct(r.resPct) + ' -> taken ' + pct(r.takenRatio);
      capped.hidden = !r.epfCapped;

      var dmg = parseFloat(dmgInput.value);
      if (!isNaN(dmg) && dmg >= 0) {
        var out = Calc.applyDamage(dmg, r);
        dmgOut.textContent = '= ' + out.result.toFixed(2) + ' (' + out.hearts.toFixed(2) + ' hearts)';
      } else {
        dmgOut.textContent = '';
      }

      Calc.SLOTS.forEach(function (slot) {
        var d = Calc.durabilityOf(slot, state.slots[slot].material);
        var dEl = durabilityEls[slot];
        dEl.textContent = d == null ? '' : String(d);
        dEl.hidden = d == null;
      });
    }

    dmgInput.addEventListener('input', render);
    render();

    container.appendChild(controls);
    container.appendChild(results);
    return { state: state, render: render };
  }

  root.ProtUI = { mount: mount };
})(typeof self !== 'undefined' ? self : this);
