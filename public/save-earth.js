import { createMissionBriefing } from "./save-earth-briefing.js";
import { createMagazineHUD } from "./save-earth-magazine.js";
import { DESKTOP_MEDIA } from "./save-earth-access.js";
import { createGameAudio } from "./save-earth-audio.js";
import { analytics } from "./save-earth-analytics.js";
const sound = createGameAudio();
import {
  createPilot,
  turnPilot,
  flyPilot,
  createMeteor,
  nearMeteorCue,
  damageMeteor,
  shotHits,
  advanceMeteor,
} from "./save-earth-flight.js";
const briefing = createMissionBriefing(
  document.querySelector("#mission-briefing"),
);
const canvas = document.querySelector("#arena");
let view;
let ready = false;
const desktop = matchMedia(DESKTOP_MEDIA);
let player = createPilot();
let thirdPerson = true,
  paused = false;
const keys = new Set();
const movementKeys = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Space",
  "ShiftLeft",
  "ShiftRight",
  "KeyQ",
  "KeyE",
  "KeyF",
]);
const shotInterval = 0.2;
let ammo = 30,
  reloadIn = 0;
const ammoLabel = document.querySelector("#ammo");
const magazineHUD = createMagazineHUD(document.querySelector("#ammo-hud"));
const storagePrefix = "karshvar:save-earth:round:";
const localRounds = new Map();
const number = new Intl.NumberFormat(document.documentElement.lang);
const date = new Intl.DateTimeFormat(document.documentElement.lang, {
  dateStyle: "medium",
  timeStyle: "short",
});
const scoreLabel = document.querySelector("#score");
const shieldLabel = document.querySelector("#shield");
const overlay = document.querySelector("#round-overlay");
const status = document.querySelector("#round-status");
const startButton = document.querySelector("#start");
const endButton = document.querySelector("#end");
const history = document.querySelector("#scores");
const empty = document.querySelector("#no-scores");
let historyPage = 0;
const bestScore = document.querySelector("#best-score");
const previousPage = document.querySelector("#scores-prev");
const nextPage = document.querySelector("#scores-next");
previousPage.addEventListener("click", () => {
  historyPage--;
  showHistory();
});
nextPage.addEventListener("click", () => {
  historyPage++;
  showHistory();
});
const meteors = [];
const shots = [];
const bursts = [];
let round;
let score = 0;
let shields = 5;
let elapsed = 0;
let spawnIn = 0;
let radioIn = 3;
let cooldown = 0;
let shotVisual = 0;
let frame = 0;
let last = 0;
let firing = false;
let aiming = false;
const orbit = { active: false, yaw: 0, pitch: 0 };
let flash = 0;
let frameCount = 0,
  frameTotal = 0,
  frameMax = 0;

function saveRound() {
  localRounds.set(round.id, { ...round, score });
  try {
    localStorage.setItem(
      storagePrefix + round.id,
      JSON.stringify(localRounds.get(round.id)),
    );
  } catch {
    // The current page can still keep a session history if storage is disabled.
  }
}

function showHistory() {
  const entries = new Map(localRounds);
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(storagePrefix)) continue;
      try {
        const entry = JSON.parse(localStorage.getItem(key));
        if (
          entry &&
          Number.isFinite(entry.at) &&
          Number.isFinite(entry.score)
        ) {
          entries.set(key.slice(storagePrefix.length), entry);
        }
      } catch {
        // Skip damaged entries without affecting the remaining scores.
      }
    }
  } catch {
    // Session scores are available even when local storage is disabled.
  }
  const sorted = [...entries.values()].sort((a, b) => b.at - a.at);
  const pageCount = Math.max(1, Math.ceil(sorted.length / 10));
  historyPage = Math.max(0, Math.min(historyPage, pageCount - 1));
  bestScore.textContent = number.format(
    sorted.reduce((best, entry) => Math.max(best, entry.score), 0),
  );
  previousPage.disabled = historyPage === 0;
  nextPage.disabled = historyPage === pageCount - 1;
  document.querySelector("#scores-page").textContent =
    number.format(historyPage + 1) + " / " + number.format(pageCount);
  document.querySelector("#scores-pagination").hidden = sorted.length <= 10;
  const items = sorted
    .slice(historyPage * 10, historyPage * 10 + 10)
    .map((entry) => {
      const item = document.createElement("li");
      const time = document.createElement("time");
      time.dateTime = new Date(entry.at).toISOString();
      time.textContent = date.format(entry.at);
      const value = document.createElement("strong");
      value.textContent = number.format(entry.score);
      item.append(time, value);
      return item;
    });
  history.replaceChildren(...items);
  empty.hidden = items.length > 0;
}

