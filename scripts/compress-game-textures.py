"""Lossless WebP packaging, with decoded RGBA equality checked before every write.

Usage: python scripts/compress-game-textures.py [art-directory]
Only choose WebP if smaller. Geometry buffers and image dimensions are preserved.
"""
import io
import json
import struct
import sys
from pathlib import Path
from PIL import Image


def webp(raw):
    with Image.open(io.BytesIO(raw)) as image:
        source = image.convert("RGBA")
        output = io.BytesIO()
        source.save(output, format="WEBP", lossless=True, exact=True, method=6)
        data = output.getvalue()
        with Image.open(io.BytesIO(data)) as check:
            assert check.size == source.size
            assert check.convert("RGBA").tobytes() == source.tobytes(), "Pixel mismatch"
    return data


def compress_model(path):
    original = path.read_bytes()
    size = struct.unpack_from("<I", original, 12)[0]
    doc = json.loads(original[20:20 + size])
    binary = original[28 + size:]
    replacements = {}
    converted = set()
    for index, image in enumerate(doc.get("images", [])):
        if image.get("mimeType") == "image/webp":
            continue
        view = doc["bufferViews"][image["bufferView"]]
        offset = view.get("byteOffset", 0)
        raw = binary[offset:offset + view["byteLength"]]
        result = webp(raw)
        if len(result) >= len(raw):
            continue
        replacements[image["bufferView"]] = result
        image["mimeType"] = "image/webp"
        converted.add(index)
    if not converted:
        return
    for texture in doc.get("textures", []):
        if texture.get("source") in converted:
            texture.setdefault("extensions", {})["EXT_texture_webp"] = {
                "source": texture.pop("source")
            }
    for key in ("extensionsUsed", "extensionsRequired"):
        if "EXT_texture_webp" not in doc.setdefault(key, []):
            doc[key].append("EXT_texture_webp")
    packed = bytearray()
    for index, view in enumerate(doc["bufferViews"]):
        offset = view.get("byteOffset", 0)
        raw = binary[offset:offset + view["byteLength"]]
        data = replacements.get(index, raw)
        packed.extend(b"\0" * (-len(packed) % 4))
        view["byteOffset"] = len(packed)
        view["byteLength"] = len(data)
        packed.extend(data)
        if index not in replacements:
            assert bytes(packed[view["byteOffset"]:]) == raw
    doc["buffers"][0]["byteLength"] = len(packed)
    packed.extend(b"\0" * (-len(packed) % 4))
    metadata = json.dumps(doc, separators=(",", ":")).encode()
    metadata += b" " * (-len(metadata) % 4)
    output = (struct.pack("<5I", 0x46546C67, 2, 28 + len(metadata) + len(packed),
                          len(metadata), 0x4E4F534A) + metadata +
              struct.pack("<2I", len(packed), 0x004E4942) + packed)
    if len(output) < len(original):
        path.write_bytes(output)
        print(f"{path.name}: {len(original)} -> {len(output)}; {len(converted)} lossless textures", flush=True)


if __name__ == "__main__":
    root = Path(sys.argv[1] if len(sys.argv) > 1 else "public/art")
    for name in ("meteorite", "smg-gun", "iss", "astronaut"):
        compress_model(root / f"{name}.glb")
    for name in ("earth-clouds.png", "saturn-rings.png", "moon.jpg", "andromeda.jpg",
                 "mercury.jpg", "venus.jpg", "mars.jpg", "jupiter.jpg", "saturn.jpg",
                 "uranus.jpg", "neptune.jpg"):
        path = root / name
        if not path.exists():
            continue
        raw = path.read_bytes()
        result = webp(raw)
        if len(result) < len(raw):
            path.with_suffix(".webp").write_bytes(result)
            print(f"{name} -> .webp: {len(raw)} -> {len(result)}", flush=True)
        else:
            print(f"{name}: retained smaller original ({len(raw)} vs WebP {len(result)})", flush=True)
