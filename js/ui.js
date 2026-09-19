// prot — ui mount v2. icon-only, borderless, popover material picker,
// shield levels for resistance, inline detail on desktop / modal on mobile.
(function (root) {
  'use strict';
  var Calc = root.ProtCalc;
  var TEX = 'assets/textures/';
  var MOBILE = '(max-width: 760px)';

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

  function mount(container) {
    var state = { slots: {}, resistance: 0 };
    Calc.SLOTS.forEach(function (s) { state.slots[s] = { material: 'none', prot: 0 }; });

    var controls = el('section', 'controls');
    var durabilityEls = {};
    var triggerEls = {};
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
      trigger.appendChild(img(materialTex('none', slot), 'none'));
      triggerEls[slot] = trigger;

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
      input.value = '0';
      var inc = el('button', 'prot-inc', '+');
      dec.type = inc.type = 'button';

      var slider = null;

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
        var b = el('button', 'res-level' + (n === 0 ? ' is-active' : ''), String(n));
        b.type = 'button';
        b.dataset.level = String(n);
        b.addEventListener('click', function () { setRes(n); });
        levelEls.push(b);
        levelGrid.appendChild(b);
      })(lvl);
    }
    resRow.appendChild(levelGrid);
    function setRes(n) {
      state.resistance = n;
      levelEls.forEach(function (b, i) { b.classList.toggle('is-active', i === n); });
      render();
    }
    controls.appendChild(resRow);

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

    var capped = el('p', 'epf-capped', 'epf capped at 20 - max');
    capped.hidden = true;

    var damageRow = el('div', 'damage-row');
    damageRow.appendChild(el('span', 'damage-label', 'damage'));
    var dmgInput = el('input', 'damage-input');
    dmgInput.type = 'number';
    dmgInput.min = '0';
    dmgInput.step = 'any';
    dmgInput.value = '';
    dmgInput.placeholder = '0.00';
    var dmgOut = el('div', 'damage-out');
    var dmgVal = el('span', 'damage-value', '0.00');
    var heartVal = el('span', 'heart-value', '0.00');
    var heartIcon = img(TEX + 'heart.png', 'hearts');
    heartIcon.className = 'heart-icon';
    dmgOut.appendChild(dmgVal);
    dmgOut.appendChild(heartVal);
    dmgOut.appendChild(heartIcon);
    damageRow.appendChild(dmgInput);
    damageRow.appendChild(dmgOut);

    results.appendChild(statRed);
    results.appendChild(statTaken);
    results.appendChild(breakdown);
    results.appendChild(damageRow);
    results.appendChild(capped);

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

    // detail modal (mobile only): faded in/out, svg close, backdrop closes
    var modal = el('div', 'detail-modal');
    var backdrop = el('div', 'modal-backdrop');
    var card = el('div', 'modal-card');
    var close = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    close.setAttribute('viewBox', '0 0 24 24');
    close.setAttribute('class', 'modal-close');
    var cross = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    cross.setAttribute('d', 'M5 5 L19 19 M19 5 L5 19');
    cross.setAttribute('stroke', 'currentColor');
    cross.setAttribute('stroke-width', '2');
    cross.setAttribute('fill', 'none');
    close.appendChild(cross);
    var modalLines = el('div', 'modal-lines');
    var mLines = [el('p', 'line', 'armor 0.00%'), el('p', 'line', 'prot 0.00%'), el('p', 'line', 'res 0.00%')];
    mLines.forEach(function (l) { modalLines.appendChild(l); });
    card.appendChild(close);
    card.appendChild(modalLines);
    modal.appendChild(backdrop);
    modal.appendChild(card);
    container.appendChild(modal);

    function openModal() {
      modal.classList.add('is-open');
    }
    function closeModal() {
      modal.classList.remove('is-open');
    }
    backdrop.addEventListener('click', closeModal);
    close.addEventListener('click', function (ev) { ev.stopPropagation(); closeModal(); });

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
      mLines[0].textContent = 'armor ' + pct(r.armorPct);
      mLines[1].textContent = 'prot ' + pct(r.epfPct);
      mLines[2].textContent = 'res ' + pct(r.resPct);

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
    }

    dmgInput.addEventListener('input', render);
    render();

    container.appendChild(controls);
    container.appendChild(results);
    container.appendChild(mobileBar);

    document.addEventListener('click', function () { closePopover(); });

    // mobile: tapping a stat label opens the detail modal
    [redLabel, takenLabel, mRedLabel, mTakenLabel].forEach(function (label) {
      label.addEventListener('click', function (ev) {
        ev.stopPropagation();
        if (matchMedia(MOBILE).matches) openModal();
      });
    });

    return { state: state, render: render };
  }

  root.ProtUI = { mount: mount };
})(typeof self !== 'undefined' ? self : this);