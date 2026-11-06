const loadingCopy = {
  en: "Checking…",
  fa: "در حال بررسی…",
  ar: "جارٍ التحقق…",
  tr: "Kontrol ediliyor…",
  fr: "Vérification…",
  ru: "Проверка…",
};

export function setUpdateLoading(button, busy) {
  if (!button) return;
  button.disabled = busy;
  button.setAttribute("aria-busy", String(busy));
  if (busy) {
    const status = document.getElementById("updateCheckStatus");
    if (status) {
      status.hidden = false;
      status.textContent =
        loadingCopy[document.documentElement.lang] || loadingCopy.en;
    }
  }
}
