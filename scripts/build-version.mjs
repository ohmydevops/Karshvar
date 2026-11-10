import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export async function buildVersion(root) {
  const cwd = fileURLToPath(new URL("../", import.meta.url));
  let commit = "dev";
  let dirty = false;
  try {
    commit = execFileSync("git", ["rev-parse", "--short=7", "HEAD"], {
      cwd,
      encoding: "utf8",
    }).trim();
    dirty = Boolean(
      execFileSync(
        "git",
        ["status", "--porcelain", "--untracked-files=normal"],
        { cwd, encoding: "utf8" },
      ).trim(),
    );
  } catch {}
  await writeFile(
    new URL("build-info.json", root),
    JSON.stringify({ commit, dirty, version: commit + (dirty ? "+" : "") }) +
      "\n",
  );
}
