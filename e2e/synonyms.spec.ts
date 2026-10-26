import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import type { Catalog, Snapshot, SynonymQuestion } from "../src/domain/types";

const catalog = JSON.parse(
  readFileSync(new URL("../src/content/books/toeic-600/catalog.json", import.meta.url), "utf8"),
) as Catalog;
const lesson = [...catalog.lessons].sort(
  (a, b) =>
    catalog.words.filter((w) => w.lesson === b.id && w.antonyms.length).length -
    catalog.words.filter((w) => w.lesson === a.id && w.antonyms.length).length,
)[0];
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const option = (page: Page, text: string) =>
  page.getByRole("button", { name: new RegExp(`^[A-D]\\s*${escape(text)}$`) });
function readSnapshot(page: Page) {
  return page.evaluate(
    () =>
      new Promise<Snapshot>((resolve, reject) => {
        const open = indexedDB.open("vocab-learn-v2", 1);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction("snapshots", "readonly");
          const read = tx.objectStore("snapshots").get("guest");
          read.onerror = () => reject(read.error);
          read.onsuccess = () => resolve(read.result);
          tx.oncomplete = () => db.close();
        };
      }),
  );
}
test("word relations label antonyms explicitly, save direction and retain the question on retry", async ({ page }) => {
  await page.addInitScript(() =>
    Object.defineProperty(crypto, "randomUUID", {
      value: () => {
        const next = Number(sessionStorage.getItem("synonym-test-session") ?? 0) + 1;
        sessionStorage.setItem("synonym-test-session", String(next));
        return `00000000-0000-4000-8000-${String(next).padStart(12, "0")}`;
      },
    }),
  );
  await page.goto(`/books/toeic-600/lessons/${lesson.id}`);
  await page.getByRole("button", { name: "Đồng nghĩa", exact: true }).click();
  await expect(page.locator(".answer-option")).toHaveCount(4);
  const first = await readSnapshot(page);
  const questions = first.session!.questions as SynonymQuestion[];
  const ant = questions.findIndex((q) => q.direction === "antonym");
  const syn = questions.findIndex((q) => q.direction === "synonym");
  expect(ant).toBeGreaterThanOrEqual(0);
  expect(syn).toBeGreaterThanOrEqual(0);
  for (let index = 0; index <= Math.max(ant, syn); index++) {
    const q = questions[index];
    await expect(page.locator(".question-prompt .small-label")).toHaveText(
      q.direction === "antonym" ? "TRÁI NGHĨA" : "ĐỒNG NGHĨA",
    );
    await expect(page.locator(".question-prompt p")).toHaveText(catalog.words.find((w) => w.id === q.wordId)!.text);
    expect(q.prompt).toBe(catalog.words.find((w) => w.id === q.wordId)!.text);
    await option(page, index === ant ? q.options.find((value) => value !== q.answer)! : q.answer).click();
    await expect(page.locator(".answer-feedback")).toBeVisible();
    if (index < Math.max(ant, syn)) await page.getByRole("button", { name: "Từ tiếp theo" }).click();
  }
  const answered = await readSnapshot(page);
  expect(answered.progress).toEqual({});
  expect(answered.events.find((event) => event.id === `${first.session!.id}:${ant}`)).toMatchObject({
    direction: "antonym",
    questionKind: "synonym-choice",
    correct: false,
    mode: "practice",
  });
  await page.getByRole("button", { name: "Kết thúc tại đây" }).click();
  await page.getByRole("button", { name: "Luyện lại từ vừa sai" }).click();
  await expect(page.getByRole("heading", { name: "Chọn từ trái nghĩa" })).toBeVisible();
  const retry = await readSnapshot(page);
  expect(retry.session!.questions[0]).toMatchObject({
    direction: "antonym",
    prompt: questions[ant].prompt,
    answer: questions[ant].answer,
  });
  await page.reload();
  await expect(page.locator(".question-prompt .small-label")).toHaveText("TRÁI NGHĨA");
  await option(page, questions[ant].answer).click();
  await expect(page.getByText("Chính xác. Bạn nhớ rồi!")).toBeVisible();
  expect((await readSnapshot(page)).events.at(-1)).toMatchObject({ direction: "antonym", correct: true });
});
test("context underlines the single original word and never replaces it with a synonym", async ({ page }, testInfo) => {
  await page.goto("/books/toeic-600/lessons/1");
  await page.getByRole("button", { name: "Gần nghĩa trong câu", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Từ nào gần nghĩa nhất với từ gạch chân?" })).toBeVisible();
  const before = await readSnapshot(page);
  const q = before.session!.questions[0] as SynonymQuestion;
  expect(q.kind).toBe("synonym-context");
  await expect(page.locator(".question-prompt p")).toHaveText(q.prompt);
  await expect(page.locator(".synonym-target")).toHaveCount(1);
  await expect(page.locator(".synonym-target")).toHaveText(new RegExp(`^${escape(q.target!)}$`, "i"));
  await expect(page.locator(".question-prompt p")).not.toContainText("___");
  await expect(page.getByRole("textbox")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Gợi ý một chữ" })).toHaveCount(0);
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `test-results/synonym-context-${testInfo.project.name}.png` });
  const labels = await page.locator(".answer-option").allTextContents();
  await page.reload();
  await expect(page.locator(".answer-option")).toHaveText(labels);
  await option(page, q.answer).click();
  await expect(page.getByText("Chính xác. Bạn nhớ rồi!")).toBeVisible();
  await expect(page.locator(".feedback-example")).toHaveText(q.prompt);
  const answered = await readSnapshot(page);
  expect(answered.events.at(-1)).toMatchObject({
    questionKind: "synonym-context",
    direction: "synonym",
    mode: "practice",
    correct: true,
    scoringVersion: 2,
    hintCount: 0,
    hintLimit: 0,
  });
  expect(answered.progress).toEqual({});
});
