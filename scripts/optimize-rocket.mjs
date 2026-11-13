import { readFileSync, writeFileSync } from "node:fs";
import { optimizeISS } from "./optimize-iss.mjs";

// The source is already low polygon. Drop its eight 2K detail maps, redundant
// UV sets and tangent streams; keep the silhouette and authored normals.
export function optimizeRocket(input) {
  const length = input.readUInt32LE(12);
  const doc = JSON.parse(input.subarray(20, 20 + length));
  doc.meshes = [doc.meshes[0]];
  doc.meshes[0].primitives.forEach((p) => {
    p.attributes = {
      POSITION: p.attributes.POSITION,
      NORMAL: p.attributes.NORMAL,
    };
    p.material = 0;
  });
  doc.nodes = [{ mesh: 0 }];
  doc.scenes = [{ nodes: [0] }];
  doc.scene = 0;
  doc.materials = [
    {
      name: "Lightweight rocket alloy",
      pbrMetallicRoughness: {
        baseColorFactor: [0.67, 0.72, 0.77, 1],
        metallicFactor: 0.45,
        roughnessFactor: 0.55,
      },
    },
  ];
  delete doc.images;
  delete doc.textures;
  delete doc.samplers;
  const raw = Buffer.from(JSON.stringify(doc));
  const json = Buffer.concat([
    raw,
    Buffer.alloc((4 - (raw.length % 4)) % 4, 32),
  ]);
  const bin = input.subarray(20 + length);
  const header = Buffer.from(input.subarray(0, 20));
  header.writeUInt32LE(20 + json.length + bin.length, 8);
  header.writeUInt32LE(json.length, 12);
  return optimizeISS(Buffer.concat([header, json, bin]));
}
if (process.argv[1]?.endsWith("optimize-rocket.mjs") && process.argv[2]) {
  const original = readFileSync(process.argv[2]);
  const result = optimizeRocket(original);
  writeFileSync(process.argv[3], result);
  console.log(`${original.length} -> ${result.length} bytes`);
}
