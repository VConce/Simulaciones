'use strict';

const lightSpeed = 299792458;
const initial = { angle: 0, armA: 11, armB: 11, speed: 30, wavelength: 550, detectorRate: 1 };
const $ = id => document.getElementById(id);
const model = {
  ...initial,
  ether: false,
  slow: false,
  emission: 'stream',
  playing: !matchMedia('(prefers-reduced-motion: reduce)').matches
};
const photons = ['#73e4f5', '#ffd68b'];
const degrees = Math.PI / 180;
const wrapAngle = n => (n % 360 + 360) % 360;
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

function measure(angle, lengthA, lengthB, speedKmPerSecond, wavelengthNm) {
  const theta = angle * degrees;
  const beta = speedKmPerSecond * 1000 / lightSpeed;
  const cos = Math.cos(theta), sin = Math.sin(theta), betaSquared = beta * beta;
  const rootA = Math.sqrt(1 - betaSquared * sin * sin);
  const rootB = Math.sqrt(1 - betaSquared * cos * cos);
  const divisor = lightSpeed * (1 - betaSquared);
  const times = [
    [lengthA * (rootA + beta * cos) / divisor, lengthA * (rootA - beta * cos) / divisor],
    [lengthB * (rootB + beta * sin) / divisor, lengthB * (rootB - beta * sin) / divisor]
  ];
  // Rationalize the difference of roots. The ether contribution is of order β².
  const delta = 2 * ((lengthA - lengthB) * rootB + lengthA * betaSquared * Math.cos(2 * theta) / (rootA + rootB)) / divisor;
  const fringeScale = lightSpeed / (wavelengthNm * 1e-9);
  return { times, delta, fringe: delta * fringeScale, fringeScale };
}

const board = $('apparatus');
const ctx = board.getContext('2d');
const detector = $('fringes');
const fringeCtx = detector.getContext('2d');
const impactLayer = document.createElement('canvas');
impactLayer.width = detector.width;
impactLayer.height = detector.height;
const impactCtx = impactLayer.getContext('2d');
const fringeSpacing = 115;
const tau = 2 * Math.PI;
let hitCount = 0;
let showPattern = false;
const lab = document.querySelector('.lab-view');
const images = {};
const center = 320;
const streamInterval = .85;
const commonLegDuration = .30;
const travelTimeScale = lightSpeed / 9;
const detectionFlash = .21;
let sceneTime = 0, previousTime = performance.now(), frameId = 0, drag = null, current;
let emissionStart = 0;
let detectedAt = null;
let streamHitCredit = 1;

const optics = {
  mesa: 'michelson-mesa.webp',
  espejo: 'michelson-espejo.webp',
  fuente: 'michelson-fuente.webp',
  divisor: 'michelson-divisor.webp',
  detector: 'michelson-placa.webp'
};
for (const [name, src] of Object.entries(optics)) {
  const img = new Image();
  images[name] = img;
  img.addEventListener('load', renderBoard);
  img.src = src;
}
const pulse = new Image();
pulse.src = 'pulso-optico.webp';
pulse.addEventListener('load', renderBoard);

function update() {
  const speed = model.ether ? model.speed : 0;
  current = measure(model.angle, model.armA, model.armB, speed, model.wavelength);
  const zero = measure(0, model.armA, model.armB, speed, model.wavelength);
  const shifted = (current.delta - zero.delta) * current.fringeScale;
  const [armA, armB] = current.times.map(legs => legs[0] + legs[1]);
  for (const name of Object.keys(initial)) $(name).value = model[name];
  $('angleOut').value = model.angle + '°';
  $('armAOut').value = model.armA.toFixed(1) + ' m';
  $('armBOut').value = model.armB.toFixed(1) + ' m';
  $('speedOut').value = model.speed + ' km/s';
  $('lambdaOut').value = model.wavelength + ' nm';
  $('detectorRateOut').value = model.detectorRate === 1 ? '1 fotón/s' : model.detectorRate + ' fotones/s';
  $('timeA').textContent = (armA * 1e9).toFixed(6) + ' ns';
  $('timeB').textContent = (armB * 1e9).toFixed(6) + ' ns';
  $('timeDifference').textContent = (current.delta === 0 ? '0' : (current.delta * 1e15).toFixed(3)) + ' fs';
  $('fringeShift').textContent = (Math.abs(shifted) < .0005 ? '0.000' : shifted.toFixed(3)) + ' franjas';
  $('fog').hidden = $('wind').hidden = !model.ether;
  $('speed').disabled = !model.ether;
  $('modelLabel').textContent = model.ether ? 'Hipótesis histórica · éter clásico' : 'En el laboratorio · luz isotrópica';
  $('ether').setAttribute('aria-pressed', model.ether);
  $('slow').setAttribute('aria-pressed', model.slow);
  $('play').textContent = model.playing ? 'Pausar' : 'Reanudar';
  $('play').disabled = $('stop').disabled = model.emission === 'stopped';
  $('single').setAttribute('aria-disabled', model.emission === 'single');
  $('stream').setAttribute('aria-pressed', model.emission === 'stream');
  const status = {
    stream: model.playing ? 'Chorro continuo en marcha.' : 'Chorro continuo en pausa.',
    single: model.playing
      ? 'Un fotón en camino. Tras el divisor se muestran sus dos recorridos posibles.'
      : 'Fotón en pausa. Pulsa «Reanudar» para seguir su recorrido.',
    stopped: 'Emisión detenida.'
  }[model.emission];
  if ($('emissionStatus').textContent !== status) $('emissionStatus').textContent = status;
  lab.classList.toggle('paused', !model.playing);
  drawFringes();
  renderBoard();
}

