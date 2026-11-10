const loadingCopy = {
  en: "Checking…",
  fa: "در حال بررسی…",
  ar: "جارٍ التحقق…",
  tr: "Kontrol ediliyor…",
  fr: "Vérification…",
  ru: "Проверка…",
};

// A browser-managed service-worker request can remain pending for minutes.
// Stop waiting in the UI; ignore any late completion of that attempt.
export function withUpdateTimeout(task, milliseconds = 15000) {
  let timer;
  return Promise.race([
    task,
    new Promise((_, reject) => {
      timer = window.setTimeout(
        () => reject(new Error("Update check timed out")),
        milliseconds,
      );
    }),
  ]).finally(() => window.clearTimeout(timer));
}

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
