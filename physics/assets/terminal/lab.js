"use strict";

(() => {
  const $ = id => document.getElementById(id);
  const model = TerminalModel;
  const colors = { air: "#1264b0", vacuum: "#a84415" };
  const series = Object.keys(colors);
  const graphUnits = { down: "v hacia abajo (m/s)", speed: "Rapidez (m/s)", y: "Altura (m)", x: "Posición x (m)" };
  const names = Object.fromEntries(Object.entries(model.objects).map(([key, body]) => [key, body.name]));
  const sprites = Object.fromEntries(Object.keys(names).map(key => {
    const image = new Image();
    image.onload = draw;
    image.src = "assets/terminal/" + key + ".webp";
    return [key, image];
  }));
  const stage = $("world");
  const graph = $("graph");
  const controls = ["object", "height", "rho"];
  const num = id => Number($(id).value);
  const round = value => Number(value.toFixed(6));
  const limit = (value, lo, hi) => Math.max(lo, Math.min(value, hi));
  let run, grabbed, previousFrame = 0, camera, air, lastGraphRefresh = 0;
  let raf = 0;

  function idle() {
    const y = num("height");
    run = { t: 0, playing: false, started: false, start: { x: 0, y, vx: 0, vy: 0 } };
    $("hint").textContent = "Arrastra el objeto y suéltalo en la dirección del lanzamiento.";
    $("measurements").textContent = measurements();
    sync();
    draw();
  }

  function measurements() {
    const body = model.objects[$("object").value];
    return "Masa " + body.mass + " kg · Área frontal " + body.area + " m² · Coeficiente de arrastre " + body.cd;
  }

  function makeRun(start) {
    const key = $("object").value;
    const density = num("rho");
    const velocity = Math.hypot(start.vx, start.vy);
    if (velocity > 65) {
      start.vx *= 65 / velocity;
      start.vy *= 65 / velocity;
    }
    const drag = model.dragFactor(model.objects[key], density);
    const terminal = drag > 0 ? Math.sqrt(model.gravity / drag) : Infinity;
    run = {
      start, key, density, drag, terminal, t: 0, playing: true, started: true,
      air: { ...start }, vacuum: { ...start },
      paths: { air: [{ ...start }], vacuum: [{ ...start }] },
      samples: [{ t: 0, air: { ...start }, vacuum: { ...start } }],
      interval: num("interval"), nextSample: num("interval"), nextPath: 1 / 40
    };
    previousFrame = 0;
    $("hint").textContent = "Agarra cualquiera de las dos imágenes para repetir el lanzamiento.";
    sync();
    draw();
    schedule();
  }

  function readVelocity(id) {
    const value = num(id);
    return Number.isFinite(value) ? limit(value, -65, 65) : 0;
  }

  function sample() {
    run.samples.push({
      t: round(run.t),
      air: run.t <= (run.air.impactTime ?? Infinity) + 1e-7 ? { ...run.air } : null,
      vacuum: run.t <= (run.vacuum.impactTime ?? Infinity) + 1e-7 ? { ...run.vacuum } : null
    });
  }

  function advance(duration) {
    const end = run.t + duration;
    while (run.playing && run.t < end - 1e-8) {
      const target = Math.min(end, run.t + 1 / 180, run.nextSample, run.nextPath);
      for (const key of series) {
        if (run[key].impactTime !== undefined) continue;
        const next = model.advance(run[key], target - run.t, key === "air" ? run.drag : 0);
        run[key] = next;
        if (next.hit !== undefined) {
          next.impactTime = run.t + next.hit;
          run.paths[key].push({ ...next });
        }
      }
      run.t = target;
      if (target >= run.nextPath - 1e-8) {
        for (const key of series) if (run[key].impactTime === undefined) run.paths[key].push({ ...run[key] });
        run.nextPath += 1 / 40;
      }
      if (target >= run.nextSample - 1e-8) {
        sample();
        run.nextSample += run.interval;
      }
      if (run.air.impactTime !== undefined && run.vacuum.impactTime !== undefined) {
        run.t = Math.max(run.air.impactTime, run.vacuum.impactTime);
        run.playing = false;
        $("hint").textContent = "Ambos objetos han llegado al suelo. Puedes descargar las medidas.";
      }
    }
  }

  function schedule() {
    if (!raf) raf = requestAnimationFrame(frame);
  }

  function frame(now) {
    raf = 0;
    if (!run.playing) return;
    if (previousFrame) advance(Math.min(.05, (now - previousFrame) / 1000) * num("speed"));
    previousFrame = now;
    drawStage();
    if (!run.playing || now - lastGraphRefresh >= 75) {
      lastGraphRefresh = now;
      sync();
      drawGraph();
    }
    if (run.playing) schedule();
  }

  function surface(canvas) {
    const { width, height } = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const px = Math.max(1, Math.round(width * dpr));
    const py = Math.max(1, Math.round(height * dpr));
    if (canvas.width !== px || canvas.height !== py) {
      canvas.width = px;
      canvas.height = py;
    }
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    return { ctx, width, height };
  }

  function framing(width, height) {
    const floor = height - 42;
    const left = 55, right = width - 28;
    const start = grabbed?.state ?? run.start;
    let minX = Math.min(-1, start.x), maxX = Math.max(1, start.x);
    let top = Math.max(num("height") * 1.14, start.y * 1.10);
    if (run.started && !grabbed) {
      for (const key of series) {
        for (const point of run.paths[key]) top = Math.max(top, point.y * 1.10);
        top = Math.max(top, run[key].y * 1.10);
        minX = Math.min(minX, run[key].x);
        maxX = Math.max(maxX, run[key].x);
      }
    }
    const unit = Math.min((floor - 79) / top, (right - left) / (maxX - minX + 18));
    const center = (left + right - (maxX + minX) * unit) / 2;
    return { floor, unit, center };
  }

  function mark(ctx, x, y, key, r) {
    ctx.fillStyle = colors[key];
    ctx.strokeStyle = "white";
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (key === "air") ctx.arc(x, y, r, 0, 2 * Math.PI);
    else {
      ctx.moveTo(x, y - r);
      ctx.lineTo(x + r, y);
      ctx.lineTo(x, y + r);
      ctx.lineTo(x - r, y);
      ctx.closePath();
    }
    ctx.fill();
    ctx.stroke();
  }

  function paintSprite(ctx, image, p, size, opacity) {
    if (!image.complete || !image.naturalWidth) return;
    const scale = size / Math.max(image.naturalWidth, image.naturalHeight);
    const w = image.naturalWidth * scale, h = image.naturalHeight * scale;
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.drawImage(image, p.x - w / 2, p.y - h * .72, w, h);
    ctx.restore();
  }

  function drawStage() {
    if (!run) return;
    const { ctx, width, height } = surface(stage);
    camera = grabbed?.camera ?? framing(width, height);
    const { floor, unit, center } = camera;
    const pos = p => ({ x: center + p.x * unit, y: floor - p.y * unit });
    const imageKey = $("object").value;
    const size = model.objects[imageKey].size;
    ctx.fillStyle = "#29485d";
    ctx.strokeStyle = "#53728b87";
    ctx.font = "12px system-ui";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, floor);
    ctx.lineTo(width, floor);
    ctx.stroke();
    const rulerStep = [1, 2, 5, 10, 20, 50, 100, 200, 500].find(n => n * unit >= 25) ?? 1000;
    for (let y = 0; y * unit <= floor - 68; y += rulerStep) {
      const py = floor - y * unit;
      ctx.fillRect(5, py, 5, 1);
      ctx.fillText(y + " m", 14, py + (y === 0 ? 12 : 4));
    }
    if (run.started && !grabbed) {
      for (const key of ["vacuum", "air"]) {
        const mode = $(key + "Trail").value;
        if (mode !== "none") {
          ctx.strokeStyle = colors[key];
          ctx.lineWidth = 2;
          ctx.setLineDash(mode === "dash" ? key === "air" ? [8, 5] : [4, 6] : []);
          ctx.beginPath();
          const points = run.paths[key];
          points.forEach((point, i) => {
            const p = pos(point);
            if (i) ctx.lineTo(p.x, p.y);
            else ctx.moveTo(p.x, p.y);
          });
          const head = pos(run[key]);
          ctx.lineTo(head.x, head.y);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        if ($("dots").checked) {
          for (const item of run.samples) if (item[key]) {
            const p = pos(item[key]);
            mark(ctx, p.x, p.y, key, key === "air" ? 3.1 : 4.2);
          }
        }
        const p = pos(run[key]);
        paintSprite(ctx, sprites[imageKey], p, size, key === "air" ? 1 : .58);
        mark(ctx, p.x, p.y, key, key === "air" ? 4.5 : 6.1);
      }
    } else {
      const p = pos(grabbed?.state ?? run.start);
      paintSprite(ctx, sprites[imageKey], p, size, 1);
      mark(ctx, p.x, p.y, "air", 4);
    }
  }

  function graphValue(state, kind) {
    if (kind === "down") return -state.vy;
    if (kind === "speed") return Math.hypot(state.vx, state.vy);
    return state[kind];
  }

  function drawGraph() {
    if (!run) return;
    const { ctx, width, height } = surface(graph);
    const kind = $("quantity").value;
    const left = 42, bottom = height - 31, right = width - 13, top = 29;
    if (right <= left || bottom <= top) return;
    const sampleEnd = run.started ? run.t : 0;
    const tMax = Math.max(5, Math.ceil(sampleEnd / 5) * 5);
    let lo = 0, hi = kind === "y" ? num("height") : 2;
    const terminal = run.terminal ?? Math.sqrt(model.gravity / model.dragFactor(model.objects[$("object").value], num("rho")));
    if ((kind === "down" || kind === "speed") && terminal < 80) hi = Math.max(hi, terminal);
    for (const sample of run.samples ?? []) for (const key of series) if (sample[key]) {
      const value = graphValue(sample[key], kind);
      lo = Math.min(lo, value);
      hi = Math.max(hi, value);
    }
    const step = Math.max(1, 10 ** Math.floor(Math.log10(hi - lo))) / 2;
    const min = Math.floor(lo / step) * step;
    const max = Math.max(min + 1, Math.ceil(hi / step) * step);
    const x = t => left + (right - left) * t / tMax;
    const y = value => bottom - (bottom - top) * (value - min) / (max - min);
    ctx.font = "12px system-ui";
    ctx.fillStyle = "#38546a";
    ctx.fillText(graphUnits[kind], left, 16);
    ctx.fillText("Tiempo (s)", right - 61, height - 1);
    ctx.strokeStyle = "#d8e5ed";
    for (let i = 0; i <= 5; i++) {
      const value = min + (max - min) * i / 5;
      ctx.beginPath();
      ctx.moveTo(left, y(value));
      ctx.lineTo(right, y(value));
      ctx.stroke();
      ctx.fillText(Number(value.toFixed(1)), 3, y(value) + 4);
      const t = tMax * i / 5;
      ctx.fillText(t, x(t) - 4, bottom + 16);
    }
    if ((kind === "down" || kind === "speed") && terminal <= max) {
      ctx.strokeStyle = "#1264b082";
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(left, y(terminal));
      ctx.lineTo(right, y(terminal));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#1264b0";
      ctx.fillText("v terminal", right - 55, Math.max(26, y(terminal) - 5));
    }
    for (const key of ["vacuum", "air"]) {
      ctx.strokeStyle = colors[key];
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      const points = (run.samples ?? []).filter(point => point[key]);
      points.forEach((point, i) => {
        const px = x(point.t), py = y(graphValue(point[key], kind));
        if (i) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
      });
      ctx.stroke();
      points.forEach(point => mark(ctx, x(point.t), y(graphValue(point[key], kind)), key, key === "air" ? 3.5 : 5));
    }
  }

  function draw() {
    drawStage();
    drawGraph();
  }

  function sync() {
    const body = model.objects[$("object").value];
    const v = Math.sqrt(model.gravity / model.dragFactor(body, num("rho")));
    $("terminal").textContent = Number.isFinite(v) ? v.toFixed(2) + " m/s" : "Sin límite en vacío";
    $("time").textContent = run.t.toFixed(2) + " s";
    $("heightValue").value = num("height") + " m";
    $("intervalValue").value = num("interval").toFixed(1) + " s";
    $("rhoValue").value = num("rho").toFixed(2) + " kg/m³";
    const n = run.samples?.length ?? 0;
    $("samples").textContent = n + (n === 1 ? " instante medido" : " instantes medidos");
    $("export").disabled = n === 0;
    $("pause").disabled = !run.started || !run.playing && run.air.impactTime !== undefined && run.vacuum.impactTime !== undefined;
    $("pause").textContent = run.started && !run.playing && !$("pause").disabled ? "Continuar" : "Pausar";
  }

  function localPointer(event) {
    const rect = stage.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function hitTest(p) {
    const { center, floor, unit } = camera;
    const size = model.objects[$("object").value].size;
    return (run.started ? [run.air, run.vacuum] : [run.start]).find(body => {
      const x = center + body.x * unit, y = floor - body.y * unit;
      return Math.abs(p.x - x) < size * .55 + 7 && p.y > y - size * .82 - 6 && p.y < y + size * .33 + 8;
    });
  }

  function updateGrab(event) {
    const p = localPointer(event);
    const { unit, center, floor } = grabbed.camera;
    const { width } = stage.getBoundingClientRect();
    const x = limit(p.x - grabbed.offsetX, 20, width - 20);
    const y = limit(p.y - grabbed.offsetY, 64, floor - unit);
    grabbed.state = { x: (x - center) / unit, y: (floor - y) / unit };
    const tick = { ...p, t: event.timeStamp };
    grabbed.points = grabbed.points.filter(point => tick.t - point.t <= 140);
    grabbed.points.push(tick);
    drawStage();
  }

  stage.addEventListener("pointerdown", event => {
    if (grabbed || event.button !== 0) return;
    const p = localPointer(event);
    const body = hitTest(p);
    if (!body) return;
    grabbed = {
      pointer: event.pointerId, camera: { ...camera }, state: { ...body }, wasPlaying: run.playing,
      offsetX: p.x - camera.center - body.x * camera.unit,
      offsetY: p.y - camera.floor + body.y * camera.unit,
      points: [{ ...p, t: event.timeStamp }]
    };
    run.playing = false;
    stage.setPointerCapture(event.pointerId);
    stage.style.cursor = "grabbing";
    drawStage();
  });
  stage.addEventListener("pointermove", event => {
    if (grabbed?.pointer === event.pointerId) updateGrab(event);
    else if (!grabbed) stage.style.cursor = hitTest(localPointer(event)) ? "grab" : "default";
  });
  stage.addEventListener("pointerup", event => {
    if (grabbed?.pointer !== event.pointerId) return;
    updateGrab(event);
    const first = grabbed.points[0], last = grabbed.points.at(-1);
    const dt = Math.max(.025, (last.t - first.t) / 1000);
    const scale = .45 / (dt * grabbed.camera.unit);
    const start = { ...grabbed.state, vx: (last.x - first.x) * scale, vy: (first.y - last.y) * scale };
    grabbed = null;
    stage.style.cursor = "grab";
    makeRun(start);
  });
  stage.addEventListener("lostpointercapture", event => {
    if (grabbed?.pointer !== event.pointerId) return;
    run.playing = grabbed.wasPlaying;
    grabbed = null;
    draw();
    if (run.playing) {
      previousFrame = 0;
      schedule();
    }
  });
  controls.forEach(id => $(id).addEventListener("input", idle));
  for (const id of ["quantity", "airTrail", "vacuumTrail", "dots"]) $(id).addEventListener("input", draw);
  $("interval").addEventListener("input", () => {
    if (run.started) {
      run.interval = num("interval");
      run.nextSample = run.t + run.interval;
    }
    sync();
  });
  $("drop").onclick = () => makeRun({ x: 0, y: num("height"), vx: 0, vy: 0 });
  $("launch").onclick = () => makeRun({ x: 0, y: num("height"), vx: readVelocity("vx"), vy: readVelocity("vy") });
  $("reset").onclick = idle;
  $("pause").onclick = () => {
    run.playing = !run.playing;
    previousFrame = 0;
    sync();
    if (run.playing) schedule();
  };
  $("export").onclick = async () => {
    const button = $("export");
    button.disabled = true;
    const snapshot = run.samples.slice();
    const { key, start, density, terminal, air, vacuum } = run;
    try {
      const { saveWorkbook } = await import("./workbook.js");
      const headers = ["Tiempo (s)"];
      for (const label of ["Con aire", "Sin aire"]) {
        for (const quantity of ["x (m)", "altura (m)", "vx (m/s)", "vy (m/s)", "rapidez (m/s)"]) {
          headers.push(label + " · " + quantity);
        }
      }
      const rows = snapshot.map(point => {
        const row = [point.t];
        for (const mode of series) {
          const b = point[mode];
          row.push(...(b ? [b.x, b.y, b.vx, b.vy, Math.hypot(b.vx, b.vy)].map(round) : [null, null, null, null, null]));
        }
        return row;
      });
      saveWorkbook([["Velocidad terminal", names[key]], ["Densidad del aire (kg/m³)", density],
        ["Altura inicial (m)", round(start.y)], ["Velocidad terminal (m/s)", Number.isFinite(terminal) ? round(terminal) : "Sin límite"],
        ["Impacto con aire (s)", air.impactTime ?? null], ["Impacto sin aire (s)", vacuum.impactTime ?? null],
        [], headers, ...rows]);
    } catch {
      $("samples").textContent = "No se ha podido descargar el archivo.";
    } finally {
      button.disabled = !run.samples?.length;
    }
  };
  const observer = new ResizeObserver(draw);
  observer.observe(stage);
  observer.observe(graph);
  idle();
  if (window.renderMathInElement) window.renderMathInElement(document.querySelector(".theory"));
})();
