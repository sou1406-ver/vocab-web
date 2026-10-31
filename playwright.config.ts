import { defineConfig, devices } from "@playwright/test";

const channel = process.env.PW_CHANNEL || undefined;
export default defineConfig({
  testDir: "e2e",
  timeout: 45_000,
  globalTimeout: 10 * 60_000,
  forbidOnly: !!process.env.CI,
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:5174",
    channel,
    trace: "retain-on-failure",
    // Exercise specs represent returning guests; the notice spec overrides this.
    storageState: {
      cookies: [],
      origins: [{ origin: "http://127.0.0.1:5174", localStorage: [{ name: "vocab:guest-notice:v1", value: "1" }] }],
    },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel, viewport: { width: 1440, height: 1000 } } },
    {
      name: "mobile",
      use: {
        ...devices["Desktop Chrome"],
        channel,
        viewport: { width: 360, height: 800 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    // Own the Next process directly so CI teardown cannot strand nested npm shells.
    command: `node node_modules/next/dist/bin/next ${process.env.E2E_PRODUCTION ? "start" : "dev"} --hostname 127.0.0.1 --port 5174`,
    url: "http://127.0.0.1:5174",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
