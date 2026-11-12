import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { optimizeISS } from "../scripts/optimize-iss.mjs";
import { repairISS } from "../scripts/repair-iss.mjs";

function decode(bytes) {
  const size = bytes.readUInt32LE(12);
  return {
    doc: JSON.parse(bytes.subarray(20, 20 + size)),
    bin: bytes.subarray(28 + size),
  };
}
function geometry({ doc, bin }) {
  function value(index, row) {
    const a = doc.accessors[index],
      v = doc.bufferViews[a.bufferView];
    const size =
      { 5121: 1, 5123: 2, 5125: 4, 5126: 4 }[a.componentType] *
      { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type];
    assert.ok(row < a.count);
    const offset =
      (v.byteOffset || 0) + (a.byteOffset || 0) + row * (v.byteStride || size);
    return bin.subarray(offset, offset + size);
  }
  return doc.meshes.map((mesh) =>
    mesh.primitives.map((p) => {
      const hash = createHash("sha256");
      const count = doc.accessors[p.indices].count;
      const names = Object.keys(p.attributes).sort();
      for (let i = 0; i < count; i++) {
        const index = value(p.indices, i);
        const vertex = index.readUIntLE(0, index.length);
        for (const name of names)
          hash.update(value(p.attributes[name], vertex));
      }
      return {
        count,
        names,
        material: p.material,
        mode: p.mode,
        hash: hash.digest("hex"),
      };
    }),
  );
}
function images({ doc, bin }) {
  return doc.images.map((image) => {
    const v = doc.bufferViews[image.bufferView];
    return createHash("sha256")
      .update(
        bin.subarray(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength),
      )
      .digest("hex");
  });
}

function surfaces({ doc, bin }) {
  return doc.meshes.map((mesh) =>
    mesh.primitives.map((p) => {
      const ia = doc.accessors[p.indices],
        iv = doc.bufferViews[ia.bufferView];
      const pa = doc.accessors[p.attributes.POSITION],
        pv = doc.bufferViews[pa.bufferView];
      const size = ia.componentType === 5123 ? 2 : 4,
        result = new Set();
      for (let i = 0; i < ia.count; i += 3) {
        const points = [0, 1, 2].map((k) => {
          const vertex = bin.readUIntLE(
            (iv.byteOffset || 0) + (ia.byteOffset || 0) + (i + k) * size,
            size,
          );
          const offset =
            (pv.byteOffset || 0) +
            (pa.byteOffset || 0) +
            vertex * (pv.byteStride || 12);
          return [0, 4, 8].map((d) => bin.readFloatLE(offset + d)).join(",");
        });
        result.add(
          [0, 1, 2]
            .map((k) =>
              [points[k], points[(k + 1) % 3], points[(k + 2) % 3]].join("|"),
            )
            .sort()[0],
        );
      }
      return [...result].sort();
    }),
  );
}

test("station repair retains every oriented surface and panel back and is idempotent", () => {
  const input = readFileSync(
    process.env.ISS_REFERENCE ||
      new URL("../public/art/iss.glb", import.meta.url),
  );
  const repaired = repairISS(input);
  const before = decode(input),
    after = decode(repaired.bytes);
  assert.deepEqual(surfaces(after), surfaces(before));
  assert.deepEqual(images(after), images(before));
  assert.deepEqual(after.doc.materials, before.doc.materials);
  assert.equal(repairISS(repaired.bytes).removed, 0);
  const count = (doc) =>
    doc.meshes.reduce(
      (sum, m) =>
        sum +
        m.primitives.reduce(
          (n, p) => n + doc.accessors[p.indices].count / 3,
          0,
        ),
      0,
    );
  assert.equal(count(before.doc) - count(after.doc), repaired.removed);
});
test("ISS compaction preserves every triangle attribute byte, embedded image and scene", () => {
  const source = readFileSync(
    process.env.ISS_REFERENCE ||
      new URL("../public/art/iss.glb", import.meta.url),
  );
  const optimized = optimizeISS(source);
  const before = decode(source),
    after = decode(optimized);
  assert.deepEqual(geometry(after), geometry(before));
  assert.deepEqual(images(after), images(before));
  for (const key of [
    "nodes",
    "scenes",
    "scene",
    "materials",
    "textures",
    "samplers",
    "asset",
    "extensionsUsed",
  ])
    assert.deepEqual(after.doc[key], before.doc[key]);
  assert.ok(optimized.length <= source.length);
  assert.ok(optimized.length < 3_000_000);
});
