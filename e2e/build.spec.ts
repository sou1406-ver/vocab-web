import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import type { BuildQuestion, Catalog, Snapshot } from "../src/domain/types";

const catalog = JSON.parse(
  readFileSync(new URL("../src/content/books/toeic-600/catalog.json", import.meta.url), "utf8"),
) as Catalog;
const lesson = catalog.lessons.find((entry) =>
  catalog.words.some((word) => word.lesson === entry.id && word.family.some((form) => (form.parts?.length ?? 0) >= 2)),
)!;
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
test("Build toggles pieces, grades order, resumes and retries in practice", async ({ page }, testInfo) => {
  let downloads = 0;
  await page.route("**/exercises/**", async (route) => {
    downloads++;
    await route.continue();
  });
  await page.goto(`/books/toeic-600/lessons/${lesson.id}`);
  await page.getByRole("button", { name: "Ghép từ", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Ghép gốc và phụ tố" })).toBeVisible();
  const before = await readSnapshot(page);
  const q = before.session!.questions[0] as BuildQuestion;
  const form = catalog.words.find((word) => word.id === q.wordId)!.family.find((item) => item.text === q.form)!;
  expect(before.session).toMatchObject({ mode: "practice", contentVersion: catalog.version });
  expect(q.answer).toEqual(form.parts);
  expect(q.prompt).toBe(`${form.meaning} (${form.pos})`);
  expect(q.sourceId).toBe(`build:${q.wordId}:${q.form!.trim().toLowerCase()}`);
  expect(downloads).toBe(0);
  await expect(page.getByRole("textbox")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Gợi ý một chữ" })).toHaveCount(0);
  const bank = page.getByRole("group", { name: "Các mảnh để ghép", exact: true });
  const selected = page.getByRole("group", { name: "Các mảnh đã ghép", exact: true });
  await expect(bank.getByRole("button")).toHaveText(q.tiles);
  await page.reload();
  await expect(bank.getByRole("button")).toHaveText(q.tiles);
  const piece = (part: string) => bank.getByRole("button", { name: part, exact: true });
  await piece(q.answer[0]).focus();
  await piece(q.answer[0]).press("Enter");
  await expect(piece(q.answer[0])).toHaveAttribute("aria-pressed", "true");
  await piece(q.answer[0]).press("Enter");
  await expect(selected.getByRole("button")).toHaveCount(0);
  await piece(q.answer[0]).click();
  await piece(q.answer[1]).click();
  await selected.getByRole("button").first().press("Enter");
  await expect(selected.getByRole("button")).toHaveText([q.answer[1]]);
  await expect(piece(q.answer[0])).toBeFocused();
  await piece(q.answer[1]).click();
  await expect(selected.getByRole("button")).toHaveCount(0);
  await piece(q.answer[0]).click();
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `test-results/build-${testInfo.project.name}.png` });
  await piece(q.answer[0]).click();
  const wrongOrder = [...q.answer].reverse();
  for (const part of wrongOrder) await piece(part).click();
  await page.getByRole("button", { name: "Kiểm tra", exact: true }).click();
  await expect(page.getByText("Chưa đúng, cùng xem lại nhé.")).toBeVisible();
  await expect(page.locator(".answer-feedback strong")).toHaveText(q.form!);
  const wrong = await readSnapshot(page);
  expect(wrong.events.at(-1)).toMatchObject({
    id: `${before.session!.id}:0`,
    questionKind: "build",
    scoringVersion: 3,
    correct: false,
    assisted: false,
    hintCount: 0,
    hintLimit: 0,
    sourceQuestionId: q.sourceId,
    contentVersion: catalog.version,
  });
  expect(wrong.progress).toEqual({});
  await page.reload();
  await expect(selected.getByRole("button")).toHaveText(wrongOrder);
  for (const button of await bank.getByRole("button").all()) await expect(button).toBeDisabled();
  await page.getByRole("button", { name: "Từ tiếp theo" }).press("Enter");
  await expect(bank.getByRole("button").first()).toBeFocused();
  await expect(selected.getByRole("button")).toHaveCount(0);
  await page.getByRole("button", { name: "Kết thúc tại đây" }).click();
  await page.getByRole("button", { name: "Luyện lại từ vừa sai" }).click();
  await expect(page.getByRole("heading", { name: "Ghép gốc và phụ tố" })).toBeVisible();
  const retry = await readSnapshot(page);
  const retried = retry.session!.questions[0] as BuildQuestion;
  expect(retry.session!.id).not.toBe(before.session!.id);
  expect(retried).toMatchObject({ sourceId: q.sourceId, answer: q.answer, form: q.form });
  expect([...retried.tiles].sort()).toEqual([...q.tiles].sort());
  await page.reload();
  await expect(bank.getByRole("button")).toHaveText(retried.tiles);
  for (const part of q.answer) await piece(part).click();
  await page.getByRole("button", { name: "Kiểm tra", exact: true }).click();
  await expect(page.getByText("Chính xác. Bạn nhớ rồi!")).toBeVisible();
  await expect(page.locator(".answer-feedback strong")).toHaveText(q.form!);
  const correct = await readSnapshot(page);
  expect(correct.events.at(-1)).toMatchObject({ correct: true, scoringVersion: 3, mode: "practice", hintCount: 0 });
  expect(correct.progress).toEqual({});
});
