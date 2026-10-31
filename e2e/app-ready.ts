import { expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// The save mark stays in the DOM on mobile even when the compact header hides it.
export async function waitForSaved(page: Page) {
  await expect(page.locator(".save-status.status-mark")).toHaveAttribute("data-status", "done");
}

export async function waitForResult(page: Page) {
  await expect(page.getByRole("heading", { name: "Một lượt học, thêm vững vàng.", exact: true })).toBeVisible();
  await waitForSaved(page);
}

export async function waitForVisualReady(page: Page) {
  await expect(page.locator("html")).toHaveAttribute("data-theme", /^(light|dark)$/);
  await expect(page.locator("html")).not.toHaveClass(/theme-switching/);
  await page.evaluate(() => document.fonts.ready.then(() => {}));
  // Wait for finite transitions/entrances, keeping real motion enabled in the tests.
  // Indefinite activity indicators are checked separately by their status assertions.
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document
            .getAnimations()
            .filter(
              (animation) =>
                (animation.playState === "running" || animation.pending) &&
                animation.effect?.getComputedTiming().iterations !== Infinity,
            ).length,
      ),
    )
    .toBe(0);
}

export async function toggleTheme(page: Page) {
  const root = page.locator("html");
  await expect(root).toHaveAttribute("data-theme", /^(light|dark)$/);
  const next = (await root.getAttribute("data-theme")) === "dark" ? "light" : "dark";
  await page.getByRole("button", { name: "Đổi giao diện sáng tối", exact: true }).click();
  await expect(root).toHaveAttribute("data-theme", next);
  await waitForVisualReady(page);
}

export async function setTheme(page: Page, theme: "light" | "dark") {
  const root = page.locator("html");
  await expect(root).toHaveAttribute("data-theme", /^(light|dark)$/);
  if ((await root.getAttribute("data-theme")) !== theme) await toggleTheme(page);
  await expect(root).toHaveAttribute("data-theme", theme);
  await waitForVisualReady(page);
}

export async function scanAccessibility(page: Page) {
  await waitForVisualReady(page);
  return new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
}
