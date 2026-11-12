import { readFileSync, writeFileSync } from "node:fs";
import { optimizeISS } from "./optimize-iss.mjs";

// Remove overlapping faces with identical positions AND winding. Oppositely
// wound faces are intentional backs of thin panels and must be retained.
export function repairISS(input) {
  const size = input.readUInt32LE(12);
  const doc = JSON.parse(input.subarray(20, 20 + size));
  const bin = Buffer.from(input.subarray(28 + size));
  const chunks = [bin];
  let byteLength = bin.length;
  let removed = 0;
  for (const mesh of doc.meshes)
    for (const primitive of mesh.primitives) {
      if (primitive.mode !== undefined && primitive.mode !== 4) continue;
      const indices = doc.accessors[primitive.indices];
      const indexView = doc.bufferViews[indices.bufferView];
      const positions = doc.accessors[primitive.attributes.POSITION];
      const positionView = doc.bufferViews[positions.bufferView];
      if (positions.componentType !== 5126 || positions.type !== "VEC3")
        throw new Error("Expected float positions");
      const indexSize = indices.componentType === 5123 ? 2 : 4;
      const offset = (indexView.byteOffset || 0) + (indices.byteOffset || 0);
      const positionOffset =
        (positionView.byteOffset || 0) + (positions.byteOffset || 0);
      const retained = [],
        seen = new Set();
      for (let i = 0; i < indices.count; i += 3) {
        const triangle = [0, 1, 2].map((k) =>
          bin.readUIntLE(offset + (i + k) * indexSize, indexSize),
        );
        const points = triangle.map((vertex) => {
          const at = positionOffset + vertex * (positionView.byteStride || 12);
          return [0, 4, 8].map((k) => bin.readFloatLE(at + k)).join(",");
        });
        const key = [0, 1, 2]
          .map((k) =>
            [points[k], points[(k + 1) % 3], points[(k + 2) % 3]].join("|"),
          )
          .sort()[0];
        if (seen.has(key)) {
          removed++;
          continue;
        }
        seen.add(key);
        retained.push(...triangle);
      }
      const align = Buffer.alloc((4 - (byteLength % 4)) % 4);
      chunks.push(align);
      byteLength += align.length;
      const data = Buffer.alloc(retained.length * indexSize);
      retained.forEach((vertex, i) =>
        data.writeUIntLE(vertex, i * indexSize, indexSize),
      );
      indices.bufferView =
        doc.bufferViews.push({
          buffer: 0,
          byteOffset: byteLength,
          byteLength: data.length,
          target: 34963,
        }) - 1;
      indices.byteOffset = 0;
      chunks.push(data);
      byteLength += data.length;
      indices.count = retained.length;
    }
  doc.buffers[0].byteLength = byteLength;
  chunks.push(Buffer.alloc((4 - (byteLength % 4)) % 4));
  const packed = Buffer.concat(chunks);
  const json = Buffer.from(JSON.stringify(doc));
  const padding = Buffer.alloc((4 - (json.length % 4)) % 4, 32);
  const header = Buffer.from(input.subarray(0, 20));
  header.writeUInt32LE(28 + json.length + padding.length + packed.length, 8);
  header.writeUInt32LE(json.length + padding.length, 12);
  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(packed.length, 0);
  binHeader.writeUInt32LE(0x004e4942, 4);
  return {
    removed,
    bytes: optimizeISS(
      Buffer.concat([header, json, padding, binHeader, packed]),
    ),
  };
}
if (process.argv[1]?.endsWith("repair-iss.mjs") && process.argv[2]) {
  const result = repairISS(readFileSync(process.argv[2]));
  writeFileSync(process.argv[3] || process.argv[2], result.bytes);
  console.log(
    `Removed ${result.removed} coincident same-facing triangles; ${result.bytes.length} bytes`,
  );
}
