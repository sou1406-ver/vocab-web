import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { scanAccessibility, setTheme, waitForSaved } from "./app-ready";
import { mockSpeech, readSnapshot, speechLog } from "./speech-mock";

const menu = (page: Page) => page.getByRole("group", { name: "Các loại gợi ý" });
const trigger = (page: Page) => page.getByRole("button", { name: "Gợi ý", exact: true });
const confirmation = (page: Page) => page.getByRole("dialog", { name: "Dùng gợi ý này sẽ tính là chưa thuộc" });
const hint = (page: Page, name: RegExp) => menu(page).getByRole("button", { name });

async function openMenu(page: Page) {
  await trigger(page).click();
  await expect(menu(page)).toBeVisible();
}

async function startRecall(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Bắt đầu học", exact: true }).click();
  await page.getByRole("button", { name: "Đã xem, thử nhớ lại" }).click();
  await page.getByRole("button", { name: "Chưa nhớ, xem đáp án" }).click();
  await page.getByRole("button", { name: "Từ tiếp theo" }).click();
  await page.getByRole("button", { name: "Đã xem, thử nhớ lại" }).click();
  await expect(page.getByRole("textbox", { name: "Đáp án của bạn" })).toBeVisible();
  return readSnapshot(page);
}

async function captureHintStates(page: Page, testInfo: TestInfo) {
  const viewport = page.viewportSize()!;
  const originalTheme = (await page.locator("html").getAttribute("data-theme")) as "light" | "dark";
  for (const width of [1440, 390, 360]) {
    await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
    for (const theme of ["light", "dark"] as const) {
      await setTheme(page, theme);
      await openMenu(page);
      await menu(page).scrollIntoViewIfNeeded();
      expect((await scanAccessibility(page)).violations).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (width !== 360)
        await page.screenshot({ path: testInfo.outputPath(`hint-menu-cue-${theme}-${width}.png`), fullPage: true });
      await hint(page, /^Nghe phát âm/).click();
      await expect(confirmation(page)).toBeVisible();
      expect((await scanAccessibility(page)).violations).toEqual([]);
      if (width !== 360)
        await page.screenshot({ path: testInfo.outputPath(`hint-confirm-${theme}-${width}.png`), fullPage: true });
      await confirmation(page).getByRole("button", { name: "Hủy" }).click();
      await expect(trigger(page)).toBeFocused();
    }
  }
  await page.setViewportSize(viewport);
  await setTheme(page, originalTheme);
}

test("saves the exact masked example, restores it and keeps the first semantic cue free", async ({
  page,
}, testInfo) => {
  test.setTimeout(120000);
  await mockSpeech(page);
  const initial = await startRecall(page);
  const active = initial.session!;
  const answer = active.questions[active.index].answer as string;
  await openMenu(page);
  const example = hint(page, /^Ví dụ khác/);
  await expect(example).toContainText("Miễn phí 1 lần");
  await expect(example).toBeFocused();
  await expect(menu(page)).not.toContainText("___");
  await page.keyboard.press("Escape");
  await expect(menu(page)).toHaveCount(0);
  await expect(trigger(page)).toBeFocused();
  await openMenu(page);
  await example.click();
  const cue = page.locator(".study-hint-cues dd");
  await expect(cue).toContainText("___");
  const used = (await cue.textContent())!;
  expect(used.toLowerCase()).not.toContain(answer.toLowerCase());
  expect((await readSnapshot(page)).session!.hints).toEqual([{ kind: "example", value: used }]);
  await page.reload();
  await expect(cue).toHaveText(used);
  await openMenu(page);
  await expect(hint(page, /^Định nghĩa/)).toContainText("Tính là chưa thuộc");
  await expect(hint(page, /^Ví dụ khác/)).toHaveCount(0);
  await page.locator(".study-counter").click();
  await expect(menu(page)).toHaveCount(0);
  if (testInfo.project.name === "desktop") await captureHintStates(page, testInfo);
  const input = page.getByRole("textbox", { name: "Đáp án của bạn" });
  await input.fill(answer);
  await input.press("Enter");
  await expect(cue).toHaveText(used);
  expect((await readSnapshot(page)).events.at(-1)).toMatchObject({
    correct: true,
    assisted: false,
    scoringVersion: 6,
    hintKinds: ["example"],
  });
  await page.getByRole("button", { name: "Từ tiếp theo" }).click();
  await expect(cue).toHaveCount(0);
  expect((await readSnapshot(page)).session!.hints).toEqual([]);
});

