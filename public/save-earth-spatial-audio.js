import { Vector3, Quaternion } from "./vendor/three.module.min.js";
const relative = new Vector3(),
  inverse = new Quaternion();

export function distanceAudio(position, listener, result = {}) {
  if (!position || !listener)
    return Object.assign(result, {
      gain: 0.45,
      cutoff: 1800,
      pan: 0,
      distance: 60,
    });
  relative.copy(position).sub(listener.position);
  const distance = relative.length();
  inverse.copy(listener.orientation).invert();
  relative.applyQuaternion(inverse);
  result.distance = distance;
  result.gain = 1 / (1 + distance / 30);
  result.cutoff = 550 + 2800 / (1 + distance / 40);
  result.pan = Math.max(
    -1,
    Math.min(1, relative.x / Math.max(1, Math.hypot(relative.x, relative.z))),
  );
  return result;
}
