import { scanAccessibility, toggleTheme, waitForSaved } from "./app-ready";
import { test, expect } from "@playwright/test";
import { readSnapshot } from "./speech-mock";
import roots from "../content/roots/roots.json" with { type: "json" };

const cardCount = roots.roots.length + roots.prefixFamilies.length + roots.particles.length + roots.coreWords.length;

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
  await expect(page.locator(".root-card")).toHaveCount(cardCount);
  const search = page.getByRole("searchbox", { name: "Tìm gốc, từ hoặc nghĩa" });
  await search.fill("keo");
  await expect(page.locator(".root-card").filter({ hasText: "tract" })).toBeVisible();
  await expect(page.locator(".root-card").filter({ hasText: "temper" })).toHaveCount(0);
  await search.fill("zzzz");
  await expect(page.getByText(/Chưa có mục nào khớp/)).toBeVisible();
  await page.getByRole("button", { name: "Xoá tìm kiếm" }).click();
  await page.getByRole("button", { name: /^Giới từ/ }).click();
  await expect(page.locator(".root-card")).toHaveCount(roots.particles.length);
  expect((await scanAccessibility(page)).violations).toEqual([]);
  await page.getByRole("button", { name: "Tất cả", exact: true }).click();
  await page.getByRole("link", { name: /^pre-/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "pre-" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "predict", exact: true })).toBeVisible();
  await expect(
    page.locator(".root-word").filter({ hasText: "predict" }).getByRole("link", { name: /dict/ }),
  ).toHaveAttribute("href", "/roots/dict");
  expect((await scanAccessibility(page)).violations).toEqual([]);
  await page.goto("/particles");
  await expect(page.locator(".particle")).toHaveCount(roots.particles.length);
  await page.getByRole("navigation", { name: "Chọn giới từ" }).getByRole("link", { name: "off", exact: true }).click();
  await expect(page).toHaveURL(/#off$/);
  expect((await scanAccessibility(page)).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("particles.png"), fullPage: true });
  await page.goto("/core-words");
  await expect(page.locator(".particle")).toHaveCount(roots.coreWords.length);
  await expect(page.getByRole("heading", { name: "interest", exact: true })).toBeVisible();
  expect((await scanAccessibility(page)).violations).toEqual([]);
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