test("pronunciation stays silent until the confirmed cue has saved", async ({ page }) => {
  await mockSpeech(page);
  const initial = await startRecall(page);
  const question = initial.session!.questions[initial.session!.index];
  const before = (await speechLog(page)).length;
  await openMenu(page);
  await hint(page, /^Nghe phát âm/).click();
  await expect(confirmation(page)).toBeVisible();
  await expect(confirmation(page).getByRole("button", { name: "Hủy" })).toBeFocused();
  expect(await speechLog(page)).toHaveLength(before);
  await page.keyboard.press("Escape");
  await expect(confirmation(page)).toHaveCount(0);
  expect(await speechLog(page)).toHaveLength(before);
  expect((await readSnapshot(page)).session!.hints ?? []).toEqual([]);
  await openMenu(page);
  await hint(page, /^Nghe phát âm/).click();
  await confirmation(page).getByRole("button", { name: "Dùng gợi ý" }).click();
  await expect.poll(async () => (await speechLog(page)).length).toBe(before + 1);
  expect((await speechLog(page)).at(-1)?.text).toBe(question.answer);
  expect((await readSnapshot(page)).session!.hints).toEqual([{ kind: "pronunciation" }]);
  await page.reload();
  await expect(page.getByRole("button", { name: "Nghe lại gợi ý phát âm" })).toBeVisible();
  expect(await speechLog(page)).toEqual([]);
  const input = page.getByRole("textbox", { name: "Đáp án của bạn" });
  await input.fill(question.answer as string);
  await input.press("Enter");
  await expect(page.getByText("Gặp lại thêm một lần nhé.")).toBeVisible();
  expect((await readSnapshot(page)).events.at(-1)).toMatchObject({
    correct: false,
    assisted: true,
    hintKinds: ["pronunciation"],
  });
});

test("elimination confirms first, keeps two wrong choices disabled across reload and blocks their shortcuts", async ({
  page,
}) => {
  await mockSpeech(page);
  await page.goto("/books/toeic-600/lessons/1");
  await page.getByRole("button", { name: "Nghe chọn từ", exact: true }).click();
  const initial = await readSnapshot(page);
  const question = initial.session!.questions[0];
  if (question.kind !== "listen-choice") throw new Error("Expected a listening choice");
  const options = page.locator(".answer-option");
  await openMenu(page);
  await page.keyboard.press("1");
  await expect(menu(page)).toBeVisible();
  expect((await readSnapshot(page)).events).toEqual([]);
  const eliminate = hint(page, /^Loại hai đáp án sai/);
  await expect(eliminate).toContainText("Tính là chưa thuộc");
  await eliminate.click();
  await expect(confirmation(page)).toBeVisible();
  await page.keyboard.press("B");
  await expect(confirmation(page)).toBeVisible();
  await confirmation(page).getByRole("button", { name: "Hủy" }).click();
  expect((await readSnapshot(page)).session!.hints ?? []).toEqual([]);
  await openMenu(page);
  await eliminate.click();
  await confirmation(page).getByRole("button", { name: "Dùng gợi ý" }).click();
  await expect(page.locator(".eliminated-option")).toHaveCount(2);
  const saved = await readSnapshot(page);
  expect(saved.session!.questions[0]).toEqual(question);
  expect(saved.session!.hints).toHaveLength(1);
  const removed = saved.session!.hints![0];
  if (removed.kind !== "eliminate") throw new Error("Expected an elimination hint");
  expect(new Set(removed.value).size).toBe(2);
  expect(removed.value).not.toContain(question.answer);
  await waitForSaved(page);
  await page.reload();
  await expect(page.locator(".eliminated-option")).toHaveCount(2);
  for (const removedOption of removed.value) {
    const index = question.options.indexOf(removedOption);
    await expect(options.nth(index)).toBeDisabled();
    await page.keyboard.press(String(index + 1));
    await page.keyboard.press(String.fromCharCode(65 + index));
  }
  const correctIndex = question.options.indexOf(question.answer);
  await expect(options.nth(correctIndex)).toBeEnabled();
  expect((await readSnapshot(page)).events).toEqual([]);
  await options.nth(correctIndex).click();
  await expect(page.getByText("Gặp lại thêm một lần nhé.")).toBeVisible();
  const answered = await readSnapshot(page);
  expect(answered.events.at(-1)).toMatchObject({
    correct: false,
    assisted: true,
    scoringVersion: 6,
    hintKinds: ["eliminate"],
  });
  expect(answered.progress).toEqual(initial.progress);
});
