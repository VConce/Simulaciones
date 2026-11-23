"use strict";

const swimSpeed = 2.4;

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
const distance = byId("distance");
const pace = byId("pace");
const course = byId("course");
const result = byId("result");
const difference = byId("difference");

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
let radius;
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
    const separation = (index === 0 ? -9 : 9) * Math.max(0, 1 - progress * 7);

    position(sprite, radius * progress * route.x, radius * progress * route.y + separation);
    sprite.style.setProperty("--heading", `${(returning ? route.backHeading : route.outHeading) + stroke}rad`);
    buoy.classList.toggle("touched", returning);
    time.textContent = `${clock.toFixed(2)} s`;

    const label = done ? "En la meta" : returning ? "De vuelta" : clock > 0 ? "Hacia la boya" : "En la salida";
    if (phase.textContent !== label) phase.textContent = label;
  });
}

function layoutCourse() {
  radius = (Math.min(course.clientWidth, course.clientHeight) / 2 - 57) * Number(distance.value) / Number(distance.max);
  course.style.setProperty("--radius", `${radius}px`);
  swimmers.forEach(({ lane, buoy }, index) => {
    const route = routes[index];
    lane.style.setProperty("--angle", `${route.angle}rad`);
    position(buoy, radius * route.x, radius * route.y);
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
  const direction = Number(angle.value) * Math.PI / 180;
  const length = Number(distance.value);
  routes = [swimRoute(direction, water, length), swimRoute(direction + Math.PI / 2, water, length)];
  duration = Math.max(...routes.map(route => route.total));
  byId("currentOut").textContent = `${water.toFixed(1)} m/s`;
  byId("angleOut").textContent = `${angle.value}°`;
  byId("distanceOut").textContent = `${length} m`;
  byId("flow").textContent = water === 0 ? "Agua en calma" : "Corriente →";
  layoutCourse();
}

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

[current, angle, distance].forEach(input => input.addEventListener("input", reset));
byId("reset").addEventListener("click", reset);
byId("turn").addEventListener("click", () => {
  angle.value = (Number(angle.value) + 90) % 360;
  reset();
});
byId("diagonal").addEventListener("click", () => {
  angle.value = 45;
  reset();
});

reset();
new ResizeObserver(layoutCourse).observe(course);
