"use strict";

const HORIZON_MAGNIFICATION = 34 * LENGTH_UNIT / GravityModel.schwarzschildRadius(6 * SUN);
const horizonStatus = $('horizonStatus');
const blackHoleScale = $('blackHoleScale');
const captureTrailLimit = 8;
const blackHoleSprite = new Image();
const backgroundCanvas = makeC(1);
let gravityViewDirty = true;
let lastReadout = -Infinity;
let lastMode3D;
let captures = [];
let captureCount = 0;
let example = '';
let numericalSlowdown = false;

function horizonRadius(o, multiplier = +ui.power.value) {
  const zoom = blackHoleScale.value === 'expanded' ? HORIZON_MAGNIFICATION : 1;
  return GravityModel.schwarzschildRadius(o.mass) * multiplier * zoom / LENGTH_UNIT;
}

function resetCaptures() {
  captures = [];
  captureCount = 0;
  example = '';
  numericalSlowdown = false;
}

function captureCrossings(boundaries, previous) {
  if (!boundaries.length) return;
  for (const o of st.objs) {
    if (!o.alive || o.type === 'blackhole') continue;
    const p = previous?.get(o) ?? o;
    let entry = null;
    for (const { source, radius } of boundaries) {
      const center = previous?.get(source) ?? source;
      const t = GravityModel.horizonEntry(p.x - center.x, p.y - center.y, o.x - source.x, o.y - source.y, radius);
      if (t !== null && (!entry || t < entry.t)) entry = { t, source };
    }
    if (!entry) continue;
    const point = { x: p.x + entry.t * (o.x - p.x), y: p.y + entry.t * (o.y - p.y) };
    o.alive = false;
    captureCount++;
    captures.push({ name: o.name, source: entry.source.name, point, trail: [...o.trail.slice(-600), point] });
    if (captures.length > captureTrailLimit) captures.shift();
    if (st.active === o.id) {
      st.active = entry.source.id;
      hideMenus();
    }
  }
  if (st.objs.some(o => !o.alive)) st.objs = st.objs.filter(o => o.alive);
}

function gravitySubstep(dt, boundaries) {
  const previous = boundaries.length ? new Map(st.objs.map(o => [o, { x: o.x, y: o.y }])) : null;
  const movers = st.objs.filter(o => !o.fixed && !o.moonLock);
  const half = dt * 0.5;
  const before = movers.map(o => acc(o.x, o.y, o));
  movers.forEach((o, i) => {
    o.vx += before[i].ax * half;
    o.vy += before[i].ay * half;
    o.x += o.vx * dt;
    o.y += o.vy * dt;
  });
  updateMoonLocks(dt);
  captureCrossings(boundaries, previous);
  const after = movers.map(o => o.alive ? acc(o.x, o.y, o) : null);
  movers.forEach((o, i) => {
    if (!after[i]) return;
    o.vx += after[i].ax * half;
    o.vy += after[i].ay * half;
    recordGravityTrail(o, dt);
  });
  elapsed += dt;
  if ($('mergeBodies').checked) collisions();
}

