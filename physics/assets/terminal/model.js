"use strict";

const TerminalModel = (() => {
  const gravity = 9.81;
  // Each state uses metres and seconds, with y increasing upwards.
  const objects = {
    parachute: { name: "Paracaidista", mass: 85, area: 34, cd: 1.42, size: 68 },
    coin: { name: "Moneda", mass: .0078, area: .00051, cd: 1.1, size: 34 },
    feather: { name: "Pluma", mass: .00045, area: .0032, cd: 1.1, size: 47 },
    ball: { name: "Pelota de tenis", mass: .057, area: .0035, cd: .55, size: 42 }
  };

  function dragFactor(body, density) {
    return .5 * density * body.cd * body.area / body.mass;
  }

  function displacement(state, dt, drag) {
    if (drag === 0) {
      return {
        x: state.x + state.vx * dt, y: state.y + state.vy * dt - .5 * gravity * dt ** 2,
        vx: state.vx, vy: state.vy - gravity * dt
      };
    }
    // Symmetric splitting. The drag-only step is exact and stays stable for a light plume.
    const uy = state.vy - gravity * dt / 2;
    const speed = Math.hypot(state.vx, uy);
    const z = drag * speed * dt;
    const shift = z === 0 ? dt : dt * Math.log1p(z) / z;
    return {
      x: state.x + state.vx * shift, y: state.y + uy * shift,
      vx: state.vx / (1 + z), vy: uy / (1 + z) - gravity * dt / 2
    };
  }

  function advance(state, dt, drag) {
    if (state.hit !== undefined) return state;
    const next = displacement(state, dt, drag);
    if (next.y > 0) return next;
    let low = 0, high = dt;
    for (let i = 0; i < 20; i++) {
      const middle = (low + high) / 2;
      if (displacement(state, middle, drag).y > 0) low = middle;
      else high = middle;
    }
    return { ...displacement(state, high, drag), y: 0, hit: high };
  }

  return { objects, gravity, dragFactor, advance };
})();
