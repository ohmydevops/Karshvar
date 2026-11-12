"""Optimize only a generated site, retaining original source artwork. Requires Pillow."""
from io import BytesIO
from pathlib import Path
import sys
from PIL import Image

target = Path(sys.argv[1]).resolve()
before = after = 0
for file in target.rglob("*"):
    if file.suffix.lower() not in {".png", ".jpg", ".jpeg", ".webp"}:
        continue
    # Game/scene maps have already been packaged and pixel-verified. Never
    # re-encode them with the lossy general-site settings during deployment.
    if file.parent.name == "art":
        continue
    size = file.stat().st_size
    with Image.open(file) as image:
        image.load()
        result = BytesIO()
        if file.parent.name == "social" and file.suffix == ".png":
            rgb = image.convert("RGB")
            # JPEG is smaller for textured sharing cards. Preserve PNG URLs for old shares.
            rgb.save(file.with_suffix(".jpg"), quality=88, optimize=True, progressive=True)
            rgb.quantize(colors=256).save(result, format="PNG", optimize=True)
        elif file.suffix.lower() in {".jpg", ".jpeg"}:
            image.convert("RGB").save(result, format="JPEG", quality=85, optimize=True, progressive=True)
        elif file.suffix.lower() == ".webp":
            image.save(result, format="WEBP", quality=88, method=6)
        else:
            image.save(result, format="PNG", optimize=True)
    data = result.getvalue()
    if len(data) < size:
        file.write_bytes(data)
    before += size
    after += file.stat().st_size
print(f"Existing raster assets: {before // 1024} -> {after // 1024} KB")
