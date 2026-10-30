# Karshvar

A browser-based country guessing game. Choose a continent, explore the globe, and guess the highlighted country.

## Run locally

```sh
npm install
npm run dev
```

Open http://127.0.0.1:5174/ in your browser.

## Offline assets

The offline worker is generated, not maintained by hand. Edit `scripts/sw-template.js` for caching behavior and `public/offline.js` for the update prompt. `npm run build:offline` regenerates `public/sw.js` with a content-based version. Development startup, tests, and deployment generate it automatically; regenerate after source edits when testing an offline update.

Local live reload is disabled to avoid interrupting a game. Accept the update prompt to load a new cached version.

Country mode starts with land neighbors, followed by remaining countries ordered by center-to-center distance from the starting country. Existing answers are preserved.
