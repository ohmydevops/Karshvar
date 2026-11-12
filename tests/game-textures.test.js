import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function assertLossless(bytes) {
  assert.equal(bytes.toString("ascii", 0, 4), "RIFF");
  assert.equal(bytes.toString("ascii", 8, 12), "WEBP");
  const types = [];
  for (let offset = 12; offset + 8 <= bytes.length;) {
    types.push(bytes.toString("ascii", offset, offset + 4));
    const length = bytes.readUInt32LE(offset + 4);
    assert.ok(offset + 8 + length <= bytes.length);
    offset += 8 + length + (length % 2);
  }
  assert.ok(types.includes("VP8L"), "Expected lossless WebP bitstream");
  assert.ok(!types.includes("VP8 "), "Lossy WebP is not allowed");
}

test("converted scene maps use full lossless WebP bitstreams", () => {
  for (const name of ["earth-clouds", "saturn-rings", "uranus"])
    assertLossless(
      readFileSync(new URL(`../public/art/${name}.webp`, import.meta.url)),
    );
});

test("embedded WebP maps declare the loader extension and valid lossless payloads", () => {
  for (const name of ["meteorite", "smg-gun", "iss"]) {
    const bytes = readFileSync(
      new URL(`../public/art/${name}.glb`, import.meta.url),
    );
    const size = bytes.readUInt32LE(12),
      doc = JSON.parse(bytes.subarray(20, 20 + size)),
      bin = bytes.subarray(28 + size);
    assert.ok(doc.extensionsRequired.includes("EXT_texture_webp"));
    let count = 0;
    for (const texture of doc.textures) {
      const extension = texture.extensions?.EXT_texture_webp;
      if (!extension) continue;
      const image = doc.images[extension.source],
        view = doc.bufferViews[image.bufferView];
      assert.equal(image.mimeType, "image/webp");
      assertLossless(
        bin.subarray(
          view.byteOffset || 0,
          (view.byteOffset || 0) + view.byteLength,
        ),
      );
      count++;
    }
    assert.ok(count > 0);
  }
});
