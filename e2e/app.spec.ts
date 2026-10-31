import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import type { Catalog, Snapshot } from "../src/domain/types";

const catalog = JSON.parse(
  readFileSync(new URL("../src/content/books/toeic-600/catalog.json", import.meta.url), "utf8"),
) as Catalog;

test("learn, reload, finish, and retry without duplicated credit", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Hôm nay, học một chút." })).toBeVisible();
  await page.getByRole("button", { name: "Bắt đầu học", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Làm quen với từ này" })).toBeVisible();
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await page.getByRole("button", { name: "Đã xem, thử nhớ lại" }).click();
  await page.getByRole("button", { name: "Chưa nhớ, xem đáp án" }).click();
  await expect(page.getByText("Gặp lại thêm một lần nhé.")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Gặp lại thêm một lần nhé.")).toBeVisible();
  await page.getByRole("button", { name: "Từ tiếp theo" }).click();
  await expect(page.getByRole("heading", { name: "agreement", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Đã xem, thử nhớ lại" }).click();
  await page.getByRole("textbox", { name: "Đáp án của bạn" }).fill("  AGREEMENT  ");
  await page.getByRole("button", { name: "Kiểm tra", exact: true }).click();
  await expect(page.getByText("Chính xác. Bạn nhớ rồi!")).toBeVisible();
  await page.getByRole("button", { name: "Kết thúc tại đây" }).click();
  await expect(page.getByRole("heading", { name: "Một lượt học, thêm vững vàng." })).toBeVisible();
  await expect(page.locator(".result-score b")).toHaveText("1/2");
  await page.getByRole("button", { name: "Luyện lại từ vừa sai", exact: true }).click();
  await page.getByRole("button", { name: "Chưa nhớ, xem đáp án" }).click();
  await page.getByRole("button", { name: "Xem kết quả" }).click();
  await expect(page.getByText("Luyện thêm không tăng bậc ôn")).toBeVisible();
  await page.getByRole("link", { name: "Hoàn tất", exact: true }).click();
  await expect(page.locator(".stat-number").first()).toHaveText("2/ 10 từ");
});

test("search, keyboard dialog, theme and no horizontal overflow", async ({ page }) => {
  await page.goto("/library?q=thoa%20thuan");
  const word = page.getByRole("button").filter({ has: page.getByRole("heading", { name: "agreement", exact: true }) });
  await expect(word).toBeVisible();
  await word.click();
  await expect(page.getByRole("dialog", { name: "Chi tiết từ" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Mở hồ sơ" }).click();
  await page.getByLabel("Giao diện", { exact: true }).selectOption("dark");
  await page.getByRole("button", { name: "Lưu tuỳ chọn" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: innerWidth }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width);
});

test("preview legacy import, apply once, preserve unknown IDs", async ({ page }) => {
  await page.goto("/settings");
  await page.getByLabel("Chọn bản sao lưu JSON").setInputFiles({
    name: "old.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        app: "VocabLearn-600",
        status: { "abide-by-1": "mastered", "old-unknown": "learning" },
        stats: {},
        book: { legacy: { right: 3 } },
      }),
    ),
  });
  await expect(page.getByRole("heading", { name: "Hồ sơ cũ" })).toBeVisible();
  await expect(page.locator(".import-counts")).toContainText("1 mục cần xem lại");
  await page.getByRole("button", { name: "Nhập dữ liệu này" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Đã nhập dữ liệu" })).toBeVisible();
  await page.goto("/library?filter=started");
  await expect(page.getByRole("heading", { name: "abide by", exact: true })).toBeVisible();
});

test("home, learning, and settings meet automated accessibility checks", async ({ page }) => {
  for (const path of ["/", "/books/toeic-600/lessons/1", "/settings"]) {
    await page.goto(path);
    await expect(page.locator("main h1")).toBeVisible();
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }))).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test("old lesson links redirect to the TOEIC book", async ({ page }) => {
  await page.goto("/lessons/3");
  await expect(page).toHaveURL(/\/books\/toeic-600\/lessons\/3$/);
  await expect(page.getByRole("heading", { name: catalog.lessons[2].title, exact: true })).toBeVisible();
});

test("two tabs keep one answer and the same resume point", async ({ page, context }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Bắt đầu học", exact: true }).click();
  await page.getByRole("button", { name: "Đã xem, thử nhớ lại" }).click();
  const other = await context.newPage();
  await other.goto("/study");
  await expect(other.getByRole("heading", { name: "Chọn nghĩa phù hợp" })).toBeVisible();
  await page.getByRole("button", { name: "Chưa nhớ, xem đáp án" }).click();
  await expect(other.getByText("Gặp lại thêm một lần nhé.")).toBeVisible();
  await other.getByRole("button", { name: "Từ tiếp theo" }).click();
  await expect(page.getByRole("heading", { name: "agreement", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Kết thúc tại đây" }).click();
  await expect(other.locator(".result-score b")).toHaveText("0/1");
});

test("overdue backlog stays visible after ending a short review batch", async ({ page }) => {
  // Keep this browser fixture independent of the app's runtime module graph.
  const data: Snapshot = {
    schemaVersion: 2,
    revision: 0,
    settings: { name: "", dailyNew: 10, timezone: "Asia/Ho_Chi_Minh", theme: "light" },
    progress: {},
    events: [],
    session: null,
    history: [],
    customWords: [],
    imports: [],
    legacyArchives: [],
  };
  const at = Date.now() - 172_800_000;
  for (const word of catalog.words.slice(0, 43))
    data.progress[word.id] = {
      startedAt: at,
      startedDay: "2026-10-01",
      box: 1,
      dueAt: at,
      correct: 0,
      incorrect: 0,
      tested: true,
      policyVersion: 1,
    };
  await page.goto("/settings");
  await page.getByLabel("Chọn bản sao lưu JSON").setInputFiles({
    name: "due.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ app: "VocabLearn-v2", data })),
  });
  await page.getByRole("button", { name: "Khôi phục bản sao này" }).click();
  await expect(page.getByText("Đã nhập dữ liệu.", { exact: false })).toBeVisible();
  await page.goto("/");
  await expect(page.getByText("43 từ đang đợi bạn.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Bắt đầu ôn", exact: true }).click();
  await expect(page.locator(".study-counter")).toHaveText("1 / 20");
  await page.getByRole("button", { name: "Chưa nhớ, xem đáp án" }).click();
  await page.getByRole("button", { name: "Kết thúc tại đây" }).click();
  await page.getByRole("link", { name: "Hoàn tất", exact: true }).click();
  await expect(page.getByText("42 từ đang đợi bạn.", { exact: false })).toBeVisible();
});

test("dark mode and compact sidebar remain accessible", async ({ page }) => {
  await page.goto("/settings");
  await page.getByLabel("Giao diện", { exact: true }).selectOption("dark");
  await page.getByRole("button", { name: "Lưu tuỳ chọn" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  for (const path of ["/", "/library", "/progress", "/settings"]) {
    await page.goto(path);
    await expect(page.locator("main h1")).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(results.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }))).toEqual([]);
  }
  await page.setViewportSize({ width: 768, height: 1024 });
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(results.violations).toEqual([]);
});
