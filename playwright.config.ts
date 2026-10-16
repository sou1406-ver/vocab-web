import { defineConfig, devices } from "@playwright/test";

// Mặc định chạy bằng Chromium của Playwright (cài: npx playwright install chromium).
// Muốn dùng Microsoft Edge có sẵn của máy: PW_CHANNEL=msedge npm run e2e
const channel = process.env.PW_CHANNEL || undefined;

export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:4173/",
    channel,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel, viewport: { width: 1280, height: 860 } } },
    { name: "narrow", use: { ...devices["Desktop Chrome"], channel, viewport: { width: 1078, height: 800 } } },
    { name: "mobile", use: { ...devices["Pixel 7"], channel } },
  ],
  webServer: {
    command: "npx vite preview --port 4173 --strictPort",
    url: "http://localhost:4173/",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
