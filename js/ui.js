// prot — ui mount v6. two tabs (def / dmg) over a single column, one divider,
// full-width results underneath. mobile: stacked tabs, results in flow, fixed
// footer bar with the two headline numbers.
(function (root) {
  'use strict';
  var Calc = root.ProtCalc;
  var TEX = 'assets/textures/';
  var STORE_KEY = 'prot.state';

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
    var state = {
      mode: 'ccl',
      slots: {},
      resistance: 0,
      manual: '',
      attack: { weapon: '', sharpness: 0, strength: 0, weakness: 0, crit: false }
    };
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
      if (saved.mode === 'ccl' || saved.mode === 'mnl') state.mode = saved.mode;
      // a pre-mode blob kept the value in `damage`; it now seeds the manual input
      if (typeof saved.manual === 'string') state.manual = saved.manual;
      else if (typeof saved.damage === 'string') state.manual = saved.damage;
      var savedAttack = saved.attack || {};
      if (typeof savedAttack.weapon === 'string' || typeof savedAttack.weapon === 'number') {
        state.attack.weapon = savedAttack.weapon;
      }
      ['sharpness', 'strength', 'weakness'].forEach(function (key) {
        var lvl = parseInt(savedAttack[key], 10);
        if (!isNaN(lvl) && lvl >= 0 && lvl <= 32767) state.attack[key] = lvl;
      });
      if (typeof savedAttack.crit === 'boolean') state.attack.crit = savedAttack.crit;
    } catch (e) { /* corrupt storage: fall back to defaults */ }
    return state;
  }

  function mount(container) {
    var state = loadState();

    // ---- two standing panels: defense left, damage right ----
    var panels = el('div', 'panels');

    var defPanel = el('section', 'panel');
    defPanel.dataset.panel = 'def';
    defPanel.appendChild(el('p', 'panel-title', 'def'));
    var dmgPanel = el('section', 'panel');
    dmgPanel.dataset.panel = 'dmg';
    dmgPanel.appendChild(el('p', 'panel-title', 'dmg'));
    var dmgControls = el('section', 'dmg-controls');

    function dmgRow(field, label) {
      var row = el('section', 'dmg-row');
      row.dataset.field = field;
      row.appendChild(el('span', 'dmg-label', label));
      return row;
    }

    // fist: the player's own 1 hp, shown but never edited
    var fistRow = dmgRow('fist', 'fist');
    fistRow.appendChild(el('span', 'fist-value', String(Calc.FIST)));
    dmgControls.appendChild(fistRow);

    // weapon: unenchanted bonus, decimals allowed
    var weaponRow = dmgRow('weapon', 'weapon');
    var weaponInput = el('input', 'prot-input weapon-input');
    weaponInput.type = 'number';
    weaponInput.min = '0';
    weaponInput.step = 'any';
    weaponInput.placeholder = '0';
    weaponInput.value = state.attack.weapon === '' ? '' : String(state.attack.weapon);
    weaponRow.appendChild(weaponInput);
    dmgControls.appendChild(weaponRow);

    // levels: sharpness / strength / weakness share one stepper shape
    var levelInputs = {};
    function levelRow(field, label, cls) {
      cls = cls || field;
      var row = dmgRow(field, label);
      var stepper = el('div', 'prot-stepper dmg-stepper');
      var dec = el('button', 'prot-dec ' + cls + '-dec', '-');
      var input = el('input', 'prot-input ' + cls + '-input');
      var inc = el('button', 'prot-inc ' + cls + '-inc', '+');
      dec.type = inc.type = 'button';
      input.type = 'number';
      input.min = '0';
      input.max = '32767';
      input.value = String(state.attack[field]);
      function setLevel(v) {
        v = parseInt(v, 10);
        if (isNaN(v) || v < 0) v = 0;
        if (v > 32767) v = 32767;
        state.attack[field] = v;
        input.value = String(v);
        render();
      }
      dec.addEventListener('click', function () { setLevel(state.attack[field] - 1); });
      inc.addEventListener('click', function () { setLevel(state.attack[field] + 1); });
      input.addEventListener('input', function () { setLevel(input.value); });
      stepper.appendChild(dec);
      stepper.appendChild(input);
      stepper.appendChild(inc);
      row.appendChild(stepper);
      levelInputs[field] = input;
      dmgControls.appendChild(row);
    }
    levelRow('sharpness', 'sharp', 'sharp');
    levelRow('strength', 'strength');
    levelRow('weakness', 'weakness');

    // crit: one explicit checkbox, no jump inference
    var critRow = dmgRow('crit', 'crit');
    var critBox = el('input', 'crit-input');
    critBox.type = 'checkbox';
    critBox.checked = !!state.attack.crit;
    critBox.addEventListener('change', function () {
      state.attack.crit = !!critBox.checked;
      render();
    });
    critRow.appendChild(critBox);
    dmgControls.appendChild(critRow);

    // manual mode row: hidden while ccl owns the number
    var manualRow = dmgRow('manual', 'manual');
    var manualInput = el('input', 'prot-input manual-input');
    manualInput.type = 'number';
    manualInput.min = '0';
    manualInput.step = 'any';
    manualInput.placeholder = '0.00';
    manualInput.value = state.manual === '' ? '' : String(state.manual);
    manualInput.addEventListener('input', function () {
      state.manual = manualInput.value;
      render();
    });
    manualRow.appendChild(manualInput);
    dmgControls.appendChild(manualRow);

    // mode switch: ccl computes the damage, mnl takes the number as given
    var modeRow = el('section', 'mode-row');
    modeRow.appendChild(el('span', 'dmg-label', 'mode'));
    var modeBtns = {};
    ['ccl', 'mnl'].forEach(function (name) {
      var b = el('button', 'mode', name);
      b.type = 'button';
      b.dataset.mode = name;
      b.addEventListener('click', function () { setMode(name); });
      modeBtns[name] = b;
      modeRow.appendChild(b);
    });
    dmgControls.insertBefore(modeRow, dmgControls.firstChild);

    weaponInput.addEventListener('input', function () {
      state.attack.weapon = weaponInput.value;
      render();
    });

    dmgPanel.appendChild(dmgControls);

    function setMode(name) {
      state.mode = name;
      ['ccl', 'mnl'].forEach(function (key) {
        if (modeBtns[key]) modeBtns[key].classList.toggle('is-active', key === name);
      });
      dmgTag.textContent = name;
      // reserve the space so the divider and results never shift between modes
      dmgPanel.querySelectorAll('.dmg-row').forEach(function (row) {
        var isManual = row.dataset.field === 'manual';
        row.classList.toggle('is-off', name === 'mnl' ? !isManual : isManual);
      });
      render();
      save();
    }

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
    var dmgLead = el('div', 'dmg-lead');
    dmgLead.appendChild(el('span', 'damage-label', 'dmg'));
    var dmgValue = el('span', 'dmg-value', '1.00');
    dmgLead.appendChild(dmgValue);
    var dmgTag = el('span', 'dmg-tag', 'ccl');
    var dmgChain = el('div', 'dmg-chain');
    dmgChain.appendChild(dmgTag);
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
    dmgChain.appendChild(dmgOut);
    damageRow.appendChild(dmgLead);
    damageRow.appendChild(dmgChain);

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

    function save() {
      try {
        if (root.localStorage) root.localStorage.setItem(STORE_KEY, JSON.stringify(state));
      } catch (e) { /* private mode: run without persistence */ }
    }

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

      var manual = parseFloat(state.manual);
      if (isNaN(manual) || manual < 0) manual = 0;
      var dmg = state.mode === 'mnl' ? manual : Calc.attackDamage(state.attack);
      dmgValue.textContent = num(dmg);
      var out = Calc.applyDamage(dmg, r);
      dmgVal.textContent = num(out.result);
      heartVal.textContent = num(out.hearts);

      Calc.SLOTS.forEach(function (slot) {
        durabilityEls[slot].textContent = String(state.slots[slot].material === 'none'
          ? 0
          : Calc.durabilityOf(slot, state.slots[slot].material));
      });

      save();
    }

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
      state.attack = { weapon: '', sharpness: 0, strength: 0, weakness: 0, crit: false };
      state.manual = '';
      weaponInput.value = '';
      manualInput.value = '';
      levelInputs.sharpness.value = '0';
      levelInputs.strength.value = '0';
      levelInputs.weakness.value = '0';
      critBox.checked = false;
      setMode('ccl');
      try { if (root.localStorage) root.localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ }
      closeReset();
      render();
    });

    panels.appendChild(defPanel);
    panels.appendChild(dmgPanel);
    container.appendChild(panels);
    container.appendChild(divider);
    container.appendChild(results);
    container.appendChild(mobileBar);
    container.appendChild(confirmModal);

    document.addEventListener('click', function () { closePopover(); });

    setMode(state.mode);
    render();

    return { state: state, render: render };
  }

  root.ProtUI = { mount: mount };
})(typeof self !== 'undefined' ? self : this);
