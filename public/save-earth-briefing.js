export function createMissionBriefing(panel) {
  const source = panel.querySelector(".briefing-source");
  const output = panel.querySelector(".briefing-typed");
  const text = Array.from(source.textContent);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let previous = -1;
  let active = false;
  let instant = false;
  const typingTime = text.length / 45;
  const readingTime = 10;
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
      active = false;
      output.textContent = text.join("");
      panel.classList.remove("briefing-fading");
      panel.hidden = false;
      remember();
    },
    start() {
      if (seen) {
        this.hide();
        return;
      }
      previous = -1;
      active = true;
      instant = reduced.matches;
      output.textContent = instant ? text.join("") : "";
      panel.classList.remove("briefing-fading");
      panel.hidden = false;
    },
    update(seconds) {
      if (!active) return;
      const count = instant
        ? text.length
        : Math.min(text.length, Math.floor(seconds * 45));
      if (count !== previous) {
        output.textContent = text.slice(0, count).join("");
        previous = count;
      }
      if (count === text.length && !seen) remember();
      const end = (instant ? 0 : typingTime) + readingTime;
      if (seconds >= end) panel.classList.add("briefing-fading");
      if (seconds >= end + 1.2) this.hide();
    },
    hide() {
      active = false;
      panel.hidden = true;
    },
  };
}
