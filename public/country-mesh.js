import { ShapeUtils, Vector2 } from "./vendor/three.core.min.js";

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = (v) => {
  const n = Math.hypot(...v);
  return v.map((x) => x / n);
};
export function spherePoint([lon, lat]) {
  lon *= Math.PI / 180;
  lat *= Math.PI / 180;
  return [
    Math.cos(lat) * Math.cos(lon),
    Math.cos(lat) * Math.sin(lon),
    Math.sin(lat),
  ];
}

// Work in a local tangent plane so dateline crossings and polar rings have
// no longitude seam. Gnomonic edges are the same great circles as the borders.
export function triangulateCountry(polygon, maxAngle = Math.PI / 180) {
  const rings = polygon.map((r) => r.slice(0, -1).map(spherePoint));
  const center = unit(
    rings[0].reduce((sum, v) => sum.map((x, i) => x + v[i]), [0, 0, 0]),
  );
  const east = unit(
    Math.abs(center[2]) < 0.99
      ? [-center[1], center[0], 0]
      : [0, -center[2], center[1]],
  );
  const north = [
    center[1] * east[2] - center[2] * east[1],
    center[2] * east[0] - center[0] * east[2],
    center[0] * east[1] - center[1] * east[0],
  ];
  const projected = rings.map((r) =>
    r.map((v) => {
      const depth = dot(v, center);
      if (depth <= 0)
        throw Error("Country polygon exceeds its tangent hemisphere");
      return new Vector2(dot(v, east) / depth, dot(v, north) / depth);
    }),
  );
  // A spherical polygon may encode the polar cap as the complement of its
  // first ring. In a tangent plane the largest ring is the exterior contour.
  const order = projected
    .map((ring, i) => ({ i, area: Math.abs(ShapeUtils.area(ring)) }))
    .sort((a, b) => b.area - a.area)
    .map(({ i }) => i);
  const contours = order.map((i) => projected[i]);
  let triangles = ShapeUtils.triangulateShape(contours[0], contours.slice(1));
  const vertices = order.flatMap((i) => rings[i]);
  const threshold = Math.cos(maxAngle);
  // Every long edge is split in all adjacent faces in the same pass. This
  // prevents cracks/T junctions without refining tiny islands unnecessarily.
  for (;;) {
    const mids = new Map();
    const key = (a, b) => (a < b ? a + ":" + b : b + ":" + a);
    for (const t of triangles)
      for (let i = 0; i < 3; i++) {
        const a = t[i],
          b = t[(i + 1) % 3],
          k = key(a, b);
        if (!mids.has(k) && dot(vertices[a], vertices[b]) < threshold) {
          mids.set(k, vertices.length);
          vertices.push(unit(vertices[a].map((x, j) => x + vertices[b][j])));
        }
      }
    if (!mids.size) break;
    const next = [];
    for (const [a, b, c] of triangles) {
      const ab = mids.get(key(a, b)),
        bc = mids.get(key(b, c)),
        ca = mids.get(key(c, a));
      const mask =
        (ab !== undefined ? 1 : 0) |
        (bc !== undefined ? 2 : 0) |
        (ca !== undefined ? 4 : 0);
      switch (mask) {
        case 0:
          next.push([a, b, c]);
          break;
        case 1:
          next.push([a, ab, c], [ab, b, c]);
          break;
        case 2:
          next.push([b, bc, a], [bc, c, a]);
          break;
        case 4:
          next.push([c, ca, b], [ca, a, b]);
          break;
        case 3:
          next.push([b, bc, ab], [a, ab, c], [ab, bc, c]);
          break;
        case 6:
          next.push([c, ca, bc], [b, bc, a], [bc, ca, a]);
          break;
        case 5:
          next.push([a, ab, ca], [c, ca, b], [ca, ab, b]);
          break;
        case 7:
          next.push([a, ab, ca], [ab, b, bc], [ca, bc, c], [ab, bc, ca]);
          break;
      }
    }
    triangles = next;
  }
  return { vertices, triangles };
}

export function buildCountryMesh(features) {
  const positions = [],
    ids = [],
    borders = [];
  features.forEach((feature, index) => {
    const polygons =
      feature.geometry.type === "Polygon"
        ? [feature.geometry.coordinates]
        : feature.geometry.coordinates;
    for (const polygon of polygons) {
      const { vertices, triangles } = triangulateCountry(polygon);
      for (const t of triangles)
        for (const i of t) {
          positions.push(...vertices[i]);
          ids.push(index + 1);
        }
      for (const ring of polygon)
        for (let i = 1; i < ring.length; i++) {
          const a = spherePoint(ring[i - 1]),
            b = spherePoint(ring[i]);
          const angle = Math.acos(Math.max(-1, Math.min(1, dot(a, b))));
          const steps = Math.max(1, Math.ceil(angle / (Math.PI / 360)));
          const at = (t) =>
            angle < 1e-10
              ? a
              : a.map(
                  (x, j) =>
                    (x * Math.sin((1 - t) * angle) +
                      b[j] * Math.sin(t * angle)) /
                    Math.sin(angle),
                );
          for (let k = 0; k < steps; k++)
            borders.push(...at(k / steps), ...at((k + 1) / steps));
        }
    }
  });
  const strokeStarts = [],
    strokeEnds = [],
    strokeCorners = [];
  for (let i = 0; i < borders.length; i += 6) {
    for (const [along, side] of [
      [0, -1],
      [1, -1],
      [1, 1],
      [0, -1],
      [1, 1],
      [0, 1],
    ]) {
      strokeStarts.push(borders[i], borders[i + 1], borders[i + 2]);
      strokeEnds.push(borders[i + 3], borders[i + 4], borders[i + 5]);
      strokeCorners.push(along, side);
    }
  }
  return {
    positions: new Float32Array(positions),
    ids: new Float32Array(ids),
    borders: new Float32Array(borders),
    strokeStarts: new Float32Array(strokeStarts),
    strokeEnds: new Float32Array(strokeEnds),
    strokeCorners: new Float32Array(strokeCorners),
  };
}
