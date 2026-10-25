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
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
