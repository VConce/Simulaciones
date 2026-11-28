const GravityModel = (() => {
  const G_SI = 6.67430e-11;
  const C = 299792458;

  function schwarzschildRadius(massKg) {
    return 2 * G_SI * massKg / C ** 2;
  }

  // dx, dy point toward the source. vx, vy are rates with respect to the
  // trajectory parameter (proper time in the isolated Schwarzschild case).
  function blackHoleForce(dx, dy, vx, vy, mu, horizon) {
    const r2 = dx * dx + dy * dy;
    const safeR2 = Math.max(r2, horizon * horizon, Number.MIN_VALUE);
    const h = dx * vy - dy * vx;
    const tangentialRate2 = h * h / safeR2;
    return (mu + 1.5 * horizon * tangentialRate2) / (safeR2 * Math.sqrt(safeR2));
  }

  function circularRate(radius, mu, horizon) {
    return Math.sqrt(mu / (radius - 1.5 * horizon));
  }

  function boundApocentreRate(apocentre, eccentricity, mu, horizon) {
    const peri = apocentre * (1 - eccentricity) / (1 + eccentricity);
    const semiLatusRectum = apocentre * (1 - eccentricity);
    if (semiLatusRectum <= (3 + eccentricity) * horizon) return null;
    if (eccentricity === 0) return circularRate(apocentre, mu, horizon);
    const ratio = apocentre / peri;
    // Equal effective energy at both turning points. Cancelling (ratio - 1)
    // avoids loss of precision for an almost circular orbit.
    const denominator = 1 + ratio - (horizon / apocentre) * (ratio * ratio + ratio + 1);
    return Math.sqrt(2 * mu / (apocentre * denominator));
  }

  // Earliest intersection of a swept centre with a moving circular boundary,
  // expressed in coordinates relative to the source. Uses a perpendicular
  // distance rather than a poorly conditioned quadratic discriminant.
  function horizonEntry(x, y, nextX, nextY, radius) {
    if (radius <= 0) return null;
    if (Math.hypot(x, y) <= radius) return 0;
    const dx = nextX - x;
    const dy = nextY - y;
    const length = Math.hypot(dx, dy);
    if (length === 0) return null;
    const ux = dx / length;
    const uy = dy / length;
    const projected = -(x * ux + y * uy);
    const offset = Math.abs(x * uy - y * ux);
    if (projected < 0 || offset > radius) return null;
    const halfChord = Math.sqrt((radius - offset) * (radius + offset));
    const entry = projected - halfChord;
    return entry <= length ? Math.max(0, entry / length) : null;
  }

  return Object.freeze({ schwarzschildRadius, blackHoleForce, circularRate, boundApocentreRate, horizonEntry });
})();
