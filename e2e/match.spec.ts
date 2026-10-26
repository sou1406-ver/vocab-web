import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import type { Catalog, MatchQuestion, Snapshot } from "../src/domain/types";

const catalog = JSON.parse(
  readFileSync(new URL("../src/content/books/toeic-600/catalog.json", import.meta.url), "utf8"),
) as Catalog;
const topic = catalog.topics[0];
const root = catalog.words.find(
  (word) => catalog.lessons.find((lesson) => lesson.id === word.lesson)?.topicId === topic.id,
)!;
const name = (text: string) => text.trim().replace(/\s+/g, " ");
const left = (page: Page, q: MatchQuestion) => page.getByRole("button", { name: `Từ: ${name(q.prompt)}`, exact: true });
const right = (page: Page, q: MatchQuestion) =>
  page.getByRole("button", { name: `Nghĩa: ${name(q.answer)}`, exact: true });
function snapshot(page: Page) {
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
async function start(page: Page) {
  await page.goto("/lessons");
  await page.getByRole("button", { name: `Nối từ: ${topic.title}`, exact: true }).click();
  await expect(page.getByRole("heading", { name: "Nối từ với nghĩa", exact: true })).toBeVisible();
  return snapshot(page);
}

test("each pair saves its own score across wrong attempts, reload and two tabs without changing scheduling", async ({
  page,
  context,
}, testInfo) => {
  const old: Snapshot = {
    schemaVersion: 2,
    revision: 0,
    settings: { name: "An", dailyNew: 10, timezone: "Asia/Ho_Chi_Minh", theme: "light" },
    progress: {
      [root.id]: {
        startedAt: 1,
        startedDay: "2026-10-25",
        box: 4,
        dueAt: 2,
        reviewedDay: "2026-10-25",
        correct: 7,
        incorrect: 2,
        tested: true,
        policyVersion: 1,
      },
    },
    events: [],
    session: null,
    history: [],
    customWords: [],
    imports: [],
    legacyArchives: [],
  };
  await page.goto("/settings");
  await page.getByLabel("Chọn bản sao lưu JSON").setInputFiles({
    name: "old.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ app: "VocabLearn-v2", data: old })),
  });
  await page.getByRole("button", { name: "Khôi phục bản sao này" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Đã nhập dữ liệu" })).toBeVisible();
  const first = await start(page);
  const questions = first.session!.questions as MatchQuestion[];
  expect(questions).toHaveLength(6);
  expect(questions.some((q) => q.wordId === root.id)).toBe(true);
  const order = await page
    .getByRole("region", { name: "Nghĩa tiếng Việt", exact: true })
    .getByRole("button")
    .allTextContents();
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()).violations).toEqual([]);
  await left(page, questions[0]).click();
  await right(page, questions[1]).click();
  await expect(page.getByText("Chưa đúng. Chọn lại từ tiếng Anh rồi thử nghĩa khác.")).toBeVisible();
  expect((await snapshot(page)).events).toHaveLength(0);
  await page.reload();
  await expect(page.getByText("1 cặp đã có lần nối sai.")).toBeVisible();
  expect(
    await page.getByRole("region", { name: "Nghĩa tiếng Việt", exact: true }).getByRole("button").allTextContents(),
  ).toEqual(order);
  await left(page, questions[4]).click();
  await right(page, questions[4]).click();
  await expect(left(page, questions[4])).toBeDisabled();
  const other = await context.newPage();
  await other.goto("/study");
  await expect(left(other, questions[4])).toBeDisabled();
  await left(other, questions[2]).click();
  await right(other, questions[2]).click();
  await expect(left(page, questions[2])).toBeDisabled();
  await other.close();
  await page.screenshot({ path: testInfo.outputPath("match-light.png"), fullPage: true });
  for (const index of [0, 5, 1, 3]) {
    await expect(page.getByRole("heading", { name: "Đã nối đủ 6 cặp" })).toHaveCount(0);
    await left(page, questions[index]).click();
    await right(page, questions[index]).click();
    await expect(left(page, questions[index])).toBeDisabled();
  }
  await expect(page.getByRole("heading", { name: "Đã nối đủ 6 cặp" })).toBeVisible();
  await expect(page.getByText("5/6 cặp đúng từ lần đầu.", { exact: true })).toBeVisible();
  const done = await snapshot(page);
  const events = done.events.filter((event) => event.sessionId === first.session!.id);
  expect(events).toHaveLength(6);
  expect(new Set(events.map((event) => event.id))).toEqual(
    new Set(questions.map((_, index) => `${first.session!.id}:${index}`)),
  );
  expect(events.find((event) => event.id === `${first.session!.id}:0`)).toMatchObject({
    correct: false,
    assisted: false,
    scoringVersion: 4,
  });
  expect(events.filter((event) => event.correct)).toHaveLength(5);
  expect(done.progress).toEqual(old.progress);
  await page.getByRole("button", { name: "Xem kết quả", exact: true }).click();
  await expect(page.locator(".result-score b")).toHaveText("5/6");
  await page.getByRole("button", { name: "Nối bảng mới", exact: true }).click();
  await expect(page.locator(".study-counter")).toHaveText("0 / 6 cặp");
  const next = await snapshot(page);
  expect(next.session!.id).not.toBe(first.session!.id);
  expect(next.session!.questions).toHaveLength(6);
  expect(next.session!.matchMistakes ?? []).toEqual([]);
  expect(next.progress).toEqual(old.progress);
});

test("topic filtering, keyboard controls and dark Match remain accessible", async ({ page }, testInfo) => {
  await page.goto("/lessons");
  const topics = page.getByRole("region", { name: "Nối từ theo chủ đề", exact: true });
  await expect(topics.getByRole("button", { name: /^Nối từ:/ })).toHaveCount(catalog.topics.length);
  await page.getByLabel("Chủ đề", { exact: true }).selectOption(topic.id);
  await expect(topics.getByRole("button", { name: /^Nối từ:/ })).toHaveCount(1);
  await page.getByRole("button", { name: "Đổi giao diện sáng tối" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await topics.getByRole("button", { name: `Nối từ: ${topic.title}`, exact: true }).click();
  await expect(page.getByRole("heading", { name: "Nối từ với nghĩa", exact: true })).toBeVisible();
  const data = await snapshot(page);
  const q = data.session!.questions[0] as MatchQuestion;
  await left(page, q).focus();
  await page.keyboard.press("Enter");
  await expect(left(page, q)).toHaveAttribute("aria-pressed", "true");
  await right(page, q).focus();
  await page.keyboard.press("Enter");
  await expect(left(page, q)).toBeDisabled();
  await expect(right(page, q)).toBeDisabled();
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByRole("textbox")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Gợi ý một chữ" })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("match-dark.png"), fullPage: true });
  await page.getByRole("button", { name: "Kết thúc tại đây", exact: true }).click();
  await expect(page.locator(".result-score b")).toHaveText("1/1");
  const done = await snapshot(page);
  expect(done.history.at(-1)).toMatchObject({ total: 1, correct: 1, finished: false });
});
