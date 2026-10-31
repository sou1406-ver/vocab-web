import { scanAccessibility, toggleTheme, waitForSaved } from "./app-ready";
import { test, expect } from "@playwright/test";
import { readSnapshot } from "./speech-mock";

test("root discovery is off by default while basic decomposition stays available", async ({ page }, testInfo) => {
  await page.goto("/library?q=tempt");
  await page
    .locator(".vocabulary-card")
    .filter({ has: page.getByText("tempt", { exact: true }) })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("region", { name: "Phân tích từ", exact: true })).toBeVisible();
  await expect(dialog.locator(".part-chip").first()).toBeVisible();
  await expect(dialog.getByRole("region", { name: "Bản chất từ", exact: true })).toHaveCount(0);
  await expect(page.getByRole("navigation").getByRole("link", { name: "Gốc từ", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Đóng chi tiết từ", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.goto("/roots");
  await expect(page.locator(".root-card")).toHaveCount(19);
  await page.goto("/settings");
  const setting = page.getByRole("checkbox", { name: "Học sâu: gốc từ", exact: true });
  await expect(setting).not.toBeChecked();
  await setting.check();
  await page.getByRole("button", { name: "Lưu tuỳ chọn", exact: true }).click();
  await waitForSaved(page);
  await expect(page.getByRole("status").filter({ hasText: "Đã lưu tuỳ chọn" })).toBeVisible();
  await waitForSaved(page);
  await page.reload();
  await expect(setting).toBeChecked();
  await expect(page.locator("nav:visible").getByRole("link", { name: "Gốc từ", exact: true })).toHaveCount(1);
  await page.goto("/library?q=tempt");
  await page
    .locator(".vocabulary-card")
    .filter({ has: page.getByText("tempt", { exact: true }) })
    .first()
    .click();
  await expect(dialog.getByRole("region", { name: "Bản chất từ", exact: true })).toBeVisible();
  const rootLink = dialog.getByRole("link", { name: /Xem gốc/ }).first();
  await expect(rootLink).toHaveAttribute("href", "/roots/tempt");
  await rootLink.click();
  await expect(page.getByRole("heading", { name: "Hình ảnh cốt lõi", exact: true })).toBeVisible();
  await expect(page.locator(".root-word")).not.toHaveCount(0);
  await expect(page.getByRole("link", { name: "Trong sách · Bài 40", exact: true }).first()).toHaveAttribute(
    "href",
    "/books/toeic-600/lessons/40",
  );
  await expect(page.getByText("Mở rộng", { exact: true }).first()).toBeVisible();
  const snapshot = await readSnapshot(page);
  expect(snapshot.progress).toEqual({});
  expect(snapshot.events).toEqual([]);
  expect((await scanAccessibility(page)).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("roots.png"), fullPage: true });
  await toggleTheme(page);
  expect((await scanAccessibility(page)).violations).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("roots-dark.png"), fullPage: true });
  await page.goto("/settings");
  await setting.uncheck();
  await page.getByRole("button", { name: "Lưu tuỳ chọn", exact: true }).click();
  await waitForSaved(page);
  await expect(page.getByRole("status").filter({ hasText: "Đã lưu tuỳ chọn" })).toBeVisible();
  await page.goto("/library?q=tempt");
  await page
    .locator(".vocabulary-card")
    .filter({ has: page.getByText("tempt", { exact: true }) })
    .first()
    .click();
  await expect(dialog.getByRole("region", { name: "Bản chất từ", exact: true })).toHaveCount(0);
  await expect(page.getByRole("navigation").getByRole("link", { name: "Gốc từ", exact: true })).toHaveCount(0);
});
