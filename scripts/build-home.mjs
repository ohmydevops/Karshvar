import fs from "node:fs";
import vm from "node:vm";
import { brandName } from "../public/brand.js";

// Static homepage content: no map libraries or data processing on scroll.
const copy = {
  fa: [
    "برای کنجکاوی دربارهٔ دنیا",
    "بیشتر کشف کن",
    "اطلس جهان",
    "آشنایی با کشورها و جغرافیا",
    "ورود به اطلس",
    "بازی جغرافیا",
    "کشورها رو روی نقشه پیدا کن",
    "شروع بازی",
    "تاریخ طبیعی",
    "آشنایی با سرگذشت طبیعی زمین",
    "تاریخ ملل",
    "آشنایی با اتفاقات و سرگذشت انسان‌ها",
    "به‌زودی",
    "نقش‌های جام شهر سوخته",
  ],
  en: [
    "For the curious about the world",
    "Discover more",
    "World atlas",
    "Discover countries and geography",
    "Explore the atlas",
    "Geography game",
    "Find countries on the map",
    "Start game",
    "Natural history",
    "Discover the natural history of Earth",
    "Human history",
    "Explore the events and stories of humanity",
    "Coming soon",
    "Drawings from the Shahr-e Sukhteh vessel",
  ],
  ar: [
    "للفضول حول العالم",
    "اكتشف المزيد",
    "أطلس العالم",
    "تعرّف على البلدان والجغرافيا",
    "استكشف الأطلس",
    "لعبة الجغرافيا",
    "اعثر على البلدان على الخريطة",
    "ابدأ اللعب",
    "التاريخ الطبيعي",
    "تعرّف على التاريخ الطبيعي للأرض",
    "تاريخ الشعوب",
    "تعرّف على أحداث البشر وقصصهم",
    "قريبًا",
    "رسوم إناء شهر سوخته",
  ],
  tr: [
    "Dünyayı merak edenler için",
    "Daha fazlasını keşfet",
    "Dünya atlası",
    "Ülkeleri ve coğrafyayı tanı",
    "Atlası keşfet",
    "Coğrafya oyunu",
    "Ülkeleri haritada bul",
    "Oyuna başla",
    "Doğa tarihi",
    "Dünya’nın doğal geçmişini keşfet",
    "İnsanlık tarihi",
    "İnsanlığın olaylarını ve hikâyelerini keşfet",
    "Yakında",
    "Şehr-i Suhta kabının çizimleri",
  ],
  fr: [
    "Pour les curieux du monde",
    "En découvrir plus",
    "Atlas du monde",
    "Découvrez les pays et la géographie",
    "Explorer l’atlas",
    "Jeu de géographie",
    "Retrouvez les pays sur la carte",
    "Jouer",
    "Histoire naturelle",
    "Découvrez l’histoire naturelle de la Terre",
    "Histoire des peuples",
    "Découvrez les événements et les récits de l’humanité",
    "Bientôt",
    "Dessins du vase de Shahr-e Sukhteh",
  ],
  ru: [
    "Для тех, кому интересен мир",
    "Узнать больше",
    "Атлас мира",
    "Знакомьтесь со странами и географией",
    "Открыть атлас",
    "Географическая игра",
    "Находите страны на карте",
    "Начать игру",
    "Естественная история",
    "Изучайте природную историю Земли",
    "История народов",
    "Знакомьтесь с событиями и судьбами людей",
    "Скоро",
    "Рисунки на сосуде из Шахри-Сухте",
  ],
};
const escape = (s) =>
  s.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
