import test from "node:test";
import assert from "node:assert/strict";
import {
  answerFill,
  answerStatus,
  bindHistory,
  historyCopy,
} from "../public/history.js";

test("play page mounts its localized answer legend without interrupting startup", () => {
  const original = globalThis.document;
  try {
    for (const [language, copy] of Object.entries(historyCopy)) {
      const makeNode = () => ({
        children: [],
        append(...nodes) {
          this.children.push(...nodes);
        },
      });
      const menu = makeNode();
      const globe = makeNode();
      globalThis.document = {
        baseURI: "https://example.test/Karshvar/",
        documentElement: { dataset: { page: "play" } },
        createElement: makeNode,
        querySelector: (selector) =>
          selector === ".site-menu nav" ? menu : globe,
      };
      bindHistory({
        language,
        getSessions: () => ({}),
        sessionLabel: (key) => key,
      });
      assert.equal(menu.children.length, 1);
      assert.deepEqual(
        globe.children[0].children.map((node) => node.textContent),
        copy.slice(2, 5),
      );
      assert.deepEqual(
        globe.children[0].children.map((node) => node.className),
        ["correct", "wrong", "revealed"],
      );
    }
  } finally {
    globalThis.document = original;
  }
});
test("saved answer colors survive JSON restoration and distinguish revealed answers", () => {
  const answers = JSON.parse(
    JSON.stringify([
      { id: "1", choice: "yes", correct: true },
      { id: "2", choice: "no", correct: false },
      { id: "3", choice: "", correct: false },
    ]),
  );
  assert.equal(answerFill("1", "4", answers), "var(--answer-correct)");
  assert.equal(answerFill("2", "4", answers), "var(--answer-wrong)");
  assert.equal(answerFill("3", "4", answers), "var(--answer-revealed)");
  assert.equal(answerFill("4", "4", answers), "#ffbd4a");
  assert.equal(answerFill("5", "4", answers), "var(--land)");
  assert.equal(answerFill("1", "1", answers), "var(--answer-correct)");
  assert.equal(answerFill("1", "4", []), "var(--land)");
  assert.equal(answerStatus(answers[2]), "revealed");
});

import { latestAnswers } from "../public/history-globe.js";
test("history globe uses the newest saved answer when sessions overlap", () => {
  const old = {
    id: "364",
    correct: false,
    choice: "x",
    date: "2026-10-01T00:00:00Z",
  };
  const recent = {
    ...old,
    correct: true,
    choice: "Iran",
    date: "2026-10-31T00:00:00Z",
  };
  assert.deepEqual(
    latestAnswers({ Asia: { answers: [recent] }, other: { answers: [old] } }),
    [recent],
  );
  assert.deepEqual(latestAnswers({}), []);
});

import fs from "node:fs";
test("history pages retain the Sources menu destination in every language", () => {
  for (const lang of ["en", "fa", "ar", "tr", "fr", "ru"]) {
    const html = fs.readFileSync(`public/${lang}/history/index.html`, "utf8");
    assert.ok(html.includes(`class="sources-link" href="./${lang}/sources/"`));
  }
});
