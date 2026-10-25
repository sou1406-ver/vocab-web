import { test, expect } from "@playwright/test";

test("brand kit logo follows theme and viewport, with matching app icons", async ({ page }, testInfo) => {
  await page.goto("/");
  const logo = page.getByRole("img", { name: "Vocab Learn", exact: true });
  await expect(logo).toBeVisible();
  await expect(logo).toHaveAttribute("src", "/brand/logo-light.svg");
  expect(await logo.evaluate((node) => (node as HTMLImageElement).naturalWidth)).toBe(1165);
  await expect(page.locator('link[rel="icon"][type="image/svg+xml"]')).toHaveAttribute("href", "/favicon.svg");
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

test("V2 study layout returns with readable cards and study actions", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Hôm nay, học một chút." })).toBeVisible();
  await expect(page.locator(".hero-art")).toBeVisible();
  await expect(page.locator(".sidebar-note")).toHaveCount(0);
  await expect(page.locator(".goal-panel")).toBeVisible();
  await expect(page.getByRole("button", { name: "Bắt đầu học", exact: true })).toHaveCount(1);
  for (const width of [1440, 1024]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.evaluate(() => document.fonts.ready);
    const layout = await page.evaluate(() => {
      const card = document.querySelector<HTMLElement>(".front-vocab-card")!;
      const meaning = card.querySelector<HTMLElement>(".art-meaning")!;
      const caption = card.querySelector<HTMLElement>(".art-bottom")!;
      return {
        end: meaning.offsetTop + meaning.offsetHeight,
        caption: caption.offsetTop,
        height: card.clientHeight,
        scroll: card.scrollHeight,
      };
    });
    expect(layout.caption).toBeGreaterThanOrEqual(layout.end + 8);
    expect(layout.scroll).toBeLessThanOrEqual(layout.height);
    if (width === 1440) await page.screenshot({ path: `test-results/vocab-v2-restored-${testInfo.project.name}.png` });
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
      await menu.getByRole("link", { name: "Tiến độ", exact: true }).focus();
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
