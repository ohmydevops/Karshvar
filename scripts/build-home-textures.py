"""Generate full-resolution WebP textures. Requires Pillow with WebP support."""
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parent.parent
source = root / "assets" / "texture-sources"
target = root / "public" / "art"
for name, extension, options in [
    ("earth-texture", "jpg", {"quality": 90}),
    ("earth-night", "png", {"lossless": True}),
]:
    original = source / f"{name}.{extension}"
    output = target / f"{name}.webp"
    with Image.open(original) as image:
        image.save(output, format="WEBP", method=6, **options)
    print(f"{name}: {original.stat().st_size:,} -> {output.stat().st_size:,} bytes")
