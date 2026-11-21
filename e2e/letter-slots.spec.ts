import { scanAccessibility, setTheme, waitForResult, waitForSaved, clickRandomLetterHint } from "./app-ready";
import { test, expect } from "@playwright/test";
import { readSnapshot } from "./speech-mock";

test("letter slots support native editing, phrase spaces and submission", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Bắt đầu học", exact: true }).click();
  await page.getByRole("button", { name: "Đã xem, thử nhớ lại" }).click();
  await page.getByRole("button", { name: "Chưa nhớ, xem đáp án" }).click();
  await page.getByRole("button", { name: "Từ tiếp theo" }).click();
  await page.getByRole("button", { name: "Đã xem, thử nhớ lại" }).click();
  const input = page.getByRole("textbox", { name: "Đáp án của bạn" });
  await expect(page.locator(".letter-slot")).toHaveCount(9);
  await expect(input).toBeFocused();
  await expect(input).toHaveAttribute("lang", "en");
  await expect(input).toHaveAttribute("spellcheck", "false");
  await input.fill("agreemenx");
  await input.press("End");
  await input.press("Backspace");
  await input.press("t");
  await expect(input).toHaveValue("agreement");
  await expect(page.locator(".letter-slot").last()).toHaveText("t");
  await input.evaluate((node) => (node as HTMLInputElement).setSelectionRange(4, 4));
  await input.press("Backspace");
  await expect(input).toHaveValue("agrement");
  expect(await input.evaluate((node) => (node as HTMLInputElement).selectionStart)).toBe(3);
  await input.press("e");
  await expect(input).toHaveValue("agreement");
  const tapSlot = async (index: number) => {
    const box = await page.locator(`[data-slot-index="${index}"]`).boundingBox();
    if (testInfo.project.name === "mobile")
      await page.touchscreen.tap(box!.x + box!.width / 2, box!.y + box!.height / 2);
    else await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
  };
  for (const key of ["Backspace", "Delete"]) {
    await input.fill("definitio");
    await tapSlot(4); // Select N, immediately after I.
    await input.press(key);
    await expect(input).toHaveValue("defiitio");
  }
  await input.fill("definitio");
  await tapSlot(4);
  await input.press("x");
  await expect(input).toHaveValue("defixitio");
  await input.fill("agreement");
  const rows = await page
    .locator(".letter-slot")
    .evaluateAll((nodes) => nodes.map((node) => (node as HTMLElement).offsetTop));
  expect(new Set(rows).size).toBe(1);
  const first = await page.locator(".letter-slot").first().boundingBox();
  if (testInfo.project.name === "mobile")
    await page.touchscreen.tap(first!.x + first!.width / 2, first!.y + first!.height / 2);
  else await page.mouse.click(first!.x + first!.width / 2, first!.y + first!.height / 2);
  expect(await input.evaluate((node) => (node as HTMLInputElement).selectionStart)).toBe(0);
  await input.press("ArrowRight");
  expect(await input.evaluate((node) => (node as HTMLInputElement).selectionStart)).toBe(1);
  await input.press("End");
  const a11y = await scanAccessibility(page);
  expect(a11y.violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `test-results/letter-slots-${testInfo.project.name}.png` });
  await input.press("Enter");
  await expect(page.getByText("Chính xác. Bạn nhớ rồi!")).toBeVisible();
  await waitForSaved(page);
  await page.reload();
  await expect(page.getByText("Chính xác. Bạn nhớ rồi!")).toBeVisible();
  await expect(input).toBeDisabled();
  await page.getByRole("button", { name: "Kết thúc tại đây" }).click();
  await waitForResult(page);
  await page.getByRole("button", { name: "Luyện lại từ vừa sai" }).click();
  // The missed first item is the two-word phrase "abide by".
  await expect(page.locator(".letter-slot")).toHaveCount(7);
  await expect(page.locator(".letter-gap")).toHaveCount(1);
  await input.fill("abide by extra");
  await expect(input).toHaveValue("abide by");
  await input.press("ControlOrMeta+A");
  await input.press("Backspace");
  await expect(input).toHaveValue("");
  await input.pressSequentially("abideby", { delay: 25 });
  await expect(input).toHaveValue("abide by");
  await input.press("Enter");
  await expect(page.getByText("Chính xác. Bạn nhớ rồi!")).toBeVisible();
});

