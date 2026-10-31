import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { revealPage } from "../public/page-ready.js";

function fixture() {
  const root = { dataset: {}, lang: "fa" };
  const main = {
    setAttribute: (key, value) => {
      main[key] = value;
    },
  };
  const status = {};
  const retry = { hidden: true };
  const events = {};
  let expired;
  let cleared = false;
  vm.runInNewContext(fs.readFileSync("public/loading.js", "utf8"), {
    document: {
      documentElement: root,
      querySelector: () => main,
      getElementById: (id) => (id === "pageLoadingStatus" ? status : retry),
      addEventListener: (type, handler) => {
        events[type] = handler;
      },
    },
    location: { href: "https://example.test/fa/modes/?test=1" },
    setTimeout: (handler) => {
      expired = handler;
      return 1;
    },
    clearTimeout: () => {
      cleared = true;
    },
  });
  return {
    root,
    main,
    status,
    retry,
    events,
    expire: () => expired(),
    cleared: () => cleared,
  };
}

test("loading hides incomplete content until ready and clears its timeout", () => {
  const f = fixture();
  assert.equal(f.root.dataset.loading, "true");
  f.events.DOMContentLoaded();
  assert.equal(f.main["aria-busy"], "true");
  assert.equal(f.status.textContent, "در حال بارگذاری…");
  f.events["page-ready"]();
  assert.equal(f.root.dataset.loading, undefined);
  assert.equal(f.main["aria-busy"], "false");
  assert.equal(f.cleared(), true);
  f.expire();
  assert.equal(f.retry.hidden, true);
});

test("failed or stalled modules provide a localized retry and can recover", () => {
  const f = fixture();
  f.events.DOMContentLoaded();
  f.expire();
  assert.equal(f.root.dataset.loading, "failed");
  assert.equal(f.retry.hidden, false);
  assert.equal(f.retry.textContent, "تلاش دوباره");
  assert.equal(f.retry.href, "https://example.test/fa/modes/?test=1");
  assert.equal(f.main["aria-busy"], "false");
  f.events["page-ready"]();
  assert.equal(f.root.dataset.loading, undefined);
});

test("ready before DOMContentLoaded does not re-enter loading", () => {
  const f = fixture();
  f.events["page-ready"]();
  f.events.DOMContentLoaded();
  assert.equal(f.main["aria-busy"], "false");
});

test("every app page has one pre-paint loading script and one skeleton", () => {
  function walk(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const file = path.join(dir, entry.name);
      return entry.isDirectory()
        ? walk(file)
        : file.endsWith(".html")
          ? [file]
          : [];
    });
  }
  for (const file of walk("public")) {
    const html = fs.readFileSync(file, "utf8");
    if (!html.includes('href="./style.css"')) continue;
    assert.equal(html.match(/<script data-page-loading>/g)?.length, 1, file);
    assert.equal(html.match(/id="pageSkeleton"/g)?.length, 1, file);
    assert.ok(
      html.indexOf("<script data-page-loading>") <
        html.indexOf('<link rel="stylesheet"'),
      file,
    );
    assert.ok(html.indexOf('id="pageSkeleton"') > html.indexOf("<main"), file);
  }
});

test("visible image errors release loading; offscreen and lazy images never block it", async () => {
  const image = new EventTarget();
  image.complete = false;
  image.loading = "eager";
  image.getBoundingClientRect = () => ({ width: 100, top: 10, bottom: 100 });
  let ready = false;
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  globalThis.document = {
    querySelectorAll: () => [
      image,
      { ...image, loading: "lazy" },
      {
        complete: false,
        getBoundingClientRect: () => ({ width: 100, top: 1000, bottom: 1100 }),
      },
    ],
    dispatchEvent: () => {
      ready = true;
    },
  };
  globalThis.window = { innerHeight: 700 };
  try {
    const waiting = revealPage();
    assert.equal(ready, false);
    image.dispatchEvent(new Event("error"));
    await waiting;
    assert.equal(ready, true);
  } finally {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
  }
});
