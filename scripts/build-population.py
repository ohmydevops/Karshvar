"""Build a compact, global density texture from official GHS-POP counts.

One-time preparation (not part of the normal site build):
  pip install rasterio numpy Pillow
  python scripts/build-population.py path/to/GHS_POP_E2025...zip
The original ~461 MB archive stays outside public/; only derived assets ship.
"""
import json
import math
from pathlib import Path
import sys
import zipfile

import numpy as np
from PIL import Image
import rasterio
from rasterio.windows import Window

ROOT = Path(__file__).resolve().parent.parent
SOURCE_URL = (
    "https://jeodpp.jrc.ec.europa.eu/ftp/jrc-opendata/GHSL/"
    "GHS_POP_GLOBE_R2023A/GHS_POP_E2025_GLOBE_R2023A_4326_30ss/"
    "V1-0/GHS_POP_E2025_GLOBE_R2023A_4326_30ss_V1_0.zip"
)
WIDTH, HEIGHT = 14400, 7200  # 0.025 degrees, ~2.8 km at the equator


def encode_density(density):
    """0 = unpopulated; 255 = 10,000+ people/km², logarithmic scale."""
    return np.rint(np.log1p(np.clip(density, 0, 10000)) / np.log1p(10000) * 255).astype(np.uint8)


def main():
    source = Path(sys.argv[1]).resolve()
    if source.suffix == ".zip":
        with zipfile.ZipFile(source) as archive:
            member = next(n for n in archive.namelist() if n.lower().endswith(".tif"))
        source_path = f"/vsizip/{source.as_posix()}/{member}"
    else:
        source_path = str(source)
    counts = np.zeros((HEIGHT, WIDTH), dtype=np.float64)
    source_total = 0.0
    with rasterio.Env(GDAL_CACHEMAX=128 * 1024 * 1024), rasterio.open(source_path) as dataset:
        print(f"Input: {dataset.width}×{dataset.height}, {dataset.crs}, {dataset.bounds}", flush=True)
        if dataset.crs.to_epsg() != 4326 or dataset.transform.b or dataset.transform.d or dataset.transform.e >= 0:
            raise ValueError("Expected a north-up WGS84 population raster")
        # Read only 256 source rows at a time. Sum residents by the cell's
        # geographic centre, never average population counts or load the full raster.
        longitude = dataset.transform.c + (np.arange(dataset.width) + 0.5) * dataset.transform.a
        valid_columns = (longitude >= -180) & (longitude < 180)
        columns = np.floor((longitude[valid_columns] + 180) * WIDTH / 360).astype(int)
        starts = np.r_[0, np.flatnonzero(np.diff(columns)) + 1]
        output_columns = columns[starts]
        for top in range(0, dataset.height, 256):
            rows = min(256, dataset.height - top)
            block = dataset.read(1, window=Window(0, top, dataset.width, rows))[:, valid_columns]
            block[~np.isfinite(block) | (block < 0)] = 0
            source_total += float(block.sum(dtype=np.float64))
            grouped = np.add.reduceat(block, starts, axis=1, dtype=np.float64)
            latitude = dataset.transform.f + (np.arange(top, top + rows) + 0.5) * dataset.transform.e
            output_rows = np.floor((90 - latitude) * HEIGHT / 180).astype(int)
            for row, output_row in enumerate(output_rows):
                if 0 <= output_row < HEIGHT:
                    counts[output_row, output_columns] += grouped[row]
            if top % 2560 == 0:
                print(f"Processed {min(100, round((top + rows) / dataset.height * 100))}%", flush=True)
    if not np.isclose(counts.sum(), source_total, rtol=1e-9):
        raise ValueError("Population total changed during aggregation")
    edges = np.linspace(math.pi / 2, -math.pi / 2, HEIGHT + 1)
    area = 6371.0088 ** 2 * (2 * math.pi / WIDTH) * (np.sin(edges[:-1]) - np.sin(edges[1:]))
    # Encode in strips to avoid several full-size floating-point allocations.
    encoded = np.empty((HEIGHT, WIDTH), dtype=np.uint8)
    for top in range(0, HEIGHT, 128):
        encoded[top:top + 128] = encode_density(
            counts[top:top + 128] / area[top:top + 128, None]
        )
    output = ROOT / "public/data/population-density.png"
    Image.fromarray(encoded).save(output, optimize=True)
    metadata = {
        "dataset": "GHS-POP R2023A", "epoch": 2025,
        "kind": "population projection", "source": SOURCE_URL,
        "doi": "10.2905/2FF68A52-5B5B-4A22-8F40-C41DA8332CFE",
        "credit": "European Commission, Joint Research Centre (JRC), © European Union",
        "citation": "Schiavina, M., Freire, S., Carioli, A., MacManus, K. (2023)",
        "sourceResolutionArcSeconds": 30, "resolutionDegrees": 360 / WIDTH,
        "bounds": [-180, -90, 180, 90], "width": WIDTH, "height": HEIGHT,
        "unit": "people/km²", "encoding": "round(log1p(min(density,10000))/log1p(10000)*255)",
        "processing": "Assign source cell centres to 0.025-degree cells and sum residents; divide by spherical cell area; logarithmic 8-bit encoding. No-data treated as empty. For visual exploration, not precise local counts.",
        "populationSum": round(float(counts.sum())),
    }
    output.with_suffix(".json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Output: {output.stat().st_size / 1024:.0f} KB; total population: {counts.sum():,.0f}", flush=True)


if __name__ == "__main__":
    main()
