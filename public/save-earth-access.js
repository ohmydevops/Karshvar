// Keep this module independent of the game, Three.js, audio and model loaders.
export const DESKTOP_MEDIA = "(min-width: 900px) and (any-pointer: fine)";

function showDialog(dialog) {
  if (!dialog.open) dialog.showModal();
}

export function bindSaveEarthLink({
  document: doc = document,
  media = doc.defaultView.matchMedia(DESKTOP_MEDIA),
} = {}) {
  const link = doc.querySelector("[data-save-earth-link]");
  const dialog = doc.getElementById("save-earth-desktop-dialog");
  if (!link || !dialog) return () => {};
  const click = (event) => {
    if (media.matches) return;
    event.preventDefault();
    showDialog(dialog);
  };
  const close = () => link.focus({ preventScroll: true });
  const backdrop = (event) => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom
    )
      dialog.close();
  };
  const change = () => {
    if (media.matches && dialog.open) dialog.close();
  };
  link.addEventListener("click", click);
  dialog.addEventListener("close", close);
  dialog.addEventListener("click", backdrop);
  media.addEventListener("change", change);
  return () => {
    link.removeEventListener("click", click);
    dialog.removeEventListener("close", close);
    dialog.removeEventListener("click", backdrop);
    media.removeEventListener("change", change);
  };
}

export function mountSaveEarthEntry({
  document: doc = document,
  media = doc.defaultView.matchMedia(DESKTOP_MEDIA),
  loadGame = () => import("./save-earth.js"),
  returnHome = () => doc.defaultView.location.assign("../"),
} = {}) {
  const mission = doc.querySelector(".mission");
  const dialog = doc.getElementById("save-earth-desktop-dialog");
  let loading;
  let disposed = false;
  const refresh = () => {
    if (disposed) return;
    mission.hidden = !media.matches;
    mission.inert = !media.matches;
    if (!media.matches) {
      doc.exitPointerLock?.();
      showDialog(dialog);
      return;
    }
    if (dialog.open) dialog.close();
    // The module is never requested on an unsupported initial visit.
    // A resize while importing is also checked by the game's own prepare().
    if (!loading) {
      loading = Promise.resolve()
        .then(() => {
          if (disposed || !media.matches) {
            loading = undefined;
            return;
          }
          return loadGame();
        })
        .catch(() => {
          if (disposed) return;
          mission.hidden = true;
          mission.inert = true;
          const message = dialog.querySelector("[data-access-message]");
          message.textContent = message.dataset.error;
          showDialog(dialog);
        });
    }
  };
  const cancel = (event) => {
    event.preventDefault();
    returnHome();
  };
  dialog.addEventListener("cancel", cancel);
  media.addEventListener("change", refresh);
  refresh();
  return () => {
    disposed = true;
    media.removeEventListener("change", refresh);
    dialog.removeEventListener("cancel", cancel);
  };
}
