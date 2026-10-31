import { latestAnswers, mountHistoryGlobe } from "./history-globe.js";
export const historyCopy = {
  en: [
    "Game history",
    "No answers yet.",
    "Correct",
    "Wrong",
    "Revealed",
    "Your answer",
    "Close",
    "Current country",
    "Saved on this device. Restarting or resetting clears the corresponding history.",
  ],
  fa: [
    "تاریخچه بازی",
    "هنوز پاسخی ثبت نشده است.",
    "درست",
    "نادرست",
    "نمایش پاسخ",
    "پاسخ شما",
    "بستن",
    "کشور فعلی",
    "ذخیره روی این دستگاه؛ شروع دوباره یا بازنشانی، تاریخچه مربوط را پاک می‌کند.",
  ],
  ar: [
    "سجل اللعب",
    "لا توجد إجابات بعد.",
    "صحيح",
    "خطأ",
    "تم الكشف",
    "إجابتك",
    "إغلاق",
    "البلد الحالي",
    "محفوظ على هذا الجهاز. إعادة اللعب أو التصفير تمسح السجل المقابل.",
  ],
  tr: [
    "Oyun geçmişi",
    "Henüz yanıt yok.",
    "Doğru",
    "Yanlış",
    "Gösterildi",
    "Yanıtın",
    "Kapat",
    "Şimdiki ülke",
    "Bu cihazda saklanır. Yeniden başlatma ilgili geçmişi siler.",
  ],
  fr: [
    "Historique",
    "Aucune réponse pour le moment.",
    "Correct",
    "Incorrect",
    "Révélé",
    "Votre réponse",
    "Fermer",
    "Pays actuel",
    "Enregistré sur cet appareil. Rejouer ou réinitialiser efface l’historique correspondant.",
  ],
  ru: [
    "История игры",
    "Ответов пока нет.",
    "Верно",
    "Неверно",
    "Показан ответ",
    "Ваш ответ",
    "Закрыть",
    "Текущая страна",
    "Сохранено на этом устройстве. Перезапуск или сброс удаляет соответствующую историю.",
  ],
};
export function answerStatus(answer) {
  return answer?.choice === ""
    ? "revealed"
    : answer?.correct
      ? "correct"
      : "wrong";
}
export function answerFill(id, currentId, answers = []) {
  const answer = answers.find((a) => a.id === id);
  if (answer) return `var(--answer-${answerStatus(answer)})`;
  return id === currentId ? "#ffbd4a" : "var(--land)";
}
export function bindHistory({ language, getSessions, sessionLabel }) {
  const copy = historyCopy[language] || historyCopy.en;
  const statusIndex = { correct: 2, wrong: 3, revealed: 4 };
  const emptyCopy = {
    en: [
      "No game started yet",
      "Play Karshvar",
      "Couldn’t load history. Please try again.",
    ],
    fa: [
      "هنوز بازی‌ای شروع نشده",
      "بازی کَرشوَر",
      "تاریخچه بارگیری نشد. دوباره تلاش کنید.",
    ],
    ar: [
      "لم تبدأ أي لعبة بعد",
      "العب Karshvar",
      "تعذّر تحميل السجل. حاول مجدداً.",
    ],
    tr: [
      "Henüz oyun başlamadı",
      "Karshvar oyna",
      "Geçmiş yüklenemedi. Tekrar deneyin.",
    ],
    fr: [
      "Aucune partie commencée",
      "Jouer à Karshvar",
      "Impossible de charger l’historique. Réessayez.",
    ],
    ru: [
      "Игра ещё не начата",
      "Играть в Karshvar",
      "Не удалось загрузить историю. Попробуйте снова.",
    ],
  }[language] || [
    "No game started yet",
    "Play Karshvar",
    "Couldn’t load history. Please try again.",
  ];
  const make = (tag, text, className) => {
    const el = document.createElement(tag);
    if (text !== undefined) el.textContent = text;
    if (className) el.className = className;
    return el;
  };
  const button = make("a", copy[0], "history-open");
  button.id = "historyOpen";
  button.href = new URL("./" + language + "/history/", document.baseURI).href;
  document.querySelector(".site-menu nav").append(button);
  if (document.documentElement.dataset.page === "play") {
    const legend = make("div", undefined, "answer-legend");
    for (const status of ["correct", "wrong", "revealed"])
      legend.append(make("span", copy[statusIndex[status]], status));
    document.querySelector(".globe-panel").append(legend);
  }
  if (document.documentElement.dataset.page !== "history") return;
  button.setAttribute("aria-current", "page");
  const content = document.getElementById("historyContent");
  const load = async () => {
    try {
      const response = await fetch(
        new URL("./data/names.json", import.meta.url),
      );
      if (!response.ok) throw Error("names");
      const names = await response.json();
      const display = new Intl.DisplayNames([language], { type: "region" });
      const name = (id) => {
        const n = names.find((n) => n.ccn3 === id);
        return n ? display.of(n.cca2) : id;
      };
      content.replaceChildren();
      const answers = latestAnswers(getSessions());
      const count = answers.length;
      {
        const response = await fetch(
          new URL("./data/countries.json", import.meta.url),
        );
        if (!response.ok) throw Error("map");
        const topology = await response.json();
        const features = globalThis.topojson.feature(
          topology,
          topology.objects.countries,
        ).features;
        const playable = new Set(
          names.filter((n) => n.independent === true).map((n) => n.ccn3),
        );
        const ids = features.filter((f) => playable.has(f.id)).map((f) => f.id);
        const completed = new Set(
          answers.filter((a) => ids.includes(a.id)).map((a) => a.id),
        ).size;
        const progressLabel = {
          en: "Countries answered",
          fa: "کشورهای پاسخ‌داده‌شده",
          ar: "البلدان التي تمت الإجابة عنها",
          tr: "Yanıtlanan ülkeler",
          fr: "Pays répondus",
          ru: "Страны с ответами",
        }[language];
        const format = new Intl.NumberFormat(language);
        const percentage = new Intl.NumberFormat(language, {
          style: "percent",
          maximumFractionDigits: 0,
        }).format(ids.length ? completed / ids.length : 0);
        const progressText = make(
          "p",
          progressLabel +
            ": " +
            format.format(completed) +
            " / " +
            format.format(ids.length) +
            " · " +
            percentage,
        );
        progressText.id = "historyProgressLabel";
        const progress = document.createElement("progress");
        progress.className = "history-progress";
        progress.max = ids.length || 1;
        progress.value = completed;
        progress.setAttribute("aria-labelledby", "historyProgressLabel");
        content.append(progressText, progress);
        if (count)
          mountHistoryGlobe(content, {
            features,
            answers,
            name,
            copy,
            status: answerStatus,
            fill: answerFill,
          });
      }
      if (!count) {
        const home = make("a", emptyCopy[1], "primary");
        home.href = new URL("./" + language + "/", document.baseURI).href;
        content.append(make("p", emptyCopy[0]), home);
      }
    } catch {
      content.replaceChildren(make("p", emptyCopy[2]));
    }
  };

  return load();
}