function updateStats() {
  scoreLabel.textContent = number.format(score);
  shieldLabel.textContent = number.format(shields);
}

function draw() {
  view?.draw({
    player,
    thirdPerson: orbit.active ? true : aiming ? false : thirdPerson,
    orbit,
    aiming,
    meteors,
    shots,
    bursts,
    elapsed,
    flash,
    reloadIn,
    cooldown: shotVisual,
    active: !!round && !paused,
  });
}
function spawnMeteor() {
  if (meteors.length < 64) {
    const meteor = createMeteor(Math.random, player);
    view.placeMeteorOutsideView(meteor);
    meteors.push(meteor);
  }
}
function fire() {
  if (reloadIn > 0 || paused) return;
  if (ammo === 0) {
    sound.empty();
    cooldown = 0.45;
    firing = false;
    return;
  }
  sound.shot();
  shotVisual = shotInterval;
  ammo--;
  updateAmmo();
  shots.push({
    ...view.shot(player, orbit.active || (!aiming && thirdPerson), elapsed),
    life: 2.85,
  });
  cooldown = shotInterval;
}
function advance(dt) {
  flyPilot(player, keys, dt);
  view?.constrainPilot?.(player);
  sound.thrust(player.velocity.length());
  if (reloadIn > 0) {
    reloadIn = Math.max(0, reloadIn - dt);
    document.querySelector("#reload-fill").style.transform =
      `scaleX(${1 - reloadIn / 1.4})`;
    if (reloadIn === 0) {
      ammo = 30;
      updateAmmo();
    }
  }
  cooldown -= dt;
  shotVisual = Math.max(0, shotVisual - dt);
  if (firing && cooldown <= 0) fire();
  elapsed += dt;
  radioIn -= dt;
  if (radioIn <= 0) {
    sound.radio?.();
    // The audio mixer schedules the next exchange after the current clip ends.
    radioIn = 0.5;
  }
  spawnIn -= dt;
  if (spawnIn <= 0) {
    spawnMeteor();
    spawnIn = Math.max(1.5, 8 * Math.pow(0.7, Math.floor(elapsed / 60)));
  }
  flash = Math.max(0, flash - dt);
  for (let i = bursts.length - 1; i >= 0; i--) {
    bursts[i].age += dt;
    if (bursts[i].age >= 0.32) bursts.splice(i, 1);
  }
  for (let i = shots.length - 1; i >= 0; i--) {
    const shot = shots[i];
    const hit = meteors.findIndex((meteor) => shotHits(shot, meteor, dt));
    if (hit !== -1) {
      const meteor = meteors[hit];
      const destroyed = damageMeteor(meteor);
      if (destroyed) meteors.splice(hit, 1);
      shots.splice(i, 1);
      bursts.push({
        position: meteor.position.clone(),
        radius: meteor.renderRadius * (destroyed ? 1 : 0.3),
        age: 0,
      });
      sound.hit();
      if (destroyed) {
        score += 10;
        updateStats();
      }
      continue;
    }
    shot.position.addScaledVector(shot.velocity, dt);
    shot.life -= dt;
    if (shot.life <= 0) shots.splice(i, 1);
  }
  for (let i = meteors.length - 1; i >= 0; i--) {
    const meteor = meteors[i];
    const arrived = advanceMeteor(meteor, player, dt);
    const cue = nearMeteorCue(player, meteor);
    if (cue) sound.flyby?.(cue.pan, cue.proximity);
    meteor.angle += meteor.spin * dt;
    meteor.hitFlash = Math.max(0, meteor.hitFlash - dt);
    if (arrived) {
      meteors.splice(i, 1);
      sound.impact();
      shields--;
      flash = 0.23;
      updateStats();
      if (shields === 0) {
        finish(true);
        return;
      }
    }
  }
}

function tick(now) {
  frame = 0;
  if (!round || paused || document.hidden) return;
  advance(last ? Math.min((now - last) / 1000, 0.035) : 0.001);
  if (last) {
    const gap = now - last;
    frameTotal += gap;
    frameMax = Math.max(frameMax, gap);
    frameCount++;
    if (frameCount === 120) {
      canvas.dataset.frameMs = (frameTotal / frameCount).toFixed(1);
      canvas.dataset.maxFrameMs = frameMax.toFixed(1);
      frameCount = frameTotal = frameMax = 0;
    }
  }
  last = now;
  briefing.update(elapsed);
  draw();
  if (round) frame = requestAnimationFrame(tick);
}

