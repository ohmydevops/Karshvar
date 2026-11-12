import { missionUI, translatedBriefings } from "./save-earth-i18n.mjs";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { brandName } from "../public/brand.js";

const sceneMessages = {
  en: [
    "Desktop only · keyboard and mouse required.",
    "Loading the 3D scene…",
    "The 3D scene could not load. Reload to try again.",
  ],
  fa: [
    "فقط برای دسکتاپ؛ با صفحه‌کلید و موس بازی کن.",
    "در حال بارگذاری صحنهٔ سه‌بعدی…",
    "صحنهٔ سه‌بعدی بارگذاری نشد. صفحه را دوباره بارگذاری کن.",
  ],
  ar: [
    "للحاسوب فقط؛ يلزم استخدام لوحة المفاتيح والفأرة.",
    "جارٍ تحميل المشهد ثلاثي الأبعاد…",
    "تعذّر تحميل المشهد. أعد تحميل الصفحة.",
  ],
  fr: [
    "Sur ordinateur uniquement, avec clavier et souris.",
    "Chargement de la scène 3D…",
    "Échec du chargement. Recharge la page.",
  ],
  ru: [
    "Только для компьютера с клавиатурой и мышью.",
    "Загрузка 3D-сцены…",
    "Не удалось загрузить сцену. Обнови страницу.",
  ],
  tr: [
    "Yalnızca masaüstü; klavye ve fare gerektirir.",
    "3B sahne yükleniyor…",
    "Sahne yüklenemedi. Sayfayı yenile.",
  ],
};

