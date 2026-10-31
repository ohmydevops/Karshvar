// Inlined in each page's head so loading starts before the first paint.
(() => {
  const root = document.documentElement;
  root.dataset.loading = "true";
  const copy = {
    en: ["Loading…", "This page could not finish loading.", "Try again"],
    fa: ["در حال بارگذاری…", "بارگذاری صفحه کامل نشد.", "تلاش دوباره"],
    ar: ["جارٍ التحميل…", "تعذّر إكمال تحميل الصفحة.", "حاول مجددًا"],
    tr: ["Yükleniyor…", "Sayfa yüklenemedi.", "Tekrar dene"],
    fr: ["Chargement…", "Le chargement de la page a échoué.", "Réessayer"],
    ru: ["Загрузка…", "Не удалось загрузить страницу.", "Повторить"],
  }[root.lang] || [
    "Loading…",
    "This page could not finish loading.",
    "Try again",
  ];
  const initialize = () => {
    if (root.dataset.loading !== "true") return;
    document.querySelector("main")?.setAttribute("aria-busy", "true");
    const status = document.getElementById("pageLoadingStatus");
    if (status) status.textContent = copy[0];
  };
  document.addEventListener("DOMContentLoaded", initialize, { once: true });
  const timeout = setTimeout(() => {
    if (root.dataset.loading !== "true") return;
    root.dataset.loading = "failed";
    document.querySelector("main")?.setAttribute("aria-busy", "false");
    const status = document.getElementById("pageLoadingStatus");
    if (status) status.textContent = copy[1];
    const retry = document.getElementById("pageLoadingRetry");
    if (retry) {
      retry.textContent = copy[2];
      retry.href = location.href;
      retry.hidden = false;
    }
  }, 15000);
  document.addEventListener(
    "page-ready",
    () => {
      clearTimeout(timeout);
      delete root.dataset.loading;
      document.querySelector("main")?.setAttribute("aria-busy", "false");
    },
    { once: true },
  );
})();
