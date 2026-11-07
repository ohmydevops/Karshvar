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
