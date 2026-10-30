const updateCopy = {
  en: [
    "Update available",
    "A new version is ready. Update and reload this page? Your saved progress will be kept.",
    "Update now",
    "Later",
    "Updating…",
  ],
  fa: [
    "به‌روزرسانی آماده است",
    "نسخهٔ جدید آماده است. به‌روزرسانی و بارگیری مجدد انجام شود؟ پیشرفت ذخیره‌شده حفظ می‌شود.",
    "به‌روزرسانی",
    "بعداً",
    "در حال به‌روزرسانی…",
  ],
  ar: [
    "تحديث متاح",
    "نسخة جديدة جاهزة. هل تريد التحديث وإعادة تحميل الصفحة؟ سيُحفظ تقدمك المحفوظ.",
    "حدّث الآن",
    "لاحقًا",
    "جارٍ التحديث…",
  ],
  tr: [
    "Güncelleme hazır",
    "Yeni sürüm hazır. Güncelleyip sayfayı yenileyelim mi? Kaydedilen ilerlemen korunacak.",
    "Şimdi güncelle",
    "Daha sonra",
    "Güncelleniyor…",
  ],
  fr: [
    "Mise à jour disponible",
    "Une nouvelle version est prête. Mettre à jour et recharger cette page ? Votre progression enregistrée sera conservée.",
    "Mettre à jour",
    "Plus tard",
    "Mise à jour…",
  ],
  ru: [
    "Доступно обновление",
    "Новая версия готова. Обновить и перезагрузить страницу? Сохранённый прогресс останется.",
    "Обновить",
    "Позже",
    "Обновление…",
  ],
};
async function setupOffline() {
  if (!("serviceWorker" in navigator) || !window.isSecureContext) return;
  try {
    const registration = await navigator.serviceWorker.register(
      new URL("./sw.js", import.meta.url),
      { updateViaCache: "none" },
    );
    let approved = false;
    let reloaded = false;
    let offeredWorker;
    const reloadIfApproved = () => {
      if (approved && !reloaded) {
        reloaded = true;
        location.reload();
      }
    };
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      reloadIfApproved,
    );
    const offerUpdate = () => {
      const worker = registration.waiting;
      // Initial installation is silent; only offer a fully downloaded replacement.
      if (
        !worker ||
        !navigator.serviceWorker.controller ||
        offeredWorker === worker
      )
        return;
      offeredWorker = worker;
      const copy = updateCopy[document.documentElement.lang] || updateCopy.en;
      const dialog = document.createElement("dialog");
      dialog.className = "update-dialog";
      dialog.setAttribute("aria-labelledby", "updateTitle");
      dialog.setAttribute("aria-describedby", "updateDescription");
      const title = document.createElement("h2");
      title.id = "updateTitle";
      title.textContent = copy[0];
      const description = document.createElement("p");
      description.id = "updateDescription";
      description.textContent = copy[1];
      const actions = document.createElement("div");
      actions.className = "dialog-actions";
      const later = document.createElement("button");
      later.textContent = copy[3];
      later.autofocus = true;
      const update = document.createElement("button");
      update.className = "primary";
      update.textContent = copy[2];
      later.onclick = () => dialog.close();
      dialog.addEventListener("close", () => dialog.remove(), { once: true });
      update.onclick = () => {
        if (registration.waiting !== worker) {
          dialog.close();
          return;
        }
        approved = true;
        update.disabled = true;
        later.disabled = true;
        update.textContent = copy[4];
        worker.postMessage({ type: "ACTIVATE_UPDATE" });
      };
      actions.append(later, update);
      dialog.append(title, description, actions);
      document.body.append(dialog);
      dialog.showModal();
    };
    const watch = () => {
      const worker = registration.installing;
      worker?.addEventListener("statechange", () => {
        if (worker.state === "installed") offerUpdate();
      });
    };
    registration.addEventListener("updatefound", watch);
    watch();
    offerUpdate();
  } catch (error) {
    console.warn("Offline setup failed", error);
  }
}
if (document.readyState === "complete") setupOffline();
else window.addEventListener("load", setupOffline, { once: true });
