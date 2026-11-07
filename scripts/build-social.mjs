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
const focusByLanguage = {
  fa: { id: "364", center: [53, 32] },
  en: { id: "826", center: [-2, 54] },
  ar: { id: "682", center: [45, 24] },
  tr: { id: "792", center: [35, 39] },
  fr: { id: "250", center: [2, 47] },
  ru: { id: "643", center: [90, 60] },
};
function makeGlobe(lang) {
  const { id, center } = focusByLanguage[lang];
  const projection = d3
    .geoOrthographic()
    .rotate([-center[0], -(center[1] - 14)])
    .translate([300, 300])
    .scale(250);
  const geoPath = d3.geoPath(projection);
  return `<svg viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="sea" cx="30%" cy="25%"><stop stop-color="#27466c"/><stop offset="1" stop-color="#132c4b"/></radialGradient></defs><circle cx="300" cy="300" r="250" fill="url(#sea)"/><path d="${geoPath(d3.geoGraticule10())}" fill="none" stroke="#9fc6cb" stroke-opacity=".15"/>${countries.map((f) => `<path d="${geoPath(f) || ""}" fill="${String(f.id) === id ? "#dfb65e" : "#718caf"}" stroke="#132c4b" stroke-width=".6"/>`).join("")}<circle cx="300" cy="300" r="250" fill="none" stroke="#9cbaff" stroke-opacity=".45"/></svg>`;
}
const copy = {
  en: "Get to know the world<br>through a simple game.",
  fa: "با یک بازی ساده،<br>دنیا رو بشناس.",
  ar: "تعرّف على العالم<br>من خلال لعبة بسيطة.",
  tr: "Basit bir oyunla<br>dünyayı tanı.",
  fr: "Découvrez le monde<br>avec un jeu simple.",
  ru: "Узнавайте мир<br>с помощью простой игры.",
};
for (const [lang, title] of Object.entries(copy)) {
  const globe = makeGlobe(lang);
  const html = socialTemplate({ lang, title, globe, article: false });
  const htmlPath = path.join(output, `${lang}.html`);
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
      `--screenshot=${path.join(publicDir, "social", `karshvar-${lang}.png`)}`,
      pathToFileURL(htmlPath).href,
    ],
    { stdio: "ignore" },
  );
  console.log(`Rendered ${lang}`);
}
fs.copyFileSync(
  path.join(publicDir, "social", "karshvar-en.png"),
  path.join(publicDir, "social", "karshvar.png"),
);
