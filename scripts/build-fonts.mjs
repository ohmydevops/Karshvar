import { readdir, readFile, writeFile } from "node:fs/promises";

// Discover the Persian fonts before CSS finishes loading, including on a cold visit.
export async function buildFonts(dir = new URL("../public/", import.meta.url)) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = new URL(entry.name + (entry.isDirectory() ? "/" : ""), dir);
    if (entry.isDirectory()) {
      await buildFonts(file);
    } else if (entry.name.endsWith(".html")) {
      const html = await readFile(file, "utf8");
      if (!/<html\b[^>]*\blang="fa"/.test(html)) continue;
      if (html.includes("data-persian-font")) continue;
      const links = ["Regular", "Bold"]
        .map(
          (weight) =>
            `    <link data-persian-font rel="preload" href="./fonts/Vazir-${weight}.woff2" as="font" type="font/woff2" crossorigin />`,
        )
        .join("\n");
      const updated = html.replace(
        '    <link rel="stylesheet" href="./style.css"',
        `${links}\n    <link rel="stylesheet" href="./style.css"`,
      );
      if (updated !== html) await writeFile(file, updated);
    }
  }
}
