import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const article = "/knowledge/reading-at-work";
test("retry reopens local storage after a temporary opening failure clears", async ({ page }) => {
  await page.addInitScript(() => {
    const actual = window.indexedDB;
    let attempts = 0;
    Object.defineProperty(window, "indexedDB", {
      get() {
        if (++attempts === 1) throw new Error("Tạm thời chưa mở được dữ liệu.");
        return actual;
      },
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Thử lại", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Hôm nay, học một chút." })).toBeVisible();
});

test("public article has server HTML with JavaScript disabled", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:5174" + article);
  await expect(page.getByRole("heading", { name: "Đọc một thỏa thuận công việc" })).toBeVisible();
  await expect(page.locator("article")).toContainText("resolved");
  const examples = page.locator(".reading-body blockquote");
  await expect(examples).toHaveCount(3);
  await expect(examples.locator("p")).toHaveCount(3);
  await expect(page.locator(".vocabulary-term p")).toHaveCount(0);
  await expect(page).toHaveTitle(/Đọc một thỏa thuận công việc/);
  await context.close();
});

test("read, inspect inflection/phrase, save, learn and return to reading", async ({ page }) => {
  await page.goto(article);
  const term = page.getByRole("button", { name: "Tra resolved", exact: true });
  await term.scrollIntoViewIfNeeded();
  await term.click();
  const dialog = page.getByRole("dialog", { name: "Chi tiết từ" });
  await expect(dialog.getByRole("heading", { name: "resolve", exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Lưu vào bộ cá nhân", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Bỏ lưu từ", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(term).toBeFocused();
  const position = await page.evaluate(() => window.scrollY);
  expect(position).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Tra abide by", exact: true }).click();
  await expect(dialog.getByRole("heading", { name: "abide by", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("link", { name: "Xem từ đã lưu", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => Number(sessionStorage.getItem("vocab:reading:reading-at-work:1"))))
    .toBeGreaterThan(0);
  await expect(page.getByRole("heading", { name: "resolve", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Học từ đã lưu", exact: true }).click();
  await page.getByRole("button", { name: "Đã xem, thử nhớ lại" }).click();
  await page.getByRole("button", { name: "Chưa nhớ, xem đáp án" }).click();
  await page.getByRole("button", { name: "Xem kết quả", exact: true }).click();
  await page.reload();
  await page.getByRole("link", { name: "Quay lại bài đang đọc", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Đọc một thỏa thuận công việc" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
});

test("lookup/save do not count as learning, accessible dialog and blocked local storage", async ({ page }) => {
  await page.goto(article);
  await page.getByRole("button", { name: "Tra agreement", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Chi tiết từ" });
  await dialog.getByRole("button", { name: "Lưu vào bộ cá nhân", exact: true }).click();
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(result.violations.map((v) => v.id)).toEqual([]);
  await page.keyboard.press("Escape");
  await page.goto("/");
  await expect(page.locator(".stat-number").first()).toHaveText("0/ 10 từ");
  await page.addInitScript(() => {
    Object.defineProperty(window, "indexedDB", {
      get() {
        throw new Error("Không mở được dữ liệu trên máy.");
      },
    });
  });
  await page.goto(article);
  await expect(page.getByRole("heading", { name: "Đọc một thỏa thuận công việc" })).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: "Không mở được dữ liệu" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Tra agreement", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Tra agreement", exact: true }).click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Lưu vào bộ cá nhân", exact: true })).toBeDisabled();
});
