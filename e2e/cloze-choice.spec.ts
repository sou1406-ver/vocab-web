import { scanAccessibility, waitForResult, waitForSaved } from "./app-ready";
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import type { Catalog, ClozeChoiceQuestion, StudySession } from "../src/domain/types";
const manifest = JSON.parse(
  readFileSync(new URL("../src/content/books/toeic-600/exercise-manifest.json", import.meta.url), "utf8"),
) as { lessons: { lessonId: number; version: string; url: string; kinds: Record<string, number> }[] };
const catalog = JSON.parse(
  readFileSync(new URL("../src/content/books/toeic-600/catalog.json", import.meta.url), "utf8"),
) as Catalog;
const optionText = (answer: string) => new RegExp(`${answer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`);

test("authored word form loads per lesson, retries failures and resumes without downloading again", async ({
  page,
  context,
}, testInfo) => {
  let requests = 0;
  await page.route("**/exercises/*/cloze/**", async (route) => {
    requests++;
    if (requests === 1) await route.fulfill({ status: 503, body: "unavailable" });
    else await route.continue();
  });
  await page.goto("/books/toeic-600/lessons/1");
  expect(requests).toBe(0);
  const start = page.getByRole("button", { name: "Luyện dạng từ", exact: true });
  await start.click();
  await expect(page.getByRole("alert").filter({ hasText: "Không tải được bài tập" })).toBeVisible();
  await start.click();
  await expect(page.getByRole("heading", { name: "Chọn dạng từ phù hợp" })).toBeVisible();
  await expect(page.locator(".answer-option")).toHaveCount(4);
  expect(requests).toBe(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await scanAccessibility(page)).violations).toEqual([]);
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
  await waitForSaved(page);
  await page.reload();
  await expect(page.getByText("Chính xác. Bạn nhớ rồi!")).toBeVisible();
  expect(requests).toBe(2);
  const other = await context.newPage();
  await waitForSaved(page);
  await other.goto("/study");
  await expect(other.getByText("Chính xác. Bạn nhớ rồi!")).toBeVisible();
  await page.getByRole("button", { name: "Từ tiếp theo" }).click();
  await expect(other.locator(".answer-option")).toHaveCount(4);
  await page.getByRole("button", { name: "Chưa nhớ, xem đáp án" }).click();
  await page.getByRole("button", { name: "Kết thúc tại đây" }).click();
  await waitForResult(page);
  await page.getByRole("button", { name: "Luyện lại từ vừa sai" }).click();
  await expect(page.locator(".answer-option")).toHaveCount(4);
  await page.getByRole("button", { name: "Kết thúc tại đây" }).click();
  await waitForResult(page);
  await page.goto("/progress");
  await expect(page.locator(".progress-stats .stat-number").first()).toContainText("0");
});

test("non-family Part 5 stays cloze-choice with the matching event label", async ({ page }) => {
  const entry = manifest.lessons.find((item) => item.kinds["cloze-choice"] > 0)!;
  const pack = JSON.parse(readFileSync(new URL(`../public${entry.url}`, import.meta.url), "utf8"));
  const question = pack.questions.find((q: { kind: string }) => q.kind === "cloze-choice");
  await page.goto(`/books/toeic-600/lessons/${entry.lessonId}`);
  await page.getByRole("button", { name: "Luyện điền chỗ trống", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Điền từ còn thiếu" })).toBeVisible();
  await expect(page.locator(".question-prompt p")).toHaveText(question.prompt);
  const options = page.locator(".answer-option");
  await options.filter({ hasText: optionText(question.answer) }).click();
  await expect(page.getByText("Chính xác. Bạn nhớ rồi!")).toBeVisible();
});

test("catalog cloze answers vary in position and keep their saved order after reload", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(crypto, "randomUUID", { value: () => "00000000-0000-4000-8000-000000000001" });
  });
  let sourceQuestions: ClozeChoiceQuestion[] = [];
  await page.route("**/exercises/*/cloze/**", async (route) => {
    const response = await route.fetch();
    const pack = await response.json();
    sourceQuestions = pack.questions;
    await route.fulfill({ response });
  });
  await page.goto("/books/toeic-600/lessons/1");
  await page.getByRole("button", { name: "Luyện điền chỗ trống", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Điền từ còn thiếu" })).toBeVisible();
  const session = await page.evaluate(
    () =>
      new Promise<StudySession>((resolve, reject) => {
        const open = indexedDB.open("vocab-learn-v2", 1);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction("snapshots", "readonly");
          const read = tx.objectStore("snapshots").get("guest");
          read.onerror = () => reject(read.error);
          read.onsuccess = () => resolve(read.result.session);
          tx.oncomplete = () => db.close();
        };
      }),
  );
  const questions = session.questions as ClozeChoiceQuestion[];
  const examples = questions.filter((q) => q.sourceId.startsWith("catalog:example:"));
  expect(examples.length).toBeGreaterThan(1);
  expect(examples.some((q) => q.options.indexOf(q.answer) > 0)).toBe(true);
  for (const q of questions) {
    const original = sourceQuestions.find((item) => item.sourceId === q.sourceId)!;
    if (q.sourceId.startsWith("catalog:example:")) {
      expect(original.options).toEqual([]);
      const target = catalog.words.find((word) => word.id === q.wordId)!;
      const allowed = new Set(
        catalog.words
          .filter((word) => word.lesson === target.lesson)
          .flatMap((word) => [word.text, ...word.family.map((form) => form.text)])
          .map((text) => text.trim().toLowerCase()),
      );
      expect(q.options).toHaveLength(4);
      for (const option of q.options) expect(allowed.has(option.trim().toLowerCase())).toBe(true);
    } else {
      expect(q.options).toHaveLength(4);
      expect([...q.options].sort()).toEqual([...original.options].sort());
    }
  }
  const options = page.locator(".answer-option");
  await expect(options).toHaveText(questions[0].options.map(optionText));
  await waitForSaved(page);
  await page.reload();
  await expect(options).toHaveText(questions[0].options.map(optionText));
  await options.filter({ hasText: optionText(questions[0].answer) }).click();
  await expect(page.getByText("Chính xác. Bạn nhớ rồi!")).toBeVisible();
});