for (const [lang, c] of Object.entries(copy)) {
  const file = new URL(`../public/${lang}/index.html`, import.meta.url);
  let html = fs.readFileSync(file, "utf8");
  const headline = `${brandName(lang)}${lang === "fa" || lang === "ar" ? "،" : ","} ${c[0]}`;
  const row = (id, title, description, action, image, disabled = false) => `
    <section class="discovery-row" aria-labelledby="${id}-title">
      <div class="discovery-copy">
        <h2 id="${id}-title">${title}</h2>
        <p>${description}</p>
        ${disabled ? `<button class="discovery-action" disabled>${c[12]}</button>` : `<a ${id === "geography" ? 'id="startGame"' : 'class="discovery-action home-explore"'} ${id === "geography" ? 'class="discovery-action"' : ""} href="./${lang}/${id === "geography" ? "modes" : "explore"}/">${action}</a>`}
      </div>
      <figure class="discovery-visual ${id}">
        <img src="./art/${image}" alt="${id === "human-history" ? escape(c[13]) : ""}" width="720" height="480" loading="lazy" decoding="async" />
      </figure>
    </section>`;
  const content = `<section id="welcomePage" class="welcome">
    <div class="welcome-copy"><h1 id="welcomeTitle">${headline}</h1></div>
    <div class="welcome-art" aria-hidden="true"><img src="./art/earth.svg" class="home-earth" alt="" hidden loading="lazy" /></div>
    <a class="discovery-scroll" href="./${lang}/#discover">${c[1]}<span aria-hidden="true">⌄</span></a>
  </section>
  <div id="discover" class="home-discover">
    ${row("atlas", c[2], c[3], c[4], "home-atlas.svg")}
    ${row("geography", c[5], c[6], c[7], "home-game.svg")}
    ${row("natural-history", c[8], c[9], "", "home-natural-history.webp", true)}
    ${row("human-history", c[10], c[11], "", "home-human-history.webp", true)}
  </div>`;
  html = html.replace(
    /<section id="welcomePage"[\s\S]*?(?=<section class="intro")/,
    content + "\n      ",
  );
  const oldTitle = html.match(/<title>(.*?)<\/title>/)[1];
  const oldDescription = html.match(
    /name="description"\s+content="([^"]*)"/,
  )[1];
  html = html
    .replaceAll(oldTitle, escape(headline))
    .replaceAll(oldDescription, escape(`${c[3]}. ${c[6]}. ${c[8]}. ${c[10]}.`));
  html = html.replace(
    '"applicationCategory": "GameApplication"',
    '"applicationCategory": "EducationalApplication"',
  );
  fs.writeFileSync(file, html);
}

// Reuse the project's own geographical data to produce lightweight static art.
const sandbox = vm.createContext({});
for (const file of ["d3.min.js", "topojson-client.min.js"])
  vm.runInContext(
    fs.readFileSync(
      new URL(`../public/vendor/${file}`, import.meta.url),
      "utf8",
    ),
    sandbox,
  );
const { d3, topojson } = sandbox;
const topology = JSON.parse(
  fs.readFileSync(
    new URL("../public/data/countries.json", import.meta.url),
    "utf8",
  ),
);
const countries = topojson
  .feature(topology, topology.objects.countries)
  .features.filter((f) => +f.id !== 10);
for (const regional of [false, true]) {
  const projection = regional
    ? d3.geoMercator().center([53, 31]).scale(650).translate([360, 240])
    : d3.geoNaturalEarth1().fitExtent(
        [
          [12, 30],
          [708, 450],
        ],
        { type: "FeatureCollection", features: countries },
      );
  const path = d3.geoPath(projection).digits(1);
  const paths = countries
    .map(
      (f) =>
        `<path d="${path(f)}" fill="${regional && +f.id === 364 ? "#aaa2e6" : "#526e8c"}"/>`,
    )
    .join("");
  fs.writeFileSync(
    new URL(
      `../public/art/home-${regional ? "game" : "atlas"}.svg`,
      import.meta.url,
    ),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 480"><defs><clipPath id="bounds"><rect width="720" height="480" rx="12"/></clipPath></defs><g clip-path="url(#bounds)" stroke="#101e30" stroke-width=".65" stroke-linejoin="round">${paths}</g></svg>`,
  );
}
