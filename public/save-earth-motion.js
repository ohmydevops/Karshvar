import {
  Vector3,
  Quaternion,
  Euler,
  MathUtils,
} from "./vendor/three.module.min.js";

// Cosmetic inertia is separate from the authoritative camera/aim orientation.
// Exact critically-damped springs remain stable at both 30 and 144 Hz.
export function springStep(value, velocity, target, frequency, dt) {
  const error = value - target,
    term = velocity + frequency * error,
    decay = Math.exp(-frequency * dt);
  return [
    target + (error + term * dt) * decay,
    (velocity - frequency * term * dt) * decay,
  ];
}
export function createFlightMotion() {
  const body = new Quaternion(),
    lastLook = new Quaternion(),
    delta = new Quaternion(),
    inverse = new Quaternion();
  const previousVelocity = new Vector3(),
    localVelocity = new Vector3(),
    acceleration = new Vector3();
  const angles = new Euler(),
    tiltRotation = new Quaternion();
  const tilt = new Vector3(),
    tiltSpeed = new Vector3(),
    angular = new Vector3();
  const cameraLag = new Vector3(),
    cameraSpeed = new Vector3();
  const result = {
    cameraOffset: new Vector3(),
    orientation: new Quaternion(),
    offset: new Vector3(),
    blur: { x: 0, y: 0, strength: 0 },
  };
  let owner,
    lastTime = 0,
    mode;
  return {
    update(pilot, time, thirdPerson, reduced = false, active = true) {
      const elapsed = time - lastTime;
      if (
        owner !== pilot ||
        mode !== thirdPerson ||
        elapsed < 0 ||
        elapsed > 0.1 ||
        !active ||
        reduced
      ) {
        owner = pilot;
        mode = thirdPerson;
        body.copy(pilot.orientation);
        lastLook.copy(pilot.orientation);
        previousVelocity.copy(pilot.velocity);
        cameraLag.set(0, 0, 0);
        cameraSpeed.set(0, 0, 0);
        tilt.set(0, 0, 0);
        tiltSpeed.set(0, 0, 0);
        angular.set(0, 0, 0);
        result.blur.strength = 0;
      }
      const dt = Math.max(0, Math.min(elapsed, 0.05));
      lastTime = time;
      inverse.copy(pilot.orientation).invert();
      localVelocity.copy(pilot.velocity).applyQuaternion(inverse);
      acceleration
        .copy(pilot.velocity)
        .sub(previousVelocity)
        .multiplyScalar(dt > 0 ? 1 / dt : 0)
        .applyQuaternion(inverse)
        .clampLength(0, 12);
      delta.copy(lastLook).invert().multiply(pilot.orientation);
      if (delta.w < 0) delta.set(-delta.x, -delta.y, -delta.z, -delta.w);
      const rotation = 2 * Math.acos(MathUtils.clamp(delta.w, -1, 1)),
        sin = Math.sqrt(Math.max(0, 1 - delta.w * delta.w));
      const scale = sin > 0.00001 && dt > 0 ? rotation / sin / dt : 0;
      angular
        .set(delta.x * scale, delta.y * scale, delta.z * scale)
        .clampLength(0, 12);
      if (!reduced && active && dt > 0) {
        body.slerp(pilot.orientation, 1 - Math.exp(-18 * dt));
        const lag = body.angleTo(pilot.orientation),
          maxLag = thirdPerson ? 0.14 : 0.045;
        if (lag > maxLag) body.slerp(pilot.orientation, 1 - maxLag / lag);
        const amount = thirdPerson ? 1 : 0.35;
        // Acceleration creates a brief camera lag; steady travel settles to centre.
        for (const axis of ["x", "y", "z"]) {
          const target =
            MathUtils.clamp(-acceleration[axis] * 0.055, -0.45, 0.45) * amount;
          [cameraLag[axis], cameraSpeed[axis]] = springStep(
            cameraLag[axis],
            cameraSpeed[axis],
            target,
            6,
            dt,
          );
        }
        result.cameraOffset.copy(cameraLag).applyQuaternion(pilot.orientation);
        const pitch =
          MathUtils.clamp(
            acceleration.z * 0.012 + localVelocity.z * 0.018,
            -0.09,
            0.09,
          ) * amount;
        const bank =
          MathUtils.clamp(
            -acceleration.x * 0.012 -
              localVelocity.x * 0.025 -
              angular.y * 0.025,
            -0.15,
            0.15,
          ) * amount;
        [tilt.x, tiltSpeed.x] = springStep(tilt.x, tiltSpeed.x, pitch, 12, dt);
        [tilt.z, tiltSpeed.z] = springStep(tilt.z, tiltSpeed.z, bank, 12, dt);
        const target = MathUtils.smoothstep(angular.length(), 1, 5) * 0.65;
        result.blur.strength = MathUtils.damp(
          result.blur.strength,
          target,
          target > result.blur.strength ? 24 : 30,
          dt,
        );
        if (result.blur.strength < 0.015) result.blur.strength = 0;
        if (angular.lengthSq() > 0.01) {
          result.blur.x = -angular.y;
          result.blur.y = angular.x;
        }
        result.offset
          .set(Math.sin(time * 0.8) * 0.012, Math.sin(time * 1.05) * 0.018, 0)
          .applyQuaternion(pilot.orientation);
      } else {
        result.cameraOffset.set(0, 0, 0);
        result.offset.set(0, 0, 0);
      }
      tiltRotation.setFromEuler(angles.set(tilt.x, 0, tilt.z));
      result.orientation.copy(body).multiply(tiltRotation);
      lastLook.copy(pilot.orientation);
      previousVelocity.copy(pilot.velocity);
      return result;
    },
  };
}
