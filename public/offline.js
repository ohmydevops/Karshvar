import { withUpdateTimeout } from "./update-loading.js";
import { createDownloadManager } from "./update-download.js";

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
  const checkButton = document.getElementById?.("checkUpdates");
  const checkStatus = document.getElementById?.("updateCheckStatus");
  const messages = checkCopy[document.documentElement.lang] || checkCopy.en;
  const showCheckStatus = (index) => {
    if (!checkStatus) return;
    checkStatus.hidden = false;
    checkStatus.textContent =
      index === 6
        ? {
            fa: "نسخهٔ جدید برای دانلود موجود است.",
            en: "A new version is available to download.",
            ar: "إصدار جديد متاح للتنزيل.",
            tr: "İndirilebilir yeni bir sürüm var.",
            fr: "Une nouvelle version est disponible au téléchargement.",
            ru: "Новая версия доступна для загрузки.",
          }[document.documentElement.lang] ||
          "A new version is available to download."
        : messages[index];
  };
  if (
    typeof location !== "undefined" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname) &&
    document.querySelector?.('script[src="/@vite/client"]')
  ) {
    const explainLocal = () => {
      if (!checkStatus) return;
      checkStatus.hidden = false;
      checkStatus.textContent =
        {
          fa: "نسخهٔ توسعهٔ محلی است؛ برای دیدن تغییرات صفحه را تازه کنید.",
          en: "Local development preview. Reload the page to see changes.",
          ar: "معاينة تطوير محلية. أعد تحميل الصفحة لرؤية التغييرات.",
          tr: "Yerel geliştirme önizlemesi. Değişiklikler için sayfayı yenileyin.",
          fr: "Aperçu de développement local. Rechargez la page pour voir les modifications.",
          ru: "Локальная версия разработки. Обновите страницу, чтобы увидеть изменения.",
        }[document.documentElement.lang] ||
        "Local development preview. Reload to see changes.";
    };
    if (checkButton) {
      checkButton.hidden = false;
      checkButton.disabled = false;
      checkButton.setAttribute?.("aria-busy", "false");
      checkButton.onclick = explainLocal;
    }
    return true;
  }
  if (checkButton) {
    checkButton.hidden = false;
    checkButton.disabled = true;
    checkButton.setAttribute?.("aria-busy", "true");
  }
  try {
    const workerURL = new URL("./sw.js", import.meta.url);
    // Reuse the installed registration: register() can wait behind a slow update
    // and prevent the menu from reaching an already downloaded waiting worker.
    const existing = await withUpdateTimeout(
      navigator.serviceWorker.getRegistration(workerURL),
    );
    const installed =
      existing?.active || existing?.waiting || existing?.installing;
    const registration =
      installed?.scriptURL === workerURL.href
        ? existing
        : await withUpdateTimeout(
            navigator.serviceWorker.register(workerURL, {
              updateViaCache: "none",
            }),
          );
    let updating;
    const updateRegistration = () => {
      if (!updating)
        updating = withUpdateTimeout(registration.update()).finally(() => {
          updating = null;
        });
      return updating;
    };
    let manualCheck = false;
    let approved = false;
    let reloaded = false;
    let offeredWorker;
    let activationNotice;
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
    const offerUpdate = (activate = false) => {
      let worker = registration.waiting;
      // Initial installation is silent; only offer a fully downloaded replacement.
      if (
        !worker ||
        !navigator.serviceWorker.controller ||
        offeredWorker === worker
      )
        return;
      offeredWorker = worker;
      downloads.hide();
      activationNotice?.close();
      const copy = updateCopy[document.documentElement.lang] || updateCopy.en;
      const notice = document.createElement("aside");
      notice.className = "update-download update-activation";
      activationNotice = notice;
      notice.setAttribute("aria-labelledby", "updateTitle");
      notice.setAttribute("aria-describedby", "updateDescription");
      const title = document.createElement("h2");
      title.id = "updateTitle";
      title.textContent = copy[0];
      const description = document.createElement("p");
      description.id = "updateDescription";
      description.setAttribute("role", "status");
      description.setAttribute("aria-live", "polite");
      description.textContent = copy[1];
      const actions = document.createElement("div");
      actions.className = "dialog-actions";
      const later = document.createElement("button");
      later.textContent = copy[3];
      later.autofocus = true;
      const update = document.createElement("button");
      update.className = "primary";
      update.textContent = copy[2];
      later.onclick = () => notice.close();
      let activationTimer;
      const restoreUpdate = () => {
        approved = false;
        window.clearTimeout(activationTimer);
        update.disabled = false;
        later.disabled = false;
        notice.setAttribute("data-state", "error");
        update.setAttribute("aria-busy", "false");
        update.textContent =
          {
            en: "Try again",
            fa: "تلاش مجدد",
            ar: "حاول مجددًا",
            tr: "Tekrar dene",
            fr: "Réessayer",
            ru: "Повторить",
          }[document.documentElement.lang] || "Try again";
        description.textContent =
          {
            en: "The update is taking longer than expected. Try again, or choose Later to continue.",
            fa: "به‌روزرسانی بیشتر از انتظار طول کشید. دوباره تلاش کنید یا برای ادامه «بعداً» را بزنید.",
            ar: "استغرق التحديث وقتًا أطول من المتوقع. حاول مجددًا أو اختر لاحقًا للمتابعة.",
            tr: "Güncelleme beklenenden uzun sürdü. Tekrar deneyin veya devam etmek için Daha sonra seçeneğini kullanın.",
            fr: "La mise à jour prend plus de temps que prévu. Réessayez ou choisissez Plus tard pour continuer.",
            ru: "Обновление занимает больше времени. Повторите попытку или выберите «Позже».",
          }[document.documentElement.lang] ||
          "The update is taking longer than expected. Try again or continue later.";
      };
      const activated = () => {
        if (worker.state === "activated" && registration.active === worker) {
          window.clearTimeout(activationTimer);
          reloadIfApproved();
        } else if (worker.state === "redundant" && approved) restoreUpdate();
      };
      worker.addEventListener?.("statechange", activated);
      notice.close = () => {
        notice.hidden = true;
        approved = false;
        window.clearTimeout(activationTimer);
        worker.removeEventListener?.("statechange", activated);
        notice.remove();
      };
      update.onclick = async () => {
        if (registration.active === worker && worker.state === "activated") {
          approved = true;
          reloadIfApproved();
          return;
        }
        approved = true;
        update.disabled = true;
        update.setAttribute("aria-busy", "true");
        notice.setAttribute("data-state", "updating");
        description.textContent = copy[4];
        update.textContent = copy[4];
        activationTimer = window.setTimeout(() => {
          activated();
          if (!reloaded) restoreUpdate();
        }, 8000);
        try {
          if (
            registration.waiting !== worker &&
            worker.state !== "activating"
          ) {
            await updateRegistration();
            if (!approved) return;
            if (!registration.waiting) {
              if (registration.active?.state === "activated")
                reloadIfApproved();
              else restoreUpdate();
              return;
            }
            worker.removeEventListener?.("statechange", activated);
            worker = registration.waiting;
            offeredWorker = worker;
            worker.addEventListener?.("statechange", activated);
          }
          worker.postMessage({ type: "ACTIVATE_UPDATE" });
        } catch {
          restoreUpdate();
        }
      };
      actions.append(later, update);
      notice.append(title, description, actions);
      document.body.append(notice);
      notice.hidden = false;
      if (activate) update.onclick();
    };
    const downloads = createDownloadManager({
      registration,
      requestUpdate: updateRegistration,
      onState: (phase) =>
        showCheckStatus(phase === "ready" ? 5 : phase === "error" ? 4 : 2),
      onReady: () => {
        offeredWorker = undefined;
        offerUpdate(true);
      },
    });
    const watch = () => {
      const worker = registration.installing;
      if (worker && manualCheck) showCheckStatus(2);
      worker?.addEventListener("statechange", () => {
        if (worker.state === "installed") {
          if (manualCheck) showCheckStatus(5);
          downloads.poll();
        } else if (worker.state === "redundant" && manualCheck)
          showCheckStatus(4);
      });
    };
    registration.addEventListener("updatefound", watch);
    watch();
    offerUpdate();
    if (checkButton) {
      checkButton.disabled = false;
      checkButton.setAttribute?.("aria-busy", "false");
      checkButton.onclick = async () => {
        manualCheck = true;
        if (registration.waiting) {
          offeredWorker = undefined;
          showCheckStatus(5);
          offerUpdate();
          return;
        }
        if (registration.installing) return showCheckStatus(2);
        if (navigator.onLine === false) return showCheckStatus(3);
        checkButton.disabled = true;
        checkButton.setAttribute?.("aria-busy", "true");
        showCheckStatus(0);
        try {
          const result = await downloads.check(true);
          if (registration.waiting) {
            offeredWorker = undefined;
            showCheckStatus(5);
            offerUpdate();
          } else showCheckStatus(result);
        } catch {
          showCheckStatus(
            registration.waiting ? 5 : registration.installing ? 2 : 4,
          );
          if (registration.waiting) offerUpdate();
        } finally {
          checkButton.disabled = false;
          checkButton.setAttribute?.("aria-busy", "false");
        }
      };
    }
    let checking = false;
    let lastCheck = 0;
    const checkForUpdate = async () => {
      if (document.visibilityState === "hidden" || navigator.onLine === false)
        return;
      offerUpdate();
      if (registration.installing) return;
      if (checking || Date.now() - lastCheck < 60_000) return;
      checking = true;
      lastCheck = Date.now();
      try {
        await downloads.check();
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
    return true;
  } catch (error) {
    console.warn("Offline setup failed", error);
    showCheckStatus(4);
    if (checkButton) {
      checkButton.disabled = false;
      checkButton.setAttribute?.("aria-busy", "false");
      checkButton.onclick = async () => {
        showCheckStatus(0);
        if (await setupOffline()) await checkButton.onclick();
        else showCheckStatus(4);
      };
    }
  }
}
// This module runs after HTML parsing; analytics and images must not delay installation.
export const offlineReady = setupOffline();
