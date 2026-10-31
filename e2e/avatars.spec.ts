import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("avatar selection persists and refreshing the list keeps the current choice", async ({ page }, testInfo) => {
  await page.goto("/settings");
  await expect(page.getByText("Đang mở dữ liệu…")).not.toBeVisible();
  const picker = page.getByRole("group", { name: "Ảnh đại diện" });
  await expect(picker.getByRole("button", { name: /^Chọn avatar/ })).toHaveCount(12);
  const choice = picker.getByRole("button", { name: "Chọn avatar 5", exact: true });
  await choice.click();
  await expect(choice).toHaveAttribute("aria-pressed", "true");
  // SVG IDs are instance-specific. The geometry and colors identify the avatar.
  const artwork = () =>
    picker.locator('[aria-pressed="true"] svg').evaluate((svg) =>
      Array.from(svg.querySelectorAll("path, circle, rect, ellipse")).map((node) => ({
        tag: node.tagName,
        d: node.getAttribute("d"),
        fill: node.getAttribute("fill"),
        transform: node.getAttribute("transform"),
      })),
    );
  const selected = await artwork();
  await picker.getByRole("button", { name: "Đổi bộ avatar" }).click();
  await expect(picker.locator('[aria-pressed="true"]')).toHaveCount(1);
  expect(await artwork()).toEqual(selected);
  await page.getByRole("button", { name: "Lưu tuỳ chọn" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Đã lưu tuỳ chọn" })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Đang mở dữ liệu…")).not.toBeVisible();
  expect(await artwork()).toEqual(selected);
  const header = page.getByRole("button", { name: "Mở hồ sơ" });
  await expect(header.locator("svg")).toBeVisible();
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }))).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("avatar-picker.png"), fullPage: true });
  await page.getByRole("button", { name: "Đổi giao diện sáng tối", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await artwork()).toEqual(selected);
  await expect(picker.locator(".user-avatar").first()).toHaveCSS("filter", "brightness(0.82) saturate(0.8)");
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()).violations).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("avatar-picker-dark.png"), fullPage: true });
});
