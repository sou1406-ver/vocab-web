import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("twenty static avatars load locally and the selected image persists", async ({ page }, testInfo) => {
  await page.goto("/settings");
  await expect(page.getByText("Đang mở dữ liệu…")).not.toBeVisible();
  const picker = page.getByRole("group", { name: "Ảnh đại diện" });
  await expect(picker.getByRole("button", { name: /^Chọn avatar/ })).toHaveCount(20);
  const choice = picker.getByRole("button", { name: "Chọn avatar 5", exact: true });
  await choice.click();
  await expect(choice).toHaveAttribute("aria-pressed", "true");
  const artwork = () => picker.locator('[aria-pressed="true"] img').getAttribute("src");
  const selected = await artwork();
  const sources = await picker.locator("img").evaluateAll((images) =>
    images.map((image) => ({
      src: image.getAttribute("src"),
      loaded: (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0,
    })),
  );
  expect(new Set(sources.map((image) => image.src)).size).toBe(20);
  expect(sources.every((image) => image.src?.startsWith("/avatars/notionists/") && image.loaded)).toBe(true);
  await expect(picker.getByRole("button", { name: "Đổi bộ avatar" })).toHaveCount(0);
  await page.getByRole("button", { name: "Lưu tuỳ chọn" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Đã lưu tuỳ chọn" })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Đang mở dữ liệu…")).not.toBeVisible();
  expect(await artwork()).toEqual(selected);
  const header = page.getByRole("button", { name: "Mở hồ sơ" });
  await expect(header.locator("img")).toBeVisible();
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }))).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("avatar-picker.png"), fullPage: true });
  await page.getByRole("button", { name: "Đổi giao diện sáng tối", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await artwork()).toEqual(selected);
  await expect(picker.locator(".user-avatar").first()).toHaveCSS("filter", "none");
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()).violations).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("avatar-picker-dark.png"), fullPage: true });
});
