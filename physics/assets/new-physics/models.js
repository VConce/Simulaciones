/* Closed-form SI models shared only by the four new physics laboratories. */
(function (root) {
  'use strict';
  const h = 6.62607015e-34, c = 299792458, k = 1.380649e-23;
  const sigma = 2 * Math.PI ** 5 * k ** 4 / (15 * h ** 3 * c ** 2);
  const wien = 2.8977719551851727e-3;
  function positive(x, name) {
    if (!Number.isFinite(x) || x <= 0) throw new RangeError(name + ' must be positive');
  }
  function lens(f, u, height) {
    positive(u, 'u');
    if (!Number.isFinite(f) || f === 0) throw new RangeError('f must be finite and nonzero');
    const singular = Math.abs(u - f) <= 1e-12 * Math.max(u, Math.abs(f));
    const v = singular ? Infinity : f * u / (u - f);
    const m = singular ? null : -v / u;
    return { v, m, imageHeight: singular ? null : m * height, singular, real: v > 0 && !singular };
  }
  function ray(f, u, height, intercept) {
    return { intercept, incoming: (intercept - height) / u, outgoing: (intercept - height) / u - intercept / f };
  }
  function rc(R, C, V, t, mode) {
    positive(R, 'R'); positive(C, 'C');
    const tau = R * C, e = Math.exp(-Math.max(0, t) / tau);
    const voltage = mode === 'charge' ? V * -Math.expm1(-Math.max(0, t) / tau) : V * e;
    const rawCurrent = (mode === 'charge' ? 1 : -1) * V / R * e;
    const current = rawCurrent === 0 ? 0 : rawCurrent;
    return { tau, voltage, charge: C * voltage, current, energy: .5 * C * voltage ** 2 };
  }
  function decay(N0, halfLife, t) {
    positive(halfLife, 'halfLife');
    const lambda = Math.LN2 / halfLife, p = Math.exp(-lambda * Math.max(0, t));
    return { lambda, p, mean: N0 * p, sd: Math.sqrt(N0 * p * (1 - p)), activity: lambda * N0 * p };
  }
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function lifetimes(N0, halfLife, seed) {
    positive(halfLife, 'halfLife');
    const random = rng(seed), lambda = Math.LN2 / halfLife;
    // Mid-bin uniforms exclude 0 and 1, including seed zero.
    return Array.from({ length: N0 }, () => -Math.log(1 - (random() + .5 / 4294967296)) / lambda);
  }
  function survivors(sorted, t) {
    let lo = 0, hi = sorted.length;
    while (lo < hi) { const mid = (lo + hi) >>> 1; if (sorted[mid] <= t) lo = mid + 1; else hi = mid; }
    return sorted.length - lo;
  }
  function planck(lambda, T, emissivity = 1) {
    if (lambda <= 0 || T <= 0 || emissivity === 0) return 0;
    const z = h * c / (lambda * k * T);
    if (z > 700) return 0;
    // Hemispherical spectral exitance per metre, NOT radiance per steradian.
    return emissivity * 2 * Math.PI * h * c ** 2 / (lambda ** 5 * Math.expm1(z));
  }
  function radiation(T, area, emissivity, ambient) {
    return { peak: wien / T, emitted: emissivity * sigma * area * T ** 4,
      absorbed: emissivity * sigma * area * ambient ** 4,
      net: emissivity * sigma * area * (T ** 4 - ambient ** 4) };
  }
  const models = { lens, ray, rc, decay, rng, lifetimes, survivors, planck, radiation, h, c, k, sigma, wien };
  if (typeof module !== 'undefined' && module.exports) module.exports = models;
  else root.Physics = models;
})(typeof globalThis !== 'undefined' ? globalThis : this);