const briefingCopy = {
  ...translatedBriefings,
  en: [
    "MISSION: Protect Earth. Destroy incoming meteors before they hit.",
    "LOOK & AIM: Move your mouse to turn and aim. Hold the left mouse button to fire.",
    "MOVE: W / S moves forward / backward; A / D moves sideways. Space rises; Shift descends.",
    "RELOAD: Press R to replace your 30-round magazine.",
    "FLIGHT: Q / E rolls your body. Hold F to brake your drift.",
    "VIEW: V switches camera. Hold Ctrl and move the mouse to look around the astronaut; you can still fire. Hold the right mouse button to zoom.",
    "CONTROLS: Esc pauses. M toggles sound. H opens help.",
  ],
  fa: [
    "مأموریت: از زمین محافظت کن؛ شهاب‌ها را پیش از برخورد با زمین نابود کن.",
    "نشانه‌گیری و شلیک: موس را حرکت بده تا بچرخی و هدف بگیری. دکمهٔ چپ موس را نگه دار تا شلیک کنی.",
    "حرکت: با W جلو و با S عقب برو؛ A و D حرکت به چپ و راست هستند. با Space بالا و با Shift پایین برو.",
    "تعویض خشاب: با R خشاب ۳۰تایی اسلحه را عوض کن.",
    "کنترل پرواز: با Q و E به دور محور بدنت بچرخ. F را نگه دار تا حرکتت آرام بگیرد.",
    "دوربین: V نما را عوض می‌کند. Ctrl را نگه دار و موس را حرکت بده تا دور فضانورد را ببینی؛ در این حالت هم می‌توانی شلیک کنی. دکمهٔ راست موس را برای زوم نگه دار.",
    "کنترل‌ها: Esc بازی را متوقف می‌کند؛ M صدا را قطع یا وصل می‌کند و H راهنما را نشان می‌دهد.",
  ],
};
const flightCopy = {
  en: [
    "WASD: fly · Mouse: look · Space / Shift: up / down · Q / E: roll · F: brake · V: camera · Esc: pause",
    "Paused — resume to capture the mouse.",
    "Resume",
    "Click Resume to enable mouse look.",
    "MAGAZINE",
    "Ready",
    "Reloading…",
    "Empty — press R",
    "R · RELOAD",
  ],
  fa: [
    "WASD: پرواز · موس: چرخش · Space / Shift: بالا / پایین · Q / E: غلتش · F: ترمز · V: دوربین · Esc: مکث",
    "بازی متوقف شد؛ برای کنترل موس ادامه بده.",
    "ادامهٔ بازی",
    "برای فعال‌شدن کنترل موس، ادامهٔ بازی را بزن.",
    "خشاب",
    "آمادهٔ شلیک",
    "بارگذاری خشاب…",
    "خشاب خالی — R را بزن",
    "R · تعویض خشاب",
  ],
  ar: [
    "WASD: طيران · الفأرة: نظر · Space / Shift: صعود / هبوط · Q / E: دوران · F: فرملة · V: كاميرا · Esc: إيقاف",
    "متوقف مؤقتًا. استأنف للتحكم بالفأرة.",
    "استئناف",
    "انقر استئناف لتفعيل الفأرة.",
    "المخزن",
    "جاهز",
    "إعادة التلقيم…",
    "فارغ — اضغط R",
    "R · تلقيم",
  ],
  fr: [
    "WASD : vol · Souris : regard · Espace / Maj : monter / descendre · Q / E : roulis · F : frein · V : caméra · Échap : pause",
    "En pause. Reprends pour contrôler la souris.",
    "Reprendre",
    "Clique sur Reprendre pour activer la souris.",
    "CHARGEUR",
    "Prêt",
    "Rechargement…",
    "Vide — appuie sur R",
    "R · RECHARGER",
  ],
  ru: [
    "WASD: полёт · Мышь: обзор · Space / Shift: вверх / вниз · Q / E: крен · F: тормоз · V: камера · Esc: пауза",
    "Пауза. Продолжи для управления мышью.",
    "Продолжить",
    "Нажми «Продолжить» для управления мышью.",
    "МАГАЗИН",
    "Готово",
    "Перезарядка…",
    "Пусто — нажми R",
    "R · ПЕРЕЗАРЯДКА",
  ],
  tr: [
    "WASD: uçuş · Fare: bakış · Space / Shift: yukarı / aşağı · Q / E: yatış · F: fren · V: kamera · Esc: duraklat",
    "Duraklatıldı. Fare kontrolü için devam et.",
    "Devam et",
    "Fare kontrolü için Devam et düğmesine tıkla.",
    "ŞARJÖR",
    "Hazır",
    "Dolduruluyor…",
    "Boş — R tuşuna bas",
    "R · DOLDUR",
  ],
};
const soundCopy = {
  en: ["Sound on · M", "Sound off · M"],
  fa: ["صدا روشن · M", "صدا خاموش · M"],
  ar: ["الصوت يعمل · M", "الصوت مكتوم · M"],
  fr: ["Son activé · M", "Son coupé · M"],
  ru: ["Звук включён · M", "Звук выключен · M"],
  tr: ["Ses açık · M", "Ses kapalı · M"],
};
const ammoCopy = {
  en: ["Ammo", "R: reload"],
  fa: ["تیر", "R: بارگذاری خشاب"],
  ar: ["الذخيرة", "R: إعادة التلقيم"],
  fr: ["Munitions", "R : recharger"],
  ru: ["Патроны", "R: перезарядка"],
  tr: ["Mermi", "R: şarjör değiştir"],
};
const title = "Save the Earth";
const origin = "https://karshvar.ir/";
const copy = {
  en: [
    "Intercept the meteors before they hit Earth.",
    "Play",
    "Back to home",
    "Move with WASD or the arrow keys. Aim with the mouse and click or hold to fire.",
    "Score",
    "Earth shields",
    "Start game",
    "Play again",
    "End round",
    "Earth’s shields are down.",
    "Round ended.",
    "Previous scores",
    "No rounds yet.",
    "Move",
  ],
  fa: [
    "قبل از رسیدن شهاب‌ها به زمین، آن‌ها را بزن.",
    "ورود به بازی",
    "بازگشت به صفحهٔ اول",
    "با WASD یا کلیدهای جهت حرکت کن. با موس نشانه بگیر و برای شلیک کلیک کن یا دکمه را نگه دار.",
    "امتیاز",
    "سپر زمین",
    "شروع بازی",
    "دوباره بازی کن",
    "پایان دور",
    "سپر زمین از بین رفت.",
    "دور تمام شد.",
    "امتیازهای قبلی",
    "هنوز دوری بازی نکرده‌ای.",
    "حرکت",
  ],
  ar: [
    "اعترض الشهب قبل أن تصطدم بالأرض.",
    "العب",
    "العودة إلى الرئيسية",
    "تحرّك بمفاتيح WASD أو الأسهم. صوّب بالفأرة وانقر أو اضغط باستمرار للإطلاق.",
    "النقاط",
    "درع الأرض",
    "ابدأ اللعبة",
    "العب مجددًا",
    "أنه الجولة",
    "انهار درع الأرض.",
    "انتهت الجولة.",
    "النقاط السابقة",
    "لم تلعب أي جولة بعد.",
    "الحركة",
  ],
  fr: [
    "Intercepte les météores avant qu’ils ne frappent la Terre.",
    "Jouer",
    "Retour à l’accueil",
    "Déplace-toi avec WASD, ZQSD ou les flèches. Vise à la souris et clique ou maintiens le bouton pour tirer.",
    "Score",
    "Bouclier terrestre",
    "Commencer",
    "Rejouer",
    "Terminer la partie",
    "Le bouclier terrestre a cédé.",
    "Partie terminée.",
    "Scores précédents",
    "Aucune partie pour le moment.",
    "Déplacement",
  ],
  ru: [
    "Перехватывай метеоры, пока они не достигли Земли.",
    "Играть",
    "На главную",
    "Двигайся клавишами WASD или стрелками. Целься мышью и нажимай или удерживай кнопку для стрельбы.",
    "Очки",
    "Щит Земли",
    "Начать игру",
    "Играть снова",
    "Завершить раунд",
    "Щит Земли разрушен.",
    "Раунд завершён.",
    "Предыдущие результаты",
    "Раундов пока нет.",
    "Движение",
  ],
  tr: [
    "Göktaşlarını Dünya’ya çarpmadan durdur.",
    "Oyna",
    "Ana sayfaya dön",
    "WASD veya ok tuşlarıyla hareket et. Fareyle nişan al, ateş etmek için tıkla veya düğmeyi basılı tut.",
    "Puan",
    "Dünya’nın kalkanı",
    "Oyunu başlat",
    "Tekrar oyna",
    "Turu bitir",
    "Dünya’nın kalkanı çöktü.",
    "Tur bitti.",
    "Önceki puanlar",
    "Henüz tur oynanmadı.",
    "Hareket",
  ],
};
const desktopCopy = {
  en: [
    "Play on a computer",
    "Save the Earth needs a desktop or laptop with a keyboard and mouse. Open this page on your computer to play.",
    "Got it",
  ],
  fa: [
    "با کامپیوتر بازی کن",
    "برای بازی Save the Earth به کامپیوتر یا لپ‌تاپ با صفحه‌کلید و موس نیاز داری. این صفحه را روی کامپیوتر باز کن.",
    "متوجه شدم",
  ],
  ar: [
    "العب على الكمبيوتر",
    "تحتاج لعبة Save the Earth إلى كمبيوتر مكتبي أو محمول مع لوحة مفاتيح وفأرة. افتح هذه الصفحة على الكمبيوتر للعب.",
    "حسنًا",
  ],
  fr: [
    "Joue sur un ordinateur",
    "Save the Earth nécessite un ordinateur avec un clavier et une souris. Ouvre cette page sur ton ordinateur pour jouer.",
    "Compris",
  ],
  ru: [
    "Играй на компьютере",
    "Для Save the Earth нужен компьютер или ноутбук с клавиатурой и мышью. Открой эту страницу на компьютере, чтобы играть.",
    "Понятно",
  ],
  tr: [
    "Bilgisayarda oyna",
    "Save the Earth için klavye ve fareli bir masaüstü veya dizüstü bilgisayar gerekir. Oynamak için bu sayfayı bilgisayarında aç.",
    "Anladım",
  ],
};

