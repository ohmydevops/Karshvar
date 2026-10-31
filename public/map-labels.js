// Try a short callout when a country's centered label would overlap a neighbor.
export function countryFlag(code) {
  return /^[A-Z]{2}$/.test(code || "")
    ? [...code]
        .map((letter) => String.fromCodePoint(127397 + letter.charCodeAt(0)))
        .join("")
    : "";
}
export function placeMapLabel(
  anchor,
  width,
  height,
  bounds,
  occupied,
  callout = false,
) {
  const [x, y] = anchor;
  const offsets = [
    ...(callout ? [] : [[0, 0]]),
    [0, -height * 1.3],
    [0, height * 1.3],
    [-width * 0.6, 0],
    [width * 0.6, 0],
  ];
  for (const [dx, dy] of offsets) {
    const box = [
      x + dx - width / 2,
      y + dy - height / 2,
      x + dx + width / 2,
      y + dy + height / 2,
    ];
    if (
      box[0] < bounds[0] ||
      box[1] < bounds[1] ||
      box[2] > bounds[2] ||
      box[3] > bounds[3]
    )
      continue;
    if (
      occupied.some(
        (b) => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1],
      )
    )
      continue;
    return {
      point: [x + dx, y + dy],
      box,
      shifted: dx !== 0 || dy !== 0,
      connector: [
        Math.max(box[0], Math.min(x, box[2])),
        Math.max(box[1], Math.min(y, box[3])),
      ],
    };
  }
  return null;
}
