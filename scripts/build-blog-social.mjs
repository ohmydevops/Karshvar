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
const projection = d3
  .geoOrthographic()
  .rotate([-48, -26])
  .translate([300, 300])
  .scale(250);
const geoPath = d3.geoPath(projection);
const baseGlobe = `<svg viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="sea" cx="30%" cy="25%"><stop stop-color="#275169"/><stop offset="1" stop-color="#102b40"/></radialGradient></defs><circle cx="300" cy="300" r="280" fill="none" stroke="#edc87c" stroke-opacity=".22"/><circle cx="300" cy="300" r="250" fill="url(#sea)"/><path d="${geoPath(d3.geoGraticule10())}" fill="none" stroke="#9fc6cb" stroke-opacity=".15"/>${countries.map((f) => `<path d="${geoPath(f) || ""}" fill="${String(f.id) === "364" ? "#edc87c" : "#527b86"}" stroke="#102b40" stroke-width=".6"/>`).join("")}<circle cx="300" cy="300" r="250" fill="none" stroke="#edc87c" stroke-opacity=".45"/><circle cx="300" cy="20" r="5" fill="#edc87c"/></svg>`;
const copy = {
  en: "Get to know the world<br>through a simple game.",
  fa: "با یک بازی ساده،<br>دنیا رو بشناس.",
  ar: "تعرّف على العالم<br>من خلال لعبة بسيطة.",
  tr: "Basit bir oyunla<br>dünyayı tanı.",
  fr: "Découvrez le monde<br>avec un jeu simple.",
  ru: "Узнавайте мир<br>с помощью простой игры.",
};
const fonts = ["Regular", "Bold"]
  .map(
    (weight, i) =>
      `@font-face{font-family:Vazir;src:url(data:font/woff2;base64,${fs.readFileSync(path.join(publicDir, `fonts/Vazir-${weight}.woff2`)).toString("base64")});font-weight:${i ? 700 : 400}}`,
  )
  .join("");
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
    '<svg viewBox="0 0 600 600"><circle cx="300" cy="300" r="260" fill="#18374a" stroke="#edc87c55"/><path d="' +
    map(feature) +
    '" fill="#edc87c" stroke="#fff4" stroke-width="1"/></svg>';
  const rtl = ["fa", "ar"].includes(lang);
  const html = `<!doctype html><html lang="${lang}"><meta charset="utf-8"><style>${fonts}*{box-sizing:border-box}html,body{margin:0;width:1200px;height:630px;overflow:hidden}body{background:radial-gradient(ellipse at 20% 50%,#18374a,#0c1d2b 70%);color:#f8f1e2;font-family:Vazir,Arial,sans-serif}.frame{position:absolute;inset:26px;border:1px solid #edc87c25;border-radius:24px}.globe{position:absolute;width:540px;height:540px;left:10px;top:45px}.copy{position:absolute;left:570px;right:65px;top:0;height:630px;display:flex;flex-direction:column;justify-content:center;align-items:${rtl ? "flex-end" : "flex-start"}}.accent{width:52px;height:4px;background:#edc87c;border-radius:4px;margin-bottom:27px}h1{margin:0;text-align:${rtl ? "right" : "left"};direction:${rtl ? "rtl" : "ltr"};font-size:40px;font-weight:700;line-height:1.65}</style><body><div class="frame"></div><div class="globe">${globe}</div><div class="copy"><div class="accent"></div><h1>${title}</h1></div></body></html>`;
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
