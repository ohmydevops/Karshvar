// Physical reference values: NASA/NSSDCA Planetary Fact Sheet (18 March 2025).
// radiusKm is EQUATORIAL radius (half the published equatorial diameter).
// orbitalAU is the published, rounded average Sun distance / Earth distance.
export const solarSystemSources = Object.freeze({
  dimensions: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/",
  distances:
    "https://nssdc.gsfc.nasa.gov/planetary/factsheet/planet_table_ratio.html",
  definitions:
    "https://nssdc.gsfc.nasa.gov/planetary/factsheet/planetfact_notes.html",
});

export const solarSystem = Object.freeze(
  [
    { name: "Mercury", radiusKm: 2439.5, orbitalAU: 0.387, inclination: 7 },
    { name: "Venus", radiusKm: 6052, orbitalAU: 0.723, inclination: 3.4 },
    { name: "Earth", radiusKm: 6378, orbitalAU: 1, inclination: 0 },
    { name: "Mars", radiusKm: 3396, orbitalAU: 1.52, inclination: 1.8 },
    { name: "Jupiter", radiusKm: 71492, orbitalAU: 5.2, inclination: 1.3 },
    { name: "Saturn", radiusKm: 60268, orbitalAU: 9.57, inclination: 2.5 },
    { name: "Uranus", radiusKm: 25559, orbitalAU: 19.17, inclination: 0.8 },
    { name: "Neptune", radiusKm: 24764, orbitalAU: 30.18, inclination: 1.8 },
  ].map(Object.freeze),
);

// Display coordinates, deliberately separate from the physical reference data.
// The observer is near Earth. Distances are compressed and phases are authored:
// this is a legible game composition, not current planetary positions or scale.
export const solarSystemSunPosition = Object.freeze([1450, 260, 100]);
export const moonDisplayRadius = 3.6;
export function moonOrbitPosition(elapsed = 0) {
  // A broad, mostly face-on display orbit keeps the Moon's silhouette clear
  // of Earth's limb from the gameplay camera, including its shoulder offset.
  const phase = elapsed * 0.012 + 2.7;
  return [
    34 * Math.cos(phase),
    34 * Math.sin(phase) * Math.cos(0.35),
    34 * Math.sin(phase) * Math.sin(0.35),
  ];
}
const radians = Math.PI / 180;
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const normalize = (v) => {
  const length = Math.hypot(...v);
  return v.map((component) => component / length);
};

const display = Object.freeze({
  Mercury: { phase: 70, diameter: 0.25, kind: 5, texture: "mercury.jpg" },
  Venus: { phase: -65, diameter: 0.6, kind: 1, texture: "venus.jpg" },
  Earth: { phase: 0, diameter: null, kind: -1, texture: null },
  Mars: { phase: 80, diameter: 0.34, kind: 2, texture: "mars.jpg" },
  Jupiter: { phase: 60, diameter: 7, kind: 3, texture: "jupiter.jpg" },
  Saturn: { phase: -45, diameter: 5.8, kind: 4, texture: "saturn.jpg" },
  Uranus: { phase: -100, diameter: 2.5, kind: 6, texture: "uranus.webp" },
  Neptune: { phase: 60, diameter: 2.4, kind: 7, texture: "neptune.jpg" },
});

export function compressedOrbitalDistance(orbitalAU, earthSunDistance) {
  return earthSunDistance * (orbitalAU <= 1 ? orbitalAU : orbitalAU ** 0.18);
}

export function createSolarSystemLayout(sunPosition = solarSystemSunPosition) {
  const earthSunDistance = Math.hypot(...sunPosition);
  // An ecliptic basis whose zero longitude is the Sun-to-Earth direction.
  const earthAxis = normalize(sunPosition.map((component) => -component));
  const referenceUp = Math.abs(earthAxis[1]) > 0.99 ? [0, 0, 1] : [0, 1, 0];
  const transverseAxis = normalize(cross(referenceUp, earthAxis));
  const north = cross(earthAxis, transverseAxis);
  return solarSystem.map((body) => {
    const settings = display[body.name];
    const orbitRadius = compressedOrbitalDistance(
      body.orbitalAU,
      earthSunDistance,
    );
    const phase = settings.phase * radians;
    const inclination = body.inclination * radians;
    const position = sunPosition.map(
      (component, axis) =>
        component +
        orbitRadius *
          (earthAxis[axis] * Math.cos(phase) +
            (transverseAxis[axis] * Math.cos(inclination) +
              north[axis] * Math.sin(inclination)) *
              Math.sin(phase)),
    );
    const distance = Math.hypot(...position);
    return {
      ...body,
      ...settings,
      orbitRadius,
      position,
      distance,
      // The gameplay Earth remains the existing 12-unit sphere, not a duplicate.
      radius:
        body.name === "Earth"
          ? 12
          : distance * Math.sin((settings.diameter * radians) / 2),
      azimuth: distance ? Math.atan2(position[0], -position[2]) / radians : 0,
      elevation: distance ? Math.asin(position[1] / distance) / radians : 0,
    };
  });
}
