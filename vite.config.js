import { defineConfig } from "vite";
export default defineConfig({
  root: "public",
  // Keep playtesting stable while source files and the offline bundle are edited.
  server: { hmr: false },
});
