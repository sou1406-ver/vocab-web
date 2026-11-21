import { expect, test, type Page } from "@playwright/test";
import { scanAccessibility, setTheme, waitForSaved } from "./app-ready";
import { readSnapshot } from "./speech-mock";

async function answerCurrent(page: Page) {
  await page.getByRole("button", { name: "Đã xem, thử nhớ lại" }).click();
  const { session } = await readSnapshot(page);
  const question = session!.questions[session!.index];
  const answer = question.answer as string;
  if (question.kind === "meaning" || question.kind === "word-choice") {
    const choice = question.options.indexOf(answer);
    expect(choice).toBeGreaterThanOrEqual(0);
    await page.locator(".answer-option").nth(choice).click();
  } else {
    const input = page.getByRole("textbox", { name: "Đáp án của bạn" });
    await input.fill(answer);
    await input.press("Enter");
  }
  await expect(page.getByText("Chính xác. Bạn nhớ rồi!")).toBeVisible();
  await waitForSaved(page);
}

test("shows a linked root once per session with an optional discovery link", async ({ page }, info) => {
  test.setTimeout(90000);
  await page.goto("/roots/tain");
  await waitForSaved(page);
  await page.getByRole("button", { name: /^Học \d+ từ trong sách thuộc gốc này$/ }).click();
  await expect(page).toHaveURL(/\/study$/);
  const root = page.locator(".study-root-feedback");
  const rootLink = page.getByRole("link", { name: "Xem gốc", exact: true });
  await expect(root).toHaveCount(0);
  await answerCurrent(page);
  await expect(root).toContainText("tain");
  await expect(rootLink).toHaveCount(0);
  const explanation = await root.innerText();
  await page.reload();
  await expect(root).toHaveText(explanation);

  await page.goto("/settings");
  await page.getByRole("checkbox", { name: "Học sâu: gốc từ" }).check();
  await page.getByRole("button", { name: "Lưu tuỳ chọn" }).click();
  await waitForSaved(page);
  await page.goto("/study");
  await expect(rootLink).toHaveAttribute("href", "/roots/tain");
  const next = page.getByRole("button", { name: "Từ tiếp theo" });
  await next.focus();
  await page.keyboard.press("Tab");
  await expect(rootLink).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const width = info.project.name === "mobile" ? 390 : 1440;
  await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
  for (const theme of ["light", "dark"] as const) {
    await setTheme(page, theme);
    expect((await scanAccessibility(page)).violations).toEqual([]);
    await page.evaluate(() => {
      const active = document.activeElement;
      if (active instanceof HTMLElement && active.matches(".skip-link")) active.blur();
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`root-feedback-${theme}-${width}.png`), fullPage: true });
  }
  await next.click();
  await answerCurrent(page);
  await expect(root).toHaveCount(0);
  const { events, session } = await readSnapshot(page);
  expect(events.map(({ id }) => id)).toEqual([`${session!.id}:0`, `${session!.id}:1`]);
});
