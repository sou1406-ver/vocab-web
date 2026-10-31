import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import type { Catalog, Snapshot } from "../src/domain/types";

const catalog = JSON.parse(
  readFileSync(new URL("../src/content/books/toeic-600/catalog.json", import.meta.url), "utf8"),
) as Catalog;

test("cultivation frames advance by learned words while keeping the selected DiceBear face", async ({
  page,
}, testInfo) => {
  await page.goto("/settings");
  await page.getByRole("button", { name: "Chọn avatar 5", exact: true }).click();
  await page.getByRole("button", { name: "Lưu tuỳ chọn", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Đã lưu tuỳ chọn" })).toBeVisible();
  await page.goto("/progress");
  const card = page.getByRole("region", { name: "Phàm Nhân", exact: true });
  await expect(card).toBeVisible();
  const portrait = page.locator(".cultivation-card .cultivation-avatar");
  const original = await portrait.locator("img").getAttribute("src");
  expect(original).toBe("/avatars/notionists/05.svg");
  await expect(portrait).toHaveClass(/cultivation-avatar--0\b/);
  await page.evaluate(
    async (ids) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const open = indexedDB.open("vocab-learn-v2", 1);
        open.onsuccess = () => resolve(open.result);
        open.onerror = () => reject(open.error);
      });
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction("snapshots", "readwrite");
        const store = tx.objectStore("snapshots");
        const read = store.get("guest");
        read.onsuccess = () => {
          const data = read.result as Snapshot;
          const progress = {
            startedAt: Date.now(),
            startedDay: "2026-10-31",
            box: 1,
            dueAt: Date.now() + 86400000,
            correct: 1,
            incorrect: 0,
            tested: true,
            policyVersion: 1 as const,
          };
          for (const id of ids) data.progress[id] = progress;
          data.progress["removed-word"] = progress;
          data.revision++;
          store.put(data, "guest");
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    },
    catalog.words.slice(0, 10).map((word) => word.id),
  );
  await page.reload();
  await expect(page.getByRole("heading", { name: "Luyện Khí", exact: true })).toBeVisible();
  await expect(portrait).toHaveClass(/cultivation-avatar--1\b/);
  await expect(portrait.locator("img")).toHaveAttribute("src", original!);
  await expect(page.locator(".cultivation-card")).toContainText("10 từ đã học");
  await page.goto("/leaderboard");
  await expect(page.getByRole("heading", { name: "Bảng tu luyện.", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Đăng nhập bằng Google", exact: true })).toBeVisible();
  await expect(page.locator(".cultivator-row")).toHaveCount(0);
  await page.getByText("12 cảnh giới tu luyện", { exact: true }).click();
  await expect(page.locator(".cultivation-realms li")).toHaveCount(12);
  await expect(page.locator(".cultivation-realms")).toContainText("Tiên Đế");
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("cultivation.png"), fullPage: true });
  await page.getByRole("button", { name: "Đổi giao diện sáng tối", exact: true }).click();
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()).violations).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("cultivation-dark.png"), fullPage: true });
});
