import { Vector3, Quaternion, Euler } from "./vendor/three.module.min.js";

export const planetRadius = 12;
export const initialPilotPosition = Object.freeze(new Vector3(0, 3, 90));
export const localFlightRadius = 400;

// Earth is distant scenery: local translation changes nearby objects, not its
// apparent distance. Reuse the caller's Vector3 in rendering/physics loops.
export function earthAnchor(pilot, target = new Vector3()) {
  return target.copy(pilot.position).sub(initialPilotPosition);
}

export function createPilot() {
  return {
    position: initialPilotPosition.clone(),
    velocity: new Vector3(),
    flightRadius: Infinity,
    angularVelocity: new Vector3(),
    orientation: new Quaternion(),
    turn: new Euler(0, 0, 0, "YXZ"),
  };
}
const rotation = new Quaternion();
const thrust = new Vector3();
const flightOffset = new Vector3();
export function turnPilot(pilot, dx, dy) {
  rotation.setFromEuler(pilot.turn.set(-dy * 0.002, -dx * 0.002, 0, "YXZ"));
  pilot.orientation.multiply(rotation).normalize();
  pilot.angularVelocity.x = Math.max(
    -0.35,
    Math.min(0.35, pilot.angularVelocity.x - dy * 0.001),
  );
  pilot.angularVelocity.y = Math.max(
    -0.35,
    Math.min(0.35, pilot.angularVelocity.y - dx * 0.001),
  );
}
export function flyPilot(pilot, keys, dt) {
  const x =
    Number(keys.has("KeyD") || keys.has("ArrowRight")) -
    Number(keys.has("KeyA") || keys.has("ArrowLeft"));
  const y =
    Number(keys.has("Space")) -
    Number(keys.has("ShiftLeft") || keys.has("ShiftRight"));
  const z =
    Number(keys.has("KeyS") || keys.has("ArrowDown")) -
    Number(keys.has("KeyW") || keys.has("ArrowUp"));
  thrust.set(x, y, z);
  if (thrust.lengthSq() > 1) thrust.normalize();
  thrust.applyQuaternion(pilot.orientation);
  pilot.velocity.addScaledVector(thrust, 3.5 * dt);
  pilot.velocity.clampLength(0, 3);
  pilot.position.addScaledVector(pilot.velocity, dt);
  flightOffset.copy(pilot.position).sub(initialPilotPosition);
  const radius = flightOffset.length();
  const flightRadius = pilot.flightRadius ?? localFlightRadius;
  if (radius > flightRadius) {
    flightOffset.multiplyScalar(1 / radius);
    pilot.position
      .copy(initialPilotPosition)
      .addScaledVector(flightOffset, flightRadius);
    // Stop only outward drift; preserve sideways flight and inward recovery.
    pilot.velocity.addScaledVector(
      flightOffset,
      -Math.max(0, pilot.velocity.dot(flightOffset)),
    );
  }
  const bank = Number(keys.has("KeyQ")) - Number(keys.has("KeyE"));
  const angular = pilot.angularVelocity;
  // Q/E apply torque. Releasing both keys preserves angular momentum.
  const beforeRoll = angular.z;
  const acceleration = bank * 0.8;
  const acceleratingFor = bank
    ? Math.min(dt, Math.max(0, (bank * 0.8 - beforeRoll) / acceleration))
    : 0;
  angular.z = Math.max(
    -0.8,
    Math.min(0.8, beforeRoll + acceleration * acceleratingFor),
  );
  if (Math.abs(angular.z) < 1e-10) angular.z = 0;
  const rollStep =
    (beforeRoll + angular.z) * 0.5 * acceleratingFor +
    angular.z * (dt - acceleratingFor);
  const lookDrag = 8;
  const lookDecay = Math.exp(-lookDrag * dt);
  rotation.setFromEuler(
    pilot.turn.set(
      (angular.x * (1 - lookDecay)) / lookDrag,
      (angular.y * (1 - lookDecay)) / lookDrag,
      rollStep,
      "YXZ",
    ),
  );
  pilot.orientation.multiply(rotation).normalize();
  angular.x *= lookDecay;
  angular.y *= lookDecay;
}
const relative = new Vector3(),
  travel = new Vector3();
