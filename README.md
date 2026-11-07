# Karshvar

A browser-based country guessing game. Choose a continent, explore the globe, and guess the highlighted country.

## Run locally

```sh
npm install
npm run dev
```

Open http://127.0.0.1:5174/ in your browser.

## Production build

Install Pillow with `python -m pip install "Pillow>=12,<14"`, then run `npm run build`.
The optimized site is written to `output/site`; source files in `public` stay readable and retain their original artwork.
JavaScript, CSS, and images are compressed before generating the versioned offline cache.
Gameplay assets remain available offline; social previews and blog pages are excluded from the offline download.
Set `PYTHON` if your Python executable is not on PATH.

## Population overlay

Explore includes an optional global GHS-POP R2023A population density layer (2025 projection).
The local `public/data/population-density.png` contains a logarithmic numerical channel, not a photograph; preserve its values when optimizing it.
The layer uses a 0.05-degree grid (about 5.6 km at the equator), aggregated from the official 30-arc-second population counts. Its metadata and source URL are in `public/data/population-density.json`.

To regenerate, install `rasterio`, `numpy`, and `Pillow`, then run:

```sh
python scripts/build-population.py output/population-source/ghs-pop-2025.zip
```

Keep the original archive under `output/population-source/`: `output/` is ignored by Git and is never copied into the deployed site. Normal builds use the derived asset and do not download or process the source dataset. The derived layer is included in the offline cache; its switch defaults to off and remembers the user's choice.
