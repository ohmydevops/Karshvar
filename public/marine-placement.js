export function marineAngle(projection, point, axis = [1, 0]) {
  const a = projection([point[0] - axis[0] * 0.05, point[1] - axis[1] * 0.05]);
  const b = projection([point[0] + axis[0] * 0.05, point[1] + axis[1] * 0.05]);
  const angle = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
  return ((angle + 270) % 180) - 90;
}

export function placeMarineLabel(
  point,
  width,
  height,
  angle,
  bounds,
  occupied,
  isWater,
) {
  const radians = (angle * Math.PI) / 180;
  const cos = Math.cos(radians),
    sin = Math.sin(radians);
  for (const [along, offset] of [
    [0, 0],
    [0, -height],
    [0, height],
    [-width / 3, 0],
    [width / 3, 0],
    [-width / 3, -height],
    [width / 3, -height],
    [-width / 3, height],
    [width / 3, height],
    [-width * 0.75, 0],
    [width * 0.75, 0],
    [-width * 1.5, 0],
    [width * 1.5, 0],
    [0, -height * 2],
    [0, height * 2],
  ]) {
    const center = [
      point[0] + cos * along - sin * offset,
      point[1] + sin * along + cos * offset,
    ];
    const samples = [];
    // Check the whole rotated text footprint, including its ends and edges.
    const columns = Math.max(8, Math.ceil(width / (height / 3)));
    for (let row = 0; row <= 2; row++) {
      for (let col = 0; col <= columns; col++) {
        const x = width * (col / columns - 0.5),
          y = height * (row / 2 - 0.5);
        samples.push([
          center[0] + x * cos - y * sin,
          center[1] + x * sin + y * cos,
        ]);
      }
    }
    const box = [
      Math.min(...samples.map((p) => p[0])),
      Math.min(...samples.map((p) => p[1])),
      Math.max(...samples.map((p) => p[0])),
      Math.max(...samples.map((p) => p[1])),
    ];
    if (
      box[0] < bounds[0] ||
      box[1] < bounds[1] ||
      box[2] > bounds[2] ||
      box[3] > bounds[3]
    )
      continue;
    if (
      occupied.some((b) => {
        if (!(box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1]))
          return false;
        const dx = center[0] - (b[0] + b[2]) / 2;
        const dy = center[1] - (b[1] + b[3]) / 2;
        const halfWidth = (b[2] - b[0]) / 2,
          halfHeight = (b[3] - b[1]) / 2;
        return (
          Math.abs(dx * cos + dy * sin) <
            width / 2 +
              halfWidth * Math.abs(cos) +
              halfHeight * Math.abs(sin) &&
          Math.abs(-dx * sin + dy * cos) <
            height / 2 + halfWidth * Math.abs(sin) + halfHeight * Math.abs(cos)
        );
      })
    )
      continue;
    if (!samples.every(isWater)) continue;
    return { point: center, box, angle };
  }
  return null;
}

export function fitMarineLabel(
  point,
  textWidth,
  angle,
  scale,
  bounds,
  occupied,
  isWater,
) {
  for (const fontSize of [13, 11, 9, 7]) {
    const width = ((textWidth * fontSize) / 13 + 4) / scale;
    const height = (fontSize + 3) / scale;
    const placement = placeMarineLabel(
      point,
      width,
      height,
      angle,
      bounds,
      occupied,
      isWater,
    );
    if (placement) return { ...placement, fontSize };
  }
  return null;
}

export function waterPredicate(countries, geo) {
  const indexed = countries.map((feature) => ({
    feature,
    bounds: geo.geoBounds(feature),
  }));
  return ([lon, lat]) =>
    !indexed.some(
      ({ feature, bounds: [[west, south], [east, north]] }) =>
        lat >= south &&
        lat <= north &&
        (west <= east
          ? lon >= west && lon <= east
          : lon >= west || lon <= east) &&
        geo.geoContains(feature, [lon, lat]),
    );
}
