import { Vector4, Quaternion, Vector3 } from "./vendor/three.module.min.js";

export const atmosphereMask = `
  uniform vec4 breaches[12];
  uniform float damage;
  float atmosphereCoverage(vec3 p) {
    float coverage = 1.;
    for (int i = 0; i < 12; i++) {
      float rough = sin(p.x * 29. + float(i)) * sin(p.y * 23. - p.z * 19.) * .018;
      float radius = sqrt(.45 + .55 * clamp(damage, 0., 1.)) * breaches[i].w;
      float distanceToHole = length(p - breaches[i].xyz) + rough;
      coverage *= smoothstep(radius - .035, radius + .045, distanceToHole);
    }
    return coverage;
  }
`;

export function createAtmosphereDamage(random = Math.random) {
  const uniforms = {
    damage: { value: 0 },
    cloudDrift: { value: 0 },
    breaches: { value: Array.from({ length: 12 }, () => new Vector4()) },
  };
  function reset() {
    // Rotate an evenly spaced field, then jitter each breach independently.
    const rotation = new Quaternion().setFromAxisAngle(
      new Vector3(random() - 0.5, random() - 0.5, random() - 0.5).normalize(),
      random() * Math.PI * 2,
    );
    const direction = new Vector3();
    uniforms.breaches.value.forEach((breach, i) => {
      const y = 1 - (2 * (i + 0.5)) / 12;
      const r = Math.sqrt(1 - y * y);
      const angle = i * 2.39996 + (random() - 0.5) * 0.4;
      direction
        .set(
          Math.cos(angle) * r,
          y + (random() - 0.5) * 0.12,
          Math.sin(angle) * r,
        )
        .normalize()
        .applyQuaternion(rotation);
      breach.set(direction.x, direction.y, direction.z, 0.23 + random() * 0.14);
    });
    uniforms.damage.value = 0;
  }
  reset();
  return { uniforms, reset };
}
