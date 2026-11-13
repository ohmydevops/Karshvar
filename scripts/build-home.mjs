import fs from "node:fs";
import vm from "node:vm";
import { brandName } from "../public/brand.js";
import { buildSaveEarth, saveEarthCard } from "./build-save-earth.mjs";

// Static homepage content: no map libraries or data processing on scroll.
const copy = {
  fa: [
    "برای کنجکاوی دربارهٔ دنیا",
    "بیشتر کشف کن",
    "اطلس جهان",
    "آشنایی با کشورها و جغرافیا",
    "ورود به اطلس",
    "بازی جغرافیا",
    "کشورها رو از روی نقشه حدس بزن",
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
const previewCopy = {
  fa: [
    "دربارهٔ این بخش",
    "بستن",
    "اینجا قراره سرگذشت زمین رو دنبال کنیم؛ از شکل‌گیری قاره‌ها و اقیانوس‌ها تا پیدایش زندگی، دایناسورها و جانوران امروز. نقشه، تصویر و خط زمان کمک می‌کنن این تغییرها رو کنار هم ببینیم.",
    "اینجا قراره دربارهٔ تمدن‌ها، سرزمین‌ها و زندگی مردم در دوره‌های مختلف بخونیم و با نقشه و خط زمان، ارتباط اتفاق‌ها رو بهتر ببینیم.",
    "این بخش در حال آماده‌شدنه و به‌زودی اضافه می‌شه.",
  ],
  en: [
    "About this section",
    "Close",
    "Follow Earth’s formation, shifting continents and oceans, the origins of life, dinosaurs and present-day species through maps, illustrations and timelines.",
    "Explore civilizations, changing territories and everyday life across eras, with maps and timelines connecting their stories.",
    "This section is being prepared and is coming soon.",
  ],
  ar: [
    "عن هذا القسم",
    "إغلاق",
    "سنتابع تكوّن الأرض والقارات والمحيطات ونشأة الحياة والديناصورات عبر الخرائط والصور والخطوط الزمنية.",
    "سنتعرّف على الحضارات والأقاليم وحياة الناس عبر العصور، مع خرائط وخطوط زمنية تربط أحداثها.",
    "هذا القسم قيد الإعداد وسيُضاف قريبًا.",
  ],
  tr: [
    "Bu bölüm hakkında",
    "Kapat",
    "Haritalar, görseller ve zaman çizelgeleriyle Dünya’nın, kıtaların ve yaşamın geçmişini keşfedin.",
    "Haritalar ve zaman çizelgeleriyle uygarlıkları, değişen sınırları ve farklı dönemlerde günlük yaşamı keşfedin.",
    "Bu bölüm hazırlanıyor ve yakında eklenecek.",
  ],
  fr: [
    "À propos de cette section",
    "Fermer",
    "Des cartes, des illustrations et des frises raconteront la formation de la Terre, les continents et les origines de la vie.",
    "Découvrez les civilisations, les territoires et la vie quotidienne à travers les époques avec des cartes et des frises chronologiques.",
    "Cette section est en préparation et sera bientôt disponible.",
  ],
  ru: [
    "Об этом разделе",
    "Закрыть",
    "Карты, иллюстрации и хронология расскажут о формировании Земли, движении материков и появлении жизни.",
    "Знакомьтесь с цивилизациями, территориями и жизнью разных эпох с помощью карт и хронологии.",
    "Раздел готовится и скоро появится.",
  ],
};
const escape = (s) =>
  s.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
for (const [lang, c] of Object.entries(copy)) {
  const file = new URL(`../public/${lang}/index.html`, import.meta.url);
  let html = fs.readFileSync(file, "utf8");
  if (!html.includes("./save-earth-access.css")) {
    html = html.replace(
      "</head>",
      '<link rel="stylesheet" href="./save-earth-access.css" />\n</head>',
    );
  }
  const headline = `${brandName(lang)}${lang === "fa" || lang === "ar" ? "،" : ","} ${c[0]}`;

  const introductions = {
    fa: "پروژهٔ شخصی منه برای دنبال‌کردن کنجکاوی‌هام؛ دربارهٔ جغرافیا، تاریخ و هر چیزی که دوست دارم از دنیا بدونم.",
    en: "is my personal project for following my curiosity about geography, history, and everything I want to know about the world.",
    ar: "مشروعي الشخصي لمتابعة فضولي حول الجغرافيا والتاريخ وكل ما أريد معرفته عن العالم.",
    tr: "coğrafya, tarih ve dünya hakkında merak ettiklerimi keşfettiğim kişisel projem.",
    fr: "est mon projet personnel pour suivre ma curiosité pour la géographie, l’histoire et tout ce que je veux connaître du monde.",
    ru: "— мой личный проект о географии, истории и обо всём, что мне хочется узнать о мире.",
  };
  const preview = previewCopy[lang];
  const row = (id, title, description, action, planned = false) => {
    const dialogId = `${id}-dialog`;
    const actionContent = `<span>${planned ? preview[0] : action}</span><span class="destination-arrow" aria-hidden="true">←</span>`;
    const control = planned
      ? `<button type="button" class="destination-action" data-preview="${id}" aria-haspopup="dialog" aria-controls="${dialogId}">${actionContent}</button>`
      : `<a ${id === "geography" ? 'id="startGame"' : ""} class="destination-action ${id === "atlas" ? "home-explore" : ""}" href="./${lang}/${id === "atlas" ? "explore" : id === "natural-history" ? "natural-history" : "modes"}/">${actionContent}</a>`;
    const dialog = planned
      ? `<dialog class="section-preview" id="${dialogId}" aria-labelledby="${dialogId}-title" aria-describedby="${dialogId}-description">
      <h2 id="${dialogId}-title">${title}</h2>
      <p id="${dialogId}-description">${preview[id === "natural-history" ? 2 : 3]}</p>
      <p class="section-preview-status">${preview[4]}</p>
      <form method="dialog"><button class="destination-action" autofocus>${preview[1]}</button></form>
    </dialog>`
      : "";
    return `<section class="destination destination-${id}" aria-labelledby="${id}-title">
      <div class="destination-copy"><h2 id="${id}-title">${title}</h2><p>${description}</p></div>
      ${control}${dialog}
    </section>`;
  };
  const content = `<section id="welcomePage" class="welcome">
    <div class="welcome-copy"><h1 id="welcomeTitle">${headline}</h1></div>
    <div class="welcome-art" aria-hidden="true"><img src="./art/earth.svg" class="home-earth" alt="" hidden loading="lazy" /></div>
    <p class="home-introduction">${brandName(lang)} ${introductions[lang]}</p>
  </section>
  <div id="discover" class="home-discover">
    <div class="destination-grid">
    ${row("atlas", c[2], c[3], c[4])}
    ${row("geography", c[5], c[6], c[7])}

    ${row("natural-history", c[8], c[9], c[8])}
    ${row("human-history", c[10], c[11], "", true)}
    ${saveEarthCard(lang)}
    </div>
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
buildSaveEarth();

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
