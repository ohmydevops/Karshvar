import fs from "node:fs";
import path from "node:path";
export const themeBootstrap =
  '<script>\n      // Apply the saved theme before styles or page content can paint.\n      (() => {\n        let theme = "light";\n        try {\n          if (localStorage.getItem("atlas-theme") === "dark") theme = "dark";\n        } catch {}\n        document.documentElement.dataset.theme = theme;\n        document.querySelector(\'meta[name="theme-color"]\')?.setAttribute("content", theme === "dark" ? "#0d1528" : "#f7f9ff");\n      })();\n    </script>';
export function buildTheme(dir = "public") {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) buildTheme(file);
    else if (entry.name.endsWith(".html")) {
      const html = fs.readFileSync(file, "utf8");
      if (
        html.includes('href="./style.css"') &&
        !html.includes("document.documentElement.dataset.theme")
      ) {
        fs.writeFileSync(
          file,
          html.replace(
            '<link rel="stylesheet"',
            themeBootstrap + '\n    <link rel="stylesheet"',
          ),
        );
      }
    }
  }
}