function fringeIntensity(x, phase) {
  return .5 + .5 * Math.cos(tau * (x / fringeSpacing - phase));
}

function wavelengthHue(wavelength) {
  const f = (wavelength - 450) / 230;
  return f < .42 ? 215 - 115 * f / .42 : 100 - 97 * (f - .42) / .58;
}

function drawFringes() {
  const w = detector.width, h = detector.height;
  const impactsLabel = 'Puntos de impacto de los fotones en el detector';
  const patternLabel = 'Patrón de interferencia de los dos haces';
  $('clearHits').setAttribute('aria-disabled', hitCount === 0);
  $('pattern').setAttribute('aria-pressed', showPattern);
  const label = hitCount === 1 ? '1 fotón detectado' : hitCount + ' fotones detectados';
  if ($('hitCount').value !== label) $('hitCount').value = label;
  const note = showPattern
    ? 'Patrón previsto para la configuración actual. Pulsa de nuevo para volver a los impactos acumulados.'
    : 'Las franjas se forman al acumularse los impactos. Si cambias el montaje, borra los puntos para empezar otra medida.';
  if ($('detectorNote').textContent !== note) $('detectorNote').textContent = note;
  detector.setAttribute('aria-label', showPattern ? patternLabel : impactsLabel);
  if (!showPattern) {
    fringeCtx.clearRect(0, 0, w, h);
    fringeCtx.drawImage(impactLayer, 0, 0);
    return;
  }
  const phase = current.fringe % 1;
  const hue = wavelengthHue(model.wavelength);
  for (let x = 0; x < w; x++) {
    const intensity = fringeIntensity(x, phase);
    fringeCtx.fillStyle = 'hsl(' + hue + ' 75% ' + (3 + 58 * intensity ** 1.6) + '%)';
    fringeCtx.fillRect(x, 0, 1, h);
  }
  fringeCtx.strokeStyle = '#ffffff90';
  fringeCtx.lineWidth = 1;
  fringeCtx.beginPath();
  fringeCtx.moveTo(w / 2, 0);
  fringeCtx.lineTo(w / 2, h);
  fringeCtx.stroke();
}

function recordImpact() {
  // A detection lands at one point. The fringe intensity weights its probability.
  const phase = current.fringe % 1;
  let x;
  do {
    x = Math.random() * impactLayer.width;
  } while (Math.random() > fringeIntensity(x, phase));
  const y = 3 + Math.random() * (impactLayer.height - 6);
  const hue = wavelengthHue(model.wavelength);
  impactCtx.fillStyle = 'hsl(' + hue + ' 86% 76%)';
  impactCtx.beginPath();
  impactCtx.arc(x, y, 2.4, 0, tau);
  impactCtx.fill();
  hitCount++;
}

function clearImpacts() {
  hitCount = 0;
  impactCtx.clearRect(0, 0, impactLayer.width, impactLayer.height);
}

