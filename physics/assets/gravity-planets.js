const GravityPlanets = (() => {
  // NASA/JPL physical parameters. Sizes in the scene are compressed for readability.
  const solarSystem = {
    mercury: { name: 'Mercurio', mass: 3.30103e23, radiusKm: 2439.4, radius: 12 },
    venus: { name: 'Venus', mass: 4.86731e24, radiusKm: 6051.8, radius: 17 },
    earth: { name: 'Tierra', mass: EARTH, radiusKm: EARTH_RADIUS, radius: 18 },
    mars: { name: 'Marte', mass: 6.41691e23, radiusKm: 3389.5, radius: 14 },
    jupiter: { name: 'Júpiter', mass: 1.898125e27, radiusKm: 69911, radius: 43 },
    saturn: { name: 'Saturno', mass: 5.68317e26, radiusKm: 58232, radius: 37, rings: true },
    uranus: { name: 'Urano', mass: 8.68099e25, radiusKm: 25362, radius: 28 },
    neptune: { name: 'Neptuno', mass: 1.024092e26, radiusKm: 24622, radius: 27 }
  };
  const moons = {
    moon: { name: 'Luna', mass: .0123 * EARTH, radiusKm: 1737.4, radius: 10 },
    titan: { name: 'Titán', mass: .0225 * EARTH, radiusKm: 2575, radius: 12 }
  };
  // Keep the previous sandbox settings for worlds with little physical data.
  const other = {
    generic: { name: 'Planeta genérico', mass: 2.5 * EARTH, radiusKm: 10500, radius: 21 },
    proximab: { name: 'Próxima Centauri b', mass: 1.27 * EARTH, radiusKm: 8500, radius: 17 },
    kepler: { name: 'Kepler-22b', mass: 9.1 * EARTH, radiusKm: 12500, radius: 25 }
  };
  const presets = { ...solarSystem, ...moons, ...other };
  const images = new Map();
  const url = key => 'assets/planets/' + key + '.webp';

  function populate(select, selected) {
    for (const [label, entries] of [
      ['Planetas del Sistema Solar', solarSystem],
      ['Satélites', moons],
      ['Otros mundos', other]
    ]) {
      const group = document.createElement('optgroup');
      group.label = label;
      for (const [key, preset] of Object.entries(entries)) {
        group.append(new Option(preset.name, key, false, key === selected));
      }
      select.append(group);
    }
  }

  function properties(key) {
    const { name, mass, radiusKm, radius } = presets[key];
    return { planet: key, name, mass, radiusKm, radius };
  }

  function imageFor(key) {
    if (!images.has(key)) {
      const image = new Image();
      image.onload = requestGravityRender;
      image.src = url(key);
      images.set(key, image);
    }
    return images.get(key);
  }

  function paint(o, p, diameter) {
    const key = o.planet;
    const image = imageFor(key);
    if (!image.complete || !image.naturalWidth) return diameter / 2;
    // The Saturn image file is scaled by the diameter of its globe. Its
    // transparent wings carry the rings and add no mass or collision radius.
    const ring = presets[key].rings;
    const width = diameter * (ring ? 1.9 : 1);
    const height = width * image.naturalHeight / image.naturalWidth;
    ctx.save();
    ctx.translate(p.x, p.y);
    if (!ring) ctx.rotate(drawAngle(o));
    ctx.drawImage(image, -width / 2, -height / 2, width, height);
    ctx.restore();
    return height / 2;
  }

  return { url, populate, properties, imageFor, paint };
})();
