export const routeLanguages = ["en", "fa", "ar", "tr", "fr", "ru"];
export const pageTypes = [
  "home",
  "continents",
  "modes",
  "countries",
  "play",
  "results",
  "about",
  "explore",
  "sources",
];
export const pageCopy = {
  en: {
    sources: "Sources",
    homeTitle: "How well do you know the world?",
    homeDescription:
      "Guess the country on the map. Discover a new corner of the world with every turn.",
    start: "Start game",
    home: "Home",
    continents: "Choose your adventure",
    results: "Your discoveries",
    again: "Choose another continent",
    play: "Country quiz",
    explore: "Explore the map",
    exploreDescription:
      "Choose a continent and discover its countries. Drag to move; zoom in to see smaller countries.",
  },
  fa: {
    sources: "منابع",
    homeTitle: "دنیا رو چقدر می‌شناسی؟",
    homeDescription:
      "کشور رو از روی نقشه حدس بزن؛ هر بار یه گوشه‌ی دنیا رو کشف کن.",
    start: "شروع بازی",
    home: "خانه",
    continents: "ماجراجویی‌ات رو انتخاب کن",
    results: "کشف‌های تو",
    again: "یک قارهٔ دیگه انتخاب کن",
    play: "حدس کشور",
    explore: "کاوش در نقشه",
    exploreDescription:
      "یک قاره انتخاب کن و کشورهاش رو بشناس. نقشه رو بچرخون و برای دیدن کشورهای کوچک‌تر بزرگ‌نمایی کن.",
  },
  ar: {
    sources: "المصادر",
    homeTitle: "كم تعرف عن العالم؟",
    homeDescription:
      "خمّن البلد على الخريطة، واكتشف ركنًا جديدًا من العالم في كل مرة.",
    start: "ابدأ اللعب",
    home: "الرئيسية",
    continents: "اختر مغامرتك",
    results: "اكتشافاتك",
    again: "اختر قارة أخرى",
    play: "تخمين البلدان",
    explore: "استكشف الخريطة",
    exploreDescription:
      "اختر قارة وتعرّف على بلدانها. اسحب لتحريك الخريطة وكبّر لرؤية البلدان الصغيرة.",
  },
  tr: {
    sources: "Kaynaklar",
    homeTitle: "Dünyayı ne kadar tanıyorsun?",
    homeDescription:
      "Haritadaki ülkeyi tahmin et. Her turda dünyanın yeni bir köşesini keşfet.",
    start: "Oyuna başla",
    home: "Ana sayfa",
    continents: "Maceranı seç",
    results: "Keşiflerin",
    again: "Başka bir kıta seç",
    play: "Ülke tahmini",
    explore: "Haritayı keşfet",
    exploreDescription:
      "Bir kıta seç ve ülkelerini tanı. Haritayı sürükle, küçük ülkeler için yakınlaştır.",
  },
  fr: {
    sources: "Sources",
    homeTitle: "Connaissez-vous bien le monde ?",
    homeDescription:
      "Devinez le pays sur la carte. À chaque tour, découvrez un nouveau coin du monde.",
    start: "Jouer",
    home: "Accueil",
    continents: "Choisissez votre aventure",
    results: "Vos découvertes",
    again: "Choisir un autre continent",
    play: "Devinez le pays",
    explore: "Explorer la carte",
    exploreDescription:
      "Choisissez un continent et découvrez ses pays. Faites glisser la carte et zoomez pour voir les petits pays.",
  },
  ru: {
    sources: "Источники",
    homeTitle: "Как хорошо ты знаешь мир?",
    homeDescription: "Угадай страну на карте. Каждый ход — новый уголок мира.",
    start: "Начать игру",
    home: "Главная",
    continents: "Выберите приключение",
    results: "Ваши открытия",
    again: "Выбрать другой континент",
    play: "Угадайте страну",
    explore: "Изучить карту",
    exploreDescription:
      "Выберите континент и познакомьтесь с его странами. Перетаскивайте карту и приближайте небольшие страны.",
  },
};
export function pagePath(language, page = "home", continent) {
  const locale = routeLanguages.includes(language) ? language : "en";
  const route = pageTypes.includes(page) ? page : "home";
  const path = `./${locale}/${route === "home" ? "" : route + "/"}`;
  return (
    path +
    (["play", "results", "explore"].includes(route) && continent
      ? "?continent=" + encodeURIComponent(continent)
      : "")
  );
}
