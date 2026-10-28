(() => {
  'use strict';
  const { $, fmt, colors } = Lab; let timer, times = [], sorted = [], animationTime = 0;
  const q = Lab.controls([
    { id: 'N0', label: 'N\u00facleos iniciales N\u2080', unit: '', min: 1, max: 5000, step: 1, value: 400 },
    { id: 'half', label: 'Semivida T\u2081/\u2082', unit: 's', min: .1, max: 100, step: .1, value: 10 },
    { id: 'seed', label: 'Semilla', unit: '', min: 0, max: 999999, step: 1, value: 2025 },
    { id: 'time', label: 'Instante t / T\u2081/\u2082', unit: 'T\u2081/\u2082', min: 0, max: 8, step: .01, value: 0 }
  ], id => { if (timer) timer.stop(); if (id !== 'time') { q.set('time', 0, false); regenerate(); } draw(); });
  function regenerate() { times = Physics.lifetimes(q.N0, q.half, q.seed); sorted = times.slice().sort((a, b) => a - b); animationTime = 0; }
  function state() { const t = q.time * q.half; return { ...Physics.decay(q.N0, q.half, t), t, count: Physics.survivors(sorted, t) }; }
  function draw() {
    const a = state(), plot = Lab.chart('decay-chart', { xmin: 0, xmax: q.half * 8, ymin: 0, ymax: q.N0 * 1.06, xlabel: 't (s)', ylabel: 'N (n\u00facleos)' });
    const { ctx, X, Y } = plot;
    if ($('band').checked) plot.clip(() => {
      ctx.beginPath();
      for (let i = 0; i <= 300; i++) { const t = q.half * 8 * i / 300, p = Physics.decay(q.N0, q.half, t); const yy = Math.min(q.N0, p.mean + p.sd); if (i === 0) ctx.moveTo(X(t), Y(yy)); else ctx.lineTo(X(t), Y(yy)); }
      for (let i = 300; i >= 0; i--) { const t = q.half * 8 * i / 300, p = Physics.decay(q.N0, q.half, t); ctx.lineTo(X(t), Y(Math.max(0, p.mean - p.sd))); }
      ctx.closePath(); ctx.fillStyle = '#d7ece8'; ctx.fill();
    });
    plot.curve(t => Physics.decay(q.N0, q.half, t).mean, colors.blue);
    plot.clip(() => { ctx.strokeStyle = colors.teal; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(0), Y(q.N0)); let n = q.N0;
      for (const t of sorted) { if (t > a.t) break; ctx.lineTo(X(t), Y(n)); n--; ctx.lineTo(X(t), Y(n)); }
      ctx.lineTo(X(a.t), Y(n)); ctx.stroke();
    });
    Lab.line(ctx, X(a.t), plot.top, X(a.t), plot.bottom, '#637c89', [5, 5]); Lab.dot(ctx, X(a.t), Y(a.count), colors.teal, 5);
    $('n-read').textContent = fmt(a.count, 0); $('lost-read').textContent = fmt(q.N0 - a.count, 0) + ' desintegrados';
    $('mean-read').textContent = fmt(a.mean, 2); $('sigma-read').textContent = '\u03c3 = ' + fmt(a.sd, 2) + ' n\u00facleos';
    $('activity-read').textContent = fmt(a.activity) + ' Bq'; $('t-read').textContent = fmt(a.t, 3) + ' s'; $('lambda-read').textContent = '\u03bb = ' + fmt(a.lambda, 5) + ' s\u207b\u00b9';
    $('status').textContent = 'Semilla ' + q.seed + ' \u00b7 t = ' + fmt(q.time, 2) + ' T\u2081/\u2082' + (q.time >= 8 ? ' \u00b7 fin' : '');
    $('outcome').textContent = a.t === 0 ? 'Al inicio N = N\u2080 exactamente: la dispersi\u00f3n es cero.' :
      'Muestra: ' + a.count + ' supervivientes. Media te\u00f3rica: ' + fmt(a.mean, 2) + '. ' + (a.count === 0 ? 'La muestra ya se ha extinguido; la media te\u00f3rica sigue siendo positiva.' : 'No se fuerza a la muestra a seguir la media.');
    const s = Lab.surface('nuclei'), shown = Math.min(200, q.N0), cols = Math.max(10, Math.floor(s.width / 19)), rows = Math.ceil(shown / cols), dx = s.width / cols, dy = Math.min(23, (s.height - 10) / rows);
    for (let i = 0; i < shown; i++) {
      const x = (i % cols + .5) * dx, y = 7 + (Math.floor(i / cols) + .5) * dy, r = Math.max(2, Math.min(4.5, dy * .29));
      if (times[i] > a.t) Lab.dot(s.ctx, x, y, colors.teal, r);
      else { s.ctx.strokeStyle = '#aab8c1'; s.ctx.lineWidth = 1; s.ctx.beginPath(); s.ctx.arc(x, y, r, 0, 2 * Math.PI); s.ctx.stroke(); }
    }
    $('sample-caption').textContent = `${shown < q.N0 ? 'Primeros ' + shown + ' de ' + q.N0 : 'Los ' + shown} n\u00facleos de esta misma muestra. Relleno: superviviente; hueco: desintegrado.`;
    const rowsHtml = [];
    for (let n = 0; n < 8; n++) {
      const done = q.time >= n + 1, start = n * q.half, end = (n + 1) * q.half, p = 2 ** -n - 2 ** -(n + 1);
      rowsHtml.push(`<tr><td>${fmt(start)}\u2013${fmt(end)}</td><td>${done ? Physics.survivors(sorted, start) - Physics.survivors(sorted, end) : '\u2014'}</td><td>${fmt(q.N0 * p, 2)}</td><td>${fmt(Math.sqrt(q.N0 * p * (1 - p)), 2)}</td></tr>`);
    }
    $('counts').innerHTML = rowsHtml.join('');
  }
  regenerate();
  timer = Lab.clock(draw, dt => { if (Math.abs(animationTime - q.time) > .02 || q.time >= 8) animationTime = q.time >= 8 ? 0 : q.time; animationTime = Math.min(8, animationTime + dt * .5); q.set('time', animationTime, false); return q.time < 8; }, () => { animationTime = 0; q.set('time', 0, false); });
  $('new-seed').onclick = () => q.set('seed', (q.seed + 1) % 1000000); $('band').onchange = draw;
  window.simulation = { kind: 'decay', params: q, state, draw, get lifetimes() { return times.slice(); } };
  Lab.math(); Lab.resize(draw); draw();
})();
