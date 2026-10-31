import { test, expect } from "@playwright/test";

test("Vietnamese headings use the bundled font and supporting text stays readable", async ({ page }) => {
  await page.goto("/progress");
  const heading = page.getByRole("heading", { name: "Mỗi chút đều có giá trị." });
  await expect(heading).toBeVisible();
  const styles = await page.evaluate(() => {
    const css = (selector: string) => getComputedStyle(document.querySelector(selector)!);
    return {
      font: css("main h1").fontFamily,
      body: parseFloat(css("body").fontSize),
      label: parseFloat(css(".stat-label").fontSize),
    };
  });
  expect(styles.font).toContain("Noto Serif");
  expect(styles.body).toBeGreaterThanOrEqual(16);
  expect(styles.label).toBeGreaterThanOrEqual(14);
  await page.goto("/lessons");
  expect(
    await page.locator(".page-heading .eyebrow").evaluate((node) => parseFloat(getComputedStyle(node).letterSpacing)),
  ).toBeLessThanOrEqual(0.5);
  await page.goto("/");
  expect(
    await page
      .locator(".front-vocab-card .small-label")
      .evaluate((node) => parseFloat(getComputedStyle(node).letterSpacing)),
  ).toBeLessThanOrEqual(0.5);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
