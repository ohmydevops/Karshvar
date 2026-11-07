// Derive label directions from Natural Earth's marine polygons.
// Usage: node scripts/build-marine-axes.mjs output/marine.geojson
import { readFileSync, writeFileSync } from "node:fs";
const source = JSON.parse(readFileSync(process.argv[2], "utf8"));
const axes = {};
for (const feature of source.features) {
  const polygons =
    feature.geometry.type === "Polygon"
      ? [feature.geometry.coordinates]
      : feature.geometry.coordinates;
  const ring = polygons.sort((a, b) => b[0].length - a[0].length)[0][0];
  const mean = ring.reduce(
    (a, p) => [a[0] + p[0] / ring.length, a[1] + p[1] / ring.length],
    [0, 0],
  );
  const cos = Math.cos((mean[1] * Math.PI) / 180);
  let xx = 0,
    yy = 0,
    xy = 0;
  for (const p of ring) {
    const x = (p[0] - mean[0]) * cos,
      y = p[1] - mean[1];
    xx += x * x;
    yy += y * y;
    xy += x * y;
  }
  const angle = Math.atan2(2 * xy, xx - yy) / 2;
  axes[feature.properties.ne_id] = [
    Number((Math.cos(angle) / Math.max(0.1, cos)).toFixed(4)),
    Number(Math.sin(angle).toFixed(4)),
  ];
}
axes.hormuz = [0.5, 1];
writeFileSync(
  new URL("../public/marine-axes.js", import.meta.url),
  "// Label directions derived from Natural Earth marine polygons (public domain).\nexport const marineAxes = " +
    JSON.stringify(axes) +
    ";\n",
);
