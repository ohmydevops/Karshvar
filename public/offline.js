const checkCopy = {
  en: [
    "Checking…",
    "You’re up to date.",
    "Downloading update…",
    "Connect to the internet to check for updates.",
    "Couldn’t check. Try again.",
    "Update ready.",
  ],
  fa: [
    "در حال بررسی…",
    "آخرین نسخه را دارید.",
    "در حال دریافت به‌روزرسانی…",
    "برای بررسی به اینترنت وصل شوید.",
    "بررسی انجام نشد. دوباره تلاش کنید.",
    "به‌روزرسانی آماده است.",
  ],
  ar: [
    "جارٍ التحقق…",
    "لديك أحدث إصدار.",
    "جارٍ تنزيل التحديث…",
    "اتصل بالإنترنت للتحقق من التحديثات.",
    "تعذّر التحقق. حاول مجددًا.",
    "التحديث جاهز.",
  ],
  tr: [
    "Kontrol ediliyor…",
    "En güncel sürümdesin.",
    "Güncelleme indiriliyor…",
    "Kontrol etmek için internete bağlan.",
    "Kontrol edilemedi. Tekrar dene.",
    "Güncelleme hazır.",
  ],
  fr: [
    "Vérification…",
    "Vous êtes à jour.",
    "Téléchargement…",
    "Connectez-vous à Internet pour vérifier.",
    "Échec de la vérification. Réessayez.",
    "Mise à jour prête.",
  ],
  ru: [
    "Проверка…",
    "У вас последняя версия.",
    "Загрузка обновления…",
    "Подключитесь к интернету для проверки.",
    "Не удалось проверить. Попробуйте снова.",
    "Обновление готово.",
  ],
};
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
    const checkButton = document.getElementById?.("checkUpdates");
    const checkStatus = document.getElementById?.("updateCheckStatus");
    const messages = checkCopy[document.documentElement.lang] || checkCopy.en;
    let manualCheck = false;
    const showCheckStatus = (index) => {
      if (!checkStatus) return;
      checkStatus.hidden = false;
      checkStatus.textContent = messages[index];
    };
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
        if (worker.state === "installed") {
          if (manualCheck) showCheckStatus(5);
          offerUpdate();
        } else if (worker.state === "redundant" && manualCheck)
          showCheckStatus(4);
      });
    };
    registration.addEventListener("updatefound", watch);
    watch();
    offerUpdate();
    if (checkButton) {
      checkButton.hidden = false;
      checkButton.onclick = async () => {
        manualCheck = true;
        if (registration.waiting) {
          offeredWorker = undefined;
          showCheckStatus(5);
          offerUpdate();
          return;
        }
        if (navigator.onLine === false) return showCheckStatus(3);
        checkButton.disabled = true;
        showCheckStatus(0);
        try {
          await registration.update();
          if (registration.waiting) {
            offeredWorker = undefined;
            showCheckStatus(5);
            offerUpdate();
          } else showCheckStatus(registration.installing ? 2 : 1);
        } catch {
          showCheckStatus(4);
        } finally {
          checkButton.disabled = false;
        }
      };
    }
    let checking = false;
    let lastCheck = 0;
    const checkForUpdate = async () => {
      if (document.visibilityState === "hidden" || navigator.onLine === false)
        return;
      offerUpdate();
      if (checking || Date.now() - lastCheck < 60_000) return;
      checking = true;
      lastCheck = Date.now();
      try {
        await registration.update();
        offerUpdate();
      } catch {
        // A failed connection must not interrupt offline play or delay a retry.
        lastCheck = 0;
      } finally {
        checking = false;
      }
    };
    document.addEventListener("visibilitychange", checkForUpdate);
    window.addEventListener("online", checkForUpdate);
    window.addEventListener("pageshow", checkForUpdate);
    window.setInterval(checkForUpdate, 60_000);
    checkForUpdate();
  } catch (error) {
    console.warn("Offline setup failed", error);
  }
}
// This module runs after HTML parsing; analytics and images must not delay installation.
setupOffline();
