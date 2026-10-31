import { scanAccessibility } from "./app-ready";
import { test, expect } from "@playwright/test";
import { mockSpeech } from "./speech-mock";

test("word dialog responds on press, remains usable during its fade and restores focus", async ({ page }, testInfo) => {
  await mockSpeech(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/library?q=agreement");
  const opener = page
    .getByRole("button")
    .filter({ has: page.getByRole("heading", { name: "agreement", exact: true }) });
  await opener.click();
  const dialog = page.getByRole("dialog", { name: "Chi tiết từ", exact: true });
  await expect(dialog).toBeVisible();
  const close = dialog.getByRole("button", { name: "Đóng chi tiết từ", exact: true });
  const target = await close.boundingBox();
  expect(target!.width).toBeGreaterThanOrEqual(32);
  expect(target!.height).toBeGreaterThanOrEqual(32);
  await page.mouse.move(target!.x + target!.width / 2, target!.y + target!.height / 2);
  await page.mouse.down();
  const scale = await close.evaluate((node) => new DOMMatrix(getComputedStyle(node).transform).a);
  expect(scale).toBeCloseTo(0.985, 3);
  await expect(dialog).toBeVisible();
  await page.mouse.up();
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
  await opener.press("Enter");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
  await opener.press("Enter");
  await expect(dialog).toBeVisible();
  expect((await scanAccessibility(page)).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("word-dialog.png") });
});

test("reduced motion and transparency keep dialog geometry, keyboard and study feedback intact", async ({
  page,
}, testInfo) => {
  await mockSpeech(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setEmulatedMedia", {
    features: [
      { name: "prefers-reduced-motion", value: "reduce" },
      { name: "prefers-reduced-transparency", value: "reduce" },
      { name: "prefers-contrast", value: "more" },
    ],
  });
  await page.goto("/library?q=agreement");
  const opener = page
    .getByRole("button")
    .filter({ has: page.getByRole("heading", { name: "agreement", exact: true }) });
  await opener.click();
  const dialog = page.getByRole("dialog", { name: "Chi tiết từ", exact: true });
  await expect(dialog).toBeVisible();
  const styles = await page.evaluate(() => {
    const dialog = document.querySelector<HTMLElement>(".dialog-surface")!;
    const overlay = document.querySelector<HTMLElement>(".dialog-overlay")!;
    const css = getComputedStyle(dialog);
    const box = dialog.getBoundingClientRect();
    return {
      animation: css.animationName,
      blur: getComputedStyle(overlay).backdropFilter,
      border: css.borderTopColor,
      ink: css.color,
      x: box.x + box.width / 2,
      y: box.y + box.height / 2,
      width: innerWidth,
      height: innerHeight,
    };
  });
  expect(styles.animation).toBe("none");
  expect(styles.blur).toBe("none");
  expect(styles.border).toBe(styles.ink);
  expect(styles.x).toBeCloseTo(styles.width / 2, 0);
  expect(styles.y).toBeCloseTo(styles.height / 2, 0);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
  await page.goto("/books/toeic-600/lessons/1");
  await page.getByRole("button", { name: "Học 5 từ tiếp theo", exact: true }).click();
  await expect(page.locator(".study-step")).toBeVisible();
  expect(await page.locator(".study-step").evaluate((node) => getComputedStyle(node).animationName)).toBe("none");
  await page.getByRole("button", { name: "Đã xem, thử nhớ lại" }).click();
  await expect(page.locator(".answer-option").first()).toBeFocused();
  await page.locator(".answer-option").first().press("Enter");
  await expect(page.locator(".answer-feedback")).toBeVisible();
  expect(await page.locator(".answer-feedback").evaluate((node) => getComputedStyle(node).animationName)).toBe("none");
  await page.getByRole("button", { name: "Từ tiếp theo", exact: true }).press("Enter");
  await expect(page.getByRole("heading", { name: "agreement", exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("reduced-motion-study.png"), fullPage: true });
});
