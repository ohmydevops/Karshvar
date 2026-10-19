// Axial tilt reference: https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html
export const earthAxialTilt = (23.44 * Math.PI) / 180;
export function createHomeScene(random = Math.random) {
  const tau = Math.PI * 2;
  const sunlightAngle = (random() - 0.5) * Math.PI;
  return {
    earthRotation: random() * tau,
    axisHeading: random() * tau,
    sunDirection: [
      Math.cos(sunlightAngle) * 3,
      1.5,
      Math.sin(sunlightAngle) * 2.2,
    ],
    satellites: Array.from({ length: 6 }, (_, i) => ({
      radius: 1.2 + i * 0.025,
      inclination: random() * Math.PI,
      node: random() * tau,
      phase: random() * tau,
      speed: 0.18 + random() * 0.16,
      scale: 0.52,
    })),
  };
}
