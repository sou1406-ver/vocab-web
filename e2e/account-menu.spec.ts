import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("avatar opens account links by hover, touch and keyboard, and dismisses safely", async ({ page }, testInfo) => {
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Mở hồ sơ", exact: true });
  const menu = page.getByRole("navigation", { name: "Tài khoản", exact: true });
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  if (testInfo.project.name === "desktop") await trigger.hover();
  else await trigger.tap();
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("button", { name: "Đăng xuất", exact: true })).toHaveCount(0);
  await expect(menu.getByRole("button", { name: "Đăng nhập bằng Google", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.press("ArrowDown");
  const settings = menu.getByRole("link", { name: "Tài khoản & cài đặt", exact: true });
  await expect(settings).toBeFocused();
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()).violations).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("account-menu.png") });
  await settings.click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(menu).toHaveCount(0);
  const account = page.getByRole("region", { name: "Tài khoản & đồng bộ", exact: true });
  const preferences = page.locator(".settings-preferences");
  const accountBox = (await account.boundingBox())!;
  const preferencesBox = (await preferences.boundingBox())!;
  if (testInfo.project.name === "desktop") {
    expect(accountBox.x).toBeGreaterThanOrEqual(preferencesBox.x + preferencesBox.width);
    expect(Math.abs(accountBox.y - preferencesBox.y)).toBeLessThan(2);
  } else {
    expect(preferencesBox.y).toBeGreaterThanOrEqual(accountBox.y + accountBox.height);
  }
  await page.screenshot({ path: testInfo.outputPath("settings-columns.png"), fullPage: true });
  await trigger.click();
  await expect(menu).toBeVisible();
  if (testInfo.project.name === "mobile") await page.touchscreen.tap(4, 300);
  else await page.mouse.click(4, 300);
  await expect(menu).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
