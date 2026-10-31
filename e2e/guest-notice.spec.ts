import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mockSpeech, speechLog } from "./speech-mock";

test.use({ storageState: { cookies: [], origins: [] } });

test("guest sees the storage warning once while practice and progress remain saved", async ({ page }, testInfo) => {
  await page.goto("/books/toeic-600/lessons/1");
  await page.getByRole("button", { name: "Luyện chọn nghĩa / chọn từ", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Đăng nhập để giữ tiến độ" })).toBeVisible();
  await expect(page.getByText(/xóa dữ liệu trang web hoặc đổi máy/)).toBeVisible();
  await expect(page.locator(".answer-option")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Đăng nhập bằng Google", exact: true })).toBeVisible();
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()).violations).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("guest-notice.png"), fullPage: true });
  // An unseen warning remains visible after reload; only acknowledgement dismisses it.
  await page.reload();
  await expect(page.getByRole("heading", { name: "Đăng nhập để giữ tiến độ" })).toBeVisible();
  await page.getByRole("button", { name: "Tiếp tục không đăng nhập", exact: true }).click();
  await expect(page.locator(".answer-option")).toHaveCount(4);
  await page.locator(".answer-option").first().click();
  await expect(page.locator(".answer-feedback")).toBeVisible();
  await page.reload();
  await expect(page.locator(".answer-feedback")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Đăng nhập để giữ tiến độ" })).toHaveCount(0);
  await page.getByRole("button", { name: "Kết thúc tại đây", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Một lượt học, thêm vững vàng.", exact: true })).toBeVisible();
  await page.goto("/books/toeic-600/lessons/1");
  await page.getByRole("button", { name: "Luyện chọn nghĩa / chọn từ", exact: true }).click();
  await expect(page.locator(".answer-option")).toHaveCount(4);
  await expect(page.getByRole("heading", { name: "Đăng nhập để giữ tiến độ" })).toHaveCount(0);
});

test("listening waits for the guest to continue before autoplay", async ({ page }) => {
  await mockSpeech(page);
  await page.goto("/books/toeic-600/lessons/1");
  await page.getByRole("button", { name: "Nghe chọn từ", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Đăng nhập để giữ tiến độ" })).toBeVisible();
  expect(await speechLog(page)).toEqual([]);
  await page.getByRole("button", { name: "Tiếp tục không đăng nhập", exact: true }).click();
  await expect.poll(async () => (await speechLog(page)).length).toBeGreaterThan(0);
  await expect(page.locator(".answer-option")).toHaveCount(4);
});
