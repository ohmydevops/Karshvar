import { matches } from "./logic.js";
import { bindCountrySuggestions } from "./suggestions.js";

export function bindStartingCountry({
  input,
  list,
  button,
  candidates,
  language,
  copy,
  startLabel,
  onStart,
}) {
  let selected = null;
  let composing = false;
  function resolve() {
    if (composing) return null;
    const accepts = (country) =>
      matches(input.value, [country.label, ...country.aliases]);
    if (selected && candidates.includes(selected) && accepts(selected))
      return selected;
    const exact = candidates.filter(accepts);
    return exact.length === 1 ? exact[0] : null;
  }
  function sync() {
    selected = resolve();
    button.disabled = !selected;
    button.textContent = selected
      ? copy.start.replace("{country}", selected.label)
      : startLabel;
    return selected;
  }
  input.addEventListener("compositionstart", () => {
    composing = true;
    sync();
  });
  input.addEventListener("compositionend", () => {
    composing = false;
    sync();
  });
  input.addEventListener("input", sync);
  input.addEventListener("change", sync);
  bindCountrySuggestions(
    input,
    list,
    () => candidates,
    () => language,
    (country) => {
      composing = false;
      selected = country;
      sync();
    },
  );
  button.onclick = () => {
    const country = sync();
    if (country) onStart(country.id);
  };
  sync();
}

export const countrySetupCopy = {
  fa: {
    step: "آماده‌سازی بازی",
    title: "کشور خودت را برای شروع انتخاب کن",
    label: "کشور",
    placeholder: "به فارسی بنویس، مثلاً ایران…",
    hint: "از همسایه‌ها شروع می‌کنی و به کشورهای دورتر می‌رسی.",
    start: "شروع بازی از {country}",
  },
  en: {
    step: "Game setup",
    title: "Choose your country to get started",
    label: "Country",
    placeholder: "e.g. United Kingdom…",
    hint: "Guess neighboring countries first, then explore further afield.",
    start: "Start from {country}",
  },
  ar: {
    step: "إعداد اللعبة",
    title: "اختر بلدك لبدء اللعبة",
    label: "البلد",
    placeholder: "مثلاً مصر…",
    hint: "ستبدأ بتخمين الدول المجاورة لبلدك، ثم تنتقل إلى الدول الأبعد.",
    start: "ابدأ من {country}",
  },
  tr: {
    step: "Oyun hazırlığı",
    title: "Başlamak için ülkeni seç",
    label: "Ülke",
    placeholder: "Örn. Türkiye…",
    hint: "Önce ülkenin komşularını, sonra daha uzak ülkeleri tahmin edeceksin.",
    start: "{country} ile başla",
  },
  fr: {
    step: "Préparation du jeu",
    title: "Choisis ton pays pour commencer",
    label: "Pays",
    placeholder: "Par exemple, France…",
    hint: "Tu devineras d’abord les pays voisins du tien, puis les pays plus éloignés.",
    start: "Commencer depuis {country}",
  },
  ru: {
    step: "Подготовка к игре",
    title: "Выбери свою страну для начала игры",
    label: "Страна",
    placeholder: "Например, Россия…",
    hint: "Сначала ты будешь угадывать соседние страны, затем — более далёкие.",
    start: "Начать со страны: {country}",
  },
};
