export function createMissionBriefing(panel) {
  const key = "karshvar:mission-guide-seen";
  let seen = false;
  try {
    seen = localStorage.getItem(key) === "1";
  } catch {}
  function remember() {
    seen = true;
    try {
      localStorage.setItem(key, "1");
    } catch {}
  }
  return {
    show() {
      panel.hidden = false;
      remember();
    },
    start() {
      panel.hidden = seen;
    },
    update() {},
    hide() {
      panel.hidden = true;
      remember();
    },
  };
}
