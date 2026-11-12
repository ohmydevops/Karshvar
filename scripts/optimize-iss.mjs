import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

// Lossless compaction: retain every indexed attribute byte, triangle and image.
// No quantization, decimation, texture conversion or runtime decoder required.
export function optimizeISS(input) {
  if (input.readUInt32LE(0) !== 0x46546c67 || input.readUInt32LE(4) !== 2)
    throw new Error("Expected GLB 2.0");
  const jsonLength = input.readUInt32LE(12);
  const doc = JSON.parse(input.subarray(20, 20 + jsonLength));
  const source = input.subarray(28 + jsonLength);
  if (doc.animations?.length || doc.skins?.length || doc.buffers.length !== 1)
    throw new Error("Only a static, single-buffer model is supported");
  const originalAccessors = doc.accessors;
  const originalViews = doc.bufferViews;
  const chunks = [],
    views = [],
    accessors = [],
    reused = new Map();
  let length = 0;
  function append(bytes, target) {
    const key = target + ":" + createHash("sha256").update(bytes).digest("hex");
    if (reused.has(key)) return reused.get(key);
    const padding = (4 - (length % 4)) % 4;
    chunks.push(Buffer.alloc(padding));
    length += padding;
    const index = views.length;
    views.push({
      buffer: 0,
      byteOffset: length,
      byteLength: bytes.length,
      ...(target ? { target } : {}),
    });
    chunks.push(bytes);
    length += bytes.length;
    reused.set(key, index);
    return index;
  }
  function elements(index) {
    const a = originalAccessors[index],
      v = originalViews[a.bufferView];
    const size =
      { 5121: 1, 5123: 2, 5125: 4, 5126: 4 }[a.componentType] *
      { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type];
    if (!size || a.sparse || !v) throw new Error("Unsupported accessor");
    const offset = (v.byteOffset || 0) + (a.byteOffset || 0);
    return {
      a,
      size,
      at: (i) =>
        source.subarray(
          offset + i * (v.byteStride || size),
          offset + i * (v.byteStride || size) + size,
        ),
    };
  }
  for (const mesh of doc.meshes)
    for (const p of mesh.primitives) {
      if (p.targets || p.extensions || p.indices === undefined)
        throw new Error("Unsupported primitive");
      const indices = elements(p.indices);
      const attributes = Object.entries(p.attributes).map(([name, index]) => [
        name,
        elements(index),
      ]);
      const unique = new Map(),
        rows = [],
        remapped = [];
      for (let i = 0; i < indices.a.count; i++) {
        const vertex = indices.at(i).readUIntLE(0, indices.size);
        if (attributes.some(([, e]) => vertex >= e.a.count))
          throw new Error("Invalid vertex index");
        const row = attributes.map(([, e]) => e.at(vertex));
        const key = Buffer.concat(row).toString("base64");
        if (!unique.has(key)) {
          unique.set(key, rows.length);
          rows.push(row);
        }
        remapped.push(unique.get(key));
      }
      attributes.forEach(([name, e], column) => {
        const bytes = Buffer.concat(rows.map((row) => row[column]));
        const a = {
          ...e.a,
          bufferView: append(bytes, 34962),
          byteOffset: 0,
          count: rows.length,
        };
        if (a.componentType === 5126 && (a.min || a.max)) {
          const dimensions = e.size / 4;
          a.min = Array(dimensions).fill(Infinity);
          a.max = Array(dimensions).fill(-Infinity);
          rows.forEach((row) => {
            for (let d = 0; d < dimensions; d++) {
              const value = row[column].readFloatLE(d * 4);
              a.min[d] = Math.min(a.min[d], value);
              a.max[d] = Math.max(a.max[d], value);
            }
          });
        }
        p.attributes[name] = accessors.push(a) - 1;
      });
      const bytesPerIndex = rows.length <= 65536 ? 2 : 4;
      const bytes = Buffer.alloc(remapped.length * bytesPerIndex);
      remapped.forEach((value, i) =>
        bytes.writeUIntLE(value, i * bytesPerIndex, bytesPerIndex),
      );
      p.indices =
        accessors.push({
          bufferView: append(bytes, 34963),
          componentType: bytesPerIndex === 2 ? 5123 : 5125,
          count: remapped.length,
          type: "SCALAR",
        }) - 1;
    }
  for (const image of doc.images || []) {
    const v = originalViews[image.bufferView];
    if (!v) throw new Error("Expected embedded image");
    image.bufferView = append(
      source.subarray(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength),
    );
  }
  doc.accessors = accessors;
  doc.bufferViews = views;
  doc.buffers = [{ byteLength: length }];
  const json = Buffer.from(JSON.stringify(doc));
  const jsonPad = Buffer.alloc((4 - (json.length % 4)) % 4, 32);
  const bin = Buffer.concat([...chunks, Buffer.alloc((4 - (length % 4)) % 4)]);
  const header = Buffer.alloc(20),
    binHeader = Buffer.alloc(8);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(28 + json.length + jsonPad.length + bin.length, 8);
  header.writeUInt32LE(json.length + jsonPad.length, 12);
  header.writeUInt32LE(0x4e4f534a, 16);
  binHeader.writeUInt32LE(bin.length, 0);
  binHeader.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([header, json, jsonPad, binHeader, bin]);
}

if (process.argv[1]?.endsWith("optimize-iss.mjs") && process.argv[2]) {
  const input = readFileSync(process.argv[2]);
  const output = optimizeISS(input);
  writeFileSync(process.argv[3] || process.argv[2], output);
  console.log(
    `${input.length} -> ${output.length} bytes (${(100 * (1 - output.length / input.length)).toFixed(1)}% smaller)`,
  );
}
