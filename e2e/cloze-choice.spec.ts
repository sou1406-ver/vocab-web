import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import type { Catalog } from "../src/domain/types";
const manifest = JSON.parse(
  readFileSync(new URL("../src/content/exercise-manifest.json", import.meta.url), "utf8"),
) as { lessons: { lessonId: number; version: string; url: string; kinds: Record<string, number> }[] };
const catalog = JSON.parse(readFileSync(new URL("../src/content/catalog.json", import.meta.url), "utf8")) as Catalog;

test("authored word form loads per lesson, retries failures and resumes without downloading again", async ({
  page,
  context,
}, testInfo) => {
  let requests = 0;
  await page.route("**/exercises/cloze/**", async (route) => {
    requests++;
    if (requests === 1) await route.fulfill({ status: 503, body: "unavailable" });
    else await route.continue();
  });
  await page.goto("/lessons/1");
  expect(requests).toBe(0);
  const start = page.getByRole("button", { name: "Luyện dạng từ", exact: true });
  await start.click();
  await expect(page.getByRole("alert").filter({ hasText: "Không tải được bài tập" })).toBeVisible();
  await start.click();
  await expect(page.getByRole("heading", { name: "Chọn dạng từ phù hợp" })).toBeVisible();
  await expect(page.locator(".answer-option")).toHaveCount(4);
  expect(requests).toBe(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()).violations).toEqual([]);
  await page.screenshot({ path: `test-results/cloze-choice-${testInfo.project.name}.png` });
  // Authored first question for lesson 1 has answer agreement.
  await page
    .locator(".answer-option")
    .filter({ hasText: /agreement$/ })
    .click();
  await expect(page.getByText("Chính xác. Bạn nhớ rồi!")).toBeVisible();
  const event = await page.evaluate(
    () =>
      new Promise<Record<string, unknown>>((resolve, reject) => {
        const open = indexedDB.open("vocab-learn-v2", 1);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction("snapshots", "readonly");
          const read = tx.objectStore("snapshots").get("guest");
          read.onsuccess = () => resolve(read.result.events.at(-1));
          tx.oncomplete = () => db.close();
        };
      }),
  );
  expect(event).toMatchObject({
    questionKind: "word-form-choice",
    contentVersion: catalog.version,
    scoringVersion: 2,
    hintCount: 0,
    hintLimit: 0,
  });
  expect(event.sourceVersion).toBe(manifest.lessons.find((item) => item.lessonId === 1)!.version);
  await page.reload();
  await expect(page.getByText("Chính xác. Bạn nhớ rồi!")).toBeVisible();
  expect(requests).toBe(2);
  const other = await context.newPage();
  await other.goto("/study");
  await expect(other.getByText("Chính xác. Bạn nhớ rồi!")).toBeVisible();
  await page.getByRole("button", { name: "Từ tiếp theo" }).click();
  await expect(other.locator(".answer-option")).toHaveCount(4);
  await page.getByRole("button", { name: "Chưa nhớ, xem đáp án" }).click();
  await page.getByRole("button", { name: "Kết thúc tại đây" }).click();
  await page.getByRole("button", { name: "Luyện lại từ vừa sai" }).click();
  await expect(page.locator(".answer-option")).toHaveCount(4);
  await page.getByRole("button", { name: "Kết thúc tại đây" }).click();
  await page.goto("/progress");
  await expect(page.locator(".progress-stats .stat-number").first()).toContainText("0");
});

test("non-family Part 5 stays cloze-choice with the matching event label", async ({ page }) => {
  const entry = manifest.lessons.find((item) => item.kinds["cloze-choice"] > 0)!;
  const pack = JSON.parse(readFileSync(new URL(`../public${entry.url}`, import.meta.url), "utf8"));
  const question = pack.questions.find((q: { kind: string }) => q.kind === "cloze-choice");
  await page.goto(`/lessons/${entry.lessonId}`);
  await page.getByRole("button", { name: "Luyện điền chỗ trống", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Điền từ còn thiếu" })).toBeVisible();
  await expect(page.locator(".question-prompt p")).toHaveText(question.prompt);
  const options = page.locator(".answer-option");
  await options.nth(question.options.indexOf(question.answer)).click();
  await expect(page.getByText("Chính xác. Bạn nhớ rồi!")).toBeVisible();
});
