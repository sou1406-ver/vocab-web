import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import type { ClozeChoiceQuestion, Snapshot, WordFormQuestion } from "../src/domain/types";

const manifest = JSON.parse(
  readFileSync(new URL("../src/content/books/toeic-600/exercise-manifest.json", import.meta.url), "utf8"),
) as {
  lessons: { lessonId: number; url: string }[];
};
const authoredSources = manifest.lessons.flatMap((entry) => {
  const pack = JSON.parse(readFileSync(new URL(`../public${entry.url}`, import.meta.url), "utf8")) as {
    questions: ClozeChoiceQuestion[];
  };
  return pack.questions.map((question) => ({ lessonId: entry.lessonId, question }));
});

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

test("typed word form loads on demand, keeps cues and hints across tabs, and retries missed questions", async ({
  page,
  context,
}, testInfo) => {
  let requests = 0;
  let sources: ClozeChoiceQuestion[] = [];
  await page.route("**/exercises/*/cloze/**", async (route) => {
    requests++;
    if (requests === 1) return route.fulfill({ status: 503, body: "unavailable" });
    const response = await route.fetch();
    sources = (await response.json()).questions;
    await route.fulfill({ response });
  });
  await page.goto("/books/toeic-600/lessons/1");
  expect(requests).toBe(0);
  const begin = page.getByRole("button", { name: "Luyện dạng từ — gõ", exact: true });
  await begin.click();
  await expect(page.getByRole("alert").filter({ hasText: "Không tải được bài tập" })).toBeVisible();
  await begin.click();
  await expect(page.getByRole("heading", { name: "Gõ dạng từ phù hợp" })).toBeVisible();
  const state = await readSnapshot(page);
  const question = state.session!.questions[0] as WordFormQuestion;
  const original = sources.find((q) => q.sourceId === question.sourceId)!;
  const cue = original.options.filter((option) => option !== original.answer).sort((a, b) => a.length - b.length)[0];
  expect(state.session!.mode).toBe("practice");
  expect(state.session!.questions.every((q) => q.kind === "word-form")).toBe(true);
  expect(question.answer).toBe(original.answer);
  expect(question.prompt).toBe(`${original.prompt} (${cue})`);
  await expect(page.locator(".question-prompt p")).toHaveText(question.prompt);
  await expect(page.locator(".answer-option")).toHaveCount(0);
  const input = page.getByRole("textbox", { name: "Đáp án của bạn" });
  await page.getByRole("button", { name: "Gợi ý một chữ" }).click();
  await expect(input).toBeFocused();
  await page.reload();
  await expect(page.locator(".letter-slot.is-revealed")).toHaveCount(1);
  expect(requests).toBe(2);
  const other = await context.newPage();
  await other.goto("/study");
  await other.getByRole("button", { name: "Gợi ý một chữ" }).click();
  await expect(page.locator(".letter-slot.is-revealed")).toHaveCount(2);
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `test-results/word-form-${testInfo.project.name}.png` });
  await input.fill(question.answer);
  await input.press("Enter");
  await expect(page.getByText("Chính xác. Bạn nhớ rồi!")).toBeVisible();
  await expect(page.locator(".feedback-example")).toHaveText(original.prompt.replace(/_{3,}/, original.answer));
  const answered = await readSnapshot(page);
  expect(answered.events.at(-1)).toMatchObject({
    id: `${state.session!.id}:0`,
    questionKind: "word-form",
    mode: "practice",
    sourceQuestionId: original.sourceId,
    sourceVersion: original.sourceVersion,
    scoringVersion: 2,
    hintCount: 2,
    hintLimit: 2,
    correct: true,
    assisted: false,
  });
  expect(answered.progress).toEqual({});
  await page.getByRole("button", { name: "Từ tiếp theo" }).click();
  await expect(page.locator(".letter-slot.is-revealed")).toHaveCount(0);
  const next = (await readSnapshot(page)).session!.questions[1];
  await input.fill("wrong answer");
  await input.press("Enter");
  await expect(page.getByText("Chưa đúng, cùng xem lại nhé.")).toBeVisible();
  await page.getByRole("button", { name: "Kết thúc tại đây" }).click();
  await page.getByRole("button", { name: "Luyện lại từ vừa sai" }).click();
  await expect(page.getByRole("heading", { name: "Gõ dạng từ phù hợp" })).toBeVisible();
  await expect(page.locator(".question-prompt p")).toHaveText(next.prompt);
  expect((await readSnapshot(page)).session!.questions).toEqual([next]);
  expect(requests).toBe(2);
});

for (const fixture of [
  { answer: "revolutionary", cue: "revolution", hints: 0 },
  { answer: "efficiently", cue: "efficient", hints: 0 },
  { answer: "seriousness", cue: "serious", hints: 0 },
  { answer: "usual", cue: "usually", hints: 2 },
]) {
  test(`types the authored answer ${fixture.answer} with its cue and hint allowance`, async ({ page }) => {
    const authored = authoredSources.find(
      ({ question }) => question.kind === "word-form-choice" && question.answer === fixture.answer,
    )!;
    await page.route("**/exercises/*/cloze/**", async (route) => {
      const response = await route.fetch();
      const pack = await response.json();
      const first = pack.questions.find((q: ClozeChoiceQuestion) => q.sourceId === authored.question.sourceId);
      pack.questions = [first, ...pack.questions.filter((q: ClozeChoiceQuestion) => q.sourceId !== first.sourceId)];
      await route.fulfill({ json: pack });
    });
    await page.goto(`/books/toeic-600/lessons/${authored.lessonId}`);
    await page.getByRole("button", { name: "Luyện dạng từ — gõ", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Gõ dạng từ phù hợp" })).toBeVisible();
    await expect(page.locator(".question-prompt p")).toHaveText(`${authored.question.prompt} (${fixture.cue})`);
    for (let index = 0; index < fixture.hints; index++)
      await page.getByRole("button", { name: "Gợi ý một chữ" }).click();
    const input = page.getByRole("textbox", { name: "Đáp án của bạn" });
    await input.fill(fixture.answer);
    await input.press("Enter");
    await expect(page.getByText(fixture.hints ? "Gặp lại thêm một lần nhé." : "Chính xác. Bạn nhớ rồi!")).toBeVisible();
    await expect(page.locator(".feedback-example")).toHaveText(
      authored.question.prompt.replace(/_{3,}/, fixture.answer),
    );
    const state = await readSnapshot(page);
    expect(state.events.at(-1)).toMatchObject({
      questionKind: "word-form",
      correct: fixture.hints === 0,
      assisted: fixture.hints > 0,
      hintCount: fixture.hints,
      hintLimit: Math.floor(fixture.answer.replace(/ /g, "").length * 0.3),
    });
    expect(state.session!.feedback!.input).toBe(fixture.answer);
    expect(state.progress).toEqual({});
  });
}
