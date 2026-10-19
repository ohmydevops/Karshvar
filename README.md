# Karshvar

A browser-only country guessing game with a draggable globe, six languages, light/dark themes, and browser-local progress. No account or backend is required.

## Setup

Run `npm install`, then `npm run dev`. Open http://127.0.0.1:5174/.

## Checks

Run `npm test` and `npm run format:check`.

## Deployment

GitHub Pages deploys `public/` automatically when changes reach `main`, using `.github/workflows/pages.yml`. In repository Settings → Pages, select **GitHub Actions** as the source. The live site is https://ohmydevops.github.io/Karshvar/. You can also run the workflow manually from Actions.

Serve `public/` with any static web host. All game dependencies and map data are local. A web server is needed; opening the HTML as a file is unsupported. Browser storage is specific to the browser and site address.

## Credits

Umami tracks pageviews and game events on the published site. Typed answers stay in browser storage and are excluded from events.

D3 (ISC), TopoJSON client (ISC), world-atlas / Natural Earth public-domain map data, and mledoze/countries (ODbL country metadata). Boundaries follow Natural Earth and are not a statement on sovereignty. The quiz includes independent countries represented in the supplied map; very small areas receive a locator ring. Country-name variants are accepted across supported languages.
