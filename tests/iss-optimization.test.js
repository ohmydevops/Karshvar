import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { optimizeISS } from "../scripts/optimize-iss.mjs";

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
