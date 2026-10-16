import { defineConfig, devices } from "@playwright/test";

// Chạy trên Microsoft Edge có sẵn của máy (không cần tải trình duyệt riêng)
export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:4173/",
    channel: "msedge",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Edge"], channel: "msedge", viewport: { width: 1280, height: 860 } } },
    { name: "narrow", use: { ...devices["Desktop Edge"], channel: "msedge", viewport: { width: 1078, height: 800 } } },
    { name: "mobile", use: { ...devices["Pixel 7"], channel: "msedge" } },
  ],
  webServer: {
    command: "npx vite preview --port 4173 --strictPort",
    url: "http://localhost:4173/",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