test("hint letters stay locked, record assistance and native input styling is independent of the form", async ({
  page,
  context,
}, testInfo) => {
  test.setTimeout(90000);
  await page.goto("/");
  await page.getByRole("button", { name: "Bắt đầu học", exact: true }).click();
  await page.getByRole("button", { name: "Đã xem, thử nhớ lại" }).click();
  await page.getByRole("button", { name: "Chưa nhớ, xem đáp án" }).click();
  await page.getByRole("button", { name: "Từ tiếp theo" }).click();
  await page.getByRole("button", { name: "Đã xem, thử nhớ lại" }).click();
  const input = page.getByRole("textbox", { name: "Đáp án của bạn" });
  const positions = () =>
    page
      .locator(".letter-slot.is-revealed")
      .evaluateAll((nodes) => nodes.map((node) => Number((node as HTMLElement).dataset.slotIndex)));
  const projected = (indices: number[], uppercase = false) =>
    Array.from("agreement")
      .map((char, index) => (indices.includes(index) ? char : uppercase ? char.toUpperCase() : " "))
      .join("")
      .trimEnd();
  await clickRandomLetterHint(page);
  await expect(page.locator(".letter-slot.is-revealed")).toHaveCount(1);
  const first = await positions();
  expect(first[0]).not.toBe(0);
  await expect(input).toHaveValue(projected(first));
  await expect(page.locator(".letter-slot.is-revealed")).toHaveText("agreement"[first[0]]);
  await input.press("ControlOrMeta+A");
  await input.press("Backspace");
  await expect(input).toHaveValue(projected(first));
  await waitForSaved(page);
  await page.reload();
  await expect(input).toHaveValue(projected(first));
  const other = await context.newPage();
  await waitForSaved(page);
  await other.goto("/study");
  await clickRandomLetterHint(other);
  await expect(page.locator(".letter-slot.is-revealed")).toHaveCount(2);
  const second = await positions();
  expect((await readSnapshot(page)).session!.revealed!.slice().sort((a, b) => a - b)).toEqual(second);
  await waitForSaved(page);
  await page.reload();
  await expect(input).toHaveValue(projected(second));
  expect(await positions()).toEqual(second);
  if (testInfo.project.name === "desktop") {
    const viewport = page.viewportSize()!;
    const theme = (await page.locator("html").getAttribute("data-theme")) as "light" | "dark";
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      for (const appearance of ["light", "dark"] as const) {
        await setTheme(page, appearance);
        expect((await scanAccessibility(page)).violations).toEqual([]);
        await page.evaluate(() => {
          const focused = document.activeElement;
          if (focused instanceof HTMLElement && focused.matches(".skip-link")) focused.blur();
        });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.screenshot({ path: testInfo.outputPath(`typed-hints-${appearance}-${width}.png`), fullPage: true });
      }
    }
    await page.setViewportSize({ width: 360, height: 800 });
    expect((await scanAccessibility(page)).violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.setViewportSize(viewport);
    await setTheme(page, theme);
  }
  await clickRandomLetterHint(page);
  await expect(page.locator(".letter-slot.is-revealed")).toHaveCount(3);
  const third = await positions();
  await expect(input).toHaveValue(projected(third));
  await input.fill("AGREEMENT");
  await expect(input).toHaveValue(projected(third, true));
  await page.locator("form.typing-answer").evaluate((node) => node.classList.remove("typing-answer"));
  const style = await input.evaluate((node) => {
    const css = getComputedStyle(node);
    return { position: css.position, color: css.color, background: css.backgroundColor };
  });
  expect(style).toEqual({ position: "absolute", color: "rgba(0, 0, 0, 0)", background: "rgba(0, 0, 0, 0)" });
  await input.press("Enter");
  await expect(page.getByText("Gặp lại thêm một lần nhé.")).toBeVisible();
  await waitForSaved(page);
  await page.reload();
  await expect(page.getByText("Gặp lại thêm một lần nhé.")).toBeVisible();
});

