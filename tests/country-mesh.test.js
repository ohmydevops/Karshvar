import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import {
  triangulateCountry,
  buildCountryMesh,
  spherePoint,
} from "../public/country-mesh.js";

const context = vm.createContext({});
context.self = context;
vm.runInContext(
  fs.readFileSync("public/vendor/topojson-client.min.js", "utf8"),
  context,
);
vm.runInContext(fs.readFileSync("public/vendor/d3.min.js", "utf8"), context);
const topology = JSON.parse(fs.readFileSync("public/data/countries.json"));
const features = context.topojson.feature(
  topology,
  topology.objects.countries,
).features;
const dot = (a, b) => a.reduce((sum, x, i) => sum + x * b[i], 0);
function triangleArea(a, b, c) {
  const cross = [
    b[1] * c[2] - b[2] * c[1],
    b[2] * c[0] - b[0] * c[2],
    b[0] * c[1] - b[1] * c[0],
  ];
  return (
    2 *
    Math.atan2(Math.abs(dot(a, cross)), 1 + dot(a, b) + dot(b, c) + dot(c, a))
  );
}
test("all real country meshes preserve spherical area including polar polygons and dateline crossings", () => {
  for (const feature of features) {
    let actual = 0;
    const polygons =
      feature.geometry.type === "Polygon"
        ? [feature.geometry.coordinates]
        : feature.geometry.coordinates;
    for (const polygon of polygons) {
      const { vertices, triangles } = triangulateCountry(polygon);
      for (const t of triangles) {
        actual += triangleArea(...t.map((i) => vertices[i]));
        for (let i = 0; i < 3; i++)
          assert(
            dot(vertices[t[i]], vertices[t[(i + 1) % 3]]) >=
              Math.cos(Math.PI / 180) - 1e-10,
          );
      }
    }
    const expected = context.d3.geoArea(feature);
    assert(
      Math.abs(actual - expected) < 1e-7,
      `${feature.id}: ${actual} vs ${expected}`,
    );
  }
});
test("holes stay empty and shared triangle edges remain conforming", () => {
  const polygon = [
    [
      [0, 0],
      [0, 4],
      [4, 4],
      [4, 0],
      [0, 0],
    ],
    [
      [1, 1],
      [3, 1],
      [3, 3],
      [1, 3],
      [1, 1],
    ],
  ];
  const { vertices, triangles } = triangulateCountry(polygon);
  const actual = triangles.reduce(
    (sum, t) => sum + triangleArea(...t.map((i) => vertices[i])),
    0,
  );
  const expected = context.d3.geoArea({
    type: "Polygon",
    coordinates: polygon,
  });
  assert(Math.abs(actual - expected) < 1e-9);
  const edges = new Map();
  for (const t of triangles)
    for (let i = 0; i < 3; i++) {
      const a = t[i],
        b = t[(i + 1) % 3],
        key = a < b ? `${a}:${b}` : `${b}:${a}`;
      edges.set(key, (edges.get(key) || 0) + 1);
    }
  assert([...edges.values()].every((n) => n === 1 || n === 2));
  // Every boundary edge lies on an original outer or hole great-circle edge.
  const original = polygon.flatMap((r) =>
    r.slice(1).map((_, i) => [r[i], r[i + 1]]),
  );
  const planes = original.map(([a, b]) => {
    a = spherePoint(a);
    b = spherePoint(b);
    const n = [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0],
    ];
    const length = Math.hypot(...n);
    return n.map((x) => x / length);
  });
  for (const [key, count] of edges)
    if (count === 1) {
      const [a, b] = key.split(":").map(Number);
      assert(
        planes.some(
          (n) =>
            Math.abs(dot(n, vertices[a])) < 1e-9 &&
            Math.abs(dot(n, vertices[b])) < 1e-9,
        ),
        "No internal T junction may become a boundary",
      );
    }
});
test("tiny islands retain their shape and country ID in GPU buffers", () => {
  const islands = features.filter((f) => ["634", "048"].includes(f.id));
  assert.equal(islands.length, 2);
  const mesh = buildCountryMesh(islands);
  assert(mesh.positions.length > 0);
  assert.equal(mesh.ids.length, mesh.positions.length / 3);
  assert.deepEqual([...new Set(mesh.ids)].sort(), [1, 2]);
  assert.equal(mesh.strokeCorners.length / 2, mesh.strokeStarts.length / 3);
  assert.equal(mesh.strokeStarts.length, mesh.strokeEnds.length);
});
