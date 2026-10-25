import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("letter slots support native editing, phrase spaces and submission", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Bắt đầu học", exact: true }).click();
  await page.getByRole("button", { name: "Đã xem, thử nhớ lại" }).click();
  await page.getByRole("button", { name: "Chưa nhớ, xem đáp án" }).click();
  await page.getByRole("button", { name: "Từ tiếp theo" }).click();
  await page.getByRole("button", { name: "Đã xem, thử nhớ lại" }).click();
  const input = page.getByRole("textbox", { name: "Đáp án của bạn" });
  await expect(page.locator(".letter-slot")).toHaveCount(9);
  await expect(input).toBeFocused();
  await input.fill("agreemenx");
  await input.press("End");
  await input.press("Backspace");
  await input.press("t");
  await expect(input).toHaveValue("agreement");
  await expect(page.locator(".letter-slot").last()).toHaveText("t");
  const rows = await page
    .locator(".letter-slot")
    .evaluateAll((nodes) => nodes.map((node) => (node as HTMLElement).offsetTop));
  expect(new Set(rows).size).toBe(1);
  await page.locator(".letter-slot").first().click();
  expect(await input.evaluate((node) => (node as HTMLInputElement).selectionStart)).toBe(0);
  await input.press("ArrowRight");
  expect(await input.evaluate((node) => (node as HTMLInputElement).selectionStart)).toBe(1);
  await input.press("End");
  const a11y = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(a11y.violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `test-results/letter-slots-${testInfo.project.name}.png` });
  await input.press("Enter");
  await expect(page.getByText("Chính xác. Bạn nhớ rồi!")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Chính xác. Bạn nhớ rồi!")).toBeVisible();
  await expect(input).toBeDisabled();
  await page.getByRole("button", { name: "Kết thúc tại đây" }).click();
  await page.getByRole("button", { name: "Luyện lại từ vừa sai" }).click();
  // The missed first item is the two-word phrase "abide by".
  await expect(page.locator(".letter-slot")).toHaveCount(7);
  await expect(page.locator(".letter-gap")).toHaveCount(1);
  await input.fill("abide by extra");
  await expect(input).toHaveValue("abide by extra");
  await input.press("ControlOrMeta+A");
  await input.press("Backspace");
  await expect(input).toHaveValue("");
  await input.fill("abide by");
  await input.press("Enter");
  await expect(page.getByText("Chính xác. Bạn nhớ rồi!")).toBeVisible();
});
