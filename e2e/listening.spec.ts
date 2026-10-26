import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mockSpeech, readSnapshot, speechLog } from "./speech-mock";
import type { ListeningQuestion } from "../src/domain/types";
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const choice = (page: Page, text: string) =>
  page.getByRole("button", { name: new RegExp(`^[A-D]\\s*${escape(text)}$`) });
async function start(page: Page, title: string) {
  await page.goto("/books/toeic-600/lessons/1");
  await page.getByRole("button", { name: title, exact: true }).click();
  await expect.poll(async () => (await speechLog(page)).length).toBeGreaterThan(0);
  return readSnapshot(page);
}
test("choice autoplay and replay do not reveal the prompt or mark assistance; retry keeps listening", async ({
  page,
}, testInfo) => {
  await mockSpeech(page);
  const first = await start(page, "Nghe chọn từ");
  const q = first.session!.questions[0] as ListeningQuestion;
  expect((await speechLog(page))[0]).toMatchObject({ text: q.answer, rate: 0.8 });
  await expect(page.locator(".question-prompt p")).toHaveText("Nghe và chọn từ.");
  expect(await page.locator(".question-prompt").textContent()).not.toContain(q.answer);
  await expect(page.locator(".word-content")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Xem lại từ", exact: false })).toHaveCount(0);
  await expect(page.locator(".answer-option")).toHaveCount(4);
  await expect(page.locator(".answer-option").first()).toBeFocused();
  await page.getByRole("button", { name: "Nghe lại", exact: true }).click();
  expect((await speechLog(page)).at(-1)?.rate).toBe(0.6);
  const replayed = await readSnapshot(page);
  expect(replayed.events).toHaveLength(0);
  expect(replayed.session!.peeked ?? false).toBe(false);
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()).violations).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("listen-choice.png"), fullPage: true });
  await choice(page, q.answer).click();
  await expect(page.locator(".answer-feedback")).toBeVisible();
  expect((await readSnapshot(page)).events[0]).toMatchObject({
    correct: true,
    assisted: false,
    hintCount: 0,
    hintLimit: 0,
    questionKind: "listen-choice",
    scoringVersion: 2,
  });
  await page.getByRole("button", { name: "Từ tiếp theo", exact: true }).click();
  const second = (await readSnapshot(page)).session!.questions[1] as ListeningQuestion;
  if (second.kind !== "listen-choice") throw new Error("choice");
  await expect.poll(async () => (await speechLog(page)).at(-1)?.text).toBe(second.answer);
  await choice(page, second.options.find((value) => value !== second.answer)!).click();
  await expect(page.locator(".answer-feedback")).toBeVisible();
  await page.getByRole("button", { name: "Kết thúc tại đây", exact: true }).click();
  await page.getByRole("button", { name: "Luyện lại từ vừa sai", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Nghe và chọn từ", exact: true })).toBeVisible();
  await choice(page, second.answer).click();
  expect((await readSnapshot(page)).events.at(-1)).toMatchObject({
    correct: true,
    assisted: false,
    questionKind: "listen-choice",
  });
});
test("typed listening keeps hints across reload and replay, and only excess hints are assisted", async ({
  page,
}, testInfo) => {
  await mockSpeech(page);
  const first = await start(page, "Nghe gõ từ");
  const q = first.session!.questions[0] as ListeningQuestion;
  const limit = Math.floor(Array.from(q.answer).filter((char) => /\p{L}/u.test(char)).length * 0.3);
  await expect(page.locator(".question-prompt p")).toHaveText("Nghe và gõ từ.");
  await expect(page.getByRole("textbox", { name: "Đáp án của bạn" })).toHaveValue("");
  await expect(page.getByRole("textbox", { name: "Đáp án của bạn" })).toBeFocused();
  const partial = q.answer.slice(0, 2);
  await page.getByRole("textbox", { name: "Đáp án của bạn" }).fill(partial);
  await page.evaluate(() => (window as unknown as { __speech: { clear: () => void } }).__speech.clear());
  await expect(page.getByRole("textbox", { name: "Đáp án của bạn" })).toBeDisabled();
  await page.evaluate(() => (window as unknown as { __speech: { load: () => void } }).__speech.load());
  await expect(page.getByRole("textbox", { name: "Đáp án của bạn" })).toBeFocused();
  await expect(page.getByRole("textbox", { name: "Đáp án của bạn" })).toHaveValue(partial);
  await page.getByRole("textbox", { name: "Đáp án của bạn" }).fill("");
  for (let n = 0; n < limit; n++) {
    await page.getByRole("button", { name: "Gợi ý một chữ", exact: true }).click();
    await expect(page.locator(".letter-slot.is-revealed")).toHaveCount(n + 1);
  }
  await page.getByRole("button", { name: "Nghe lại", exact: true }).click();
  await page.reload();
  await expect(page.locator(".letter-slot.is-revealed")).toHaveCount(limit);
  await expect(page.getByRole("button", { name: "Nghe lại", exact: true })).toBeVisible();
  await page.getByRole("textbox", { name: "Đáp án của bạn" }).fill(q.answer);
  await page.getByRole("button", { name: "Kiểm tra", exact: true }).click();
  await expect(page.locator(".answer-feedback")).toBeVisible();
  expect((await readSnapshot(page)).events[0]).toMatchObject({
    correct: true,
    assisted: false,
    hintCount: limit,
    hintLimit: limit,
  });
  await page.getByRole("button", { name: "Từ tiếp theo", exact: true }).click();
  const next = (await readSnapshot(page)).session!.questions[1];
  const secondLimit = Math.floor(Array.from(next.answer as string).filter((char) => /\p{L}/u.test(char)).length * 0.3);
  for (let n = 0; n <= secondLimit; n++) {
    await page.getByRole("button", { name: "Gợi ý một chữ", exact: true }).click();
    await expect(page.locator(".letter-slot.is-revealed")).toHaveCount(n + 1);
  }
  await page.getByRole("textbox", { name: "Đáp án của bạn" }).fill(next.answer as string);
  await page.getByRole("button", { name: "Kiểm tra", exact: true }).click();
  await expect(page.locator(".answer-feedback")).toBeVisible();
  expect((await readSnapshot(page)).events.at(-1)).toMatchObject({
    correct: false,
    assisted: true,
    hintCount: secondLimit + 1,
    hintLimit: secondLimit,
  });
  expect((await readSnapshot(page)).progress).toEqual({});
  await page.screenshot({ path: testInfo.outputPath("listen-type.png"), fullPage: true });
});
test("late English voices reveal buttons and disappearing voices disable the active question", async ({ page }) => {
  await mockSpeech(page, "delayed");
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/books/toeic-600/lessons/1");
  await expect(page.getByRole("button", { name: "Nghe chọn từ", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Nghe gõ từ", exact: true })).toHaveCount(0);
  await page.evaluate(() => (window as unknown as { __speech: { load: () => void } }).__speech.load());
  await page.getByRole("button", { name: "Nghe chọn từ", exact: true }).click();
  await expect(page.getByRole("button", { name: "Nghe lại", exact: true })).toBeVisible();
  await page.evaluate(() => (window as unknown as { __speech: { clear: () => void } }).__speech.clear());
  await expect(page.getByRole("button", { name: "Nghe lại", exact: true })).toHaveCount(0);
  for (const button of await page.locator(".answer-option").all()) await expect(button).toBeDisabled();
  await expect(page.getByRole("link", { name: "Cài đặt phát âm", exact: true })).toBeVisible();
  await page.evaluate(() => (window as unknown as { __speech: { load: () => void } }).__speech.load());
  await expect(page.locator(".answer-option").first()).toBeFocused();
  expect(errors).toEqual([]);
});
