// Axial tilt reference: https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html
export const earthAxialTilt = (23.44 * Math.PI) / 180;
export function createHomeScene(random = Math.random) {
  const tau = Math.PI * 2;
  return {
    // Open on Africa and Europe with the sun above the camera's left side.
    earthRotation: (-110 * Math.PI) / 180,
    axisHeading: 0,
    sunDirection: [-1.15, 0.85, 2.4],
    satellites: Array.from({ length: 3 }, (_, i) => ({
      radius: 1.2 + i * 0.025,
      inclination: random() * Math.PI,
      node: random() * tau,
      phase: random() * tau,
      speed: 0.18 + random() * 0.16,
      scale: 0.52,
    })),
  };
}
