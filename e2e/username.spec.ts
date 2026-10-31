import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.skip(process.env.FIREBASE_SYNC_EMULATOR_TEST !== "1", "Requires a local build with Firebase emulators enabled.");
test.setTimeout(90000);

test("Google accounts must finish username setup before sync; rename and hide retain identity", async ({
  page,
}, testInfo) => {
  const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 6);
  const username = `user_${testInfo.project.name}_${suffix}`;
  const renamed = `ren_${testInfo.project.name}_${suffix}`;
  const listens: string[] = [];
  page.on("request", (request) => {
    if (!request.url().includes("Firestore/Listen")) return;
    const payload = request.url() + " " + (request.postData() ?? "");
    try {
      listens.push(decodeURIComponent(payload));
    } catch {
      listens.push(payload);
    }
  });
  await page.goto("/settings");
  const popupReady = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Đăng nhập bằng Google", exact: true }).click();
  const popup = await popupReady;
  await popup.getByRole("button", { name: /Add new account/ }).click();
  expect(popup.url()).toContain("127.0.0.1:9099/emulator/auth/handler");
  await popup.getByLabel("Email", { exact: true }).fill(`${username}@example.test`);
  await popup.getByLabel("Display name", { exact: true }).fill("Google Display Name");
  await Promise.all([
    popup.waitForEvent("close"),
    popup.getByRole("button", { name: "Sign in with Google.com", exact: true }).click(),
  ]);
  await expect(page.getByRole("heading", { name: "Chọn username", exact: true })).toBeVisible();
  await expect(page.getByRole("navigation")).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: "Username", exact: true })).toHaveValue("");
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  await page.goto("/settings");
  const againReady = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Đăng nhập bằng Google", exact: true }).click();
  const again = await againReady;
  await Promise.all([
    again.waitForEvent("close"),
    again.getByText(`${username}@example.test`, { exact: true }).click(),
  ]);
  await expect(page.getByRole("heading", { name: "Chọn username", exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Username", exact: true })).toHaveValue("");
  await page.goto("/lessons");
  await expect(page.getByRole("heading", { name: "Chọn username", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Chọn username", exact: true })).toBeVisible();
  expect(listens.some((payload) => payload.includes("/profiles/"))).toBe(true);
  expect(listens.some((payload) => payload.includes("/users/"))).toBe(false);
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()).violations).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("choose-username.png"), fullPage: true });
  await page.getByRole("textbox", { name: "Username", exact: true }).fill(username);
  await page.getByRole("button", { name: "Tạo tài khoản", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Chọn username", exact: true })).toHaveCount(0);
  await expect.poll(() => listens.some((payload) => payload.includes("/users/"))).toBe(true);
  await page.goto("/leaderboard");
  const row = page.locator(".cultivator-row").filter({ hasText: username });
  await expect(row).toBeVisible();
  await expect(page.locator(".cultivator-list")).not.toContainText("Google Display Name");
  await page.goto("/settings");
  await page.getByRole("textbox", { name: "Username", exact: true }).fill(renamed);
  await page.getByRole("button", { name: "Đổi username", exact: true }).click();
  await expect(page.locator(".account-name strong")).toHaveText(`@${renamed}`);
  const hidden = page.getByRole("checkbox", { name: "Ẩn khỏi bảng xếp hạng", exact: true });
  // This privacy preference reflects the confirmed server transaction.
  await hidden.click();
  await expect(hidden).toBeChecked();
  await page.goto("/leaderboard");
  await expect(page.locator(".cultivator-row").filter({ hasText: renamed })).toHaveCount(0);
  await page.goto("/settings");
  await page.reload();
  await expect(hidden).toBeChecked();
  await expect(page.locator(".account-name strong")).toHaveText(`@${renamed}`);
  await hidden.click();
  await expect(hidden).not.toBeChecked();
  await page.goto("/leaderboard");
  await expect(page.locator(".cultivator-row").filter({ hasText: renamed })).toBeVisible();
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("username-leaderboard.png"), fullPage: true });
});
