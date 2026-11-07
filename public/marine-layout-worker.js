import "./vendor/d3.min.js";
import {
  fitMarineLabel,
  marineAngle,
  waterPredicate,
} from "./marine-placement.js";
import { marineAxes } from "./marine-axes.js";

let isWater;
self.onmessage = ({ data }) => {
  if (data.land) {
    isWater = waterPredicate(data.land, globalThis.d3);
    return;
  }
  if (!isWater) return;
  const { key, camera, scale, bounds, labels } = data;
  const projection = globalThis.d3
    .geoOrthographic()
    .rotate(camera.rotation)
    .translate(camera.translation)
    .scale(camera.zoom)
    .clipAngle(90);
  const occupied = [];
  const placements = [];
  for (const label of labels) {
    const angle = marineAngle(projection, label.point, marineAxes[label.id]);
    const placement = fitMarineLabel(
      projection(label.point),
      label.width,
      angle,
      scale,
      bounds,
      occupied,
      (screen) => {
        const point = projection.invert(screen);
        if (!point || !point.every(Number.isFinite)) return false;
        const projected = projection(point);
        return (
          Math.hypot(projected[0] - screen[0], projected[1] - screen[1]) <
            0.1 && isWater(point)
        );
      },
    );
    if (!placement) continue;
    occupied.push(placement.box);
    placements.push([
      label.id,
      {
        point: projection.invert(placement.point),
        fontSize: placement.fontSize,
      },
    ]);
  }
  self.postMessage({ key, placements });
};
