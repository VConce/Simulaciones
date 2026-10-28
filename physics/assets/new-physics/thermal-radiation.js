(() => {
  'use strict';
  const { $, fmt, colors } = Lab; let timer, animationProgress = 100;
  const q = Lab.controls([
    { id: 'target', label: 'Temperatura final T', unit: 'K', min: 100, max: 10000, step: 1, value: 3000 },
    { id: 'reference', label: 'Referencia T\u2080', unit: 'K', min: 100, max: 10000, step: 1, value: 2000 },
    { id: 'area', label: '\u00c1rea emisora A', unit: 'm\u00b2', min: .01, max: 20, step: .01, value: 1 },
    { id: 'epsilon', label: 'Emisividad \u03b5', unit: '', min: 0, max: 1, step: .01, value: 1 },
    { id: 'ambient', label: 'Temperatura del entorno', unit: 'K', min: 0, max: 2000, step: 1, value: 300 },
    { id: 'progress', label: 'Recorrido entre T\u2080 y T', unit: '%', min: 0, max: 100, step: .1, value: 100 }
  ], id => { if (timer) timer.stop(); if (id === 'target' || id === 'reference') q.set('progress', 100, false); draw(); });
  function state() { const T = q.reference + (q.target - q.reference) * q.progress / 100; return { T, ...Physics.radiation(T, q.area, q.epsilon, q.ambient) }; }
  function draw() {
    const a = state(), reference = Physics.radiation(q.reference, q.area, q.epsilon, q.ambient), logarithmic = $('scale').value === 'log';
    const upper = Math.max(Physics.wien / Math.min(q.reference, q.target) * 1e6 * 4, 1);
    const fromAxis = x => logarithmic ? 10 ** x : x, toAxis = x => logarithmic ? Math.log10(x) : x;
    const min = logarithmic ? Math.log10(.05) : 0, max = logarithmic ? Math.log10(200) : upper;
    const maxSpectrum = Math.max(Physics.planck(a.peak, a.T, q.epsilon), Physics.planck(reference.peak, q.reference, q.epsilon)) * 1e-6;
    const ymax = maxSpectrum > 0 ? maxSpectrum * 1.13 : 1;
    const plot = Lab.chart('spectrum', { xmin: min, xmax: max, ymin: 0, ymax, xlabel: logarithmic ? '\u03bb (\u00b5m), escala log' : '\u03bb (\u00b5m)', ylabel: 'M\u03bb (W m\u207b\u00b2 \u00b5m\u207b\u00b9)', xformat: x => fmt(fromAxis(x), 2) });
    const { ctx, X, Y } = plot;
    plot.clip(() => { ctx.fillStyle = '#e7f3e9'; ctx.fillRect(X(toAxis(.38)), plot.top, X(toAxis(.78)) - X(toAxis(.38)), plot.bottom - plot.top); });
    // More samples on a linear axis retain very narrow hot peaks beside cold references.
    function spectrumCurve(T, color, dash) {
      plot.clip(() => { ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 2.4; ctx.setLineDash(dash);
        const xs = [];
        for (let i = 0; i <= 800; i++) xs.push(min + (max - min) * i / 800);
        const peak = Physics.wien / T * 1e6;
        for (let i = 1; i <= 400; i++) { const x = toAxis(peak * i / 100); if (x >= min && x <= max) xs.push(x); }
        xs.sort((a, b) => a - b);
        xs.forEach((x, i) => { const y = Physics.planck(fromAxis(x) * 1e-6, T, q.epsilon) * 1e-6; if (i === 0) ctx.moveTo(X(x), Y(y)); else ctx.lineTo(X(x), Y(y)); }); ctx.stroke();
      });
    }
    spectrumCurve(q.reference, colors.red, [6, 5]); spectrumCurve(a.T, colors.blue, []);
    if (q.epsilon > 0) {
      const peakX = X(toAxis(a.peak * 1e6)); Lab.line(ctx, peakX, plot.top, peakX, plot.bottom, colors.blue, [3, 5]);
      Lab.dot(ctx, peakX, Y(Physics.planck(a.peak, a.T, q.epsilon) * 1e-6), colors.blue, 4);
    }
    $('spectrum-label').textContent = 'T = ' + fmt(a.T, 1) + ' K';
    $('t-read').textContent = fmt(a.T, 1) + ' K'; $('delta-read').textContent = '\u0394T = ' + fmt(a.T - q.reference, 1) + ' K respecto a T\u2080';
    $('peak-read').textContent = q.epsilon > 0 ? fmt(a.peak * 1e6, 4) + ' \u00b5m' : 'Sin emisi\u00f3n';
    $('power-read').textContent = fmt(a.emitted, 2) + ' W'; $('net-read').textContent = fmt(a.net, 2) + ' W';
    $('absorbed-read').textContent = 'Absorbida: ' + fmt(a.absorbed, 2) + ' W';
    $('status').textContent = 'Recorrido: ' + fmt(q.progress, 1) + ' % (sin tiempo f\u00edsico)';
    $('outcome').textContent = q.epsilon === 0 ? 'Emisividad cero: no se emite ni se absorbe radiaci\u00f3n en este modelo gris.' :
      a.net === 0 ? 'Equilibrio radiativo: la emisi\u00f3n iguala a la absorci\u00f3n; ambas pueden ser distintas de cero.' :
      a.net > 0 ? 'Transferencia radiativa neta del cuerpo al entorno. La temperatura est\u00e1 impuesta, no se calcula un enfriamiento.' :
      'Transferencia radiativa neta del entorno al cuerpo (potencia hacia fuera negativa).';
    $('comparison').innerHTML = `<tr><td>Referencia</td><td>${fmt(q.reference)}</td><td>${fmt(reference.emitted, 2)}</td><td>${q.epsilon ? '1' : '\u2014'}</td></tr><tr><td>Actual</td><td>${fmt(a.T, 1)}</td><td>${fmt(a.emitted, 2)}</td><td>${q.epsilon ? fmt((a.T / q.reference) ** 4, 4) : '\u2014'}</td></tr>`;
    $('spectrum').onpointermove = e => {
      const r = $('spectrum').getBoundingClientRect(), fraction = Math.max(0, Math.min(1, (e.clientX - r.left - plot.left) / (plot.right - plot.left))), wavelength = fromAxis(min + fraction * (max - min));
      $('cursor-data').textContent = '\u03bb = ' + fmt(wavelength, 3) + ' \u00b5m; M\u03bb = ' + fmt(Physics.planck(wavelength * 1e-6, a.T, q.epsilon) * 1e-6, 3) + ' W m\u207b\u00b2 \u00b5m\u207b\u00b9';
    };
  }
  timer = Lab.clock(draw, dt => { if (Math.abs(animationProgress - q.progress) > .15 || q.progress >= 100) animationProgress = q.progress >= 100 ? 0 : q.progress; animationProgress = Math.min(100, animationProgress + dt * 12.5); q.set('progress', animationProgress, false); return q.progress < 100; }, () => { animationProgress = 0; q.set('progress', 0, false); });
  $('scale').onchange = draw;
  window.simulation = { kind: 'thermal', params: q, state, draw };
  Lab.math(); Lab.resize(draw); draw();
})();
