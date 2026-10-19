// Interactive figures built from data/passk.js. Each figure keeps a static
// fallback (the paper's panels) that is hidden once the widget renders.
(function () {
  'use strict';

  var DATA = window.PASSK_DATA;
  if (!DATA) return;
  var B = DATA.benchmarks;
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Short notes per view, restating the paper's statements for that panel.
  var NOTES = {
    'text/Symptom2Disease': 'pass@1 nearly matches the 120B reference; at pass@64 the optimized harness falls below both the reference and the 20B baseline.',
    'text/LawBench': 'A 16.05 pp lead over the 120B reference at pass@1 reverses at k = 11; at pass@64 the optimized harness reaches 56% versus 60%.',
    'text/USPTO': 'Below the 120B reference at pass@1 and pass@64; with the optimized harness, 68 of 100 tasks still yield no success.',
    'hotpotqa/all': 'Both optimized harnesses exceed the 32B reference at pass@1, but only one remains above it at pass@128.',
    'hotpotqa/easy': 'The optimized 8B harnesses match or exceed the 32B reference throughout the evaluated budgets.',
    'hotpotqa/hard': 'Neither optimized harness exceeds the 32B reference at any evaluated budget; at pass@128 they reach 71–73%, versus 71% for the 8B baseline and 78% for 32B.',
    'appworld/all': 'Both optimized medium-effort harnesses fall below high effort at pass@1 and pass@128; one briefly exceeds it at k = 2.',
    'appworld/easy': 'All systems eventually reach complete observed coverage.',
    'hotpotqa/all/mean': 'Averaged over two optimization runs, the optimized Qwen3-8B harness stays close to the 32B reference across budgets: 71.8% versus 69.1% at pass@1 and 88.0% versus 87.7% at pass@128.',
    'appworld/all/mean': 'Averaged over two optimization runs, the optimized medium-effort harness stays below high effort at every budget: 62.2% versus 63.5% at pass@1 and 95.5% versus 97.0% at pass@128.',
    'appworld/hard': 'Unlike on HotpotQA, the optimized harnesses gain coverage over the medium-effort baseline (89–92% versus 83% at pass@128), but at best match high effort (92%).',
  };

  var VIEWS = {
    Symptom2Disease: { bench: 'text', dataset: 'Symptom2Disease', title: 'Symptom2Disease' },
    LawBench: { bench: 'text', dataset: 'LawBench', title: 'LawBench' },
    USPTO: { bench: 'text', dataset: 'USPTO', title: 'USPTO' },
    hotpotqa: { bench: 'hotpotqa', title: 'HotpotQA' },
    appworld: { bench: 'appworld', title: 'AppWorld' },
  };
  var STRATA = ['all', 'easy', 'medium', 'hard'];
  var STRATUM_LABEL = { all: 'All tasks', easy: 'Easy', medium: 'Medium', hard: 'Hard' };

  function el(tag, attrs, parent) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (key) {
      if (key === 'text') node.textContent = attrs[key];
      else node.setAttribute(key, attrs[key]);
    });
    if (parent) parent.appendChild(node);
    return node;
  }

  function svgEl(tag, attrs, parent) {
    var node = document.createElementNS(SVG_NS, tag);
    Object.keys(attrs || {}).forEach(function (key) {
      if (key === 'text') node.textContent = attrs[key];
      else node.setAttribute(key, attrs[key]);
    });
    if (parent) parent.appendChild(node);
    return node;
  }

  function pct(v) { return v.toFixed(2) + '%'; }
  function pp(v) {
    if (Math.abs(v) < 0.005) return '±0.00 pp';
    return (v > 0 ? '+' : '−') + Math.abs(v).toFixed(2) + ' pp';
  }

  // Arms for a view: [{role, label, curve}], with run numbers for multiple optimized arms.
  function armsFor(viewKey, stratum, averageRuns) {
    var view = VIEWS[viewKey];
    var bench = B[view.bench];
    var arms = (view.dataset ? bench.datasets[view.dataset].arms : bench.arms).map(function (a) {
      return { role: a.role, label: a.label, curve: view.dataset ? a.passk : a.passk[stratum] };
    });
    var runs = arms.filter(function (a) { return a.role === 'optimized'; });
    if (!averageRuns || runs.length < 2) return arms;
    // One optimized curve: the mean of the selected harnesses' pass@k across optimization runs.
    var mean = {
      role: 'optimized',
      label: runs[0].label.replace(/ \(run \d+\)$/, '') + ' (mean of ' + runs.length + ' runs)',
      curve: runs[0].curve.map(function (_, i) {
        return runs.reduce(function (sum, r) { return sum + r.curve[i]; }, 0) / runs.length;
      }),
    };
    var out = [];
    arms.forEach(function (a) {
      if (a.role !== 'optimized') out.push(a);
      else if (a === runs[0]) out.push(mean);
    });
    return out;
  }

  function niceRange(lo, hi) {
    var span = hi - lo;
    var step = span > 45 ? 20 : span > 22 ? 10 : 5;
    lo = Math.max(0, Math.floor((lo - 2) / step) * step);
    hi = Math.min(100, Math.ceil((hi + 2) / step) * step);
    return { lo: lo, hi: hi, step: step };
  }

  // ---------------------------------------------------------------------------
  // Attempt-budget explorer
  // ---------------------------------------------------------------------------
  function Explorer(root) {
    this.root = root;
    this.views = root.getAttribute('data-views').split(',');
    this.showStrata = root.hasAttribute('data-strata');
    this.averageRuns = root.hasAttribute('data-average-runs');
    this.view = root.getAttribute('data-default-view') || this.views[0];
    this.stratum = root.getAttribute('data-default-stratum') || 'all';
    this.k = 1;
    this.build();
    this.update();
  }

  Explorer.prototype.build = function () {
    var self = this;
    var widget = el('div', { class: 'explorer' });
    var controls = el('div', { class: 'ex-controls' }, widget);

    var tabs = el('div', { class: 'ex-tabs', role: 'group', 'aria-label': 'Benchmark' }, controls);
    this.tabButtons = this.views.map(function (key) {
      var b = el('button', { type: 'button', class: 'ex-tab', text: VIEWS[key].title }, tabs);
      b.addEventListener('click', function () { self.view = key; self.update(); });
      b.dataset.key = key;
      return b;
    });

    this.strataGroup = el('div', { class: 'ex-tabs ex-strata', role: 'group', 'aria-label': 'Difficulty' }, controls);
    this.strataButtons = STRATA.map(function (s) {
      var b = el('button', { type: 'button', class: 'ex-tab ex-tab-sm', text: STRATUM_LABEL[s] }, self.strataGroup);
      b.addEventListener('click', function () { self.stratum = s; self.update(); });
      b.dataset.key = s;
      return b;
    });

    var body = el('div', { class: 'ex-body' }, widget);
    var chartWrap = el('div', { class: 'ex-chart' }, body);
    this.svg = svgEl('svg', { viewBox: '0 0 440 380', role: 'img' }, chartWrap);
    this.chartWrap = chartWrap;
    this.readout = el('div', { class: 'ex-readout', 'aria-live': 'polite' }, body);

    var sliderRow = el('div', { class: 'ex-slider-row' }, widget);
    this.playButton = el('button', { type: 'button', class: 'ex-play', 'aria-label': 'Animate the attempt budget' }, sliderRow);
    this.playButton.innerHTML = '&#9654;';
    this.playButton.addEventListener('click', function () { self.play(); });
    var label = el('label', { class: 'ex-slider-label' }, sliderRow);
    el('span', { text: 'Attempt budget' }, label);
    this.slider = el('input', { type: 'range', min: '0', max: '1000', step: '1', value: '0' }, label);
    this.kLabel = el('output', { class: 'ex-k' }, sliderRow);
    this.slider.addEventListener('input', function () {
      self.stop();
      self.k = self.kFromSlider();
      self.draw();
    });

    this.note = el('p', { class: 'ex-note' }, widget);

    // Hovering the chart moves the budget cursor.
    this.svg.addEventListener('pointermove', function (event) {
      var box = self.svg.getBoundingClientRect();
      var x = ((event.clientX - box.left) / box.width) * self.geom.W;
      var t = (x - self.geom.L) / (self.geom.R - self.geom.L);
      if (t < -0.05 || t > 1.05) return;
      self.stop();
      self.k = Math.min(self.K, Math.max(1, Math.round(Math.pow(2, Math.max(0, Math.min(1, t)) * Math.log2(self.K)))));
      self.syncSlider();
      self.draw();
    });

    this.root.insertBefore(widget, this.root.querySelector('figcaption'));
    this.root.classList.add('has-widget');

    // Narrow screens get a taller chart with fewer ticks; redraw when that changes.
    var resizeTimer = null;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        if (self.isNarrow() !== self.geom.narrow) self.draw();
      }, 150);
    });
  };

  Explorer.prototype.isNarrow = function () {
    return this.chartWrap.clientWidth < 400;
  };

  Explorer.prototype.kFromSlider = function () {
    var t = Number(this.slider.value) / 1000;
    return Math.min(this.K, Math.max(1, Math.round(Math.pow(2, t * Math.log2(this.K)))));
  };

  Explorer.prototype.syncSlider = function () {
    this.slider.value = String(Math.round((Math.log2(this.k) / Math.log2(this.K)) * 1000));
  };

  Explorer.prototype.update = function () {
    var view = VIEWS[this.view];
    var strataVisible = this.showStrata && !view.dataset;
    this.strataGroup.hidden = !strataVisible;
    if (!strataVisible) this.stratum = 'all';
    var self = this;
    this.tabButtons.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.key === self.view)); });
    this.strataButtons.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.key === self.stratum)); });
    this.arms = armsFor(this.view, this.stratum, this.averageRuns);
    this.K = this.arms[0].curve.length;
    this.k = Math.min(this.k, this.K);
    var optimized = this.arms.filter(function (a) { return a.role === 'optimized'; });
    this.multi = optimized.length > 1;
    var run = 0;
    this.arms.forEach(function (a) { if (a.role === 'optimized' && self.multi) a.run = ++run; });
    var all = [];
    this.arms.forEach(function (a) { all = all.concat(a.curve); });
    this.range = niceRange(Math.min.apply(null, all), Math.max.apply(null, all));
    var noteKey = view.bench + '/' + (view.dataset || this.stratum);
    var note = (this.averageRuns && NOTES[noteKey + '/mean']) || NOTES[noteKey];
    this.note.textContent = note || '';
    this.note.hidden = !note;
    this.svg.setAttribute('aria-label', view.title + (view.dataset ? '' : ', ' + STRATUM_LABEL[this.stratum].toLowerCase()) +
      ': pass@k from 1 to ' + this.K + ' attempts for the baseline, optimized, and reference systems.');
    this.syncSlider();
    this.draw();
  };

  Explorer.prototype.draw = function () {
    var self = this;
    var svg = this.svg;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var narrow = this.isNarrow();
    var W = narrow ? 360 : 440, H = narrow ? 300 : 380;
    var L = narrow ? 42 : 56, R = W - (narrow ? 14 : 24), T = 16, Bt = H - 50;
    this.geom = { L: L, R: R, W: W, narrow: narrow };
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    var r = this.range, K = this.K;
    var x = function (k) { return L + (Math.log2(k) / Math.log2(K)) * (R - L); };
    var y = function (v) { return Bt - ((v - r.lo) / (r.hi - r.lo)) * (Bt - T); };

    for (var v = r.lo; v <= r.hi + 1e-9; v += r.step) {
      svgEl('line', { class: 'ex-grid', x1: L, x2: R, y1: y(v), y2: y(v) }, svg);
      svgEl('text', { class: 'ex-ytick', x: L - 8, y: y(v) + 4, text: v + '%' }, svg);
    }
    for (var k = 1; k <= K; k *= narrow ? 4 : 2) {
      svgEl('text', { class: 'ex-xtick', x: x(k), y: Bt + 20, text: String(k) }, svg);
    }
    if (narrow && K === 128) svgEl('text', { class: 'ex-xtick', x: x(K), y: Bt + 20, text: String(K) }, svg);
    svgEl('text', { class: 'ex-axis', x: (L + R) / 2, y: Bt + 42, text: 'attempts per task (k), log scale' }, svg);

    var order = { baseline: 0, optimized: 1, reference: 2 };
    this.arms.slice().sort(function (a, b) { return order[a.role] - order[b.role]; }).forEach(function (a) {
      var d = a.curve.map(function (val, i) { return (i ? 'L' : 'M') + x(i + 1).toFixed(1) + ',' + y(val).toFixed(1); }).join(' ');
      svgEl('path', { class: 'ex-line ex-' + a.role, d: d }, svg);
    });

    var cx = x(this.k);
    svgEl('line', { class: 'ex-cursor', x1: cx, x2: cx, y1: T, y2: Bt }, svg);
    this.arms.forEach(function (a) {
      svgEl('circle', { class: 'ex-dot ex-dot-' + a.role, cx: cx, cy: y(a.curve[self.k - 1]), r: 4.5 }, svg);
    });

    this.kLabel.textContent = 'k = ' + this.k;
    this.renderReadout();
  };

  Explorer.prototype.renderReadout = function () {
    var self = this;
    var i = this.k - 1;
    var base = this.arms.filter(function (a) { return a.role === 'baseline'; })[0];
    var ref = this.arms.filter(function (a) { return a.role === 'reference'; })[0];
    var html = '<p class="ex-ro-head">pass@' + this.k + '</p><ul class="ex-ro-list">';
    this.arms.forEach(function (a) {
      var name = a.label;
      html += '<li><span class="ex-sw ex-sw-' + a.role + '"></span><span class="ex-ro-name">' + name + '</span>' +
        '<span class="ex-ro-val">' + pct(a.curve[i]) + '</span></li>';
    });
    html += '</ul><p class="ex-ro-head ex-ro-gap">Optimized minus …</p><ul class="ex-ro-list">';
    this.arms.forEach(function (a) {
      if (a.role !== 'optimized') return;
      var tag = a.run ? ' (run ' + a.run + ')' : '';
      var dBase = a.curve[i] - base.curve[i];
      var dRef = a.curve[i] - ref.curve[i];
      html += '<li><span class="ex-ro-name">baseline' + tag + '</span><span class="ex-ro-val ' + (dBase >= 0.005 ? 'up' : 'down') + '">' + pp(dBase) + '</span></li>';
      html += '<li><span class="ex-ro-name">reference' + tag + '</span><span class="ex-ro-val ' + (dRef >= 0.005 ? 'up' : 'down') + '">' + pp(dRef) + '</span></li>';
    });
    html += '</ul>';
    this.readout.innerHTML = html;
  };

  Explorer.prototype.play = function () {
    var self = this;
    this.stop();
    if (reducedMotion) { this.k = this.K; this.syncSlider(); this.draw(); return; }
    var start = null, duration = 3200;
    this.playButton.classList.add('playing');
    function step(ts) {
      if (start === null) start = ts;
      var t = Math.min(1, (ts - start) / duration);
      self.slider.value = String(Math.round(t * 1000));
      self.k = self.kFromSlider();
      self.draw();
      if (t < 1) self.raf = requestAnimationFrame(step);
      else self.stop();
    }
    this.raf = requestAnimationFrame(step);
  };

  Explorer.prototype.stop = function () {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
    this.playButton.classList.remove('playing');
  };

  // ---------------------------------------------------------------------------
  // Never / sometimes / always task outcomes (text classification)
  // ---------------------------------------------------------------------------
  function Outcomes(root) {
    this.root = root;
    this.datasets = Object.keys(B.text.datasets);
    this.dataset = root.getAttribute('data-default-dataset') || 'LawBench';
    this.build();
    this.update();
  }

  Outcomes.prototype.build = function () {
    var self = this;
    var widget = el('div', { class: 'outcomes' });
    var tabs = el('div', { class: 'ex-tabs', role: 'group', 'aria-label': 'Dataset' }, widget);
    this.tabButtons = this.datasets.map(function (d) {
      var b = el('button', { type: 'button', class: 'ex-tab', text: d }, tabs);
      b.addEventListener('click', function () { self.dataset = d; self.update(); });
      b.dataset.key = d;
      return b;
    });
    var legend = el('ul', { class: 'oc-legend', 'aria-label': 'Legend' }, widget);
    [['never', 'No observed success'], ['sometimes', 'Some attempts succeed'], ['always', 'Every attempt succeeds']].forEach(function (p) {
      var li = el('li', {}, legend);
      el('span', { class: 'oc-sw oc-' + p[0] }, li);
      li.appendChild(document.createTextNode(p[1]));
    });
    this.rows = el('div', { class: 'oc-rows' }, widget);
    this.summary = el('p', { class: 'oc-summary', 'aria-live': 'polite' }, widget);
    this.root.insertBefore(widget, this.root.querySelector('figcaption'));
    this.root.classList.add('has-widget');
  };

  Outcomes.prototype.update = function () {
    var self = this;
    this.tabButtons.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.key === self.dataset)); });
    var data = B.text.datasets[this.dataset];
    var n = data.n_tasks;
    var rows = [['baseline', 'GPT-OSS-20B · baseline harness'], ['optimized', 'GPT-OSS-20B · optimized harness']];
    this.rows.innerHTML = '';
    rows.forEach(function (r) {
      var o = data.outcomes[r[0]];
      var row = el('div', { class: 'oc-row' }, self.rows);
      el('p', { class: 'oc-name', text: r[1] }, row);
      var bar = el('div', { class: 'oc-bar', role: 'img',
        'aria-label': r[1] + ': no observed success on ' + o.never + ', some attempts succeed on ' + o.sometimes + ', every attempt succeeds on ' + o.always + ' of ' + n + ' tasks.' }, row);
      ['never', 'sometimes', 'always'].forEach(function (key) {
        var seg = el('span', { class: 'oc-seg oc-' + key }, bar);
        seg.style.width = (100 * o[key] / n) + '%';
        if (o[key] / n >= 0.07) seg.textContent = o[key];
      });
    });
    var b = data.outcomes.baseline, o = data.outcomes.optimized;
    this.summary.innerHTML = 'Of ' + n + ' tasks within 64 attempts: solved on every attempt <strong>' + b.always + ' → ' + o.always +
      '</strong>, some attempts <strong>' + b.sometimes + ' → ' + o.sometimes + '</strong>, no observed success <strong>' + b.never + ' → ' + o.never + '</strong>.';
  };

  // ---------------------------------------------------------------------------
  // Candidate examples (section 03): one run's pass@1 vs. pass@128, and a crossing pair
  // ---------------------------------------------------------------------------
  var CAND_COLORS = { p1: '#E21500', p128: '#006FE2', other: '#C9C9C9', base: '#8D8D8D', ref: '#2D2D2D' };

  function axes(svg, g, xTicks, yTicks, xLabel, yLabel) {
    yTicks.forEach(function (v) {
      svgEl('line', { class: 'ex-grid', x1: g.L, x2: g.R, y1: g.y(v), y2: g.y(v) }, svg);
      svgEl('text', { class: 'ex-ytick', x: g.L - 8, y: g.y(v) + 4, text: v + '%' }, svg);
    });
    xTicks.forEach(function (t) {
      svgEl('text', { class: 'ex-xtick', x: g.x(t.v), y: g.B + 20, text: t.label }, svg);
    });
    svgEl('text', { class: 'ex-axis', x: (g.L + g.R) / 2, y: g.B + 42, text: xLabel }, svg);
    svgEl('text', { class: 'ex-axis', transform: 'translate(14 ' + (g.T + g.B) / 2 + ') rotate(-90)', text: yLabel }, svg);
  }

  function Candidates(root) {
    var C = DATA.candidates;
    if (!C) return;
    var hp = B.hotpotqa.arms;
    var base = hp.filter(function (a) { return a.role === 'baseline'; })[0].passk.all;
    var ref = hp.filter(function (a) { return a.role === 'reference'; })[0].passk.all;
    var W = 380, H = 340;
    var geom = function (x0, x1, y0, y1, logX) {
      var L = 58, R = W - 16, T = 14, Bt = H - 54;
      return {
        L: L, R: R, T: T, B: Bt,
        x: function (v) { return logX ? L + (Math.log2(v) / Math.log2(x1)) * (R - L) : L + ((v - x0) / (x1 - x0)) * (R - L); },
        y: function (v) { return Bt - ((v - y0) / (y1 - y0)) * (Bt - T); },
      };
    };

    var widget = el('div', { class: 'cand-widget' });
    var legend = el('ul', { class: 'html-legend cand-legend', 'aria-label': 'Legend' }, widget);
    [['p1', 'Leads at pass@1', ''], ['p128', 'Leads at pass@128', ''], ['other', 'Other candidates', ''],
     ['base', 'Qwen3-8B baseline', ''], ['ref', 'Qwen3-32B baseline', 'dashed']].forEach(function (item) {
      var li = el('li', {}, legend);
      var sw = el('span', { class: 'lg-line' }, li);
      sw.style.borderColor = CAND_COLORS[item[0]];
      if (item[2]) sw.style.borderTopStyle = item[2];
      li.appendChild(document.createTextNode(item[1]));
    });
    var selItem = el('li', {}, legend);
    el('span', { class: 'lg-dot' }, selItem);
    selItem.appendChild(document.createTextNode('Selected harness (a)'));
    var grid = el('div', { class: 'cand-grid' }, widget);

    // (a) Scatter.
    var pts = C.scatter.points;
    var lead1 = pts.reduce(function (a, b) { return b.p1 > a.p1 ? b : a; });
    var lead128 = pts.reduce(function (a, b) { return b.p128 > a.p128 ? b : a; });
    var pa = el('div', { class: 'cand-panel' }, grid);
    el('p', { class: 'panel-title', text: '(a) One run\u2019s candidates: pass@1 vs. pass@128' }, pa);
    var sa = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img',
      'aria-label': 'Scatter of pass@1 against pass@128 for the 40 Qwen3-8B candidates of one optimization run. The candidate with the highest pass@1 (' + pct(lead1.p1) + ', ' + pct(lead1.p128) + ') differs from the one with the highest pass@128 (' + pct(lead128.p1) + ', ' + pct(lead128.p128) + '); the run\u2019s selected harness is at (' + pct(pts.filter(function (p) { return p.selected; })[0].p1) + ', ' + pct(pts.filter(function (p) { return p.selected; })[0].p128) + ').' }, pa);
    var ga = geom(55, 77, 80, 90, false);
    axes(sa, ga, [55, 60, 65, 70, 75].map(function (v) { return { v: v, label: v + '%' }; }), [80, 85, 90], 'pass@1', 'pass@128');
    pts.forEach(function (p) {
      if (p === lead1 || p === lead128 || p.selected) return;
      svgEl('circle', { cx: ga.x(p.p1), cy: ga.y(p.p128), r: 4, fill: CAND_COLORS.other }, sa);
    });
    var b1 = base[0], b128 = base[base.length - 1], r1 = ref[0], r128 = ref[ref.length - 1];
    svgEl('rect', { x: ga.x(b1) - 5, y: ga.y(b128) - 5, width: 10, height: 10, fill: CAND_COLORS.base }, sa);
    // Leader labels sit in empty space: above-left of the pass@128 leader, and in the lower-right
    // corner for the pass@1 leader, joined to its point by a short line.
    svgEl('circle', { cx: ga.x(lead128.p1), cy: ga.y(lead128.p128), r: 6.5, fill: CAND_COLORS.p128, stroke: '#FFFFFF', 'stroke-width': 1.5 }, sa);
    svgEl('text', { class: 'cand-note', x: ga.x(lead128.p1) - 12, y: ga.y(lead128.p128) - 12, fill: CAND_COLORS.p128, 'text-anchor': 'end', text: 'highest pass@128' }, sa);
    var sel = pts.filter(function (p) { return p.selected; })[0];
    svgEl('circle', { cx: ga.x(sel.p1), cy: ga.y(sel.p128), r: 6.5, fill: '#000000', stroke: '#FFFFFF', 'stroke-width': 1.5 }, sa);
    svgEl('text', { class: 'cand-note', x: ga.x(sel.p1) - 12, y: ga.y(sel.p128) + 4, fill: '#000000', 'text-anchor': 'end', text: 'selected' }, sa);
    var lx = ga.R - 4, ly = ga.y(82.6);
    svgEl('line', { x1: ga.x(lead1.p1), y1: ga.y(lead1.p128) + 7, x2: lx - 22, y2: ly - 14, stroke: CAND_COLORS.p1, 'stroke-width': 1 }, sa);
    svgEl('circle', { cx: ga.x(lead1.p1), cy: ga.y(lead1.p128), r: 6.5, fill: CAND_COLORS.p1, stroke: '#FFFFFF', 'stroke-width': 1.5 }, sa);
    svgEl('text', { class: 'cand-note', x: lx, y: ly, fill: CAND_COLORS.p1, 'text-anchor': 'end', text: 'highest pass@1' }, sa);

    // (b) Crossing pair.
    var pb = el('div', { class: 'cand-panel' }, grid);
    el('p', { class: 'panel-title', text: '(b) Two candidates trade places as k grows' }, pb);
    var curves = C.cross.curves;
    var a = curves.filter(function (c) { return c.role === 'a'; })[0].passk;
    var bb = curves.filter(function (c) { return c.role === 'b'; })[0].passk;
    var sb = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img',
      'aria-label': 'pass@k for the 40 candidates of one optimization run. One candidate leads Qwen3-32B at pass@1 (' + pct(a[0]) + ' vs. ' + pct(r1) + ') but trails it at pass@128 (' + pct(a[a.length - 1]) + ' vs. ' + pct(r128) + '); another trails at pass@1 (' + pct(bb[0]) + ') but leads at pass@128 (' + pct(bb[bb.length - 1]) + ').' }, pb);
    var K = a.length;
    var gb = geom(1, K, 40, 90, true);
    axes(sb, gb, [1, 4, 16, 128].map(function (v) { return { v: v, label: String(v) }; }), [40, 50, 60, 70, 80, 90], 'attempts per task (k), log scale', 'pass@k');
    var line = function (c, attrs) {
      var d = c.map(function (v, i) { return (i ? 'L' : 'M') + gb.x(i + 1).toFixed(1) + ',' + gb.y(v).toFixed(1); }).join(' ');
      attrs.d = d; attrs.fill = 'none'; attrs['stroke-linejoin'] = 'round'; attrs['stroke-linecap'] = 'round';
      svgEl('path', attrs, sb);
    };
    curves.forEach(function (c) { if (c.role === 'other') line(c.passk, { stroke: CAND_COLORS.other, 'stroke-width': 1.2, opacity: 0.8 }); });
    line(base, { stroke: CAND_COLORS.base, 'stroke-width': 2.5 });
    line(ref, { stroke: CAND_COLORS.ref, 'stroke-width': 2, 'stroke-dasharray': '6 5' });
    line(a, { stroke: CAND_COLORS.p1, 'stroke-width': 3 });
    line(bb, { stroke: CAND_COLORS.p128, 'stroke-width': 3 });

    root.insertBefore(widget, root.querySelector('figcaption'));
    root.classList.add('has-widget');
  }

  document.querySelectorAll('[data-explorer]').forEach(function (root) { new Explorer(root); });
  document.querySelectorAll('[data-candidates]').forEach(function (root) { new Candidates(root); });
  document.querySelectorAll('[data-outcomes]').forEach(function (root) { new Outcomes(root); });
})();
