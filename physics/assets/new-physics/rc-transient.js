(() => {
  'use strict';
  const { $, fmt, colors } = Lab; let mode = 'charge', timer;
  const q = Lab.controls([
    { id: 'R', label: 'Resistencia R', unit: 'k\u03a9', min: .1, max: 100, step: .1, value: 10 },
    { id: 'C', label: 'Capacidad C', unit: '\u00b5F', min: 1, max: 1000, step: 1, value: 100 },
    { id: 'V', label: 'Tensi\u00f3n inicial / fuente', unit: 'V', min: 0, max: 24, step: .1, value: 12 },
    { id: 'time', label: 'Instante t / \u03c4', unit: '\u03c4', min: 0, max: 8, step: .01, value: 0 }
  ], id => { if (timer) timer.stop(); if (id !== 'time') q.set('time', 0, false); draw(); });
  function state(t = q.time * q.R * q.C * .001) { return Physics.rc(q.R * 1000, q.C * 1e-6, q.V, t, mode); }
  function circuit(a) {
    const { ctx, width: w } = Lab.surface('circuit'), l = w * .14, r = w * .85, mid = w * .48, top = 53, bottom = 167;
    ctx.lineWidth = 2; Lab.line(ctx, l, top, mid - 29, top); Lab.line(ctx, mid + 29, top, r, top);
    ctx.strokeStyle = colors.ink; ctx.strokeRect(mid - 29, top - 11, 58, 22);
    Lab.text(ctx, 'R = ' + fmt(q.R) + ' k\u03a9', mid, 23, colors.ink, 'center');
    Lab.line(ctx, r, top, r, 105); Lab.line(ctx, r - 23, 105, r + 23, 105, colors.teal);
    Lab.line(ctx, r - 23, 118, r + 23, 118, colors.teal); Lab.line(ctx, r, 118, r, bottom);
    Lab.line(ctx, r, bottom, l, bottom); Lab.text(ctx, 'C', r + 30, 111, colors.teal);
    Lab.text(ctx, '+', r - 34, 97, colors.teal); Lab.text(ctx, '\u2212', r - 34, 124, colors.teal);
    if (mode === 'charge') {
      Lab.line(ctx, l, top, l, 101); Lab.line(ctx, l, 120, l, bottom);
      Lab.line(ctx, l - 18, 101, l + 18, 101, colors.blue); Lab.line(ctx, l - 10, 120, l + 10, 120, colors.blue);
      Lab.text(ctx, fmt(q.V) + ' V', l, 188, colors.blue, 'center'); Lab.text(ctx, '+', l - 27, 97, colors.blue);
    } else { Lab.line(ctx, l, top, l, bottom); Lab.text(ctx, 'Sin fuente', l, 188, colors.muted, 'center'); }
    // Fixed positive-reference arrow; the numeric sign specifies actual direction.
    Lab.arrow(ctx, mid - 20, 86, mid + 20, 86, colors.red); Lab.text(ctx, 'I', mid, 105, colors.red, 'center');
    const fraction = q.V ? a.voltage / q.V : 0;
    for (let i = 0; i < Math.round(fraction * 5); i++) {
      Lab.text(ctx, '+', r - 20 + 10 * i, 92, colors.teal, 'center'); Lab.text(ctx, '\u2212', r - 20 + 10 * i, 132, colors.teal, 'center');
    }
    $('circuit-title').textContent = mode === 'charge' ? 'Carga: fuente conectada' : 'Descarga: fuente desconectada';
  }
  function draw() {
    const a = state(), t = q.time * a.tau; circuit(a);
    $('t-read').textContent = fmt(t, 4) + ' s'; $('tau-read').textContent = '\u03c4 = ' + fmt(a.tau, 4) + ' s';
    $('q-read').textContent = fmt(a.charge * 1e6) + ' \u00b5C'; $('v-read').textContent = fmt(a.voltage) + ' V';
    $('i-read').textContent = fmt(a.current * 1000, 4) + ' mA'; $('energy-read').textContent = 'E = ' + fmt(a.energy * 1000) + ' mJ';
    const plots = [
      { id: 'charge-chart', key: 'charge', factor: 1e6, max: Math.max(1, q.C * q.V), unit: 'Q (\u00b5C)', color: colors.blue },
      { id: 'voltage-chart', key: 'voltage', factor: 1, max: Math.max(1, q.V), unit: 'Vc (V)', color: colors.teal },
      { id: 'current-chart', key: 'current', factor: 1000, max: Math.max(.001, q.V / q.R), unit: 'I (mA)', color: colors.red }
    ];
    for (const p of plots) {
      const negative = p.key === 'current' && mode === 'discharge';
      const chart = Lab.chart(p.id, { xmin: 0, xmax: 8 * a.tau, ymin: negative ? -1.1 * p.max : 0, ymax: negative ? .1 * p.max : 1.1 * p.max, xlabel: 't (s)', ylabel: p.unit });
      const { ctx, X, Y, top, bottom } = chart;
      chart.curve(x => state(x)[p.key] * p.factor, p.color);
      Lab.line(ctx, X(a.tau), top, X(a.tau), bottom, '#9baab2', [3, 4]);
      Lab.line(ctx, X(t), top, X(t), bottom, colors.ink, [5, 5]); Lab.dot(ctx, X(t), Y(a[p.key] * p.factor), p.color, 4.5);
      $(p.id).onpointermove = e => {
        const rect = $(p.id).getBoundingClientRect(), xx = Math.max(0, Math.min(8 * a.tau, (e.clientX - rect.left - chart.left) / (chart.right - chart.left) * 8 * a.tau));
        $('cursor-data').textContent = 't = ' + fmt(xx, 4) + ' s; ' + p.unit.split(' ')[0] + ' = ' + fmt(state(xx)[p.key] * p.factor, 4) + ' ' + p.unit.match(/\((.*)\)/)[1];
      };
    }
    $('status').textContent = 't = ' + fmt(q.time, 2) + '\u03c4' + (q.time >= 8 ? ' \u00b7 recorrido terminado' : '');
    const residual = (mode === 'charge' ? q.V : 0) - a.current * q.R * 1000 - a.voltage;
    $('outcome').textContent = q.V === 0 ? 'V = 0: no hay carga, corriente ni energ\u00eda almacenada.' :
      `${mode === 'charge' ? 'Carga alcanzada' : 'Carga restante'}: ${fmt(a.voltage / q.V * 100, 2)} %. Balance de tensiones Vs \u2212 RI \u2212 Vc = ${fmt(Math.abs(residual) < 1e-12 ? 0 : residual)} V.`;
  }
  function setMode(value) { timer.stop(); mode = value; q.set('time', 0, false); $('charge').setAttribute('aria-pressed', String(mode === 'charge')); $('discharge').setAttribute('aria-pressed', String(mode === 'discharge')); draw(); }
  $('charge').onclick = () => setMode('charge'); $('discharge').onclick = () => setMode('discharge');
  // Accumulate continuously, then update the slider: rounding must not stall small dt.
  let animationTime = 0;
  timer = Lab.clock(draw, dt => { if (Math.abs(animationTime - q.time) > .02 || q.time >= 8) animationTime = q.time >= 8 ? 0 : q.time; animationTime = Math.min(8, animationTime + dt * .5); q.set('time', animationTime, false); return q.time < 8; }, () => { animationTime = 0; q.set('time', 0, false); });
  window.simulation = { kind: 'rc', params: q, state, setMode, draw, get mode() { return mode; } };
  Lab.math(); Lab.resize(draw); draw();
})();
