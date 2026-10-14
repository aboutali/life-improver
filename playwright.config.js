import { defineConfig, devices } from "@playwright/test";

// End-to-end user stories. Runs against the production build via `vite preview`.
// Local: npm run build && npm run e2e. CI installs chromium first.
const executablePath = process.env.PW_CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:4173/life-improver/",
    serviceWorkers: "block",
    launchOptions: executablePath ? { executablePath } : {},
    trace: "retain-on-failure",
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"], browserName: "chromium" } },
    { name: "desktop", use: { viewport: { width: 1280, height: 900 }, browserName: "chromium" } },
  ],
  webServer: {
    command: "npx vite preview --port 4173 --strictPort",
    url: "http://localhost:4173/life-improver/",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
