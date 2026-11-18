// prot — ui mount v6. two tabs (def / dmg) over a single column, one divider,
// full-width results underneath. mobile: stacked tabs, results in flow, fixed
// footer bar with the two headline numbers.
(function (root) {
  'use strict';
  var Calc = root.ProtCalc;
  var TEX = 'assets/textures/';
  var STORE_KEY = 'prot.state';
  var TABS = ['def', 'dmg'];

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function img(src, alt) {
    var i = document.createElement('img');
    i.src = src;
    i.alt = alt || '';
    i.draggable = false;
    return i;
  }

  function materialTex(material, slot) {
    return TEX + (material === 'none' ? 'empty_armor_slot_' + slot : material + '_' + slot) + '.png';
  }

  function defaultState() {
    var state = { slots: {}, resistance: 0, damage: '' };
    Calc.SLOTS.forEach(function (s) { state.slots[s] = { material: 'none', prot: 0 }; });
    return state;
  }

  function loadState() {
    var state = defaultState();
    try {
      var raw = root.localStorage && root.localStorage.getItem(STORE_KEY);
      if (!raw) return state;
      var saved = JSON.parse(raw);
      Calc.SLOTS.forEach(function (slot) {
        var piece = saved.slots && saved.slots[slot];
        if (!piece) return;
        if (Calc.MATERIALS.indexOf(piece.material) !== -1) state.slots[slot].material = piece.material;
        var prot = parseInt(piece.prot, 10);
        if (!isNaN(prot) && prot >= 0 && prot <= 32767) state.slots[slot].prot = prot;
      });
      var res = parseInt(saved.resistance, 10);
      if (!isNaN(res) && res >= 0 && res <= 5) state.resistance = res;
      if (typeof saved.damage === 'string') state.damage = saved.damage;
    } catch (e) { /* corrupt storage: fall back to defaults */ }
    return state;
  }

  function mount(container) {
    var state = loadState();

    // ---- tabs + panels ----
    var tabs = el('nav', 'tabs');
    var tabEls = {};
    var panelEls = {};

    function setTab(id) {
      TABS.forEach(function (name) {
        if (tabEls[name]) tabEls[name].classList.toggle('is-active', name === id);
        if (panelEls[name]) panelEls[name].hidden = name !== id;
      });
    }

    TABS.forEach(function (id) {
      var b = el('button', 'tab', id);
      b.type = 'button';
      b.dataset.tab = id;
      b.addEventListener('click', function () { setTab(id); });
      tabEls[id] = b;
      tabs.appendChild(b);
    });

    var defPanel = el('section', 'panel');
    defPanel.dataset.panel = 'def';
    var dmgPanel = el('section', 'panel');
    dmgPanel.dataset.panel = 'dmg';
    dmgPanel.hidden = true;
    panelEls.def = defPanel;
    panelEls.dmg = dmgPanel;
    dmgPanel.appendChild(el('p', 'panel-placeholder', 'damage'));

    // ---- def panel: armor + resistance ----
    var controls = el('section', 'controls');
    var durabilityEls = {};
    var openPopover = null;

    function closePopover() {
      if (openPopover) {
        openPopover.classList.remove('is-open');
        openPopover = null;
      }
    }

    Calc.SLOTS.forEach(function (slot) {
      var row = el('section', 'slot-row');
      row.dataset.slot = slot;

      var trigger = el('button', 'slot-trigger');
      trigger.type = 'button';
      trigger.appendChild(img(materialTex(state.slots[slot].material, slot), state.slots[slot].material));

      var pop = el('div', 'material-popover');
      Calc.MATERIALS.forEach(function (material) {
        var opt = el('button', 'mat-option');
        opt.type = 'button';
        opt.dataset.material = material;
        opt.appendChild(img(materialTex(material, slot), material));
        opt.addEventListener('click', function (ev) {
          ev.stopPropagation();
          state.slots[slot].material = material;
          trigger.querySelector('img').src = materialTex(material, slot);
          closePopover();
          render();
        });
        pop.appendChild(opt);
      });
      trigger.addEventListener('click', function (ev) {
        ev.stopPropagation();
        var wasOpen = pop.classList.contains('is-open');
        closePopover();
        if (!wasOpen) {
          pop.classList.add('is-open');
          openPopover = pop;
        }
      });
      row.appendChild(trigger);
      row.appendChild(pop);

      var protWrap = el('div', 'prot');
      protWrap.appendChild(el('span', 'prot-label', 'prot'));
      var dec = el('button', 'prot-dec', '-');
      var input = el('input', 'prot-input');
      input.type = 'number';
      input.min = '0';
      input.max = '32767';
      input.value = String(state.slots[slot].prot);
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
      var stepper = el('div', 'prot-stepper');
      stepper.appendChild(dec);
      stepper.appendChild(input);
      stepper.appendChild(inc);
      protWrap.appendChild(stepper);
      row.appendChild(protWrap);

      var dur = el('span', 'durability', '0');
      durabilityEls[slot] = dur;
      row.appendChild(dur);

      controls.appendChild(row);
    });

    var resRow = el('section', 'resistance-row');
    var shield = img(TEX + 'effect_resistance.png', 'resistance');
    shield.className = 'res-icon';
    resRow.appendChild(shield);
    var levelEls = [];
    var levelGrid = el('div', 'res-levels');
    for (var lvl = 0; lvl <= 5; lvl++) {
      (function (n) {
        var b = el('button', 'res-level' + (n === state.resistance ? ' is-active' : ''), String(n));
        b.type = 'button';
        b.dataset.level = String(n);
        b.addEventListener('click', function () { setRes(n); });
        levelEls.push(b);
        levelGrid.appendChild(b);
      })(lvl);
    }
    resRow.appendChild(levelGrid);

    var resetBtn = el('button', 'reset-button');
    resetBtn.type = 'button';
    resetBtn.title = 'reset';
    var resetSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    resetSvg.setAttribute('viewBox', '0 0 24 24');
    var resetPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    resetPath.setAttribute('d', 'M4 12a8 8 0 1 0 3-6.2M4 4v5h5');
    resetPath.setAttribute('fill', 'none');
    resetPath.setAttribute('stroke', 'currentColor');
    resetPath.setAttribute('stroke-width', '2');
    resetSvg.appendChild(resetPath);
    resetBtn.appendChild(resetSvg);
    resRow.appendChild(resetBtn);
    controls.appendChild(resRow);

    function setRes(n) {
      state.resistance = n;
      levelEls.forEach(function (b, i) { b.classList.toggle('is-active', i === n); });
      render();
    }

    defPanel.appendChild(controls);

    // ---- results ----
    var results = el('aside', 'results');

    var breakdown = el('div', 'breakdown');
    function breakdownLine(label) {
      var p = el('p', 'line');
      var lab = el('span', 'line-label', label);
      var val = el('span', 'line-value', '0.00%');
      p.appendChild(lab);
      p.appendChild(val);
      return { root: p, label: lab, value: val };
    }
    var bArmor = breakdownLine('armor');
    var bProt = breakdownLine('prot');
    var bRes = breakdownLine('res');
    breakdown.appendChild(bArmor.root);
    breakdown.appendChild(bProt.root);
    breakdown.appendChild(bRes.root);

    var statRed = el('div', 'stat reduction');
    var redValue = el('span', 'stat-value', '100.00%');
    var redLabel = el('span', 'stat-label', 'reduction');
    statRed.appendChild(redValue);
    statRed.appendChild(redLabel);

    var statTaken = el('div', 'stat taken');
    var takenValue = el('span', 'stat-value', '100.00%');
    var takenLabel = el('span', 'stat-label', 'taken');
    statTaken.appendChild(takenValue);
    statTaken.appendChild(takenLabel);

    var capped = el('p', 'epf-capped', 'epf capped at max - no further gain');
    capped.hidden = true;

    var damageRow = el('div', 'damage-row');
    damageRow.appendChild(el('span', 'damage-label', 'damage'));
    var dmgInput = el('input', 'damage-input');
    dmgInput.type = 'number';
    dmgInput.min = '0';
    dmgInput.step = 'any';
    dmgInput.value = state.damage || '';
    dmgInput.placeholder = '0.00';
    var dmgOut = el('div', 'damage-out');
    var dmgVal = el('span', 'damage-value', '0.00');
    var heartVal = el('span', 'heart-value', '0.00');
    var heartIcon = img(TEX + 'heart.png', 'hearts');
    heartIcon.className = 'heart-icon';
    var equals = el('span', 'damage-equals', '=');
    dmgOut.appendChild(dmgVal);
    dmgOut.appendChild(equals);
    dmgOut.appendChild(heartVal);
    dmgOut.appendChild(heartIcon);
    damageRow.appendChild(dmgInput);
    damageRow.appendChild(dmgOut);

    results.appendChild(statRed);
    results.appendChild(statTaken);
    results.appendChild(breakdown);
    results.appendChild(damageRow);
    results.appendChild(capped);

    // the divider only marks input | output
    var divider = el('hr', 'divider');

    // mobile footer bar (numbers pinned to both edges, labels centred under their number)
    var mobileBar = el('div', 'mobile-bar');
    var mRed = el('div', 'stat reduction');
    var mRedValue = el('span', 'stat-value', '100.00%');
    var mRedLabel = el('span', 'stat-label', 'reduction');
    mRed.appendChild(mRedValue);
    mRed.appendChild(mRedLabel);
    var mTaken = el('div', 'stat taken');
    var mTakenValue = el('span', 'stat-value', '100.00%');
    var mTakenLabel = el('span', 'stat-label', 'taken');
    mTaken.appendChild(mTakenValue);
    mTaken.appendChild(mTakenLabel);
    mobileBar.appendChild(mRed);
    mobileBar.appendChild(mTaken);

    // reset confirmation
    var confirmModal = el('div', 'confirm-modal');
    var confirmBackdrop = el('div', 'modal-backdrop');
    var confirmCard = el('div', 'modal-card');
    confirmCard.appendChild(el('p', 'reset-question', 'reset all?'));
    var resetActions = el('div', 'reset-actions');
    var resetCancel = el('button', 'reset-cancel', 'cancel');
    var resetConfirm = el('button', 'reset-confirm', 'reset');
    resetCancel.type = resetConfirm.type = 'button';
    resetActions.appendChild(resetCancel);
    resetActions.appendChild(resetConfirm);
    confirmCard.appendChild(resetActions);
    confirmModal.appendChild(confirmBackdrop);
    confirmModal.appendChild(confirmCard);

    function pct(x) { return (x * 100).toFixed(2) + '%'; }
    function num(x) { return x.toFixed(2); }

    function render() {
      var r = Calc.compute(state);
      var red = pct(r.reductionRatio);
      var taken = pct(r.takenRatio);

      redValue.textContent = red;
      takenValue.textContent = taken;
      mRedValue.textContent = red;
      mTakenValue.textContent = taken;

      bArmor.value.textContent = pct(r.armorPct);
      bProt.value.textContent = pct(r.epfPct);
      bRes.value.textContent = pct(r.resPct);

      capped.hidden = !r.epfCapped;

      var dmg = parseFloat(dmgInput.value);
      if (isNaN(dmg) || dmg < 0) dmg = 0;
      dmgVal.textContent = num(dmg);
      if (dmg === 0) {
        heartVal.textContent = num(0);
      } else {
        var out = Calc.applyDamage(dmg, r);
        dmgVal.textContent = num(out.result);
        heartVal.textContent = num(out.hearts);
      }

      Calc.SLOTS.forEach(function (slot) {
        durabilityEls[slot].textContent = String(state.slots[slot].material === 'none'
          ? 0
          : Calc.durabilityOf(slot, state.slots[slot].material));
      });

      state.damage = dmgInput.value;
      try {
        if (root.localStorage) root.localStorage.setItem(STORE_KEY, JSON.stringify(state));
      } catch (e) { /* private mode: run without persistence */ }
    }

    dmgInput.addEventListener('input', render);

    function closeReset() { confirmModal.classList.remove('is-open'); }

    resetBtn.addEventListener('click', function () { confirmModal.classList.add('is-open'); });
    confirmBackdrop.addEventListener('click', closeReset);
    resetCancel.addEventListener('click', closeReset);
    resetConfirm.addEventListener('click', function () {
      Calc.SLOTS.forEach(function (slot) {
        state.slots[slot].material = 'none';
        state.slots[slot].prot = 0;
        var row = container.querySelector('[data-slot="' + slot + '"]');
        row.querySelector('.slot-trigger img').src = materialTex('none', slot);
        row.querySelector('.prot-input').value = '0';
      });
      state.resistance = 0;
      levelEls.forEach(function (b, i) { b.classList.toggle('is-active', i === 0); });
      dmgInput.value = '';
      state.damage = '';
      try { if (root.localStorage) root.localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ }
      closeReset();
      render();
    });

    container.appendChild(tabs);
    container.appendChild(defPanel);
    container.appendChild(dmgPanel);
    container.appendChild(divider);
    container.appendChild(results);
    container.appendChild(mobileBar);
    container.appendChild(confirmModal);

    document.addEventListener('click', function () { closePopover(); });

    setTab('def');
    render();

    return { state: state, render: render, setTab: setTab };
  }

  root.ProtUI = { mount: mount };
})(typeof self !== 'undefined' ? self : this);
