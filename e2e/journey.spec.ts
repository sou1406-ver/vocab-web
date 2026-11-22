import { test, expect } from "@playwright/test";
import { scanAccessibility, setTheme } from "./app-ready";

test("loads an atlas only when a visible plant needs it", async ({ page }) => {
  const atlas = /\/_next\/static\/(?:immutable\/)?media\/(\d+)(?:\.[^/]+)?\.webp$/;
  const requested = new Set<string>();
  page.on("request", (request) => {
    const sheet = request.url().match(atlas)?.[1];
    if (sheet) requested.add(sheet);
  });
  const sheetLoaded = (name: string) =>
    page.waitForResponse((response) => response.ok() && response.url().match(atlas)?.[1] === name);

  const mapSheet = sheetLoaded("10");
  await page.goto("/prototype/hanh-trinh");
  await mapSheet;
  expect([...requested]).toEqual(["10"]);

  await page.locator('a[href="/prototype/hanh-trinh/vuon/4"]').click();
  await expect(page).toHaveURL(/\/vuon\/4$/);
  const progress = page.locator(".journey-v2 .page-subtitle");
  await expect(progress).toHaveText("0/12 đã trồng");
  expect([...requested]).toEqual(["10"]);
  const reminder = page.getByRole("complementary", { name: "Nhắc tưới vườn khác" });
  await expect(reminder).toContainText("2 cây ở vườn Contracts đang khát");
  await reminder.getByRole("button", { name: "Đóng nhắc tưới" }).click();
  await expect(reminder).toHaveCount(0);

  await page.getByRole("button", { name: "Gieo luống 1", exact: true }).click();
  const sow = page.getByRole("dialog");
  const gardenSheet = sheetLoaded("45");
  // The first plot is address, with three required senses.
  for (let sense = 0; sense < 3; sense++) {
    await expect(sow.getByRole("heading", { name: "address", exact: true })).toBeVisible();
    await sow.getByRole("button", { name: "Thử nhớ lại" }).click();
    await sow.getByRole("button", { name: "Chưa nhớ, xem đáp án" }).click();
    await sow.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  }
  await page.keyboard.press("Escape");
  await expect(progress).toHaveText("1/12 đã trồng");
  await gardenSheet;
  expect([...requested]).toEqual(["10", "45"]);
});

