import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const html = fs.readFileSync("public/index.html", "utf8");
test("root redirects to English on the custom domain and preserves query and fragment", () => {
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  for (const address of [
    "https://karshvar.ir/",
    "https://karshvar.ir/index.html?from=google#map",
    "http://127.0.0.1:5174/?from=google#map",
    "http://127.0.0.1:5174/en/en/en/?from=google#map",
    "http://127.0.0.1:5174/missing/page/",
  ]) {
    const url = new URL(address);
    let target;
    vm.runInNewContext(script, {
      URL,
      location: {
        href: url.href,
        search: url.search,
        hash: url.hash,
        replace: (value) => {
          target = new URL(value);
        },
      },
    });
    assert.equal(target.origin, url.origin);
    assert.equal(target.pathname, "/en/");
    assert.equal(target.search, url.search);
    assert.equal(target.hash, url.hash);
  }
});
test("root has a no-script fallback and canonical English URL without a duplicate app", () => {
  assert.match(html, /<noscript>[\s\S]*http-equiv="refresh"[\s\S]*url=\/en\//);
  assert.ok(html.includes('href="https://karshvar.ir/en/"'));
  assert.ok(html.includes('href="/en/"'));
  assert.ok(!html.includes("app.js"));
  assert.ok(!html.includes("pageSkeleton"));
});

test("a fallback served at the English destination cannot redirect to itself", () => {
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  vm.runInNewContext(script, {
    URL,
    location: {
      href: "http://127.0.0.1:5174/en/",
      search: "",
      hash: "",
      replace: () => assert.fail("Redirect loop"),
    },
  });
});
