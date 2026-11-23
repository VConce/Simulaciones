"use strict";

const swimSpeed = 2.4;
const radians = Math.PI / 180;
const wrapAngle = degrees => (degrees % 360 + 360) % 360;

function swimRoute(angle, current, distance) {
  const x = Math.cos(angle);
  const y = Math.sin(angle);
  const lateral = Math.sqrt(swimSpeed ** 2 - (current * y) ** 2);
  const outSpeed = lateral + current * x;
  const backSpeed = lateral - current * x;
  const outTime = distance / outSpeed;
  return {
    angle,
    x,
    y,
    outTime,
    total: outTime + distance / backSpeed,
    outHeading: Math.atan2(outSpeed * y, outSpeed * x - current),
    backHeading: Math.atan2(-backSpeed * y, -backSpeed * x - current)
  };
}

const byId = id => document.getElementById(id);
const play = byId("play");
const current = byId("current");
const angle = byId("angle");
const distances = [byId("distanceA"), byId("distanceB")];
const pace = byId("pace");
const course = byId("course");
const result = byId("result");
const difference = byId("difference");
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
const waterMotion = byId("waterTexture").animate(
  [{ transform: "translateX(calc(-1 * var(--water-tile)))" }, { transform: "translateX(0)" }],
  { duration: 16800, iterations: Infinity }
);

const swimmers = ["A", "B"].map(letter => ({
  time: byId(`time${letter}`),
  phase: byId(`phase${letter}`),
  lane: course.querySelector(`.lane-${letter.toLowerCase()}`),
  buoy: course.querySelector(`.buoy-${letter.toLowerCase()}`),
  sprite: course.querySelector(`.swimmer-${letter.toLowerCase()}`)
}));

let elapsed = 0;
let routes;
let duration;
let radii;
let offsetB = 90;
let frame = null;
let lastStamp = null;

function position(element, x, y) {
  element.style.setProperty("--x", `${x}px`);
  element.style.setProperty("--y", `${y}px`);
}

function draw() {
  swimmers.forEach(({ time, phase, sprite, buoy }, index) => {
    const route = routes[index];
    const clock = Math.min(elapsed, route.total);
    const returning = clock >= route.outTime;
    const done = clock >= route.total;
    const progress = returning
      ? (route.total - clock) / (route.total - route.outTime)
      : clock / route.outTime;
    const stroke = frame === null || done ? 0 : Math.sin(clock * 7) * .07;
    const radius = radii[index];
    position(sprite, radius * progress * route.x, radius * progress * route.y);
    sprite.style.setProperty("--heading", `${(returning ? route.backHeading : route.outHeading) + stroke}rad`);
    buoy.classList.toggle("touched", returning);
    time.textContent = `${clock.toFixed(2)} s`;

    const label = done ? "En la meta" : returning ? "De vuelta" : clock > 0 ? "Hacia la boya" : "En la salida";
    if (phase.textContent !== label) phase.textContent = label;
  });
}

function maxCourseRadius() {
  return Math.max(0, Math.min(course.clientWidth, course.clientHeight) / 2 - 57);
}

function layoutCourse() {
  const maxRadius = maxCourseRadius();
  radii = distances.map(input => maxRadius * Number(input.value) / Number(input.max));
  swimmers.forEach(({ lane, buoy }, index) => {
    const route = routes[index];
    const radius = radii[index];
    lane.style.setProperty("--radius", `${radius}px`);
    lane.style.setProperty("--angle", `${route.angle}rad`);
    position(buoy, radius * route.x, radius * route.y);
    const letter = index === 0 ? "A" : "B";
    const degrees = wrapAngle(Math.round(route.angle / radians));
    buoy.setAttribute("aria-label", `Boya ${letter}, ${distances[index].value} m, ${degrees} grados`);
  });
  draw();
}

function pause(label) {
  if (frame !== null) cancelAnimationFrame(frame);
  frame = null;
  lastStamp = null;
  play.textContent = label;
}

function reset() {
  pause("Iniciar");
  elapsed = 0;
  difference.textContent = "—";
  result.textContent = "Ida y vuelta";
  const water = Number(current.value);
  const direction = Number(angle.value);
  routes = distances.map((input, index) => {
    const length = Number(input.value);
    byId(`${input.id}Out`).textContent = `${length} m`;
    return swimRoute((direction + index * offsetB) * radians, water, length);
  });
  duration = Math.max(...routes.map(route => route.total));
  byId("angleOut").textContent = `${angle.value}°`;
  layoutCourse();
}

