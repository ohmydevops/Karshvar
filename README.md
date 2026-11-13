# Karshvar

A browser-based country guessing game. Choose a continent, explore the globe, and guess the highlighted country.

## Run locally

```sh
npm install
npm run dev
```

Open [localhost:5174](http://localhost:5174/) in your browser. Refresh after editing files; hot reload is disabled.

## Test and format

```sh
npm test
npm run format:check
npm run format
```

## Build locally

```sh
python -m pip install "Pillow>=12,<14"
npm run build
```

Output: `output/site/`. Set `PYTHON` to your Python executable path if it is not on PATH.

### CDN caching for offline updates

Keep `/sw.js`, `/build-info.json`, and `/update-manifest.json` outside the CDN cache. In Cloudflare, use a Cache Rule with `Bypass cache` for these three URI paths, after any broader caching rules. Purge these URLs once when enabling the rule. A cached worker from an older deployment combined with current build metadata causes integrity validation to reject updates.

Keep integrity checks enabled. Do not clear browser storage or saved game progress to repair a CDN mismatch. Verify that the worker's expected `build-info.json` hash matches the deployed file before considering a client cache reset. Models and textures can continue using CDN caching.
