import fs from "node:fs";
import { historyCopy } from "../public/history.js";
for (const [lang, copy] of Object.entries(historyCopy)) {
  let html = fs.readFileSync(`public/${lang}/sources/index.html`, "utf8");
  html = html
    .replaceAll("/sources/", "/history/")
    .replace(
      `class="sources-link" href="./${lang}/history/"`,
      `class="sources-link" href="./${lang}/sources/"`,
    )
    .replace('data-page="sources"', 'data-page="history"')
    .replace('content="index,follow"', 'content="noindex,follow"');
  html = html.replace(
    /<title>[\s\S]*?<\/title>/,
    `<title>${copy[0]} — Karshvar</title>`,
  );
  html = html.replace(
    /(<meta\s+(?:name|property)="(?:description|og:description|twitter:description)"\s+content=")[^"]*/g,
    "$1" + copy[8],
  );
  html = html.replace(
    /(<meta\s+(?:name|property)="(?:og:title|twitter:title)"\s+content=")[^"]*/g,
    "$1" + copy[0] + " — Karshvar",
  );
  html = html.replace(
    /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
    "",
  );
  html = html.replace(
    /<article class="sources-page info-page">[\s\S]*?<\/article>/,
    `<section class="history-page" aria-labelledby="historyTitle"><h1 id="historyTitle">${copy[0]}</h1><div id="historyContent" aria-live="polite"></div></section>`,
  );
  fs.mkdirSync(`public/${lang}/history`, { recursive: true });
  fs.writeFileSync(`public/${lang}/history/index.html`, html);
}
