import fs from "node:fs";
const origin = "https://ohmydevops.github.io/Karshvar/";
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
  const alternates = [
    ...html.matchAll(
      /<link\s+rel="alternate"\s+hreflang="([^"]+)"\s+href="([^"]+)"/g,
    ),
  ].map(
    (m) =>
      `    <xhtml:link rel="alternate" hreflang="${m[1]}" href="${m[2]}" />`,
  );
  entries.push(
    `  <url>\n    <loc>${canonical}</loc>\n${alternates.join("\n")}\n  </url>`,
  );
}
fs.writeFileSync(
  "public/sitemap.xml",
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' +
    entries.join("\n") +
    "\n</urlset>\n",
);
console.log(`Updated SEO URLs and sitemap: ${entries.length} indexable pages`);
