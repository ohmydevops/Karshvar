import { Vector3 } from "./vendor/three.module.min.js";

const normal = new Vector3();
const relativeVelocity = new Vector3();
// Includes the astronaut, the full third-person camera orbit and camera lag.
const pilotClearance = 7;
export function meteorSafeDistance(meteor) {
  // Source geometry is normalized by its largest box dimension, not a sphere.
  // Cover its diagonal and the brief hit-flash enlargement conservatively.
  return (meteor.renderRadius ?? meteor.radius) * 1.85 + pilotClearance;
}

export function constrainMeteorContact(pilot, meteors) {
  // A second bounded pass resolves neighboring rocks without an unbounded solver.
  for (let pass = 0; pass < 2; pass++) {
    for (const meteor of meteors) {
      const safe = meteorSafeDistance(meteor);
      normal.copy(pilot.position).sub(meteor.position);
      const distance = normal.length();
      if (distance >= safe) continue;
      if (distance > 1e-8) normal.divideScalar(distance);
      else normal.set(0, 0, 1).applyQuaternion(pilot.orientation);
      pilot.position.copy(meteor.position).addScaledVector(normal, safe);
      relativeVelocity.copy(pilot.velocity);
      if (meteor.velocity) relativeVelocity.sub(meteor.velocity);
      const approach = relativeVelocity.dot(normal);
      // Contact stops inward motion only. Tangential and outward drift persist.
      if (approach < 0) pilot.velocity.addScaledVector(normal, -approach);
    }
  }
}