export function saveEarthDialog(lang, direct = false) {
  const [heading, message, close] = desktopCopy[lang];
  const action = direct
    ? `<a class="desktop-required-action" href="../" autofocus>${copy[lang][2]}</a>`
    : `<form method="dialog"><button class="desktop-required-action" autofocus>${close}</button></form>`;
  return `<dialog id="save-earth-desktop-dialog" class="desktop-required-dialog" aria-labelledby="desktop-required-title" aria-describedby="desktop-required-message">
    <svg class="desktop-required-icon" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="5" y="7" width="38" height="27" rx="3"/><path d="M17 42h14M24 34v8"/></svg>
    <h2 id="desktop-required-title">${heading}</h2>
    <p id="desktop-required-message" data-access-message data-error="${sceneMessages[lang][2]}">${message}</p>
    ${action}
  </dialog>`;
}

export function saveEarthCard(lang) {
  const [description, play] = copy[lang];
  return `<section class="destination destination-save-earth" aria-labelledby="save-earth-title">
      <div class="destination-copy"><h2 id="save-earth-title" lang="en">${title}</h2><p>${description}</p></div>
      <a class="destination-action" data-save-earth-link aria-haspopup="dialog" aria-controls="save-earth-desktop-dialog" href="./${lang}/save-the-earth/"><span>${play}</span><span class="destination-arrow" aria-hidden="true">←</span></a>
    ${saveEarthDialog(lang)}
    </section>`;
}
const magazineCartridges = Array.from(
  { length: 30 },
  () => '<i class="magazine-cartridge is-loaded" data-cartridge></i>',
).join("");

