# Karshvar

A browser-based country guessing game. Choose a continent, explore the globe, and guess the highlighted country.

## Run locally

```sh
npm install
npm run dev
```

Open http://127.0.0.1:5174/ in your browser.

The root URL redirects to `/en/`, including offline. Other language URLs remain directly accessible.

## Offline assets

The offline worker is generated, not maintained by hand. Edit `scripts/sw-template.js` for caching behavior and `public/offline.js` for the update prompt. `npm run build:offline` regenerates `public/sw.js` with a content-based version. Development startup, tests, and deployment generate it automatically; regenerate after source edits when testing an offline update.

Local live reload is disabled to avoid interrupting a game. Accept the update prompt to load a new cached version.

The offline build also synchronizes the early theme script and page loading skeletons into the HTML. Edit `public/loading.js` and `scripts/build-loading.mjs` rather than the generated skeleton blocks.

Blog pages and their article images are network-only and excluded from offline downloads. Activating an updated worker removes the previous version's cache.

Explore has separate saved switches for population and country highlighting; highlighting defaults off. Flag emojis use a bundled font so they display consistently offline; its license is in `public/fonts/NotoEmoji-LICENSE.txt`.

Country mode starts with land neighbors, followed by remaining countries ordered by center-to-center distance from the starting country. Existing answers are preserved.