function start() {
  if (!ready || !desktop.matches) return;
  if (round) {
    lockMouse();
    return;
  }
  document.body.classList.add("playing");
  const at = Date.now();
  round = { id: crypto.randomUUID?.() ?? at + "-" + Math.random(), at };
  analytics.track("save-earth-start", {
    language: document.documentElement.lang,
  });
  score = 0;
  ammo = 30;
  reloadIn = 0;
  updateAmmo();
  shields = 5;
  elapsed = 0;
  briefing.start();
  spawnIn = 10;
  radioIn = 3;
  cooldown = 0;
  shotVisual = 0;
  flash = 0;
  last = 0;
  meteors.length = shots.length = bursts.length = 0;
  player = createPilot();

  updateStats();
  saveRound();
  showHistory();
  overlay.hidden = true;
  endButton.hidden = false;
  canvas.focus({ preventScroll: true });
  paused = true;
  lockMouse();
}

function clearInput() {
  keys.clear();
  orbit.active = false;
  orbit.yaw = orbit.pitch = 0;
  aiming = false;
  firing = false;
}

function finish(lost) {
  if (!round) return;
  saveRound();
  round = null;
  briefing.hide();
  sound.pause();
  document.exitPointerLock?.();
  paused = false;
  reloadIn = 0;
  updateAmmo();
  document.body.classList.remove("playing");
  cancelAnimationFrame(frame);
  frame = 0;
  clearInput();
  status.textContent = lost ? status.dataset.lost : status.dataset.ended;
  startButton.textContent = startButton.dataset.replay;
  overlay.hidden = false;
  endButton.hidden = true;
  showHistory();
  // Prepare the next round before showing its preview, not on Start.
  player = createPilot();
  elapsed = 0;
  meteors.length = shots.length = bursts.length = 0;
  view.resetStation(player);
  draw();
  startButton.focus({ preventScroll: true });
}

function lockMouse() {
  sound.setFirstPerson?.(!thirdPerson);
  sound.boot();
  const result = canvas.requestPointerLock?.();
  result?.catch(() => {
    paused = true;
    overlay.hidden = false;
    status.textContent = status.dataset.lock;
    startButton.textContent = startButton.dataset.resume;
  });
}
function pause() {
  if (!round) return;
  paused = true;
  sound.pause();
  clearInput();
  cancelAnimationFrame(frame);
  frame = 0;
  last = 0;
  overlay.hidden = false;
  status.textContent = status.dataset.paused;
  startButton.textContent = startButton.dataset.resume;
  draw();
}
document.addEventListener("pointerlockchange", () => {
  if (!round) return;
  if (document.pointerLockElement === canvas) {
    paused = false;
    overlay.hidden = true;
    last = 0;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(tick);
  } else pause();
});
document.addEventListener("pointerlockerror", () => {
  pause();
  status.textContent = status.dataset.lock;
});
function showHelp() {
  if (round) {
    pause();
    document.exitPointerLock?.();
  }
  briefing.show();
}
document.querySelector("#mission-help").addEventListener("click", showHelp);
document.querySelector("#briefing-close").addEventListener("click", () => {
  briefing.hide();
  document.querySelector("#mission-help").focus();
});
startButton.addEventListener("click", start);
endButton.addEventListener("click", () => finish(false));
document.addEventListener("mousemove", (event) => {
  if (!round || paused || document.pointerLockElement !== canvas) return;
  if (orbit.active) {
    orbit.yaw -= event.movementX * 0.004;
    orbit.pitch = Math.max(
      -1.2,
      Math.min(1.2, orbit.pitch + event.movementY * 0.004),
    );
  } else turnPilot(player, event.movementX, event.movementY);
});
// Mouse events fire for each button even when another button is held.
canvas.addEventListener("mousedown", (event) => {
  if (!round || paused) return;
  if (event.button === 2) {
    if (orbit.active) return;
    aiming = true;
    return;
  }
  if (event.button !== 0) return;
  firing = true;
  if (cooldown <= 0) fire();
});
canvas.addEventListener("contextmenu", (event) => event.preventDefault());
document.addEventListener("mouseup", (event) => {
  if (event.button === 2) aiming = false;
  if (event.button === 0) firing = false;
});
document.addEventListener("keydown", (event) => {
  if (event.code === "ControlLeft" || event.code === "ControlRight") {
    if (round && !paused) {
      event.preventDefault();
      keys.add(event.code);
      orbit.active = true;
      aiming = false;
      firing = false;
    }
    return;
  }
  if (event.code === "KeyH" && !event.repeat) {
    event.preventDefault();
    showHelp();
    return;
  }
  if (event.code === "KeyM" && !event.repeat) {
    toggleSound();
    return;
  }
  if (!round || paused || event.altKey || event.ctrlKey || event.metaKey)
    return;
  if (event.code === "KeyV" && !event.repeat) {
    thirdPerson = !thirdPerson;
    sound.setFirstPerson?.(!thirdPerson);
    return;
  }
  if (event.code === "KeyR" && ammo < 30 && !reloadIn) {
    event.preventDefault();
    sound.reload();
    reloadIn = 1.4;
    updateAmmo();
    return;
  }
  if (movementKeys.has(event.code)) {
    event.preventDefault();
    keys.add(event.code);
  }
});
document.addEventListener("keyup", (event) => {
  keys.delete(event.code);
  if (event.code === "ControlLeft" || event.code === "ControlRight") {
    orbit.active = keys.has("ControlLeft") || keys.has("ControlRight");
    if (!orbit.active) orbit.yaw = orbit.pitch = 0;
  }
});
addEventListener("blur", () => {
  clearInput();
  if (round) {
    document.exitPointerLock?.();
    pause();
  }
});
document.addEventListener("visibilitychange", () => {
  clearInput();
  cancelAnimationFrame(frame);
  frame = 0;
  last = 0;
  if (document.hidden && round) {
    document.exitPointerLock?.();
    pause();
  }
  if (!document.hidden && round && !paused) frame = requestAnimationFrame(tick);
});
addEventListener("pagehide", () => {
  if (round) saveRound();
});
addEventListener("storage", (event) => {
  if (event.key === null || event.key.startsWith(storagePrefix)) showHistory();
});
updateStats();
showHistory();
draw();

