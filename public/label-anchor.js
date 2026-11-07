// A concave country's geographic centroid may lie in a neighboring country.
// Keep valid centroids; otherwise find a point well inside its main polygon.
export function interiorLabelPoint(geometry, geo) {
  const center = geo.geoCentroid(geometry);
  if (geo.geoContains(geometry, center)) return center;
  const [[west, south], [east, north]] = geo.geoBounds(geometry);
  const right = east < west ? east + 360 : east;
  const unwrap = (lon) => (lon < west ? lon + 360 : lon);
  const wrap = (lon) => ((lon + 540) % 360) - 180;
  const xScale = Math.cos((center[1] * Math.PI) / 180);
  const rings = geometry.coordinates.map((ring) =>
    ring.map(([lon, lat]) => [unwrap(lon) * xScale, lat]),
  );
  let best = center;
  let clearance = -1;
  let bounds = [west, south, right, north];
  for (let pass = 0; pass < 3; pass++) {
    const [left, bottom, rightEdge, top] = bounds;
    const dx = (rightEdge - left) / 24;
    const dy = (top - bottom) / 24;
    for (let row = 0; row < 24; row++) {
      for (let col = 0; col < 24; col++) {
        const lon = left + (col + 0.5) * dx;
        const lat = bottom + (row + 0.5) * dy;
        const candidate = [wrap(lon), lat];
        if (!geo.geoContains(geometry, candidate)) continue;
        const x = lon * xScale;
        let distance = Infinity;
        for (const ring of rings) {
          for (let i = 1; i < ring.length; i++) {
            const [ax, ay] = ring[i - 1];
            const [bx, by] = ring[i];
            const length = (bx - ax) ** 2 + (by - ay) ** 2;
            const t = length
              ? Math.max(
                  0,
                  Math.min(
                    1,
                    ((x - ax) * (bx - ax) + (lat - ay) * (by - ay)) / length,
                  ),
                )
              : 0;
            distance = Math.min(
              distance,
              (x - ax - t * (bx - ax)) ** 2 + (lat - ay - t * (by - ay)) ** 2,
            );
          }
        }
        if (distance > clearance) {
          clearance = distance;
          best = candidate;
        }
      }
    }
    const lon = unwrap(best[0]);
    bounds = [lon - dx, best[1] - dy, lon + dx, best[1] + dy];
  }
  return best;
}
