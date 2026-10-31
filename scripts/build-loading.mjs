import fs from "node:fs";
import path from "node:path";
import { format } from "prettier";
import { highlightCopy } from "../public/explore-settings.js";

const bootstrap = fs.readFileSync("public/loading.js", "utf8").trim();
const block = (name) => `<div class="page-skeleton-block ${name}"></div>`;
const line = (name = "") => block(`page-skeleton-line ${name}`);
const card = () =>
  `<div class="page-skeleton-card">${line("short")}${line()}${line("medium")}</div>`;
export function skeletonFor(page) {
  const heading = line("page-skeleton-heading short");
  const globe = block("page-skeleton-globe");
  const map = block("page-skeleton-map");
  const form = `<div class="page-skeleton-card">${line("short")}${block("page-skeleton-input")}${block("page-skeleton-button")}</div>`;
  switch (page) {
    case "home":
      return `<div class="page-skeleton-hero"><div>${heading}${line()}${line("medium")}${block("page-skeleton-button")}</div>${globe}</div>`;
    case "modes":
      return `${globe}${heading}<div class="page-skeleton-cards">${card().repeat(2)}</div>`;
    case "countries":
      return `${heading}${globe}${form}`;
    case "continents":
      return `${heading}<div class="page-skeleton-cards continents">${`<div class="page-skeleton-card">${block("page-skeleton-continent-art")}${line("short")}${line("medium")}</div>`.repeat(6)}</div>`;
    case "play":
      return `${heading}<div class="page-skeleton-game">${map}${form}</div>`;
    case "explore":
      return `${heading}${line("medium")}${map}`;
    case "results":
      return `${heading}${globe}${card()}${block("page-skeleton-button")}`;
    case "history":
      return `${heading}${line()}${globe}${card()}`;
    case "blog":
      return `${heading}<div class="page-skeleton-cards blog">${`<div>${block("page-skeleton-cover")}${card()}</div>`.repeat(3)}</div>`;
    default:
      return `${heading}<div class="page-skeleton-info">${line()}${line("medium")}${line()}${line("medium")}</div>${card().repeat(2)}`;
  }
}

export async function buildLoading(dir = "public") {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await buildLoading(file);
      continue;
    }
    if (!entry.name.endsWith(".html")) continue;
    const original = fs.readFileSync(file, "utf8");
    let html = original;
    if (!html.includes('href="./style.css"')) continue;
    if (
      html.includes('id="showPopulation"') &&
      !html.includes('id="highlightCountries"')
    ) {
      const locale = html.match(/lang="([^"]+)"/)?.[1] || "en";
      html = html.replace(
        /(<label class="population-switch"[\s\S]*?<\/label\s*>)/,
        `$1<label class="population-switch"><input id="highlightCountries" type="checkbox" role="switch"><span>${highlightCopy[locale] || highlightCopy.en}</span></label>`,
      );
    }
    const skip = html.match(
      /<button\b(?=[^>]*\bid="skip")[^>]*>[\s\S]*?<\/button>/,
    )?.[0];
    if (skip) {
      html = html
        .replace(skip, "")
        .replace(
          /(<div class="question">[\s\S]*?<h2\b[^>]*>[\s\S]*?<\/h2>)/,
          "$1" + skip.replace('class="text-button"', 'class="skip-outline"'),
        );
    }
    const page =
      html.match(/data-selection-page="([^"]+)"/)?.[1] ||
      html.match(/data-page="([^"]+)"/)?.[1] ||
      "home";
    const layout =
      page === "blog" && /class="blog-place"/.test(html) ? "article" : page;
    // Replace generated markup so rebuilding remains repeatable.
    html = html.replace(/\s*<script data-page-loading>[\s\S]*?<\/script>/, "");
    html = html.replace(
      /\s*<!-- page-skeleton:start -->[\s\S]*?<!-- page-skeleton:end -->/,
      "",
    );
    html = html.replace(
      '<link rel="stylesheet"',
      `<script data-page-loading>\n${bootstrap}\n</script>\n    <link rel="stylesheet"`,
    );
    html = html.replace(
      /<main\b[^>]*>/,
      (main) =>
        `${main}\n<!-- page-skeleton:start -->\n<div id="pageSkeleton" class="page-skeleton" data-layout="${layout}"><div aria-hidden="true" class="page-skeleton-shapes">${skeletonFor(layout)}</div><p id="pageLoadingStatus" role="status"></p><a id="pageLoadingRetry" hidden></a></div>\n<!-- page-skeleton:end -->`,
    );
    html = await format(html, { parser: "html" });
    if (html !== original) fs.writeFileSync(file, html);
  }
}
