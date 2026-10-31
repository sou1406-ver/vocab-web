import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

function luminance(color: string) {
  const hex = color.slice(1);
  const channels = color.startsWith("#")
    ? (hex.length === 3 ? hex.split("").map((digit) => digit + digit) : hex.match(/.{2}/g)!).map((value) =>
        parseInt(value, 16),
      )
    : color
        .match(/[\d.]+/g)!
        .slice(0, 3)
        .map(Number);
  const [r, g, b] = channels.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(foreground: string, background: string) {
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

for (const theme of ["light", "dark"] as const) {
  test(`${theme} palette keeps text contrast and the existing responsive layout`, async ({ page }, testInfo) => {
    await page.emulateMedia({ colorScheme: theme });
    await page.goto("/");
    await expect(page.getByText("Đang mở dữ liệu…")).not.toBeVisible();
    await expect(page.locator(".stats-grid")).toBeVisible();
    if ((await page.locator("html").getAttribute("data-theme")) !== theme)
      await page.getByRole("button", { name: "Đổi giao diện sáng tối" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    const logo = page.locator(testInfo.project.name === "mobile" ? ".mobile-brand img" : ".sidebar .brand img");
    await expect(logo).toBeVisible();
    await expect(logo).toHaveAttribute("src", `/brand/logo-${theme}.svg`);
    await expect
      .poll(() => logo.evaluate((node: HTMLImageElement) => [node.naturalWidth, node.naturalHeight]))
      .toEqual([760, 256]);
    await expect(page.locator('link[rel="icon"][type="image/svg+xml"]')).toHaveAttribute(
      "href",
      "/favicon.svg?v=pocket",
    );
    const palette = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const tokens = Object.fromEntries(
        ["bg", "surface", "surface-soft", "ink", "muted", "green", "soft-green", "brand-ink"].map((name) => [
          name,
          root.getPropertyValue(`--${name}`).trim(),
        ]),
      );
      const stats = document.querySelector(".stats-grid")!;
      const due = stats.querySelector(".stat-card--due")!;
      return {
        tokens,
        due: getComputedStyle(due.querySelector(".stat-number")!).color,
        dueLabel: getComputedStyle(due.querySelector(".stat-label")!).color,
        cardBackground: getComputedStyle(due).backgroundColor,
        cardTop: getComputedStyle(due).borderTopColor,
        icons: Array.from(stats.querySelectorAll(".stat-icon"), (node) => getComputedStyle(node).color),
      };
    });
    const ratios: Record<string, number> = {};
    for (const foreground of ["ink", "muted"]) {
      for (const background of ["bg", "surface", "surface-soft"]) {
        const label = `${foreground} / ${background}`;
        ratios[label] = contrast(palette.tokens[foreground], palette.tokens[background]);
        expect(ratios[label], label).toBeGreaterThanOrEqual(4.5);
      }
    }
    for (const background of ["surface", "soft-green", "bg"]) {
      const label = `green / ${background}`;
      ratios[label] = contrast(palette.tokens.green, palette.tokens[background]);
      expect(ratios[label], label).toBeGreaterThanOrEqual(4.5);
    }
    ratios.dueNumber = contrast(palette.due, palette.cardBackground);
    ratios.dueLabel = contrast(palette.dueLabel, palette.cardBackground);
    expect(ratios.dueNumber).toBeGreaterThanOrEqual(4.5);
    expect(ratios.dueLabel).toBeGreaterThanOrEqual(4.5);
    expect(new Set(palette.icons).size).toBe(3);
    const moved = await page.evaluate(() => {
      const stats = document.querySelector(".stats-grid")!;
      const due = stats.querySelector(".stat-card--due")!;
      const cards = Array.from(stats.children);
      const label = stats.getAttribute("aria-label");
      stats.prepend(due);
      stats.setAttribute("aria-label", "Thống kê học tập");
      const color = getComputedStyle(due.querySelector(".stat-number")!).color;
      stats.replaceChildren(...cards);
      if (label === null) stats.removeAttribute("aria-label");
      else stats.setAttribute("aria-label", label);
      return color;
    });
    expect(moved).toBe(palette.due);
    if (theme === "dark") expect(palette.cardTop).toBe("rgba(255, 255, 255, 0.1)");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }))).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`${theme}-home.png`), fullPage: true });
    for (const path of ["/books/toeic-600/lessons/1", "/library", "/progress", "/settings"]) {
      await page.goto(path);
      await expect(page.locator("main h1")).toBeVisible();
      const scan = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
      expect(
        scan.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
        path,
      ).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), path).toBe(true);
      if (path === "/progress") {
        const tracks = await page.locator(".activity-track").evaluateAll((nodes) =>
          nodes.map((node) => ({
            width: node.getBoundingClientRect().width,
            maximum: parseFloat(getComputedStyle(node).maxWidth),
          })),
        );
        expect(tracks).toHaveLength(7);
        for (const track of tracks) {
          expect(track.maximum).toBe(26.25);
          expect(track.width).toBeLessThanOrEqual(26.25);
        }
        await page.screenshot({ path: testInfo.outputPath(`${theme}-progress.png`), fullPage: true });
      }
    }
    const button = page.getByRole("button", { name: "Lưu tuỳ chọn" });
    await expect(button).toBeVisible();
    const buttonContrast = async () => {
      const colors = await button.evaluate((node) => {
        const css = getComputedStyle(node);
        return { text: css.color, background: css.backgroundColor };
      });
      if (theme === "dark") expect(colors.text).toBe("rgb(14, 21, 18)");
      return contrast(colors.text, colors.background);
    };
    ratios.button = await buttonContrast();
    await button.hover();
    // Wait for the existing color transition before measuring the hover state.
    await expect.poll(buttonContrast).toBeGreaterThanOrEqual(4.5);
    ratios.buttonHover = await buttonContrast();
    expect(ratios.button).toBeGreaterThanOrEqual(4.5);
    await testInfo.attach("text-contrast", {
      body: JSON.stringify(ratios, null, 2),
      contentType: "application/json",
    });
  });
}
