import fs from "node:fs";
import { createHash } from "node:crypto";
import { countrySetupCopy } from "../public/country-setup.js";
const origin = "https://karshvar.ir/";
const walk = (d) =>
  fs
    .readdirSync(d, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory() ? walk(d + "/" + e.name) : [d + "/" + e.name],
    );
const entries = [];
for (const file of walk("public").filter(
  (p) => p.endsWith("/index.html") && p !== "public/index.html",
)) {
  let html = fs.readFileSync(file, "utf8");
  const lang = file.split("/")[1];
  if (file === `public/${lang}/countries/index.html`) {
    const copy = countrySetupCopy[lang];
    const oldTitle = html.match(/<title>(.*?) — Karshvar<\/title>/)?.[1];
    const oldDescription = html.match(
      /name="description"\s+content="([^"]+)"/,
    )?.[1];
    if (oldTitle) html = html.replaceAll(oldTitle, copy.title);
    if (oldDescription) html = html.replaceAll(oldDescription, copy.hint);
  }
  // A content hash gives refreshed artwork a new URL in social preview caches.
  html = html.replace(
    /https:\/\/karshvar\.ir\/social\/([\w-]+\.png)(?:\?v=[\w-]+)?/g,
    (_, image) => {
      const hash = createHash("sha256")
        .update(fs.readFileSync(`public/social/${image}`))
        .digest("hex")
        .slice(0, 12);
      return `${origin}social/${image}?v=${hash}`;
    },
  );
  const imageAlt = html.match(
    /property="og:image:alt"\s+content="([^"]+)"/,
  )?.[1];
  if (imageAlt && !html.includes('name="twitter:image:alt"')) {
    html = html.replace(
      /(<meta\s+name="twitter:card")/,
      `<meta name="twitter:image:alt" content="${imageAlt}" />\n    $1`,
    );
  }
  const canonical = html.match(/rel="canonical"\s+href="([^"]+)"/)?.[1];
  if (!canonical) throw Error("Missing canonical: " + file);
  const expected = origin + file.slice(7, -10);
  if (canonical !== expected) throw Error("Wrong canonical: " + file);
  html = html.replace(
    /(<meta\s+property="og:url"\s+content=")[^"]+/,
    "$1" + canonical,
  );
  fs.writeFileSync(file, html);
  if (/name="robots"\s+content="[^"]*noindex/.test(html)) continue;
  entries.push(`  <url>\n    <loc>${canonical}</loc>\n  </url>`);
}
fs.writeFileSync(
  "public/sitemap.xml",
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    entries.join("\n") +
    "\n</urlset>\n",
);
console.log(`Updated SEO URLs and sitemap: ${entries.length} indexable pages`);
