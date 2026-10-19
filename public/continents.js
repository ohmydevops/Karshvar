import { shuffled } from "./logic.js";
export const continents = [
  "Africa",
  "Asia",
  "Europe",
  "North America",
  "South America",
  "Oceania",
];
export const labels = {
  en: [
    "Choose your continent",
    "Where would you like to play?",
    "Choose a continent, then guess its highlighted countries.",
    "Change continent",
    "Continent complete!",
    "Play this continent again",
    "answered",
    "Africa",
    "Asia",
    "Europe",
    "North America",
    "South America",
    "Oceania",
  ],
  fa: [
    "قاره‌ات رو انتخاب کن",
    "دوست داری کجا بازی کنی؟",
    "یک قاره انتخاب کن، بعد اسم کشورهایی که روشن می‌شن رو حدس بزن.",
    "تغییر قاره",
    "این قاره رو تموم کردی!",
    "این قاره رو دوباره بازی کن",
    "پاسخ داده‌شده",
    "آفریقا",
    "آسیا",
    "اروپا",
    "آمریکای شمالی",
    "آمریکای جنوبی",
    "اقیانوسیه",
  ],
  ar: [
    "اختر القارة",
    "أين تود أن تلعب؟",
    "اختر قارة، ثم خمن أسماء البلدان المميزة فيها.",
    "تغيير القارة",
    "أكملت القارة!",
    "العب هذه القارة مجددًا",
    "تمت الإجابة",
    "أفريقيا",
    "آسيا",
    "أوروبا",
    "أمريكا الشمالية",
    "أمريكا الجنوبية",
    "أوقيانوسيا",
  ],
  tr: [
    "Kıtanı seç",
    "Nerede oynamak istersin?",
    "Bir kıta seç, ardından vurgulanan ülkelerini tahmin et.",
    "Kıtayı değiştir",
    "Kıta tamamlandı!",
    "Bu kıtayı tekrar oyna",
    "yanıtlandı",
    "Afrika",
    "Asya",
    "Avrupa",
    "Kuzey Amerika",
    "Güney Amerika",
    "Okyanusya",
  ],
  fr: [
    "Choisissez votre continent",
    "Où voulez-vous jouer ?",
    "Choisissez un continent, puis devinez ses pays en surbrillance.",
    "Changer de continent",
    "Continent terminé !",
    "Rejouer ce continent",
    "réponses données",
    "Afrique",
    "Asie",
    "Europe",
    "Amérique du Nord",
    "Amérique du Sud",
    "Océanie",
  ],
  ru: [
    "Выберите континент",
    "Где хотите сыграть?",
    "Выберите континент и угадывайте выделенные страны в нём.",
    "Сменить континент",
    "Континент пройден!",
    "Сыграть на этом континенте снова",
    "отвечено",
    "Африка",
    "Азия",
    "Европа",
    "Северная Америка",
    "Южная Америка",
    "Океания",
  ],
};
// Use the dataset's primary region so transcontinental countries occur only once.
export function continentFor(country) {
  if (country.region === "Americas")
    return country.subregion === "South America"
      ? "South America"
      : "North America";
  return continents.includes(country.region) ? country.region : null;
}
export function validSession(session, ids) {
  return (
    !!session &&
    Array.isArray(session.order) &&
    session.order.length === ids.length &&
    new Set(session.order).size === ids.length &&
    session.order.every((id) => ids.includes(id)) &&
    Number.isInteger(session.index) &&
    session.index >= 0 &&
    session.index <= ids.length &&
    Array.isArray(session.answers) &&
    session.answers.length >= session.index &&
    session.answers.length <= Math.min(session.index + 1, ids.length) &&
    session.answers.every(
      (a, i) =>
        a && a.id === session.order[i] && typeof a.correct === "boolean",
    )
  );
}
export function createSession(ids, previous) {
  const answers = Array.isArray(previous?.answers)
    ? previous.answers.filter(
        (a, i, all) =>
          a &&
          ids.includes(a.id) &&
          typeof a.correct === "boolean" &&
          all.findIndex((b) => b?.id === a.id) === i,
      )
    : [];
  return {
    order: [
      ...answers.map((a) => a.id),
      ...shuffled(ids.filter((id) => !answers.some((a) => a.id === id))),
    ],
    index: answers.length,
    answers,
  };
}
