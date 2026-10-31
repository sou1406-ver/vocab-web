import { scanAccessibility, setTheme, waitForSaved } from "./app-ready";
import { test, expect } from "@playwright/test";

test("today uses the remaining daily goal, keeps the streak and replaces empty progress", async ({
  page,
}, testInfo) => {
  await page.goto("/progress");
  await expect(page.getByRole("heading", { name: "Chưa có lượt học nào", exact: true })).toBeVisible();
  await expect(page.locator(".exercise-result-card, .activity-chart")).toHaveCount(0);
  await page.goto("/settings");
  await page.getByLabel("Mục tiêu từ mới mỗi ngày", { exact: true }).selectOption("15");
  await page.getByRole("button", { name: "Lưu tuỳ chọn", exact: true }).click();
  await waitForSaved(page);
  await expect(page.getByRole("status").filter({ hasText: "Đã lưu tuỳ chọn" })).toBeVisible();
  await page.goto("/");
  await expect(page.locator(".today-workload")).toHaveText("15 từ mới");
  await expect(page.locator(".today-highlights > section")).toHaveCount(2);
  await expect(page.locator(".today-streak-count")).toContainText("0");
  await expect(page.locator(".goal-panel, .today-page .stats-grid, .hero-art")).toHaveCount(0);
  await page.getByRole("button", { name: "Bắt đầu học", exact: true }).click();
  await page.getByRole("button", { name: "Đã xem, thử nhớ lại", exact: true }).click();
  await page.getByRole("button", { name: "Chưa nhớ, xem đáp án", exact: true }).click();
  await expect(page.locator(".answer-feedback")).toBeVisible();
  await waitForSaved(page);
  await page.goto("/");
  await expect(page.locator(".today-workload")).toHaveText("14 từ mới");
  await expect(page.locator(".today-streak-count")).toContainText("1");
  await expect(page.getByRole("progressbar", { name: "Mục tiêu từ mới hôm nay", exact: true })).toHaveAttribute(
    "aria-valuenow",
    "1",
  );
  await waitForSaved(page);
  await page.reload();
  await expect(page.locator(".today-streak-count")).toContainText("1");
  for (const theme of ["light", "dark"] as const) {
    await setTheme(page, theme);
    expect((await scanAccessibility(page)).violations).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`today-${theme}.png`), fullPage: true });
  }
  await page.goto("/progress");
  await expect(page.locator(".exercise-result-card")).toHaveCount(6);
  await expect(page.locator(".activity-chart")).toBeVisible();
});
