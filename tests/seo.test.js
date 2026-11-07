import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { aboutCopy } from "../public/about.js";
const origin = "https://karshvar.ir/";
const walk = (d) =>
  fs
    .readdirSync(d, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory() ? walk(d + "/" + e.name) : [d + "/" + e.name],
    );
test("SEO canonicals, sharing URLs, hreflang and sitemap agree for every page", () => {
  const sitemap = fs.readFileSync("public/sitemap.xml", "utf8");
  const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
  assert.equal(new Set(urls).size, urls.length);
  for (const file of walk("public").filter(
    (p) => p.endsWith("/index.html") && p !== "public/index.html",
  )) {
    const h = fs.readFileSync(file, "utf8"),
      url = origin + file.slice(7, -10);
    assert.equal(h.match(/rel="canonical"\s+href="([^"]+)"/)[1], url);
    assert.equal(h.match(/property="og:url"\s+content="([^"]+)"/)[1], url);
    assert(h.match(/<title>[^<]+<\/title>/));
    assert(h.match(/name="description"\s+content="[^"]+"/));
    const image = h.match(/property="og:image"\s+content="([^"]+)"/)?.[1];
    const twitterImage = h.match(
      /name="twitter:image"\s+content="([^"]+)"/,
    )?.[1];
    assert.equal(image, twitterImage);
    const imageUrl = new URL(image);
    const bytes = fs.readFileSync(`public${imageUrl.pathname}`);
    assert.equal(bytes.readUInt32BE(16), 1200);
    assert.equal(bytes.readUInt32BE(20), 630);
    assert.equal(
      imageUrl.searchParams.get("v"),
      createHash("sha256").update(bytes).digest("hex").slice(0, 12),
    );
    assert.equal(
      urls.includes(url),
      !/name="robots"\s+content="[^"]*noindex/.test(h),
    );
    for (const m of h.matchAll(
      /rel="alternate"\s+hreflang="([^"]+)"\s+href="([^"]+)"/g,
    )) {
      const target = "public/" + m[2].slice(origin.length) + "index.html";
      assert(fs.existsSync(target), target);
      if (m[1] !== "x-default")
        assert(
          fs.readFileSync(target, "utf8").includes(`href="${url}"`),
          "Missing return alternate: " + target,
        );
    }
  }
});

test("about pages show their Wikipedia link without the quiz engine", () => {
  for (const [lang, copy] of Object.entries(aboutCopy)) {
    const html = fs.readFileSync(`public/${lang}/about/index.html`, "utf8");
    const link = html.match(
      /<a\s[^>]*id="aboutSource"[^>]*>([\s\S]*?)<\/a\s*>/,
    );
    assert(link, lang);
    assert.equal(link[1].trim(), copy[2]);
    assert.match(link[0], /href="https:\/\/(?:fa|en)\.wikipedia\.org\/wiki\//);
  }
});