export function buildSaveEarth() {
  for (const [lang, labels] of Object.entries(copy)) {
    const [
      description,
      ,
      back,
      controls,
      score,
      shield,
      start,
      replay,
      end,
      lost,
      ended,
      history,
      empty,
      move,
    ] = labels;
    const dir = lang === "fa" || lang === "ar" ? "rtl" : "ltr";
    const canonical = `${origin}${lang}/save-the-earth/`;
    const imagePath = `social/save-earth-${lang}.png`;
    const hash = createHash("sha256")
      .update(readFileSync(new URL(`../public/${imagePath}`, import.meta.url)))
      .digest("hex")
      .slice(0, 12);
    const image = `${origin}${imagePath}?v=${hash}`;
    const alternates = Object.keys(copy)
      .map(
        (locale) =>
          `  <link rel="alternate" hreflang="${locale}" href="${origin}${locale}/save-the-earth/">`,
      )
      .join("\n");
    const folder = new URL(
      `../public/${lang}/save-the-earth/`,
      import.meta.url,
    );
    mkdirSync(folder, { recursive: true });
    writeFileSync(
      new URL("index.html", folder),
      `<!doctype html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} · ${brandName(lang)}</title>
  <meta name="description" content="${description}">
  <link rel="canonical" href="${canonical}">
${alternates}
  <link rel="alternate" hreflang="x-default" href="${origin}en/save-the-earth/">
  <meta property="og:url" content="${canonical}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${image}">
  <meta property="og:image:alt" content="${description}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="${image}">
  <link rel="stylesheet" href="../../save-earth.css">
  <link rel="stylesheet" href="../../save-earth-access.css">
  <script type="module" src="../../save-earth-entry.js"></script>
</head>
<body>
  <main class="mission" hidden inert>
    <header class="mission-header">
      <div><a class="mission-back" href="../">${back}</a><h1 lang="en">${title}</h1></div>
      <div class="mission-stats">
        <span>${score} <strong id="score">0</strong></span>
        <span>${shield} <strong id="shield">5</strong></span>
        <button id="sound-toggle" type="button" aria-pressed="false" data-on="${soundCopy[lang][0]}" data-off="${soundCopy[lang][1]}">${soundCopy[lang][0]}</button>

      </div>
    </header>
    <div class="arena">
      <canvas id="arena" width="800" height="470" tabindex="0" aria-label="${title}" aria-describedby="controls"></canvas>
      <div id="round-overlay" class="round-overlay">
        <p id="round-status" data-paused="${flightCopy[lang][1]}" data-lock="${flightCopy[lang][3]}" data-desktop="${sceneMessages[lang][0]}" data-loading="${sceneMessages[lang][1]}" data-error="${sceneMessages[lang][2]}" data-lost="${lost}" data-ended="${ended}" role="status">${description}</p>
        <button id="start" disabled type="button" data-resume="${flightCopy[lang][2]}" data-replay="${replay}">${start}</button>
      </div>
    </div>
    <aside id="mission-briefing" class="mission-briefing" hidden aria-label="${title}">
      <button id="briefing-close" type="button" aria-label="${missionUI[lang][1]}">×</button>
      <div class="briefing-heading" aria-hidden="true">◉ ${missionUI[lang][2]} <span>${missionUI[lang][3]}</span></div>
      <p class="briefing-source">${briefingCopy[lang].join("\n\n")}</p>
      <p class="briefing-typed" aria-hidden="true"></p>
    </aside>
    <div id="crosshair" aria-hidden="true"><i></i></div>
    <aside id="ammo-hud" class="ammo-hud" aria-label="${ammoCopy[lang][0]}">
      <div class="magazine-visual" aria-hidden="true">
        <div class="magazine-body">
          <span class="magazine-lips"></span>
          <div class="magazine-rounds">${magazineCartridges}</div>
          <span class="magazine-base"></span>
        </div>
        <i class="magazine-eject"></i>
      </div>
      <div class="magazine-details">
        <span class="weapon-name">SMG · ${flightCopy[lang][4]}</span>
        <div class="ammo-count" dir="ltr"><strong id="ammo">30</strong><span>/ 30</span></div>
        <div class="magazine-track"><i id="magazine-fill"></i></div>
        <div class="reload-track"><i id="reload-fill"></i></div>
        <span id="ammo-state" role="status" data-ready="${flightCopy[lang][5]}" data-reloading="${flightCopy[lang][6]}" data-empty="${flightCopy[lang][7]}">${flightCopy[lang][5]}</span>
        <small>${flightCopy[lang][8]}</small>
      </div>
    </aside>
    <div class="mission-controls">
      <button id="mission-help" type="button" aria-controls="mission-briefing">${missionUI[lang][0]} · H</button>
      <p id="controls" hidden>${flightCopy[lang][0]}</p>
      <button id="end" type="button" hidden>${end}</button>
    </div>
    <p class="desktop-note">${sceneMessages[lang][0]}</p>
    <details class="round-history">
      <summary>${history}</summary>
      <p id="no-scores">${empty}</p>
      <p class="best-score">${{ fa: "بهترین امتیاز", en: "Best score", ar: "أفضل نتيجة", fr: "Meilleur score", ru: "Лучший результат", tr: "En iyi skor" }[lang]} <strong id="best-score">0</strong></p>
      <ol id="scores"></ol>
      <nav id="scores-pagination" hidden aria-label="${missionUI[lang][4]}"><button id="scores-prev" type="button">${{ fa: "قبلی", en: "Previous", ar: "السابق", fr: "Précédent", ru: "Назад", tr: "Önceki" }[lang]}</button><span id="scores-page" aria-live="polite"></span><button id="scores-next" type="button">${{ fa: "بعدی", en: "Next", ar: "التالي", fr: "Suivant", ru: "Далее", tr: "Sonraki" }[lang]}</button></nav>
    </details>
    <p class="scene-credits"><a href="../sources/#home-scene-credits">${missionUI[lang][5]}</a> · <a href="https://sketchfab.com/3d-models/smg-gun-9586ff6a08744cee9f89fd563bd0a277">${missionUI[lang][6]} — Drus</a> · <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a> · <a href="../../audio/nasa-radio-SOURCE.txt">${missionUI[lang][7]}</a> · <a href="../../audio/helmet-breathing-SOURCE.txt">${missionUI[lang][8]} · CC0</a> · <a href="https://supernova.eso.org/exhibition/images/0808_andromeda_visible/">${missionUI[lang][9]}: R. Gendler</a> · <a href="../../art/andromeda-SOURCE.txt">CC BY 4.0 · ${missionUI[lang][10]}</a> · <a href="https://www.solarsystemscope.com/textures/">${missionUI[lang][11]}: Solar System Scope / INOVE</a> · <a href="../../art/solar-system-SOURCE.txt">CC BY 4.0</a> · <a href="../../art/moon-SOURCE.txt">NASA / LRO</a></p>
  </main>
  ${saveEarthDialog(lang, true)}
</body>
</html>
`,
    );
  }
}