function gravityStep(dt) {
  if (!ui.dynamic.checked || dt <= 0) return 0;
  const multiplier = +ui.power.value;
  const boundaries = multiplier === 0 ? [] : st.objs.filter(o => o.type === 'blackhole')
    .map(source => ({ source, radius: horizonRadius(source, multiplier) }));
  captureCrossings(boundaries);
  let remaining = dt;
  // Bound work per frame. Keeping the trajectory accurate takes priority over
  // the requested playback speed during a very close encounter.
  for (let i = 0; i < 160 && remaining > dt * 1e-10; i++) {
    let h = Math.min(remaining, 0.002);
    for (let j = 0; j < st.objs.length; j++) {
      const a = st.objs[j];
      for (let k = j + 1; k < st.objs.length; k++) {
        const b = st.objs[k];
        if (a.fixed && b.fixed) continue;
        const distance2 = (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
        const relativeSpeed = Math.hypot(a.vx - b.vx, a.vy - b.vy);
        const mu = G * multiplier * (mE(a) + mE(b));
        if (boundaries.length && (a.type === 'blackhole' || b.type === 'blackhole')) {
          const r = Math.sqrt(distance2);
          if (r > 0 && mu > 0) h = Math.min(h, 0.035 * Math.sqrt(r ** 3 / mu), 0.035 * r / (relativeSpeed || 1));
        } else if (mu > 0) {
          h = Math.min(h, 0.025 * Math.sqrt((distance2 + SOFTENING ** 2) ** 1.5 / mu));
        }
      }
    }
    if (!(h > 0) || h < Number.EPSILON * remaining) break;
    gravitySubstep(h, boundaries);
    remaining -= h;
  }
  numericalSlowdown = remaining > dt * 0.01;
  return dt - Math.max(0, remaining);
}

function startHorizonExample(mode) {
  hideMenus();
  resetCaptures();
  elapsed = 0;
  st.objs = [];
  st.view.zoom = 1;
  ui.power.value = 1;
  ui.time.value = 0.25;
  blackHoleScale.value = 'expanded';
  gravitySnapSuspended++;
  try {
    const hole = add('blackhole', W / 2, H / 2);
    const rs = horizonRadius(hole);
    const mu = G * mE(hole);
    const radius = rs * ({ stable: 4.5, fall: 5.4, flyby: 2.8 })[mode];
    const ship = add('ship', hole.x + radius, hole.y);
    if (mode === 'stable') ship.vy = -GravityModel.circularRate(radius, mu, rs);
    if (mode === 'flyby') ship.vy = Math.sqrt(2.5 * mu / (radius - rs));
    st.view.zoom = Math.min(1, Math.min(W, H) * 0.35 / (4.5 * rs));
    st.gridSnap.origin = { x: hole.x, y: hole.y };
    centerMainStar();
  } finally {
    gravitySnapSuspended--;
  }
  example = {
    stable: 'Órbita circular a 4.5 rₛ, fuera de la última órbita estable.',
    fall: 'Caída radial desde el reposo. Sigue la nave hasta el horizonte.',
    flyby: 'Sobrevuelo con periastro a 2.8 rₛ y energía suficiente para escapar.'
  }[mode];
  ui.dynamic.checked = true;
  st.last = performance.now();
  render();
}

function updateHorizonReadouts() {
  const active = st.objs.find(o => o.id === st.active);
  const hole = active?.type === 'blackhole' ? active : st.objs.find(o => o.type === 'blackhole');
  $('blackHoleControls').hidden = !hole;
  $('horizonExampleNote').textContent = example;
  $('horizonExampleNote').hidden = !example;
  if (hole) {
    const rKm = GravityModel.schwarzschildRadius(hole.mass) / 1000;
    const visible = blackHoleScale.value === 'expanded';
    $('horizonInfo').textContent = 'Radio físico (G real): ' + rKm.toPrecision(4) + ' km. ' +
      (visible ? 'Radio ampliado en el tablero. Las distancias cercanas se leen en rₛ.' : 'Escala astronómica: el horizonte puede ocupar menos de un píxel.');
  }
  const last = captures.at(-1);
  const text = last ? last.name + ' cruzó el horizonte de ' + last.source + ' · Capturas: ' + captureCount
    : hole ? (+ui.power.value === 0 ? 'Campo desactivado' : 'Halo amarillo · Horizonte de sucesos') : '';
  horizonStatus.hidden = !text;
  if (horizonStatus.textContent !== text) horizonStatus.textContent = text;
}

function paintGravitySky() {
  if (backgroundCanvas.width !== W || backgroundCanvas.height !== H) {
    backgroundCanvas.width = W;
    backgroundCanvas.height = H;
    const sky = backgroundCanvas.getContext('2d');
    sky.fillStyle = '#020611';
    sky.fillRect(0, 0, W, H);
    const size = 38;
    for (let j = 0; j * size < H; j++) {
      for (let i = 0; i * size < W; i++) {
        const seed = i * 928371 + j * 364479 + 17;
        if (starRand(seed) <= 0.34) continue;
        sky.fillStyle = 'rgba(225,237,255,' + (0.2 + 0.6 * starRand(seed + 4)) + ')';
        sky.beginPath();
        sky.arc((i + starRand(seed + 1)) * size, (j + starRand(seed + 2)) * size, 0.6 + 1.15 * starRand(seed + 3), 0, 2 * Math.PI);
        sky.fill();
      }
    }
  }
  ctx.drawImage(backgroundCanvas, 0, 0);
}

function drawBlackHoleSprite(point, size) {
  if (blackHoleSprite.complete && blackHoleSprite.naturalWidth) {
    ctx.drawImage(blackHoleSprite, point.x - size / 2, point.y - size / 2, size, size);
  } else {
    ctx.beginPath();
    ctx.arc(point.x, point.y, size * 0.36, 0, 2 * Math.PI);
    ctx.fillStyle = '#080b12';
    ctx.fill();
  }
}

function traceHorizon(o, project, center) {
  const radius = horizonRadius(o);
  if (radius <= 0) return;
  ctx.save();
  ctx.beginPath();
  if (radius * st.view.zoom < 1.5) {
    ctx.arc(center.x, center.y, 2.5, 0, 2 * Math.PI);
  } else {
    const points = 72;
    for (let i = 0; i <= points; i++) {
      const angle = i * 2 * Math.PI / points;
      const p = project(o.x + radius * Math.cos(angle), o.y + radius * Math.sin(angle));
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
  }
  ctx.strokeStyle = 'rgba(253,187,41,.25)';
  ctx.lineWidth = 7;
  ctx.stroke();
  ctx.strokeStyle = '#ffe384';
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.restore();
}

function paintRecordedCaptures(project) {
  if (!ui.trails.checked) return;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,189,88,.7)';
  ctx.fillStyle = '#ffdf91';
  ctx.lineWidth = 1.6;
  for (const { trail, point } of captures) {
    if (!trail.length) continue;
    ctx.beginPath();
    trail.forEach((item, i) => {
      const p = project(item.x, item.y);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
    const p = project(point.x, point.y);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, 2 * Math.PI);
    ctx.fill();
  }
  ctx.restore();
}

function gravitySurface3D() {
  space();
  const cx = st.view.cx, cy = st.view.cy;
  const project = (x, y) => pr(p3(x, y));
  if (!st.gridSnap.enabled) {
    const span = Math.max(520 / st.view.zoom, Math.min(1600, st.objs.reduce((m, o) =>
      Math.max(m, Math.abs(o.x - cx), Math.abs(o.y - cy)), 0) + 260 / st.view.zoom));
    const divisions = W < 560 ? 38 : 54;
    const step = 2 * span / divisions;
    const mesh = Array.from({ length: divisions + 1 }, (_, y) => Array.from({ length: divisions + 1 }, (_, x) =>
      project(cx - span + x * step, cy - span + y * step)));
    ctx.beginPath();
    for (let i = 0; i <= divisions; i += 2) {
      ctx.moveTo(mesh[i][0].x, mesh[i][0].y);
      for (let j = 1; j <= divisions; j++) ctx.lineTo(mesh[i][j].x, mesh[i][j].y);
      ctx.moveTo(mesh[0][i].x, mesh[0][i].y);
      for (let j = 1; j <= divisions; j++) ctx.lineTo(mesh[j][i].x, mesh[j][i].y);
    }
    ctx.strokeStyle = 'rgba(72,170,220,.42)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  if (ui.field.checked) paintGravityField3D(project);
  if (ui.trails.checked) {
    ctx.strokeStyle = 'rgba(152,205,255,.5)';
    ctx.lineWidth = 1.6;
    for (const o of st.objs) {
      const stride = Math.max(1, Math.ceil(o.trail.length / 220));
      ctx.beginPath();
      for (let i = 0; i < o.trail.length; i += stride) {
        const p = project(o.trail[i].x, o.trail[i].y);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }
  }
  const drawn = st.objs.map(o => ({ o, p: pr(body3Point(o)) })).sort((a, b) => a.p.s - b.p.s);
  for (const { o, p } of drawn) {
    const radius = o.type === 'blackhole' ? horizonRadius(o) : o.radius;
    const size = Math.max(12, Math.min(2 * Math.max(W, H), radius * 2 * p.s));
    let labelOffset = size / 2;
    if (o.type === 'blackhole') {
      drawBlackHoleSprite(p, size);
      traceHorizon(o, project, p);
    } else {
      labelOffset = paintGravityBody(o, p, size);
    }
    if (ui.labels.checked) gravityLabel(o.name, p.x, p.y + 14 + labelOffset);
  }
  paintRecordedCaptures(project);
}

function paintGravityField3D(project) {
  const span = 440 / st.view.zoom;
  for (let i = -5; i <= 5; i++) {
    for (let j = -5; j <= 5; j++) {
      const x = st.view.cx + i * span / 5, y = st.view.cy + j * span / 5;
      const g = acc(x, y, null), length = Math.hypot(g.ax, g.ay);
      if (length < 1e-12) continue;
      const start = project(x, y);
      const end = project(x + g.ax / length * 19 / st.view.zoom, y + g.ay / length * 19 / st.view.zoom);
      arrow(start.x, start.y, end.x - start.x, end.y - start.y, 'rgba(180,225,255,.72)', 1.2);
    }
  }
}

function gravityLabel(text, x, y) {
  ctx.fillStyle = '#e5edf7';
  ctx.font = '800 12px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText(text, x, y);
}

function requestGravityRender() {
  gravityViewDirty = true;
}

function loadGravityTheory() {
  if (loadGravityTheory.started) return;
  loadGravityTheory.started = true;
  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = '../shared/katex/katex.min.css';
  const script = document.createElement('script');
  script.src = '../shared/katex/katex.min.js';
  script.onload = () => {
    for (const element of document.querySelectorAll('.formula[data-tex]')) {
      katex.render(element.dataset.tex, element, { displayMode: true, throwOnError: false });
    }
  };
  script.onerror = () => { loadGravityTheory.started = false; };
  document.head.append(css, script);
}

blackHoleSprite.onload = () => { requestGravityRender(); };
blackHoleSprite.src = 'assets/gravity-black-hole.webp';
for (const button of document.querySelectorAll('[data-gravity-example]')) {
  button.onclick = () => startHorizonExample(button.dataset.gravityExample);
}
blackHoleScale.onchange = () => { example = ''; clearTrails(); render(); };
for (const event of ['input', 'change', 'click', 'focusout', 'keydown', 'pointerdown', 'pointerup', 'pointercancel', 'drop', 'wheel', 'contextmenu']) {
  document.addEventListener(event, requestGravityRender, { passive: true, capture: true });
}
document.addEventListener('pointermove', () => {
  if (st.drag || st.camDrag) requestGravityRender();
}, { passive: true });
new ResizeObserver(() => { resizeCanvas(); requestGravityRender(); }).observe(stage);
sprites();
initTools();
resizeCanvas();
setup();
makeSideOutputsEditable();
centerMainStar();
render();
requestAnimationFrame(tick);
