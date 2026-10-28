(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const colors = { blue: '#1268c4', teal: '#008678', red: '#bc4256', ink: '#172b3a', muted: '#566c7b', line: '#dce5ea' };
  function fmt(n, digits = 3) {
    if (!Number.isFinite(n)) return n === Infinity ? '\u221e' : '\u2014';
    if (n === 0) return '0';
    if (Math.abs(n) < .001 || Math.abs(n) >= 1e6) return n.toExponential(2).replace('.', ',');
    return new Intl.NumberFormat('es-ES', { maximumFractionDigits: digits }).format(n);
  }
  function tickLabel(n) {
    if (n === 0) return '0';
    if (Math.abs(n) >= 10000 || Math.abs(n) < .001) return n.toExponential(1).replace('.', ',');
    return new Intl.NumberFormat('es-ES', { maximumSignificantDigits: 3, useGrouping: false }).format(n);
  }
  function controls(specs, changed) {
    const values = {};
    for (const spec of specs) {
      const { id, min, max, step, value, label, unit = '' } = spec;
      values[id] = value;
      const wrapper = document.createElement('div'); wrapper.className = 'control';
      wrapper.innerHTML = `<div class="control-top"><label for="${id}">${label}</label><div class="value-wrap"><input id="${id}-value" type="text" inputmode="decimal" aria-label="${label}: valor" spellcheck="false"><span>${unit}</span></div></div><input id="${id}" type="range" min="${min}" max="${max}" step="${step}" aria-label="${label}">`;
      $(spec.host || 'controls').appendChild(wrapper);
      const slider = $(id), editor = $(id + '-value');
      function set(raw, notify = true) {
        const n = Number(String(raw).trim().replace(',', '.'));
        if (String(raw).trim() === '' || !Number.isFinite(n)) {
          editor.setAttribute('aria-invalid', 'true'); $('input-error').textContent = 'Introduce un valor num\u00e9rico.'; return false;
        }
        const v = Math.min(max, Math.max(min, Math.round((n - min) / step) * step + min));
        values[id] = Number(v.toFixed(9)); slider.value = values[id];
        editor.value = String(values[id]).replace('.', ','); editor.removeAttribute('aria-invalid');
        $('input-error').textContent = n < min || n > max ? `Rango: ${fmt(min)} a ${fmt(max)} ${unit}.` : '';
        if (notify) changed(id); return true;
      }
      slider.addEventListener('input', () => set(slider.value));
      editor.addEventListener('change', () => set(editor.value));
      editor.addEventListener('keydown', e => {
        if (e.key === 'Enter') { set(editor.value); editor.blur(); }
        if (e.key === 'Escape') { set(values[id], false); editor.blur(); }
      });
      spec.set = set; set(value, false);
    }
    values.set = (id, value, notify = true) => specs.find(s => s.id === id).set(value, notify);
    return values;
  }
  function icons() { if (window.lucide) window.lucide.createIcons(); }
  function clock(draw, advance, reset) {
    let running = false, previous = 0, frame = null;
    function label() {
      $('play').innerHTML = `<i data-lucide="${running ? 'pause' : 'play'}"></i>${running ? 'Pausar' : 'Iniciar'}`;
      $('play').setAttribute('aria-pressed', String(running)); icons();
    }
    function tick(now) {
      if (!running) return;
      const dt = previous ? Math.min((now - previous) / 1000, .1) : 0; previous = now;
      const keep = advance(dt); draw();
      if (keep === false) { running = false; frame = null; label(); }
      else frame = requestAnimationFrame(tick);
    }
    function stop() { running = false; if (frame !== null) cancelAnimationFrame(frame); frame = null; previous = 0; label(); }
    $('play').onclick = () => { if (running) stop(); else { running = true; previous = 0; label(); frame = requestAnimationFrame(tick); } };
    $('reset').onclick = () => { stop(); reset(); draw(); };
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
    label(); return { stop, get running() { return running; } };
  }
  function surface(id) {
    const canvas = $(id), ctx = canvas.getContext('2d'), rect = canvas.getBoundingClientRect();
    const width = rect.width, height = rect.height, ratio = Math.min(devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
      canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    }
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0); ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, width, height);
    ctx.font = '12px system-ui'; ctx.textBaseline = 'middle'; ctx.lineWidth = 1;
    return { canvas, ctx, width, height };
  }
  function line(ctx, x1, y1, x2, y2, color = colors.ink, dash = []) {
    ctx.strokeStyle = color; ctx.setLineDash(dash); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.setLineDash([]);
  }
  function dot(ctx, x, y, color, r = 4) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.fill(); }
  function text(ctx, value, x, y, color = colors.muted, align = 'left') { ctx.fillStyle = color; ctx.textAlign = align; ctx.fillText(value, x, y); }
  function arrow(ctx, x1, y1, x2, y2, color, dashed = false) {
    ctx.lineWidth = 2; line(ctx, x1, y1, x2, y2, color, dashed ? [5, 4] : []);
    const a = Math.atan2(y2 - y1, x2 - x1), length = 8;
    line(ctx, x2, y2, x2 - length * Math.cos(a - .45), y2 - length * Math.sin(a - .45), color);
    line(ctx, x2, y2, x2 - length * Math.cos(a + .45), y2 - length * Math.sin(a + .45), color);
  }
  function chart(id, opts) {
    const s = surface(id), { ctx, width, height } = s;
    const pad = { l: width < 430 ? 59 : 70, r: 17, t: 33, b: 47 };
    const left = pad.l, right = width - pad.r, top = pad.t, bottom = height - pad.b;
    const X = value => left + (value - opts.xmin) / (opts.xmax - opts.xmin) * (right - left);
    const Y = value => bottom - (value - opts.ymin) / (opts.ymax - opts.ymin) * (bottom - top);
    const count = width < 430 ? 3 : 5;
    for (let i = 0; i <= count; i++) {
      const v = opts.xmin + (opts.xmax - opts.xmin) * i / count, x = X(v);
      line(ctx, x, top, x, bottom, colors.line);
      text(ctx, opts.xformat ? opts.xformat(v) : tickLabel(v), x, bottom + 17, colors.muted, i === count ? 'right' : 'center');
    }
    for (let i = 0; i <= 4; i++) {
      const v = opts.ymin + (opts.ymax - opts.ymin) * i / 4, y = Y(v);
      line(ctx, left, y, right, y, colors.line);
      text(ctx, tickLabel(v), left - 8, y, colors.muted, 'right');
    }
    text(ctx, opts.ylabel, left, 13, colors.ink);
    text(ctx, opts.xlabel, (left + right) / 2, height - 9, colors.ink, 'center');
    line(ctx, left, top, left, bottom); line(ctx, left, bottom, right, bottom);
    function clip(fn) { ctx.save(); ctx.beginPath(); ctx.rect(left, top, right - left, bottom - top); ctx.clip(); fn(); ctx.restore(); }
    function curve(fn, color, dash = []) {
      clip(() => { ctx.strokeStyle = color; ctx.lineWidth = 2.3; ctx.setLineDash(dash); ctx.beginPath();
        for (let i = 0; i <= 500; i++) { const x = opts.xmin + (opts.xmax - opts.xmin) * i / 500; const y = fn(x); if (i === 0) ctx.moveTo(X(x), Y(y)); else ctx.lineTo(X(x), Y(y)); } ctx.stroke(); });
    }
    return { ...s, X, Y, left, right, top, bottom, clip, curve };
  }
  function math() {
    document.querySelectorAll('[data-tex]').forEach(el => {
      if (window.katex) katex.render(el.dataset.tex, el, { throwOnError: true, displayMode: true });
      else el.textContent = el.dataset.tex;
    });
  }
  function resize(draw) { let pending; window.addEventListener('resize', () => { cancelAnimationFrame(pending); pending = requestAnimationFrame(draw); }); }
  window.Lab = { $, colors, fmt, controls, clock, surface, line, dot, text, arrow, chart, math, resize, icons };
})();
