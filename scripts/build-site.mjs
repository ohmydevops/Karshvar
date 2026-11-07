import {
  cp,
  mkdir,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { transform } from "esbuild";
import { createHash } from "node:crypto";

const project = fileURLToPath(new URL("../", import.meta.url));
const output = path.join(project, "output");
const target = path.join(output, "site");
// Only replace this build's own output directory.
if (path.dirname(target) !== output) throw Error("Invalid build directory");
await mkdir(output, { recursive: true });
execFileSync(process.execPath, ["scripts/build-offline.mjs"], { cwd: project });
await rm(target, { recursive: true, force: true });
await cp(path.join(project, "public"), target, { recursive: true });
execFileSync(
  process.env.PYTHON || "python",
  ["scripts/optimize-images.py", target],
  {
    cwd: project,
    stdio: "inherit",
  },
);
const socialVersions = new Map();
for (const name of await readdir(path.join(target, "social"))) {
  if (!name.endsWith(".jpg")) continue;
  const bytes = await readFile(path.join(target, "social", name));
  socialVersions.set(
    name.replace(/\.jpg$/, ".png"),
    `${name}?v=${createHash("sha256").update(bytes).digest("hex").slice(0, 12)}`,
  );
}

let before = 0;
let after = 0;
async function minify(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "vendor") await minify(file);
      continue;
    }
    const extension = path.extname(file);
    if (extension === ".html") {
      const html = await readFile(file, "utf8");
      await writeFile(
        file,
        html.replace(
          /https:\/\/karshvar\.ir\/social\/([\w-]+\.png)(?:\?v=[\w-]+)?/g,
          (url, name) =>
            socialVersions.has(name)
              ? `https://karshvar.ir/social/${socialVersions.get(name)}`
              : url,
        ),
      );
      continue;
    }
    if (![".js", ".css"].includes(extension) || entry.name === "sw.js")
      continue;
    const source = await readFile(file, "utf8");
    const result = await transform(source, {
      loader: extension === ".js" ? "js" : "css",
      minify: true,
      target: "es2022",
      legalComments: "none",
    });
    before += Buffer.byteLength(source);
    await writeFile(file, result.code);
    after += (await stat(file)).size;
  }
}
await minify(target);
// Cache the final deployed bytes, not the unminified source files.
execFileSync(process.execPath, ["scripts/build-offline.mjs", target], {
  cwd: project,
});
console.log(
  `JS/CSS: ${Math.round(before / 1024)} → ${Math.round(after / 1024)} KB`,
);
console.log(`Offline-ready site: ${target}`);
