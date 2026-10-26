import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mockSpeech, readSnapshot, speechLog } from "./speech-mock";

test("delayed voices, device preferences, repeat slowdown and word/feedback speakers", async ({ page }, testInfo) => {
  await mockSpeech(page, "delayed");
  await page.goto("/settings");
  await expect(page.getByText("Máy này chưa có giọng tiếng Anh khả dụng.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Lưu tuỳ chọn", exact: false }).click();
  await expect(page.getByRole("status").filter({ hasText: "Đã lưu tuỳ chọn" })).toBeVisible();
  const before = await readSnapshot(page);
  await page.evaluate(() => (window as unknown as { __speech: { load: () => void } }).__speech.load());
  await page.getByLabel("Giọng tiếng Anh", { exact: true }).selectOption("british");
  await page.getByLabel("Tốc độ đọc", { exact: true }).selectOption("1");
  await page.getByRole("button", { name: "Nghe thử", exact: true }).click();
  expect((await speechLog(page)).at(-1)).toMatchObject({ rate: 1, voiceId: "british" });
  const settings = (await readSnapshot(page)).settings;
  expect(settings).not.toHaveProperty("voiceId");
  expect(settings).not.toHaveProperty("rate");
  expect(await readSnapshot(page)).toEqual(before);
  await page.reload();
  await page.evaluate(() => (window as unknown as { __speech: { load: () => void } }).__speech.load());
  await expect(page.getByLabel("Giọng tiếng Anh", { exact: true })).toHaveValue("british");
  await expect(page.getByLabel("Tốc độ đọc", { exact: true })).toHaveValue("1");
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()).violations).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("speech-settings.png"), fullPage: true });
  await page.goto("/library?q=agreement");
  await page.evaluate(() => (window as unknown as { __speech: { load: () => void } }).__speech.load());
  await page
    .getByRole("button")
    .filter({ has: page.getByRole("heading", { name: "agreement", exact: true }) })
    .click();
  const speaker = page.getByRole("button", { name: "Nghe phát âm agreement", exact: true });
  await speaker.click();
  expect((await speechLog(page)).at(-1)).toMatchObject({ text: "agreement", rate: 1, voiceId: "british" });
  await speaker.click();
  expect((await speechLog(page)).at(-1)?.rate).toBe(0.6);
  await page.keyboard.press("Escape");
  await page.goto("/books/toeic-600/lessons/1");
  await page.evaluate(() => (window as unknown as { __speech: { load: () => void } }).__speech.load());
  await page.getByRole("button", { name: "Học 5 từ tiếp theo", exact: true }).click();
  await expect(page.locator(".word-content .sound-button")).toBeVisible();
  await page.getByRole("button", { name: "Đã xem, thử nhớ lại" }).click();
  await page.getByRole("button", { name: "Chưa nhớ, xem đáp án" }).click();
  await expect(page.locator(".answer-feedback .sound-button")).toBeVisible();
  await page.locator(".answer-feedback .sound-button").click();
  expect((await speechLog(page)).at(-1)?.text).toBeTruthy();
});
for (const mode of ["none", "unsupported"] as const) {
  test(`no English speech (${mode}) hides speakers and explains availability`, async ({ page }) => {
    await mockSpeech(page, mode);
    await page.goto("/settings");
    await expect(page.getByText("Máy này chưa có giọng tiếng Anh khả dụng.", { exact: false })).toBeVisible();
    await expect(page.getByRole("button", { name: "Nghe thử", exact: true })).toHaveCount(0);
    await page.goto("/library?q=agreement");
    await page
      .getByRole("button")
      .filter({ has: page.getByRole("heading", { name: "agreement", exact: true }) })
      .click();
    await expect(page.locator(".sound-button")).toHaveCount(0);
  });
}
