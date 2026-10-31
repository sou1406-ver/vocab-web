import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readSnapshot } from "./speech-mock";

test("grouped progress shows measured results and keeps untried groups empty", async ({ page }, testInfo) => {
  await page.goto("/progress");
  const groups = page.getByRole("region", { name: "Theo nhóm bài tập" });
  await expect(groups).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Chưa có lượt học nào", exact: true })).toBeVisible();
  await page.goto("/books/toeic-600/lessons/1");
  await page.getByRole("button", { name: "Luyện chọn nghĩa / chọn từ", exact: true }).click();
  const snapshot = await readSnapshot(page);
  const [first, second] = snapshot.session!.questions;
  if (first.kind !== "meaning" || second.kind !== "word-choice") throw new Error("Recognition fixture");
  await page.locator(".answer-option").filter({ hasText: first.answer }).click();
  await page.getByRole("button", { name: "Từ tiếp theo", exact: true }).click();
  await page
    .locator(".answer-option")
    .filter({ hasText: second.options.find((option) => option !== second.answer)! })
    .click();
  await page.getByRole("button", { name: "Kết thúc tại đây", exact: true }).click();
  await page.goto("/progress");
  await expect(groups.getByRole("article")).toHaveCount(6);
  const recognition = page.getByRole("article", { name: "Nhận biết", exact: true });
  await expect(recognition.locator(".exercise-result-value")).toHaveText("50%");
  await expect(recognition).toContainText("1/2 câu tự trả lời đúng");
  await page.reload();
  await expect(recognition.locator(".exercise-result-value")).toHaveText("50%");
  if (testInfo.project.name === "desktop") {
    const sidebar = page.locator(".sidebar");
    await expect(sidebar.getByText("HỌC TẬP", { exact: true })).toBeVisible();
    await expect(sidebar.getByText("THEO DÕI", { exact: true })).toBeVisible();
    await expect(sidebar.getByText("TÀI KHOẢN", { exact: true })).toBeVisible();
  }
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("exercise-progress.png"), fullPage: true });
  await page.getByRole("button", { name: "Đổi giao diện sáng tối", exact: true }).click();
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()).violations).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("exercise-progress-dark.png"), fullPage: true });
});
