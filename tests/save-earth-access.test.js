import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  bindSaveEarthLink,
  mountSaveEarthEntry,
  DESKTOP_MEDIA,
} from "../public/save-earth-access.js";

function target() {
  const listeners = new Map();
  return {
    addEventListener(name, callback) {
      listeners.set(name, callback);
    },
    removeEventListener(name) {
      listeners.delete(name);
    },
    emit(name, event = {}) {
      listeners.get(name)?.(event);
    },
  };
}
function fixture(supported = false) {
  let loads = 0,
    returns = 0,
    unlocks = 0,
    focused = 0,
    shown = 0;
  const media = { ...target(), matches: supported };
  const mission = { hidden: true, inert: true };
  const message = {
    textContent: "Desktop required",
    dataset: { error: "Reload to try again" },
  };
  const link = {
    ...target(),
    focus() {
      focused++;
    },
  };
  const dialog = {
    ...target(),
    open: false,
    showModal() {
      assert.equal(this.open, false);
      this.open = true;
      shown++;
    },
    close() {
      this.open = false;
      this.emit("close");
    },
    getBoundingClientRect() {
      return { left: 20, right: 320, top: 50, bottom: 300 };
    },
    querySelector() {
      return message;
    },
  };
  const doc = {
    querySelector: (selector) => (selector === ".mission" ? mission : link),
    getElementById: () => dialog,
    exitPointerLock() {
      unlocks++;
    },
  };
  return {
    doc,
    media,
    mission,
    dialog,
    link,
    message,
    options: {
      document: doc,
      media,
      loadGame: () => {
        loads++;
        return Promise.resolve();
      },
      returnHome: () => {
        returns++;
      },
    },
    state: () => ({ loads, returns, unlocks, focused, shown }),
    supported(value) {
      media.matches = value;
      media.emit("change");
    },
  };
}
const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

test("mobile home click opens a dialog without following the game link; closing returns focus", () => {
  const f = fixture();
  const dispose = bindSaveEarthLink(f.options);
  let prevented = 0;
  f.link.emit("click", {
    preventDefault() {
      prevented++;
    },
  });
  f.link.emit("click", {
    preventDefault() {
      prevented++;
    },
  });
  assert.equal(prevented, 2);
  assert.equal(f.dialog.open, true);
  assert.equal(f.state().shown, 1);
  f.dialog.close();
  assert.equal(f.state().focused, 1);
  f.supported(true);
  f.link.emit("click", {
    preventDefault() {
      assert.fail("Desktop navigation must remain native");
    },
  });
  assert.equal(f.dialog.open, false);
  dispose();
});

test("direct mobile visits keep the mission hidden and inert without importing the game", async () => {
  const f = fixture();
  const dispose = mountSaveEarthEntry(f.options);
  await flush();
  assert.equal(f.mission.hidden, true);
  assert.equal(f.mission.inert, true);
  assert.equal(f.dialog.open, true);
  assert.equal(f.state().loads, 0);
  let prevented = false;
  f.dialog.emit("cancel", {
    preventDefault() {
      prevented = true;
    },
  });
  assert.equal(prevented, true);
  assert.equal(f.state().returns, 1);
  dispose();
});

test("desktop resize imports once and switching back hides the mission and releases pointer lock", async () => {
  const f = fixture();
  const dispose = mountSaveEarthEntry(f.options);
  f.supported(true);
  await flush();
  assert.equal(f.state().loads, 1);
  assert.equal(f.mission.hidden, false);
  assert.equal(f.mission.inert, false);
  assert.equal(f.dialog.open, false);
  const unlocks = f.state().unlocks;
  f.supported(false);
  assert.equal(f.mission.hidden, true);
  assert.equal(f.mission.inert, true);
  assert.equal(f.dialog.open, true);
  assert.equal(f.state().unlocks, unlocks + 1);
  f.supported(true);
  await flush();
  assert.equal(f.state().loads, 1);
  dispose();
});

test("a resize before the deferred import prevents starting the game on mobile", async () => {
  const f = fixture(true);
  const dispose = mountSaveEarthEntry(f.options);
  f.supported(false);
  await flush();
  assert.equal(f.state().loads, 0);
  f.supported(true);
  await flush();
  assert.equal(f.state().loads, 1);
  dispose();
});

test("a pending desktop import cannot reveal the mission after switching to mobile", async () => {
  const f = fixture(true);
  let complete;
  f.options.loadGame = () =>
    new Promise((resolve) => {
      complete = resolve;
    });
  const dispose = mountSaveEarthEntry(f.options);
  await flush();
  f.supported(false);
  complete();
  await flush();
  assert.equal(f.dialog.open, true);
  assert.equal(f.mission.hidden, true);
  dispose();
});

test("all six generated pages use the lightweight entry and an accessible localized modal", async () => {
  for (const lang of ["en", "fa", "ar", "fr", "ru", "tr"]) {
    const root = new URL(`../public/${lang}/`, import.meta.url);
    const direct = await readFile(
      new URL("save-the-earth/index.html", root),
      "utf8",
    );
    const home = await readFile(new URL("index.html", root), "utf8");
    assert.match(direct, /<main class="mission" hidden inert>/);
    assert.match(direct, /src="\.\.\/\.\.\/save-earth-entry\.js"/);
    assert.doesNotMatch(direct, /src="\.\.\/\.\.\/save-earth\.js"/);
    for (const html of [direct, home]) {
      assert.match(html, /id="save-earth-desktop-dialog"/);
      assert.match(html, /aria-labelledby="desktop-required-title"/);
      assert.match(html, /aria-describedby="desktop-required-message"/);
      assert.match(html, /save-earth-access\.css/);
    }
    assert.match(home, /data-save-earth-link/);
  }
  assert.equal(DESKTOP_MEDIA, "(min-width: 900px) and (any-pointer: fine)");
  const entry = await readFile(
    new URL("../public/save-earth-entry.js", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(entry, /from ["'][^"']*(?:flight|scene|audio|three)/);
});
