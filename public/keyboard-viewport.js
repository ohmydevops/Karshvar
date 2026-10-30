// The visual viewport excludes the on-screen keyboard, unlike layout viewport units.
export function keyboardVisible({ focused, touch, scale, available, full }) {
  return (
    focused && touch && Math.abs(scale - 1) < 0.05 && full - available > 120
  );
}
export function bindKeyboardViewport(win, doc) {
  const viewport = win.visualViewport;
  if (!viewport) return;
  let fullHeight = viewport.height;
  let frame;
  function update() {
    frame = null;
    const active = doc.activeElement;
    const focused =
      active?.matches(
        'input:not([type="checkbox"]), textarea, [contenteditable="true"]',
      ) || false;
    if (!focused) fullHeight = viewport.height;
    const open = keyboardVisible({
      focused,
      touch: win.matchMedia("(pointer: coarse)").matches,
      scale: viewport.scale,
      available: viewport.height,
      full: Math.max(fullHeight, win.innerHeight),
    });
    doc.documentElement.classList.toggle("keyboard-open", open);
    doc.documentElement.style.setProperty(
      "--keyboard-height",
      viewport.height + "px",
    );
  }
  function schedule() {
    if (!frame) frame = win.requestAnimationFrame(update);
  }
  viewport.addEventListener("resize", schedule);
  doc.addEventListener("focusin", schedule);
  doc.addEventListener("focusout", schedule);
  win.addEventListener("orientationchange", () => {
    fullHeight = viewport.height;
    schedule();
  });
  update();
}