test("typed answers cap typing and paste and reject incomplete Enter without recording an answer", async ({
  page,
  context,
}) => {
  await page.goto("/books/toeic-600/lessons/1");
  await page.getByRole("button", { name: "Luyện dạng từ — gõ", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Gõ dạng từ phù hợp" })).toBeVisible();
  expect((await readSnapshot(page)).session!.questions[0].answer).toBe("agreement");
  const input = page.getByRole("textbox", { name: "Đáp án của bạn" });
  await input.press("Enter");
  await expect(page.locator("form.typing-answer [role='alert']")).toHaveText("Còn 9 ô trống");
  expect((await readSnapshot(page)).events).toEqual([]);
  await input.pressSequentially("agreements", { delay: 25 });
  await expect(input).toHaveValue("agreement");
  await expect(page.locator("[data-slot-index]")).toHaveCount(9);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.evaluate(() => navigator.clipboard.writeText("agreements and a much longer suffix"));
  await input.fill("");
  await expect(input).toHaveValue("");
  await input.press("ControlOrMeta+A");
  await input.press("ControlOrMeta+V");
  await expect(input).toHaveValue("agreement");
  await input.fill("  AGREEMENT  ");
  await expect(input).toHaveValue("AGREEMENT");
  await input.fill("agree");
  await input.press("Enter");
  await expect(page.locator("form.typing-answer [role='alert']")).toHaveText("Còn 4 ô trống");
  const incomplete = await readSnapshot(page);
  expect(incomplete.events).toEqual([]);
  expect(incomplete.session!.phase).toBe("question");
  await input.fill("xxxxxxxxx");
  await input.press("Enter");
  await expect(page.getByText("Chưa đúng, cùng xem lại nhé.")).toBeVisible();
  const answered = await readSnapshot(page);
  expect(answered.events[0]).toMatchObject({ correct: false, assisted: false });
  expect(answered.session!.feedback!.input).toBe("xxxxxxxxx");
});

test("typing at End with a final hint fills an empty cell and keeps the hinted letter", async ({ page }, testInfo) => {
  await page.addInitScript(() =>
    Object.defineProperty(crypto, "randomUUID", {
      value: () => "00000000-0000-4000-8000-000000000009",
    }),
  );
  await page.goto("/books/toeic-600/lessons/1");
  await page.getByRole("button", { name: "Luyện dạng từ — gõ", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Gõ dạng từ phù hợp" })).toBeVisible();
  await clickRandomLetterHint(page);
  const input = page.getByRole("textbox", { name: "Đáp án của bạn" });
  await expect(page.locator(".is-revealed[data-slot-index='8']")).toHaveText("t");
  await expect(input).toHaveValue("        t");
  const slot = await page.locator("[data-slot-index='7']").boundingBox();
  if (testInfo.project.name === "mobile")
    await page.touchscreen.tap(slot!.x + slot!.width / 2, slot!.y + slot!.height / 2);
  else await page.mouse.click(slot!.x + slot!.width / 2, slot!.y + slot!.height / 2);
  await input.press("n");
  await expect(input).toHaveValue("       nt");
  await input.press("End");
  await input.press("a");
  await expect(input).toHaveValue("a      nt");
  expect(await input.evaluate((node) => (node as HTMLInputElement).selectionStart)).toBe(1);
  await input.fill("agreement");
  await input.press("Enter");
  await expect(page.getByText("Chính xác. Bạn nhớ rồi!")).toBeVisible();
  expect((await readSnapshot(page)).events[0]).toMatchObject({ correct: true, assisted: false, hintCount: 1 });
});

test("correct answer with a hint within the allowance still receives credit", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Bắt đầu học", exact: true }).click();
  await page.getByRole("button", { name: "Đã xem, thử nhớ lại" }).click();
  await page.getByRole("button", { name: "Chưa nhớ, xem đáp án" }).click();
  await page.getByRole("button", { name: "Từ tiếp theo" }).click();
  await page.getByRole("button", { name: "Đã xem, thử nhớ lại" }).click();
  await clickRandomLetterHint(page);
  const input = page.getByRole("textbox", { name: "Đáp án của bạn" });
  await input.fill("agreement");
  await input.press("Enter");
  await expect(page.getByText("Chính xác. Bạn nhớ rồi!")).toBeVisible();
  await waitForSaved(page);
  await page.reload();
  await expect(page.getByText("Chính xác. Bạn nhớ rồi!")).toBeVisible();
});
