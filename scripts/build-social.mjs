import { pageCopy } from "../public/navigation.js";
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
function makeAtlas(lang) {
  const { id, center } = focusByLanguage[lang];
  const projection = d3
    .geoAzimuthalEquidistant()
    .rotate([-center[0], -center[1]])
    .clipAngle(85)
    .translate([370, 300])
    .scale(290);
  const geoPath = d3.geoPath(projection);
  const names = JSON.parse(
    fs.readFileSync(path.join(publicDir, "data/names.json"), "utf8"),
  );
  const country = names.find((n) => n.ccn3 === id);
  const translation = { fa: "per", ar: "ara", tr: "tur", fr: "fra", ru: "rus" }[
    lang
  ];
  const label =
    country.translations[translation]?.common || country.name.common;
  const coordinates = `${Math.abs(center[1])}° N · ${Math.abs(center[0])}° ${center[0] < 0 ? "W" : "E"}`;
  return `<svg viewBox="0 0 800 630" xmlns="http://www.w3.org/2000/svg">
  <defs><pattern id="hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><path d="M0 0V5" stroke="#28414a" stroke-opacity=".1"/></pattern></defs>
  <path d="${geoPath(d3.geoGraticule10())}" fill="none" stroke="#8d9b90" stroke-width=".7" stroke-dasharray="2 3"/>
  ${countries.map((f) => `<path d="${geoPath(f) || ""}" fill="${String(f.id) === id ? "#d3ac59" : "#ddd6be"}" stroke="#29444c" stroke-width=".8"/>`).join("")}
  <path d="${geoPath(countries.find((f) => String(f.id) === id))}" fill="url(#hatch)" stroke="#8d6427" stroke-width="1.6"/>
  <path d="M75 470 C110 520 250 220 370 300 S540 270 620 90" fill="none" stroke="#a57239" stroke-width="1.8" stroke-dasharray="6 6"/>
  <circle cx="370" cy="300" r="8" fill="#eee5d0" stroke="#193442" stroke-width="2"/>
  <circle cx="370" cy="300" r="2.5" fill="#193442"/>
  <path d="M384 315L421 360H510" fill="none" stroke="#193442"/>
  <text x="425" y="387" fill="#193442" font-family="Vazir,Arial,sans-serif" font-size="21" font-weight="700">${label}</text>
  <g transform="translate(120 535)" fill="none" stroke="#193442"><circle r="34" stroke-width=".7"/><circle r="27" stroke-width=".5"/><path d="M0-43V43M-43 0H43" stroke-width=".5"/><path d="M0-34L7 0 0 34-7 0Z" fill="#193442"/><path d="M-34 0L0-7 34 0 0 7Z" fill="#d3ac59"/><text y="-48" text-anchor="middle" font-family="serif" font-size="12" fill="#193442" stroke="none">N</text></g>
  <text x="185" y="560" fill="#516269" font-family="monospace" font-size="13" letter-spacing="2">${coordinates}</text>
  </svg>`;
}

const copy = {
  en: "Get to know the world<br>through a simple game.",
  fa: "با یک بازی ساده،<br>دنیا رو بشناس.",
  ar: "تعرّف على العالم<br>من خلال لعبة بسيطة.",
  tr: "Basit bir oyunla<br>dünyayı tanı.",
  fr: "Découvrez le monde<br>avec un jeu simple.",
  ru: "Узнавайте мир<br>с помощью простой игры.",
};
function renderSocial(name, html) {
  const htmlPath = path.join(output, `${name}.html`);
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
      `--screenshot=${path.join(publicDir, "social", `${name}.png`)}`,
      pathToFileURL(htmlPath).href,
    ],
    { stdio: "ignore" },
  );
  console.log(`Rendered ${name}`);
}
for (const [lang, title] of Object.entries(copy)) {
  const globe = makeGlobe(lang);
  renderSocial(`karshvar-${lang}`, socialTemplate({ lang, title, globe }));
  renderSocial(
    `explore-${lang}`,
    socialTemplate({
      lang,
      title: pageCopy[lang].explore,
      globe: makeAtlas(lang),
      explore: true,
    }),
  );
}
fs.copyFileSync(
  path.join(publicDir, "social", "karshvar-en.png"),
  path.join(publicDir, "social", "karshvar.png"),
);
