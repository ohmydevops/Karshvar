import { normalize } from "./logic.js";
import { routeLanguages } from "./navigation.js";

// Quiz answer variants supplement the source dataset; displayed country names stay unchanged.
const additionalNames = {
  IND: [
    "Hind",
    "Hindustan",
    "Bharat",
    "هند",
    "هندوستان",
    "بهارات",
    "الهند",
    "Hindistan",
    "Hindoustan",
    "Индостан",
    "Бхарат",
  ],
  USA: [
    "USA",
    "US",
    "America",
    "آمریکا",
    "امریکا",
    "ایالات متحده",
    "أمريكا",
    "ABD",
    "Amerika",
    "États Unis",
    "США",
    "Америка",
  ],
  GBR: [
    "UK",
    "Britain",
    "Great Britain",
    "بریتانیا",
    "بریتانیای کبیر",
    "انگلیس",
    "بريطانيا",
    "İngiltere",
    "Grande Bretagne",
    "Royaume Uni",
    "Великобритания",
    "Британия",
    "انگلستان",
    "بریتانیه",
  ],
  ARE: ["UAE", "امارات", "الإمارات", "BAE", "Émirats arabes unis", "ОАЭ"],
  NLD: ["Holland", "هلند", "هولندا", "Hollanda", "Hollande", "Голландия"],
  CZE: [
    "Czechia",
    "Czech Republic",
    "چک",
    "جمهوری چک",
    "التشيك",
    "Çekya",
    "Çek Cumhuriyeti",
    "Tchéquie",
    "République tchèque",
    "Чехия",
  ],
  MMR: ["Burma", "برمه", "میانمار", "بورما", "Birmanya", "Birmanie", "Бирма"],
  SWZ: [
    "Swaziland",
    "Eswatini",
    "سوازیلند",
    "اسواتینی",
    "سوازيلند",
    "إسواتيني",
    "Svaziland",
    "Esvatini",
    "Эсватини",
    "Свазиленд",
  ],
  TLS: [
    "East Timor",
    "Timor Leste",
    "تیمور شرقی",
    "تيمور الشرقية",
    "Doğu Timor",
    "Timor oriental",
    "Восточный Тимор",
  ],
  CPV: [
    "Cape Verde",
    "Cabo Verde",
    "کیپ ورد",
    "کابو ورد",
    "الرأس الأخضر",
    "Yeşil Burun Adaları",
    "Cap Vert",
    "Кабо Верде",
  ],
  CIV: [
    "Ivory Coast",
    "Cote d Ivoire",
    "ساحل عاج",
    "ساحل العاج",
    "Fildişi Sahili",
    "Кот д Ивуар",
  ],
  BLR: [
    "Belarus",
    "بلاروس",
    "روسیه سفید",
    "بيلاروس",
    "روسيا البيضاء",
    "Beyaz Rusya",
    "Biélorussie",
    "Беларусь",
    "Белоруссия",
  ],
  MKD: [
    "North Macedonia",
    "مقدونیه شمالی",
    "مقدونيا الشمالية",
    "Kuzey Makedonya",
    "Macédoine du Nord",
    "Северная Македония",
  ],
  VAT: [
    "Vatican",
    "Vatican City",
    "Holy See",
    "واتیکان",
    "الفاتيكان",
    "Vatikan",
    "Cité du Vatican",
    "Ватикан",
  ],
  RUS: [
    "Russia",
    "Russian Federation",
    "روسیه",
    "فدراسیون روسیه",
    "روسيا",
    "Rusya",
    "Russie",
    "Россия",
    "РФ",
  ],
  IRN: ["Iran", "ایران", "إيران", "İran", "Иран"],
  KOR: [
    "South Korea",
    "Republic of Korea",
    "کره جنوبی",
    "كوريا الجنوبية",
    "Güney Kore",
    "Corée du Sud",
    "Южная Корея",
  ],
  PRK: [
    "North Korea",
    "DPRK",
    "کره شمالی",
    "كوريا الشمالية",
    "Kuzey Kore",
    "Corée du Nord",
    "Северная Корея",
    "КНДР",
  ],
  SAU: [
    "Saudi Arabia",
    "Saudi",
    "عربستان",
    "عربستان سعودی",
    "السعودية",
    "Suudi Arabistan",
    "Arabie saoudite",
    "Саудовская Аравия",
    "عربستان صعودی",
    "عربستان سئودی",
    "سعودی",
  ],
  AZE: ["آذربایجان", "آزربایجان"],
  CHE: ["سوییس", "سویس"],
  COM: ["کومور", "جزایر قمر", "قمر", "Comoro Islands", "Komor Adaları"],
  LTU: ["لیتوانی"],
  GIN: [
    "گینه",
    "جمهوری گینه",
    "Guinea Conakry",
    "Guinée Conakry",
    "غينيا كوناكري",
    "Gine Konakri",
    "Гвинея Конакри",
  ],
  COD: [
    "DRC",
    "DR Congo",
    "Congo Kinshasa",
    "Democratic Congo",
    "جمهوری دموکراتیک کنگو",
    "کنگو کینشاسا",
    "الكونغو الديمقراطية",
    "الكونغو كينشاسا",
    "Kongo Kinşasa",
    "Congo démocratique",
    "Congo Kinshasa",
    "ДР Конго",
    "Конго Киншаса",
  ],
  COG: [
    "Congo Brazzaville",
    "کنگو برازاویل",
    "الكونغو برازافيل",
    "Kongo Brazavil",
    "Конго Браззавиль",
  ],
  KAZ: ["کازاخستان"],
  KGZ: [
    "قرغیزستان",
    "Kyrgyz Republic",
    "Kyrgyzstan",
    "Kirghizia",
    "Кыргызстан",
    "قرغزستان",
  ],
  MEX: ["المكسيك"],
  SRB: ["صربيا"],
  UZB: ["أوزبكستان", "اوزبکستان"],
  ERI: ["اریتره", "اریتریا"],
  DOM: ["دومینیکن", "الدومينيكان"],
  MUS: ["Maurice", "موریس", "موریسیوس", "موریشس"],
  ZAF: ["RSA", "South Africa", "افریقای جنوبی", "Afrique du Sud", "ЮАР"],
  CAF: ["CAR", "جمهوری افریقای مرکزی", "Centrafrique", "RCA", "ЦАР"],
  FSM: ["FSM", "Federated States of Micronesia", "ایالات فدرال میکرونزی"],
  NZL: ["NZ", "نیوزلند", "نیوزیلند"],
  PNG: ["PNG", "پاپوا گینه نو"],
  LKA: ["Ceylon", "سیلان", "سيلان", "Seylan", "Ceylan", "Цейлон"],
  THA: ["Siam", "سیام", "سيام", "Сиам"],
  TUR: ["Turkey", "Türkiye"],
  KNA: [
    "Saint Christopher and Nevis",
    "سنت کریستوفر و نویس",
    "Saint Christophe et Niévès",
  ],
  PRT: ["پرتقال"],
  TJK: ["تاجکستان"],
  NIC: ["نیکاراگوآ", "نیکاراگوا"],
  URY: ["اوروگوئه", "اوروگوای", "اروگوای"],
  PRY: ["پاراگوای"],
  ZWE: ["زیمباوه"],
  SWE: ["سوید"],
  BEL: ["بلجیک"],
  JPN: ["جاپان"],
  BDI: ["بروندی"],
  RWA: ["روآندا", "رواندا"],
  BIH: ["بوسنی و هرزگوین", "بوسنی و هرزه گوین"],
  SVK: ["اسلوواکی", "سلواکی"],
  SVN: ["سلوونی"],
  LIE: ["لیختن اشتاین", "لیشتن اشتاین"],
  STP: ["سائوتومه و پرینسیپ"],
  SLE: ["سیرا لئون", "سیرالئون"],
  CMR: ["کامرون", "کامیرون"],
  GTM: ["گواتمالا", "گواتیمالا"],
  BWA: ["بوتسوانا", "بوتسوان"],
  BRN: ["برونئی", "برونای"],
  LAO: ["لاووس"],
  MDA: ["مولداوا", "مولدوا"],
  MNE: ["مونتنگرو", "مونته نگرو"],
  SYC: ["سیشل"],
  KEN: ["کینیا"],
  ETH: ["اتیوپیا"],
};