const listenerInverse = new Quaternion();
export function nearMeteorCue(pilot, meteor) {
  if (meteor.flybyPlayed) return null;
  relative.copy(meteor.position).sub(pilot.position);
  const distance = relative.length();
  const cueRadius = meteor.giant ? 24 : 10;
  if (distance > cueRadius) return null;
  meteor.flybyPlayed = true;
  listenerInverse.copy(pilot.orientation).invert();
  relative.applyQuaternion(listenerInverse);
  return {
    pan: Math.max(-1, Math.min(1, relative.x / 6)),
    proximity: 1 - distance / (cueRadius + 2),
  };
}
export function shotHits(shot, meteor, dt) {
  relative.copy(shot.position).sub(meteor.position);
  travel.copy(shot.velocity).sub(meteor.velocity).multiplyScalar(dt);
  const t = travel.lengthSq()
    ? Math.max(0, Math.min(1, -relative.dot(travel) / travel.lengthSq()))
    : 0;
  return (
    relative.addScaledVector(travel, t).lengthSq() <=
    ((meteor.renderRadius ?? meteor.radius) + 0.12) ** 2
  );
}
export function meteorHealth(radius) {
  return radius < 1.05 ? 1 : radius < 1.5 ? 2 : 3;
}
export function damageMeteor(meteor, damage = 1) {
  meteor.health = Math.max(0, meteor.health - damage);
  meteor.hitFlash = 0.12;
  return meteor.health === 0;
}

export function createGiantMeteor(random = Math.random, pilot) {
  const meteor = createMeteor(random, pilot);
  meteor.giant = true;
  meteor.radius = meteor.renderRadius = 6;
  meteor.health = 15;
  meteor.earthDamage = 3;
  meteor.duration = 70;
  meteor.spin *= 0.25;
  const side = random() < 0.5 ? -1 : 1;
  const offset = new Vector3(side * 40, 12, 8).applyQuaternion(
    pilot.orientation,
  );
  meteor.position.copy(pilot.position).add(offset);
  meteor.spawnPosition.copy(meteor.position);
  meteor.flybyControl = new Vector3(-side * 24, 12, 40)
    .applyQuaternion(pilot.orientation)
    .add(pilot.position);
  return meteor;
}
const meteorEndpoint = new Vector3();
const previousMeteorPosition = new Vector3();

export function createMeteor(random = Math.random, pilot) {
  const azimuth = random() * Math.PI * 2,
    y = random() * 2 - 1,
    radial = Math.sqrt(1 - y * y);
  const position = new Vector3(
    Math.cos(azimuth) * radial,
    y,
    Math.sin(azimuth) * radial,
  )
    .multiplyScalar(18 + random() * 14)
    .add(pilot?.position ?? initialPilotPosition);
  // Strike the visible hemisphere, so the rock does not disappear behind the
  // Earth before its journey completes. This offset is relative to its anchor.
  const targetSurface = new Vector3(
    (random() - 0.5) * 12,
    (random() - 0.5) * 12,
    0,
  );
  targetSurface.z = Math.sqrt(planetRadius ** 2 - targetSurface.lengthSq());
  const radius = 0.7 + random() * 1.1;
  const duration = 40 + ((radius - 0.7) / 1.1) * 30;
  if (pilot) earthAnchor(pilot, meteorEndpoint);
  else meteorEndpoint.set(0, 0, 0);
  meteorEndpoint.add(targetSurface);
  return {
    position,
    spawnPosition: position.clone(),
    targetSurface,
    age: 0,
    duration,
    health: meteorHealth(radius),
    hitFlash: 0,
    velocity: meteorEndpoint.clone().sub(position).divideScalar(duration),
    radius,
    renderRadius: radius,
    angle: random() * 6,
    spin: (random() - 0.5) * 2,
    appearance: Math.floor(random() * 6),
  };
}

// Near-to-far visual flight takes 40–70 seconds. The endpoint follows distant
// Earth while the spawn remains in local space; no teleport occurs as we fly.
export function advanceMeteor(meteor, pilot, dt) {
  const step = Math.max(0, dt);
  meteor.age = Math.min(meteor.duration, meteor.age + step);
  const progress = meteor.age / meteor.duration;
  earthAnchor(pilot, meteorEndpoint).add(meteor.targetSurface);
  previousMeteorPosition.copy(meteor.position);
  if (meteor.flybyControl) {
    meteor.position
      .copy(meteor.spawnPosition)
      .multiplyScalar((1 - progress) ** 2)
      .addScaledVector(meteor.flybyControl, 2 * (1 - progress) * progress)
      .addScaledVector(meteorEndpoint, progress ** 2);
  } else
    meteor.position.lerpVectors(meteor.spawnPosition, meteorEndpoint, progress);
  meteor.renderRadius = meteor.radius * (1 - 0.92 * progress);
  if (step > 0)
    meteor.velocity
      .copy(meteor.position)
      .sub(previousMeteorPosition)
      .divideScalar(step);
  return progress >= 1;
}
