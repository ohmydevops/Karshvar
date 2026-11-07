import { socialTemplate } from "./social-template.mjs";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const publicDir = path.join(root, "public");
const output = path.join(root, "output", "social");
fs.mkdirSync(output, { recursive: true });
const chrome =
  process.argv[2] || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const context = vm.createContext({});
for (const file of ["d3.min.js", "topojson-client.min.js"]) {
  vm.runInContext(
    fs.readFileSync(path.join(publicDir, "vendor", file), "utf8"),
    context,
  );
}
const { d3, topojson } = context;
const topology = JSON.parse(
  fs.readFileSync(path.join(publicDir, "data/countries.json")),
);
const countries = topojson.feature(
  topology,
  topology.objects.countries,
).features;
for (const article of JSON.parse(
  fs.readFileSync(path.join(root, "scripts/blog-images.json"), "utf8"),
)) {
  const lang = article.l;
  const title = article.country + "<br>" + article.subtitle;
  const id = JSON.parse(
    fs.readFileSync(path.join(root, "scripts/blog-data.json"), "utf8"),
  ).find((r) => r[0] === article.slug)[1];
  const feature = countries.find((f) => String(f.id) === id);
  const map = d3.geoPath(
    d3.geoMercator().fitExtent(
      [
        [70, 80],
        [530, 520],
      ],
      feature,
    ),
  );
  const globe =
    '<svg viewBox="0 0 600 600"><circle cx="300" cy="300" r="260" fill="#16243e" stroke="#9cbaff55"/><path d="' +
    map(feature) +
    '" fill="#9cbaff" stroke="#fff4" stroke-width="1"/></svg>';
  const html = socialTemplate({ lang, title, globe, article: true });
  const htmlPath = path.join(output, `blog-${article.slug}-${lang}.html`);
  fs.writeFileSync(htmlPath, html);
  execFileSync(
    chrome,
    [
      "--headless",
      "--disable-gpu",
      "--no-sandbox",
      `--user-data-dir=${path.join(output, "browser-profile")}`,
      "--hide-scrollbars",
      "--no-pdf-header-footer",
      "--force-device-scale-factor=1",
      "--window-size=1200,630",
      "--virtual-time-budget=1500",
      `--screenshot=${path.join(publicDir, "social", `blog-${article.slug}-${lang}.png`)}`,
      pathToFileURL(htmlPath).href,
    ],
    { stdio: "ignore" },
  );
  console.log(`Rendered ${article.slug} ${lang}`);
}