const rejectedAliases = {
  GIN: ["پاپوآ گینه نو", "مملکت مستقل پاپوآ گینه نو"],
  DMA: ["도미니카 공화국"],
  TZA: ["Tádzsikisztán", "Tádzsik Köztársaság"],
  COD: ["Kongo", "الكونغو"],
  COG: ["Kongo"],
  ISR: ["فلسطين اشغالی", "فلسطین اشغالی"],
  LTU: ["لیتوانیایی‌ها"],
};

export function countryAliases(country, fallbackName = "") {
  if (!country) return [fallbackName];
  const candidates = [
    ...new Set(
      [
        fallbackName,
        country.name.common,
        country.name.official,
        ...(country.altSpellings || []),
        ...Object.values(country.translations || {}).flatMap((n) => [
          n.common,
          n.official,
        ]),
        ...Object.values(country.name.nativeName || {}).flatMap((n) => [
          n.common,
          n.official,
        ]),
        ...routeLanguages.map((language) =>
          new Intl.DisplayNames([language], { type: "region" }).of(
            country.cca2,
          ),
        ),
        ...(additionalNames[country.cca3] || []),
      ].filter(Boolean),
    ),
  ];
  const blocked = new Set((rejectedAliases[country.cca3] || []).map(normalize));
  return [
    ...new Set(
      candidates.flatMap((alias) => [
        alias,
        ...(alias.startsWith("ال") ? [alias.slice(2)] : []),
        ...(/\bSaint(?:e)?[ -]/i.test(alias)
          ? [
              alias
                .replace(/\bSainte[ -]/gi, "Ste ")
                .replace(/\bSaint[ -]/gi, "St "),
            ]
          : []),
      ]),
    ),
  ].filter((alias) => !blocked.has(normalize(alias)));
}

// Suggestions use the selected language; answer validation remains multilingual.
export function localizedCountryAliases(country, language) {
  if (!country) return [];
  const code = {
    en: "eng",
    fa: "per",
    ar: "ara",
    tr: "tur",
    fr: "fra",
    ru: "rus",
  }[language];
  const translated =
    language === "en" ? country.name : country.translations?.[code];
  const native = country.name.nativeName?.[code];
  const script =
    language === "fa" || language === "ar"
      ? /\p{Script=Arabic}/u
      : language === "ru"
        ? /\p{Script=Cyrillic}/u
        : /\p{Script=Latin}/u;
  const extras = (additionalNames[country.cca3] || []).filter((value) =>
    script.test(value),
  );
  return [
    translated?.common,
    translated?.official,
    native?.common,
    native?.official,
    ...(language === "en" ||
    language === "fa" ||
    language === "ar" ||
    language === "ru"
      ? extras
      : []),
  ].filter(Boolean);
}