function updateWaterMotion() {
  const speed = Number(current.value);
  byId("currentOut").textContent = `${speed.toFixed(1)} m/s`;
  byId("flow").textContent = speed === 0 ? "Agua en calma" : "Corriente →";
  waterMotion.updatePlaybackRate(reduceMotion.matches ? 0 : speed / Number(current.defaultValue));
}

function moveBuoy(index, meters, degrees) {
  const distance = distances[index];
  const length = Math.min(Number(distance.max), Math.max(Number(distance.min), Math.round(meters)));
  const direction = wrapAngle(Math.round(degrees));
  const directionA = Number(angle.value);
  const oldDirection = wrapAngle(directionA + index * offsetB);
  if (length === Number(distance.value) && direction === oldDirection) return;

  distance.value = length;
  if (index === 0) {
    offsetB = wrapAngle(directionA + offsetB - direction);
    angle.value = direction;
  } else {
    offsetB = wrapAngle(direction - directionA);
  }
  reset();
}

swimmers.forEach(({ buoy }, index) => {
  let drag = null;

  buoy.addEventListener("pointerdown", event => {
    if (event.button !== 0 || drag) return;
    const rect = buoy.getBoundingClientRect();
    drag = {
      id: event.pointerId,
      offsetX: event.clientX - rect.left - rect.width / 2,
      offsetY: event.clientY - rect.top - rect.height / 2
    };
    buoy.setPointerCapture(event.pointerId);
    buoy.classList.add("dragging");
  });

  buoy.addEventListener("pointermove", event => {
    if (drag?.id !== event.pointerId) return;
    const rect = course.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2 - drag.offsetX;
    const y = event.clientY - rect.top - rect.height / 2 - drag.offsetY;
    const radius = maxCourseRadius();
    if (radius > 0) moveBuoy(index, Math.hypot(x, y) / radius * Number(distances[index].max), Math.atan2(y, x) / radians);
  });

  buoy.addEventListener("lostpointercapture", () => {
    drag = null;
    buoy.classList.remove("dragging");
  });

  buoy.addEventListener("keydown", event => {
    const steps = { ArrowUp: [1, 0], ArrowDown: [-1, 0], ArrowLeft: [0, -5], ArrowRight: [0, 5] };
    const step = steps[event.key];
    if (!step) return;
    event.preventDefault();
    moveBuoy(index, Number(distances[index].value) + step[0], Number(angle.value) + index * offsetB + step[1]);
  });
});

function tick(stamp) {
  const delta = lastStamp === null ? 0 : Math.min(.08, (stamp - lastStamp) / 1000);
  lastStamp = stamp;
  elapsed = Math.min(duration, elapsed + delta * Number(pace.value));
  draw();
  if (elapsed < duration) {
    frame = requestAnimationFrame(tick);
    return;
  }

  pause("Repetir");
  const gap = routes[0].total - routes[1].total;
  difference.textContent = `${Math.abs(gap).toFixed(2)} s`;
  result.textContent = Math.abs(gap) < .005 ? "Llegan a la vez" : `Llega antes ${gap > 0 ? "B" : "A"}`;
}

play.addEventListener("click", () => {
  if (frame !== null) {
    pause("Continuar");
    return;
  }
  if (elapsed >= duration) reset();
  play.textContent = "Pausar";
  frame = requestAnimationFrame(tick);
});

[current, angle, ...distances].forEach(input => input.addEventListener("input", reset));
current.addEventListener("input", updateWaterMotion);
reduceMotion.addEventListener("change", updateWaterMotion);
pace.addEventListener("input", () => {
  byId("paceOut").textContent = `${pace.value}×`;
});
byId("reset").addEventListener("click", reset);
byId("turn").addEventListener("click", () => {
  angle.value = wrapAngle(Number(angle.value) + 90);
  reset();
});
byId("diagonal").addEventListener("click", () => {
  angle.value = 45;
  offsetB = 90;
  reset();
});

updateWaterMotion();
reset();
new ResizeObserver(layoutCourse).observe(course);