function radiusFor(length) {
  return 42 + 12.4 * length;
}
function trace(points, color) {
  ctx.beginPath();
  ctx.moveTo(...points[0]);
  for (const point of points.slice(1)) ctx.lineTo(...point);
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.stroke();
}
function image(img, x, y, width, angle = 0) {
  if (!img?.naturalWidth) return;
  const height = width * img.naturalHeight / img.naturalWidth;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.drawImage(img, -width / 2, -height / 2, width, height);
  ctx.restore();
}
function photon(point, color) {
  const [x, y] = point;
  ctx.save();
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 13;
  ctx.beginPath();
  ctx.arc(x, y, 4.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  image(pulse, x, y, 34);
}
const interpolate = (a, b, f) => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
function pulseAlong(start, points, durations, color) {
  let t = sceneTime - start;
  for (let i = 0; i < durations.length; i++) {
    if (t >= 0 && t < durations[i]) {
      photon(interpolate(points[i], points[i + 1], t / durations[i]), color);
      return;
    }
    t -= durations[i];
  }
}

function detectionTime() {
  const roundTrips = current.times.map(([out, back]) => (out + back) * travelTimeScale);
  return Math.max(...roundTrips) + 2 * commonLegDuration;
}

function drawPulse(start, source, splitter, mirrors, screen) {
  pulseAlong(start, [source, splitter], [commonLegDuration], '#eaf9ff');
  current.times.forEach(([out, back], index) => {
    const offset = index === 0 ? -5 : 5;
    pulseAlong(start + commonLegDuration, [splitter, mirrors[index], splitter, [offset, screen[1]]],
      [out * travelTimeScale, back * travelTimeScale, commonLegDuration], photons[index]);
  });
}

function renderBoard() {
  if (!current) return;
  const orientation = model.angle * degrees;
  const radiusA = radiusFor(model.armA), radiusB = radiusFor(model.armB);
  ctx.clearRect(0, 0, board.width, board.height);
  ctx.save();
  ctx.translate(center, center);
  // Positive angles turn clockwise. Arm A is parallel to the initial wind direction.
  ctx.rotate(orientation);
  image(images.mesa, 0, 0, 616);
  const source = [-179, 0], splitter = [0, 0], screen = [0, 176];
  const armA = [radiusA, 0], armB = [0, -radiusB];
  ctx.globalAlpha = .86;
  trace([source, splitter], '#cddde2');
  trace([[radiusA, -4], [0, -4], [-4, 0], [-4, 176]], photons[0]);
  trace([[4, -radiusB], [4, 176]], photons[1]);
  ctx.globalAlpha = 1;
  image(images.fuente, ...source, 80);
  image(images.espejo, ...armA, 34);
  image(images.espejo, ...armB, 34, Math.PI / 2);
  image(images.divisor, ...splitter, 56, Math.PI / 2);
  image(images.detector, screen[0], screen[1] + 16, 90);

  const emissionAge = sceneTime - emissionStart;
  if (model.emission === 'stream') {
    const latest = Math.floor(emissionAge / streamInterval);
    for (let i = latest; i >= Math.max(0, latest - 4); i--) {
      drawPulse(emissionStart + i * streamInterval, source, splitter, [armA, armB], screen);
    }
  } else if (model.emission === 'single') {
    drawPulse(emissionStart, source, splitter, [armA, armB], screen);
    if (detectedAt !== null) photon(screen, '#eaf9ff');
  }
  ctx.restore();

  function label(point, caption, color) {
    const cos = Math.cos(orientation), sin = Math.sin(orientation);
    const x = center + point[0] * cos - point[1] * sin;
    const y = center + point[0] * sin + point[1] * cos;
    ctx.font = '650 21px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const width = ctx.measureText(caption).width + 17;
    ctx.fillStyle = '#05141ce8';
    ctx.beginPath();
    ctx.roundRect(x - width / 2, y - 15, width, 30, 5);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.fillText(caption, x, y + 1);
  }
  label([radiusA + 33, 0], 'A', photons[0]);
  label([0, -radiusB - 34], 'B', photons[1]);
  label([-231, 0], 'Fuente', '#e9f4f8');
  label([0, 231], 'Detector', '#e9f4f8');
}

function animation(time) {
  const delta = Math.min((time - previousTime) / 1000, .05);
  const visualSpeed = model.slow ? .28 : 1;
  previousTime = time;
  sceneTime += delta * visualSpeed;
  if (model.emission === 'stream') {
    const timeAfterFirstArrival = (sceneTime - emissionStart - detectionTime()) / visualSpeed;
    if (timeAfterFirstArrival >= 0) {
      streamHitCredit += Math.min(delta, timeAfterFirstArrival) * model.detectorRate;
      const arrivals = Math.floor(streamHitCredit);
      streamHitCredit -= arrivals;
      for (let i = 0; i < arrivals; i++) recordImpact();
      if (arrivals > 0) drawFringes();
    }
  }
  if (model.emission === 'single') {
    if (detectedAt === null && sceneTime - emissionStart >= detectionTime()) {
      detectedAt = sceneTime;
      recordImpact();
      drawFringes();
    }
    if (detectedAt !== null && sceneTime - detectedAt >= detectionFlash) {
      setEmission('stopped');
      return;
    }
  }
  renderBoard();
  frameId = requestAnimationFrame(animation);
}
function setPlaying(playing) {
  model.playing = playing;
  cancelAnimationFrame(frameId);
  if (playing) {
    previousTime = performance.now();
    frameId = requestAnimationFrame(animation);
  }
  update();
}

function setEmission(mode, playing = mode !== 'stopped') {
  model.emission = mode;
  emissionStart = sceneTime;
  streamHitCredit = 1;
  detectedAt = null;
  setPlaying(playing);
}

function boardPoint(event) {
  const rect = board.getBoundingClientRect();
  return [(event.clientX - rect.left) * board.width / rect.width - center,
    (event.clientY - rect.top) * board.height / rect.height - center];
}
function pick([x, y]) {
  const angle = model.angle * degrees;
  const alongA = x * Math.cos(angle) + y * Math.sin(angle);
  const alongB = x * Math.sin(angle) - y * Math.cos(angle);
  if (Math.hypot(alongA - radiusFor(model.armA), alongB) <= 39) return 'armA';
  if (Math.hypot(alongB - radiusFor(model.armB), alongA) <= 39) return 'armB';
  const distance = Math.hypot(x, y);
  return distance > 105 && distance < 310 ? 'angle' : null;
}
board.addEventListener('pointerdown', event => {
  if (!event.isPrimary || event.button !== 0 || drag) return;
  const point = boardPoint(event);
  const grip = pick(point);
  if (!grip) return;
  drag = { grip, id: event.pointerId, from: Math.atan2(point[1], point[0]), angle: model.angle };
  board.setPointerCapture(event.pointerId);
  board.style.cursor = 'grabbing';
});
board.addEventListener('pointermove', event => {
  const [x, y] = boardPoint(event);
  if (!drag) {
    board.style.cursor = pick([x, y]) ? 'grab' : 'default';
    return;
  }
  if (event.pointerId !== drag.id) return;
  const { grip } = drag;
  if (grip === 'angle') {
    model.angle = wrapAngle(Math.round(drag.angle + (Math.atan2(y, x) - drag.from) / degrees));
  } else {
    const axis = (model.angle - (grip === 'armB' ? 90 : 0)) * degrees;
    const position = x * Math.cos(axis) + y * Math.sin(axis);
    model[grip] = clamp(Math.round((position - 42) / 12.4 * 10) / 10, 2, 15);
  }
  update();
});
for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  board.addEventListener(event, event => {
    if (drag?.id !== event.pointerId) return;
    drag = null;
    board.style.cursor = pick(boardPoint(event)) ? 'grab' : 'default';
  });
}

