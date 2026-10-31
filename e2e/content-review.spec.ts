import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import type { Snapshot } from "../src/domain/types";

test("guests cannot open reviewer tools or see an admin menu entry", async ({ page }) => {
  await page.goto("/review");
  await expect(page.getByRole("heading", { name: "Kiểm tra nội dung", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Bộ lọc nội dung" })).toHaveCount(0);
  await page.getByRole("button", { name: "Mở hồ sơ", exact: true }).click();
  await expect(page.getByRole("link", { name: "Kiểm tra nội dung", exact: true })).toHaveCount(0);
});

test("only the reviewer claim opens all exercise previews without recording learning", async ({
  page,
  request,
}, testInfo) => {
  test.skip(process.env.FIREBASE_SYNC_EMULATOR_TEST !== "1", "Requires local Firebase emulators.");
  test.setTimeout(90000);
  const name = `rv_${testInfo.project.name}_${crypto.randomUUID().slice(0, 6)}`;
  await page.goto("/settings");
  const popupReady = page.waitForEvent("popup");
  const signedIn = page.waitForResponse((response) => response.url().includes("accounts:signInWithIdp"));
  await page.getByRole("button", { name: "Đăng nhập bằng Google", exact: true }).click();
  const popup = await popupReady;
  await popup.waitForLoadState("load");
  expect(popup.url()).toContain("127.0.0.1:9099/");
  await popup.getByRole("button", { name: /Add new account/ }).click();
  await popup.getByLabel("Email", { exact: true }).fill(`${name}@example.test`);
  await popup.getByLabel("Display name", { exact: true }).fill("Content reviewer fixture");
  await popup.getByRole("button", { name: "Sign in with Google.com", exact: true }).click();
  const identity = await (await signedIn).json();
  expect(identity.localId).toBeTruthy();
  await page.getByRole("textbox", { name: "Username", exact: true }).fill(name);
  await page.getByRole("button", { name: "Tạo tài khoản", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Chọn username", exact: true })).toHaveCount(0);
  await page.goto("/review");
  await expect(
    page.getByText("Khu vực này dành cho tài khoản được cấp quyền kiểm tra nội dung.", { exact: true }),
  ).toBeVisible();
  const grant = await request.post(
    "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/demo-vocab-sync/accounts:update",
    {
      headers: { Authorization: "Bearer owner" },
      data: { localId: identity.localId, customAttributes: JSON.stringify({ contentReviewer: true }) },
    },
  );
  expect(grant.ok()).toBe(true);
  await page.reload();
  await expect(page.getByRole("region", { name: "Bộ lọc nội dung" })).toBeVisible();
  const readOwnSnapshot = () =>
    page.evaluate(
      (uid) =>
        new Promise<Snapshot | undefined>((resolve, reject) => {
          const open = indexedDB.open("vocab-learn-v2", 1);
          open.onerror = () => reject(open.error);
          open.onsuccess = () => {
            const db = open.result;
            const tx = db.transaction("snapshots", "readonly");
            const read = tx.objectStore("snapshots").get(`user:${uid}`);
            read.onsuccess = () => resolve(read.result?.snapshot);
            read.onerror = () => reject(read.error);
            tx.oncomplete = () => db.close();
          };
        }),
      identity.localId as string,
    );
  const before = await readOwnSnapshot();
  const formats = await page
    .getByLabel("Dạng bài", { exact: true })
    .locator("option")
    .evaluateAll((nodes) => nodes.map((node) => (node as HTMLOptionElement).value));
  for (const format of formats) {
    await page.getByLabel("Dạng bài", { exact: true }).selectOption(format);
    await expect(
      page
        .locator(".review-question")
        .first()
        .or(page.getByText("Bài này chưa có câu phù hợp cho dạng đã chọn.", { exact: true })),
    ).toBeVisible();
    await expect(page.getByRole("alert")).toHaveCount(0);
  }
  const after = await readOwnSnapshot();
  expect(after?.events ?? []).toEqual(before?.events ?? []);
  expect(after?.progress ?? {}).toEqual(before?.progress ?? {});
  expect(after?.session ?? null).toEqual(before?.session ?? null);
  await page.getByRole("button", { name: "Mở hồ sơ", exact: true }).click();
  await expect(page.getByRole("link", { name: "Kiểm tra nội dung", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("content-review.png"), fullPage: true });
});
