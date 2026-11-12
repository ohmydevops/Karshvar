// A scene only animates while it is visible. Pointer movement queues one paint,
// never a perpetual animation loop or a layout read on each pointer event.
export function mountDiscoveryMotion(root = document) {
  const doc = root.ownerDocument || root;
  const view = doc.defaultView;
  if (!view?.IntersectionObserver) return () => {};
  const reduced = view.matchMedia("(prefers-reduced-motion: reduce)");
  const fine = view.matchMedia("(hover: hover) and (pointer: fine)");
  let disposed = false;
  let suspended = false;
  const listeners = [];
  const listen = (target, type, handler, options) => {
    target.addEventListener(type, handler, options);
    listeners.push(() => target.removeEventListener(type, handler, options));
  };
  const scenes = [...root.querySelectorAll(".discovery-scene")].map(
    (scene) => ({
      scene,
      media: scene.querySelector(".scene-media"),
      visible: false,
      active: false,
      bounds: null,
      frame: null,
      x: 0,
      y: 0,
      moved: false,
    }),
  );
  const reset = (state) => {
    if (state.frame !== null) view.cancelAnimationFrame(state.frame);
    state.frame = null;
    state.bounds = null;
    if (state.moved) {
      state.media.style.removeProperty("--scene-x");
      state.media.style.removeProperty("--scene-y");
      state.moved = false;
    }
  };
  const update = () => {
    for (const state of scenes) {
      state.active =
        !disposed &&
        !suspended &&
        !doc.hidden &&
        !reduced.matches &&
        state.visible;
      state.scene.dataset.active = String(state.active);
      if (!state.active || !fine.matches) reset(state);
    }
  };
  const states = new Map(scenes.map((state) => [state.scene, state]));
  const observer = new view.IntersectionObserver(
    (entries) => {
      if (disposed) return;
      for (const entry of entries) {
        const state = states.get(entry.target);
        if (state) state.visible = entry.isIntersecting;
      }
      update();
    },
    { threshold: 0 },
  );
  for (const state of scenes) {
    state.scene.dataset.active = "false";
    observer.observe(state.scene);
    if (!state.media) continue;
    listen(state.media, "pointerenter", (event) => {
      if (!state.active || !fine.matches || event.pointerType === "touch")
        return;
      state.bounds = state.media.getBoundingClientRect();
    });
    listen(state.media, "pointermove", (event) => {
      if (!state.active || !fine.matches || !state.bounds) return;
      const { left, top, width, height } = state.bounds;
      if (!width || !height) return;
      const offset = (value) => Math.max(-10, Math.min(10, value));
      state.x = offset(((event.clientX - left) / width - 0.5) * 20);
      state.y = offset(((event.clientY - top) / height - 0.5) * 20);
      if (state.frame !== null) return;
      state.frame = view.requestAnimationFrame(() => {
        state.frame = null;
        if (!state.active || !state.bounds || !fine.matches) return;
        state.media.style.setProperty("--scene-x", `${state.x.toFixed(2)}px`);
        state.media.style.setProperty("--scene-y", `${state.y.toFixed(2)}px`);
        state.moved = true;
      });
    });
    listen(state.media, "pointerleave", () => reset(state));
    listen(state.media, "pointercancel", () => reset(state));
  }
  const resetAll = () => scenes.forEach(reset);
  listen(doc, "visibilitychange", update);
  listen(reduced, "change", update);
  listen(fine, "change", update);
  listen(view, "scroll", resetAll, { passive: true });
  listen(view, "resize", resetAll, { passive: true });
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    update();
    observer.disconnect();
    for (const remove of listeners) remove();
  };
  listen(view, "pagehide", (event) => {
    if (!event.persisted) return dispose();
    suspended = true;
    update();
  });
  listen(view, "pageshow", (event) => {
    if (!event.persisted || disposed) return;
    suspended = false;
    update();
  });
  return dispose;
}
