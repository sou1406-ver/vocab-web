import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

test("brand kit logo follows theme and viewport, with matching app icons", async ({ page }, testInfo) => {
  await page.goto("/");
  const logo = page.getByRole("img", { name: "Vocab Learn", exact: true });
  await expect(logo).toBeVisible();
  await expect(logo).toHaveAttribute("src", "/brand/logo-light.svg");
  const svg = readFileSync(new URL("../public/brand/logo-light.svg", import.meta.url), "utf8");
  const dimensions = svg.match(/viewBox="[^"]*?\s([\d.]+)\s+([\d.]+)"/)!;
  await expect
    .poll(() =>
      logo.evaluate((node) => [(node as HTMLImageElement).naturalWidth, (node as HTMLImageElement).naturalHeight]),
    )
    .toEqual([Number(dimensions[1]), Number(dimensions[2])]);
  await expect(page.locator('link[rel="icon"][type="image/svg+xml"]')).toHaveAttribute(
    "href",
    /^\/favicon\.svg(?:\?.*)?$/,
  );
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/site.webmanifest");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `test-results/vocab-logo-${testInfo.project.name}.png` });
  await page.getByRole("button", { name: "Đổi giao diện sáng tối" }).click();
  await expect(logo).toHaveAttribute("src", "/brand/logo-dark.svg");
  await expect(page.locator('nav[aria-label="Điều hướng chính"] a[href="/library"] svg circle')).toHaveAttribute(
    "fill",
    "currentColor",
  );
  await page.screenshot({ path: `test-results/vocab-logo-dark-${testInfo.project.name}.png` });
  await page.setViewportSize({ width: 768, height: 1024 });
  const compactLogo = page.locator(".sidebar .brand-logo img");
  await expect
    .poll(() => compactLogo.evaluate((node) => (node as HTMLImageElement).currentSrc))
    .toContain("/brand/symbol-dark.svg");
  const box = await compactLogo.boundingBox();
  expect(box?.width).toBe(48);
  expect(box?.height).toBe(48);
});

test("Today keeps its daily goal inside a compact responsive hero", async ({ page }, testInfo) => {
  for (const width of [1440, 1024]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Hôm nay, học một chút." })).toBeVisible();
    await expect(page.locator(".goal-panel, .hero-art, .sidebar-note")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Bắt đầu học", exact: true })).toHaveCount(1);
    const hero = (await page.locator(".today-hero").boundingBox())!;
    const goal = (await page.locator(".goal-circle").boundingBox())!;
    expect(hero.height).toBeLessThan(360);
    expect(goal.x).toBeGreaterThanOrEqual(hero.x);
    expect(goal.x + goal.width).toBeLessThanOrEqual(hero.x + hero.width);
    expect(goal.y + goal.height).toBeLessThanOrEqual(hero.y + hero.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width === 1440) await page.screenshot({ path: testInfo.outputPath("today-compact.png") });
  }
});

test("short desktop and compact sidebars scroll the menu while keeping settings at the bottom", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "The sidebar is hidden on mobile.");
  for (const theme of ["light", "dark"]) {
    for (const width of [1440, 768]) {
      await page.setViewportSize({ width, height: 400 });
      await page.goto("/");
      await expect(page.getByText("Đang mở dữ liệu…")).not.toBeVisible();
      if ((await page.locator("html").getAttribute("data-theme")) !== theme)
        await page.getByRole("button", { name: "Đổi giao diện sáng tối" }).click();
      const menu = page.getByRole("navigation", { name: "Điều hướng chính", exact: true });
      const settings = page.getByRole("link", { name: "Cài đặt và sao lưu", exact: true });
      const footer = page.locator(".sidebar-footer");
      const initial = await footer.boundingBox();
      expect(initial).not.toBeNull();
      expect(initial!.y + initial!.height).toBeLessThanOrEqual(400);
      expect(initial!.y + initial!.height).toBeGreaterThanOrEqual(375);
      expect(await menu.evaluate((node) => node.scrollHeight > node.clientHeight)).toBe(true);
      await menu.evaluate((node) => {
        node.scrollTop = node.scrollHeight;
      });
      await menu.getByRole("link").last().focus();
      await page.keyboard.press("Tab");
      await expect(settings).toBeFocused();
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      const after = await footer.boundingBox();
      expect(after!.y).toBeCloseTo(initial!.y, 0);
      const link = await settings.boundingBox();
      expect(link!.y).toBeGreaterThanOrEqual(0);
      expect(link!.y + link!.height).toBeLessThanOrEqual(400);
      await page.screenshot({ path: testInfo.outputPath(`sidebar-${theme}-${width}.png`) });
      await settings.click();
      await expect(page).toHaveURL(/\/settings$/);
    }
  }
});

test("desktop sidebar shows every destination without scrolling at ordinary laptop heights", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "The sidebar is hidden on mobile.");
  await page.goto("/settings");
  await page.getByRole("checkbox", { name: "Học sâu: gốc từ", exact: true }).check();
  await page.getByRole("button", { name: "Lưu tuỳ chọn", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Đã lưu tuỳ chọn" })).toBeVisible();
  const menu = page.getByRole("navigation", { name: "Điều hướng chính", exact: true });
  for (const height of [600, 768, 900]) {
    await page.setViewportSize({ width: 1440, height });
    expect(await menu.evaluate((node) => node.scrollHeight <= node.clientHeight)).toBe(true);
    for (const link of await menu.getByRole("link").all()) await expect(link).toBeInViewport();
    await expect(menu.getByRole("link", { name: "Hôm nay", exact: true })).toBeInViewport();
    await expect(page.getByRole("link", { name: "Cài đặt và sao lưu", exact: true })).toBeInViewport();
  }
  await expect(page.getByText("BẢN THỬ NGHIỆM", { exact: true })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("sidebar-all-links.png") });
});