const initialMessage = status.textContent;
let preparing = false;
async function prepare() {
  startButton.disabled = true;
  if (!desktop.matches) {
    if (round) finish(false);
    status.textContent = status.dataset.desktop;
    startButton.hidden = true;
    return;
  }
  startButton.hidden = false;
  if (ready) {
    status.textContent = initialMessage;
    startButton.disabled = false;
    return;
  }
  if (preparing) return;
  preparing = true;
  status.textContent = status.dataset.loading;
  try {
    const { createSpaceRenderer } = await import("./save-earth-scene.js");
    view = await createSpaceRenderer(
      canvas,
      canvas.clientWidth,
      canvas.clientHeight,
    );
    view.resetStation(player);
    ready = true;
    resize();
    status.textContent = desktop.matches
      ? initialMessage
      : status.dataset.desktop;
    startButton.disabled = !desktop.matches;
    startButton.hidden = !desktop.matches;
  } catch (error) {
    console.error(error);
    status.textContent = status.dataset.error;
  } finally {
    preparing = false;
  }
}
desktop.addEventListener("change", prepare);
canvas.addEventListener("webglcontextlost", (event) => {
  event.preventDefault();
  if (round) finish(false);
  ready = false;
  startButton.disabled = true;
  status.textContent = status.dataset.error;
});
prepare();

function resize() {
  if (!view) return;
  const rect = canvas.getBoundingClientRect();
  view.resize(rect.width, rect.height);
  draw();
}
addEventListener("resize", resize);

function updateAmmo() {
  magazineHUD.update(ammo, reloadIn > 0);
  ammoLabel.textContent = number.format(ammo);
  const hud = document.querySelector("#ammo-hud");
  hud.classList.toggle("low", ammo <= 6);
  hud.classList.toggle("reloading", reloadIn > 0);
  document.querySelector("#magazine-fill").style.transform =
    `scaleX(${ammo / 30})`;
  const label = document.querySelector("#ammo-state");
  label.textContent =
    reloadIn > 0
      ? label.dataset.reloading
      : ammo === 0
        ? label.dataset.empty
        : label.dataset.ready;
}
updateAmmo();

function toggleSound() {
  const muted = sound.toggle(),
    button = document.querySelector("#sound-toggle");
  button.setAttribute("aria-pressed", String(muted));
  button.textContent = muted ? button.dataset.off : button.dataset.on;
}
document.querySelector("#sound-toggle").addEventListener("click", toggleSound);
if (navigator.serviceWorker?.controller)
  import("./offline.js").catch((error) =>
    console.warn("Update discovery unavailable", error),
  );