for (const name of Object.keys(initial)) {
  $(name).addEventListener('input', event => {
    model[name] = event.target.valueAsNumber;
    update();
  });
}
for (const button of document.querySelectorAll('[data-turn]')) {
  button.addEventListener('click', () => {
    model.angle = wrapAngle(model.angle + Number(button.dataset.turn));
    update();
  });
}
for (const name of ['ether', 'slow']) {
  $(name).addEventListener('click', () => {
    model[name] = !model[name];
    update();
  });
}
$('equal').addEventListener('click', () => {
  model.armB = model.armA;
  update();
});
$('play').addEventListener('click', () => setPlaying(!model.playing));
$('stop').addEventListener('click', () => setEmission('stopped'));
$('single').addEventListener('click', () => {
  if (model.emission !== 'single') setEmission('single');
});
$('stream').addEventListener('click', () => {
  if (model.emission !== 'stream') setEmission('stream');
  else if (!model.playing) setPlaying(true);
});
$('pattern').addEventListener('click', () => {
  showPattern = !showPattern;
  drawFringes();
});
$('clearHits').addEventListener('click', () => {
  if (hitCount === 0) return;
  clearImpacts();
  showPattern = false;
  drawFringes();
});
$('reset').addEventListener('click', () => {
  Object.assign(model, initial, { ether: false, slow: false });
  clearImpacts();
  showPattern = false;
  sceneTime = 0;
  setEmission('stream', !matchMedia('(prefers-reduced-motion: reduce)').matches);
});

setPlaying(model.playing);
