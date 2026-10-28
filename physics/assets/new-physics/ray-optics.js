/* Thin-lens rays use physical slopes; drawing scales may differ on each axis. */
(() => {
  'use strict';
  const { $, colors, fmt } = Lab;
  let phase = 0, elapsed = 0, geometry, dragging = null, timer;
  const q = Lab.controls([
    { id: 'f', label: 'Distancia focal |f|', unit: 'cm', min: 10, max: 80, step: .1, value: 40 },
    { id: 'u', label: 'Distancia del objeto', unit: 'cm', min: 5, max: 180, step: .1, value: 80 },
    { id: 'height', label: 'Altura del objeto', unit: 'cm', min: 2, max: 30, step: .1, value: 20 },
    { id: 'lensX', label: 'Posici\u00f3n de la lente', unit: 'cm', min: -30, max: 30, step: .1, value: 0 }
  ], id => {
    if (id === 'lensX' && geometry) {
      const objectX = geometry.objectX;
      const lensX = Math.max(-30, Math.min(30, objectX + 180, Math.max(objectX + 5, q.lensX)));
      q.set('lensX', lensX, false); q.set('u', q.lensX - objectX, false);
    }
    draw();
  });
  function state() { const f = $('type').value === 'converging' ? q.f : -q.f; return { f, ...Physics.lens(f, q.u, q.height) }; }
  function draw() {
    const s = Lab.surface('optics'), { ctx, width: w, height: h } = s;
    const xmin = -220, xmax = 220, top = 48, bottom = h - 58, axis = (top + bottom) / 2;
    const X = x => 20 + (x - xmin) / (xmax - xmin) * (w - 40), Y = y => axis - y * (bottom - top) / 110;
    geometry = { X, Y, xmin, xmax, width: w, axis, top, bottom, objectX: q.lensX - q.u };
    const a = state(), lx = q.lensX, ox = lx - q.u, ix = lx + a.v;
    Lab.text(ctx, 'Luz incidente: izquierda \u2192 derecha', 20, 17, colors.ink);
    Lab.line(ctx, X(xmin), axis, X(xmax), axis, '#9faeb8');
    for (let v = -200; v <= 200; v += w < 450 ? 100 : 50) {
      Lab.line(ctx, X(v), axis - 4, X(v), axis + 4, '#9faeb8');
      Lab.text(ctx, fmt(v), X(v), bottom + 21, colors.muted, 'center');
    }
    Lab.text(ctx, 'x (cm)', w - 20, h - 12, colors.muted, 'right');
    const leftFocus = lx - q.f, rightFocus = lx + q.f;
    for (const [x, label] of [[leftFocus, a.f > 0 ? 'F' : "F\u2032"], [rightFocus, a.f > 0 ? "F\u2032" : 'F']]) {
      Lab.dot(ctx, X(x), axis, colors.ink, 3); Lab.text(ctx, label, X(x), axis + 18, colors.ink, 'center');
    }
    ctx.save(); ctx.beginPath(); ctx.rect(20, top, w - 40, bottom - top); ctx.clip();
    const rays = [q.height, 0, -q.height * .5].map(y => Physics.ray(a.f, q.u, q.height, y));
    rays.forEach((r, j) => {
      const color = [colors.blue, colors.teal, colors.red][j]; ctx.lineWidth = 1.9;
      Lab.line(ctx, X(ox), Y(q.height), X(lx), Y(r.intercept), color);
      Lab.line(ctx, X(lx), Y(r.intercept), X(xmax), Y(r.intercept + r.outgoing * (xmax - lx)), color);
      if (!a.real && !a.singular && $('extensions').checked) {
        Lab.line(ctx, X(lx), Y(r.intercept), X(xmin), Y(r.intercept + r.outgoing * (xmin - lx)), color, [6, 5]);
      }
      // Direction arrows exist in the paused state too; moving dots are illustrative.
      const rx = lx + 35, ry = r.intercept + r.outgoing * 35;
      Lab.arrow(ctx, X(rx), Y(ry), X(rx + 9), Y(ry + r.outgoing * 9), color);
      if (phase > 0) {
        const xx = ox + phase * (xmax - ox);
        const yy = xx < lx ? q.height + r.incoming * (xx - ox) : r.intercept + r.outgoing * (xx - lx);
        Lab.dot(ctx, X(xx), Y(yy), color, 4);
      }
    });
    ctx.fillStyle = '#d9efed'; ctx.strokeStyle = '#008678'; ctx.lineWidth = 2;
    const x = X(lx), upper = Y(48), lower = Y(-48);
    ctx.beginPath();
    if (a.f > 0) { ctx.moveTo(x, upper); ctx.bezierCurveTo(x - 20, upper + 45, x - 20, lower - 45, x, lower); ctx.bezierCurveTo(x + 20, lower - 45, x + 20, upper + 45, x, upper); }
    else { ctx.moveTo(x - 12, upper); ctx.quadraticCurveTo(x + 5, axis, x - 12, lower); ctx.lineTo(x + 12, lower); ctx.quadraticCurveTo(x - 5, axis, x + 12, upper); ctx.closePath(); }
    ctx.globalAlpha = .7; ctx.fill(); ctx.globalAlpha = 1; ctx.stroke();
    Lab.arrow(ctx, X(ox), axis, X(ox), Y(q.height), colors.ink);
    Lab.dot(ctx, X(ox), Y(q.height), colors.ink, 5);
    if (!a.singular) Lab.arrow(ctx, X(ix), axis, X(ix), Y(a.imageHeight), '#b23c59', !a.real);
    ctx.restore();
    const imageVisible = !a.singular && ix >= xmin && ix <= xmax && Y(a.imageHeight) >= top && Y(a.imageHeight) <= bottom;
    function annotation(value, px, py, color, align) {
      const tw = ctx.measureText(value).width;
      const start = Math.max(21, Math.min(w - 21 - tw, align === 'right' ? px - tw : px));
      ctx.fillStyle = '#fff'; ctx.fillRect(start - 2, py - 8, tw + 4, 16);
      Lab.text(ctx, value, start, py, color);
    }
    const imageLeft = imageVisible && ix < ox;
    annotation('Objeto', X(ox) + (imageLeft ? 8 : -8), Math.max(top + 14, Y(q.height) - 17), colors.ink, imageLeft ? 'left' : 'right');
    Lab.text(ctx, 'Lente', x, top - 11, colors.teal, 'center');
    if (imageVisible) annotation(a.real ? 'Imagen real' : 'Imagen virtual', X(ix) + (imageLeft ? -8 : 8), Math.min(bottom - 10, Math.max(top + 10, Y(a.imageHeight) + (a.real ? 18 : -18))), '#a7344c', imageLeft ? 'right' : 'left');
    $('u-read').textContent = fmt(q.u) + ' cm'; $('v-read').textContent = a.singular ? '\u221e (sin imagen finita)' : fmt(a.v) + ' cm';
    $('m-read').textContent = a.singular ? 'No finito' : fmt(a.m); $('h-read').textContent = a.singular ? 'No finita' : fmt(a.imageHeight) + ' cm';
    $('outcome').textContent = a.singular ? 'Objeto en el foco: los tres rayos emergen paralelos. No se dibuja una imagen ficticia a distancia finita.' :
      `${a.real ? 'Imagen real e invertida' : 'Imagen virtual y derecha'}. ${Math.abs(a.m) > 1 + 1e-9 ? 'Mayor' : Math.abs(a.m) < 1 - 1e-9 ? 'Menor' : 'Igual'} que el objeto. ${imageVisible ? '' : 'La imagen queda fuera del campo visible.'}`;
  }
  timer = Lab.clock(draw, dt => { elapsed += dt; phase = (elapsed / 3) % 1; $('status').textContent = 'Sentido de propagaci\u00f3n (tiempo no f\u00edsico)'; if (elapsed >= 24) { elapsed = 0; $('status').textContent = 'Recorrido terminado'; return false; } }, () => {
    phase = 0; elapsed = 0; q.set('f', 40, false); q.set('u', 80, false); q.set('height', 20, false); q.set('lensX', 0, false); $('type').value = 'converging'; $('extensions').checked = true; $('status').textContent = 'Trazado est\u00e1tico';
  });
  $('type').onchange = draw; $('extensions').onchange = draw;
  const canvas = $('optics');
  function position(e) { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  canvas.addEventListener('pointerdown', e => {
    const p = position(e), g = geometry, ox = g.X(q.lensX - q.u), lx = g.X(q.lensX);
    if (Math.hypot(p.x - ox, p.y - g.Y(q.height)) < 30 || (Math.abs(p.x - ox) < 15 && p.y >= g.Y(q.height) && p.y <= g.axis)) dragging = 'object';
    else if (Math.abs(p.x - lx) < 23 && p.y > g.top && p.y < g.bottom) dragging = 'lens';
    if (dragging) { timer.stop(); canvas.setPointerCapture(e.pointerId); e.preventDefault(); }
  });
  canvas.addEventListener('pointermove', e => {
    if (!dragging) return; const p = position(e), g = geometry;
    const x = g.xmin + (p.x - 20) / (g.width - 40) * (g.xmax - g.xmin);
    if (dragging === 'object') { q.set('u', q.lensX - x, false); q.set('height', (g.axis - p.y) * 110 / (g.bottom - g.top), false); }
    else { const objectX = q.lensX - q.u; const newX = Math.max(-30, Math.min(30, objectX + 180, Math.max(objectX + 5, x))); q.set('lensX', newX, false); q.set('u', q.lensX - objectX, false); }
    draw();
  });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(event, () => { dragging = null; });
  window.simulation = { kind: 'optics', params: q, state, draw, get geometry() { return geometry; } };
  Lab.math(); Lab.resize(draw); draw();
})();
