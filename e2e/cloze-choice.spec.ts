import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("authored cloze loads per lesson, retries failures and resumes without downloading again", async ({
  page,
  context,
}, testInfo) => {
  let requests = 0;
  await page.route("**/exercises/cloze/**", async (route) => {
    requests++;
    if (requests === 1) await route.fulfill({ status: 503, body: "unavailable" });
    else await route.continue();
  });
  await page.goto("/lessons/1");
  expect(requests).toBe(0);
  const start = page.getByRole("button", { name: "Luyện điền chỗ trống", exact: true });
  await start.click();
  await expect(page.getByRole("alert").filter({ hasText: "Không tải được bài tập" })).toBeVisible();
  await start.click();
  await expect(page.getByRole("heading", { name: "Điền từ còn thiếu" })).toBeVisible();
  await expect(page.locator(".answer-option")).toHaveCount(4);
  expect(requests).toBe(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()).violations).toEqual([]);
  await page.screenshot({ path: `test-results/cloze-choice-${testInfo.project.name}.png` });
  // Authored first question for lesson 1 has answer agreement.
  await page
    .locator(".answer-option")
    .filter({ hasText: /agreement$/ })
    .click();
  await expect(page.getByText("Chính xác. Bạn nhớ rồi!")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Chính xác. Bạn nhớ rồi!")).toBeVisible();
  expect(requests).toBe(2);
  const other = await context.newPage();
  await other.goto("/study");
  await expect(other.getByText("Chính xác. Bạn nhớ rồi!")).toBeVisible();
  await page.getByRole("button", { name: "Từ tiếp theo" }).click();
  await expect(other.locator(".answer-option")).toHaveCount(4);
  await page.getByRole("button", { name: "Chưa nhớ, xem đáp án" }).click();
  await page.getByRole("button", { name: "Kết thúc tại đây" }).click();
  await page.getByRole("button", { name: "Luyện lại từ vừa sai" }).click();
  await expect(page.locator(".answer-option")).toHaveCount(4);
  await page.getByRole("button", { name: "Kết thúc tại đây" }).click();
  await page.goto("/progress");
  await expect(page.locator(".progress-stats .stat-number").first()).toContainText("0");
});
