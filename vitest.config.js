import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Standalone test config: kept separate from vite.config.js so the PWA
// plugin and dev-server options never load under test.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["src/test/setup.js"],
  },
});
