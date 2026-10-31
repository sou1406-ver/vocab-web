import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("React Bits save indicator follows actual save, failure and recovery without delaying writes", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "The existing compact header hides its save indicator.");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => {
    const gate = { hold: false, fail: false, pending: null as (() => void) | null };
    Object.assign(window, { __saveGate: gate });
    const descriptor = Object.getOwnPropertyDescriptor(IDBTransaction.prototype, "oncomplete")!;
    Object.defineProperty(IDBTransaction.prototype, "oncomplete", {
      configurable: true,
      get: descriptor.get,
      set(this: IDBTransaction, handler: ((event: Event) => void) | null) {
        descriptor.set!.call(
          this,
          handler &&
            ((event: Event) => {
              if (gate.hold && this.mode === "readwrite") gate.pending = () => handler.call(this, event);
              else handler.call(this, event);
            }),
        );
      },
    });
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args: Parameters<typeof put>) {
      if (gate.fail) throw new DOMException("Storage full", "QuotaExceededError");
      return put.apply(this, args);
    };
  });
  await page.goto("/");
  await expect(page.locator(".today-highlights .panel").first()).toHaveCSS("border-top-width", "1px");
  await page.goto("/settings");
  const mark = page.locator(".save-status.status-mark");
  await expect(mark).toHaveAttribute("data-status", "done");
  await page.getByLabel("Mình gọi bạn là gì?").fill("An");
  await page.evaluate(() => {
    (window as unknown as { __saveGate: { hold: boolean } }).__saveGate.hold = true;
  });
  await page.getByRole("button", { name: "Lưu tuỳ chọn", exact: false }).click();
  await expect(mark).toHaveAttribute("data-status", "running");
  await expect(mark).toHaveText("Đang lưu…");
  await expect(page.getByRole("button", { name: "Lưu tuỳ chọn", exact: false })).toBeDisabled();
  await expect
    .poll(() =>
      page.evaluate(() => Boolean((window as unknown as { __saveGate: { pending: unknown } }).__saveGate.pending)),
    )
    .toBe(true);
  expect(await mark.locator(".status-mark__rotation").evaluate((node) => getComputedStyle(node).animationName)).toBe(
    "rb-status-spin",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await mark.locator(".status-mark__rotation").evaluate((node) => getComputedStyle(node).animationName)).toBe(
    "none",
  );
  await page.evaluate(() => {
    const gate = (window as unknown as { __saveGate: { hold: boolean; pending: (() => void) | null } }).__saveGate;
    gate.hold = false;
    gate.pending?.();
  });
  await expect(mark).toHaveAttribute("data-status", "done");
  await expect(mark).toHaveText("Lưu trên máy");
  await page.evaluate(() => {
    (window as unknown as { __saveGate: { fail: boolean } }).__saveGate.fail = true;
  });
  await page.getByLabel("Mình gọi bạn là gì?").fill("Thử lỗi");
  await page.getByRole("button", { name: "Lưu tuỳ chọn", exact: false }).click();
  await expect(mark).toHaveAttribute("data-status", "failed");
  await expect(mark).toHaveText("Cần kiểm tra");
  await expect(page.locator(".error-banner")).toBeVisible();
  await page.evaluate(() => {
    (window as unknown as { __saveGate: { fail: boolean } }).__saveGate.fail = false;
  });
  await page.getByRole("button", { name: "Lưu tuỳ chọn", exact: false }).click();
  await expect(mark).toHaveAttribute("data-status", "done");
  await expect(page.locator(".error-banner")).toHaveCount(0);
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()).violations).toEqual([]);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath("status-mark-light.png") });
  await page.evaluate(() => {
    const root = document.documentElement;
    const observer = new MutationObserver((records) => {
      if (!records.some((record) => record.attributeName === "data-theme")) return;
      Object.assign(window, {
        __themeTransition: {
          switching: root.classList.contains("theme-switching"),
          transition: getComputedStyle(document.querySelector(".primary")!).transitionProperty,
        },
      });
      observer.disconnect();
    });
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
  });
  await page.getByRole("button", { name: "Đổi giao diện sáng tối", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await page.evaluate(() => (window as unknown as { __themeTransition: unknown }).__themeTransition)).toEqual({
    switching: true,
    transition: "none",
  });
  await expect(page.locator("html")).not.toHaveClass(/theme-switching/);
  for (const selector of [
    "html",
    "body",
    "main h1",
    "main h2",
    "main label",
    "main legend",
    "main .deep-roots-toggle strong",
    "main .secondary",
  ]) {
    await expect(page.locator(selector).first(), selector).toHaveCSS("color", "rgb(244, 246, 239)");
  }
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(14, 21, 18)");
  await expect(mark).toHaveAttribute("data-status", "done");
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()).violations).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("status-mark-dark.png") });
});

test("React Bits answer marks preserve feedback text, keyboard flow and reduced motion", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/books/toeic-600/lessons/1");
  await page.getByRole("button", { name: "Học 5 từ tiếp theo", exact: true }).click();
  await page.getByRole("button", { name: "Đã xem, thử nhớ lại" }).click();
  await page.getByRole("button", { name: "Chưa nhớ, xem đáp án" }).click();
  const mark = page.locator(".feedback-title .status-mark");
  await expect(mark).toHaveAttribute("data-status", "failed");
  await expect(mark).toHaveAttribute("aria-hidden", "true");
  await expect(page.getByText("Gặp lại thêm một lần nhé.", { exact: true })).toBeVisible();
  const colors = await mark.evaluate((node) => ({
    glyph: getComputedStyle(node.querySelector("svg")!).color,
    text: getComputedStyle(node.parentElement!).color,
  }));
  expect(colors.glyph).toBe(colors.text);
  await expect(page.getByRole("button", { name: "Từ tiếp theo", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Từ tiếp theo", exact: true }).press("Enter");
  await page.getByRole("button", { name: "Đã xem, thử nhớ lại" }).click();
  await page.getByRole("textbox", { name: "Đáp án của bạn" }).fill("agreement");
  await page.getByRole("button", { name: "Kiểm tra", exact: true }).click();
  await expect(mark).toHaveAttribute("data-status", "done");
  await expect(page.getByText("Chính xác. Bạn nhớ rồi!", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Từ tiếp theo", exact: true })).toBeFocused();
  expect(await mark.locator(".status-mark__check").evaluate((node) => getComputedStyle(node).transitionProperty)).toBe(
    "none",
  );
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Từ tiếp theo", exact: true }).focus();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath("status-mark-feedback.png"), fullPage: true });
});