test("sows a bed and waters a plant in one sandbox garden", async ({ page }, info) => {
  test.setTimeout(90000);
  await page.goto("/prototype/hanh-trinh");
  const featured = page.getByRole("link", { name: /Contracts.*4\/12/ });
  await expect(featured.locator(".journey-plant")).toHaveCount(4);
  await expect(featured).toHaveAttribute("aria-current", "step");
  await expect(featured).toBeInViewport();
  const width = info.project.name === "mobile" ? 390 : 1440;
  await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
  for (const theme of ["light", "dark"] as const) {
    await setTheme(page, theme);
    expect((await scanAccessibility(page)).violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await featured.scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath(`map-${width}-${theme}.png`) });
  }
  await featured.click();
  const garden = /\/prototype\/hanh-trinh\/vuon\/1$/;
  await expect(page).toHaveURL(garden);
  await expect(page.locator(".journey-field")).toBeVisible();
  for (const theme of ["light", "dark"] as const) {
    await setTheme(page, theme);
    await page.screenshot({ path: info.outputPath(`garden-${width}-${theme}.png`) });
  }
  const water = page.locator('.journey-plot[data-state="thirsty"]').first();
  await expect.soft(water).toHaveAccessibleName("Tưới cây ở ô 1");
  await expect.soft(page.locator(".journey-field")).not.toContainText(/abide by|agreement/i);
  await water.click();
  const dialog = page.getByRole("dialog", { name: /Tưới/ });
  await expect(dialog).toBeVisible();
  await expect.soft(dialog).toHaveAccessibleName("Tưới cây ở ô 1");
  await expect.soft(dialog).not.toContainText(/abide by/i);
  await dialog.getByRole("textbox").fill("abide by");
  await dialog.getByRole("button", { name: "Kiểm tra", exact: true }).click();
  await expect(dialog.getByText("abide by", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Về vườn", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL(garden);
  await expect(page.getByRole("button", { name: "Tưới cây ở ô 1", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Xem abide by", exact: true })).toContainText("Đã tưới hôm nay");

  await page.getByRole("button", { name: "Gieo luống 2", exact: true }).click();
  const sow = page.getByRole("dialog", { name: /Gieo luống/ });
  await expect(sow).toBeVisible();
  await sow.getByRole("button", { name: "Thử nhớ lại" }).click();
  await sow.getByRole("button", { name: "Chưa nhớ, xem đáp án" }).click();
  await sow.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(sow).toHaveCount(0);
  await expect(page.getByText("5/12 đã trồng", { exact: true })).toBeVisible();
  for (const theme of ["light", "dark"] as const) {
    await setTheme(page, theme);
    expect((await scanAccessibility(page)).violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  if (info.project.name === "mobile") {
    await page.setViewportSize({ width: 360, height: 800 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const plot = page.getByRole("button", { name: "Xem abide by", exact: true });
    const plant = await plot.locator(".journey-plant").boundingBox();
    const word = await plot.locator(".journey-word").boundingBox();
    expect(plant!.y + plant!.height).toBeLessThanOrEqual(word!.y);
    await page.setViewportSize({ width, height: 844 });
    await page.evaluate(() => window.scrollTo(0, 0));
  }
  await page.getByRole("link", { name: "← Bản đồ hành trình" }).click();
  await expect(page.getByRole("link", { name: /Contracts.*5\/12/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("link", { name: /Contracts.*4\/12/ })).toBeVisible();
});

test("a missed watering keeps the plant slightly thirsty without allowing another review today", async ({ page }) => {
  await page.goto("/prototype/hanh-trinh/vuon/1");
  const wilted = page.getByRole("button", { name: "Tưới cây ở ô 1", exact: true });
  await expect(wilted).toContainText("Héo nặng");
  await wilted.click();
  const dialog = page.getByRole("dialog", { name: "Tưới cây ở ô 1" });
  await dialog.getByRole("button", { name: "Chưa nhớ, xem đáp án" }).click();
  await dialog.getByRole("button", { name: "Về vườn", exact: true }).click();
  const plant = page.getByRole("button", { name: "Xem abide by", exact: true });
  await expect(plant).toContainText("Còn khát nhẹ");
  await expect(wilted).toHaveCount(0);
  await plant.click();
  await expect(page.getByRole("region", { name: "Chi tiết cây" })).toContainText("Mầm · Còn khát nhẹ");
});

test("waters the due plants in one garden round and updates the remaining count", async ({ page }) => {
  await page.goto("/prototype/hanh-trinh/vuon/1");
  const count = page.getByRole("status");
  const water = page.getByRole("button", { name: "Tưới cả vườn", exact: true });
  await expect(count).toHaveText("2 cây cần tưới");
  await water.click();
  const dialog = page.getByRole("dialog", { name: "Tưới cả vườn" });
  for (const [index, value] of ["abide by", "agreement"].entries()) {
    await expect(dialog).toContainText(`Câu ${index + 1}/2`);
    await expect(dialog).not.toContainText(value);
    await dialog.getByRole("textbox").fill(value);
    await dialog.getByRole("button", { name: "Kiểm tra", exact: true }).click();
    await expect(dialog.getByText("Chính xác!", { exact: true })).toBeVisible();
    await dialog.getByRole("button", { name: index === 0 ? "Tiếp tục" : "Về vườn", exact: true }).click();
  }
  await expect(count).toHaveText("Hôm nay không còn cây cần tưới");
  await expect(water).toBeDisabled();
});

test("finishes a whole bed and returns from the shared watering round", async ({ page }, info) => {
  const width = info.project.name === "mobile" ? 390 : 1440;
  await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
  await page.goto("/prototype/hanh-trinh");
  await page.getByText("Dữ liệu thử", { exact: true }).click();
  await page.getByRole("button", { name: "Vườn trống" }).click();
  await expect(page.getByRole("button", { name: "Vườn trống" })).toBeHidden();
  await page.getByRole("link", { name: /Contracts.*0\/12/ }).click();
  await page.getByRole("button", { name: "Gieo luống 1", exact: true }).click();
  const dialog = page.getByRole("dialog");
  for (let index = 0; index < 4; index++) {
    await dialog.getByRole("button", { name: "Thử nhớ lại" }).click();
    await dialog.getByRole("button", { name: "Chưa nhớ, xem đáp án" }).click();
    await dialog.getByRole("button", { name: index < 3 ? "Tiếp tục" : "Về vườn", exact: true }).click();
  }
  await expect(page.getByText("4/12 đã trồng", { exact: true })).toBeVisible();
  await expect(page.getByText("Luống đã trồng đủ", { exact: true })).toBeVisible();
  const grown = page.getByRole("region", { name: "Luống 1", exact: true });
  await expect(grown.locator('[data-sprouting="true"]')).toHaveCount(4);
  await expect(grown).toBeInViewport();
  for (const theme of ["light", "dark"] as const) {
    await setTheme(page, theme);
    await grown.scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath(`after-sowing-${width}-${theme}.png`), animations: "disabled" });
  }
  await page.getByRole("link", { name: "← Bản đồ hành trình" }).click();
  await page.getByText("Dữ liệu thử", { exact: true }).click();
  await page.getByRole("button", { name: "Vườn có cây khát" }).click();
  await page.getByRole("button", { name: "Bình tưới chung (2)", exact: true }).click();
  await expect(dialog).toHaveAccessibleName("Bình tưới chung");
  for (const [index, value] of ["abide by", "agreement"].entries()) {
    await dialog.getByRole("textbox").fill(value);
    await dialog.getByRole("button", { name: "Kiểm tra", exact: true }).click();
    await expect(dialog.getByText("Chính xác!", { exact: true })).toBeVisible();
    await dialog.getByRole("button", { name: index === 0 ? "Tiếp tục" : "Về bản đồ", exact: true }).click();
  }
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Bình tưới chung (0)", exact: true })).toBeDisabled();
  const revived = page.getByRole("link", { name: /Contracts.*4\/12/ });
  await expect(revived.locator('.journey-plant[data-recovered="true"]')).toHaveCount(2);
  for (const theme of ["light", "dark"] as const) {
    await setTheme(page, theme);
    await revived.scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath(`after-watering-${width}-${theme}.png`), animations: "disabled" });
  }
});

test("unlocks the first trial from planted words independently of garden completion", async ({ page }) => {
  await page.goto("/prototype/hanh-trinh");
  await page.getByText("Dữ liệu thử", { exact: true }).click();
  await page.getByRole("button", { name: "Đủ ngưỡng Kiếp nạn", exact: true }).click();
  const furnace = page.getByRole("button", { name: /Lò đan/ });
  await expect(furnace).toContainText("Kiếp nạn sẵn sàng");
  await expect(furnace).toHaveAttribute("data-complete", "false");
  await furnace.click();
  const gate = page.getByRole("dialog", { name: "Kiếp nạn" });
  await expect(gate).toContainText(/cây đang khát/);
  await gate.getByRole("button", { name: "Vào Kiếp nạn luôn" }).click();
  await expect(gate.getByText("Sẽ dựng ở đợt sau")).toBeVisible();
  await gate.getByRole("button", { name: "Đóng", exact: true }).click();
  await page.getByText("Dữ liệu thử", { exact: true }).click();
  await page.getByRole("button", { name: "Xong vùng 1 · nhiều cây khát", exact: true }).click();
  await expect(furnace).toHaveAttribute("data-complete", "true");
  await expect(furnace).toContainText("5/5 vườn hoàn thành");
  await expect(page.locator('a[aria-current="step"][href$="/vuon/6"]')).toBeInViewport();
});

test("opens a future region and waters another garden from its reminder", async ({ page }) => {
  await page.goto("/prototype/hanh-trinh");
  const nextRegion = page.getByRole("button", { name: "Văn phòng Chưa khám phá" });
  await nextRegion.click();
  await expect(page.getByRole("button", { name: "Văn phòng Đang khám phá" })).toHaveAttribute("aria-expanded", "true");
  await page.locator('a[href="/prototype/hanh-trinh/vuon/6"]').click();
  const reminder = page.getByRole("complementary", { name: "Nhắc tưới vườn khác" });
  await reminder.getByRole("button", { name: "Tưới trước" }).click();
  const dialog = page.getByRole("dialog", { name: "Bình tưới chung" });
  for (const [index, value] of ["abide by", "agreement"].entries()) {
    await dialog.getByRole("textbox").fill(value);
    await dialog.getByRole("button", { name: "Kiểm tra", exact: true }).click();
    await dialog.getByRole("button", { name: index === 0 ? "Tiếp tục" : "Về bản đồ", exact: true }).click();
  }
  await expect(page).toHaveURL(/\/hanh-trinh$/);
  await expect(page.getByRole("link", { name: /Contracts.*4\/12/ })).toHaveAttribute("data-recovered", "true");
});
