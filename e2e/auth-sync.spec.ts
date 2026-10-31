import { scanAccessibility, toggleTheme, waitForSaved } from "./app-ready";
import { test, expect, type Page } from "@playwright/test";

test.skip(
  process.env.E2E_FIREBASE_EMULATOR !== "1",
  "Requires the explicitly configured local Auth/Firestore emulators.",
);

async function googleLogin(page: Page, email: string) {
  const pending = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Đăng nhập bằng Google", exact: true }).click();
  const popup = await pending;
  await popup.waitForURL(/127\.0\.0\.1:9099\/emulator\/auth\/handler/);
  await expect(popup.getByRole("button", { name: /Add new account/ })).toBeVisible();
  const account = popup.getByRole("button").filter({ hasText: email });
  if (await account.count()) await account.click();
  else {
    await popup.getByRole("button", { name: /Add new account/ }).click();
    await popup.locator("#email-input").fill(email);
    await popup.locator("#display-name-input").fill("Người học thử");
    await popup.getByRole("button", { name: "Sign in with Google.com", exact: true }).click();
  }
  await expect(page.getByText(email, { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Đăng xuất", exact: true })).toBeEnabled();
}
async function savedProfiles(page: Page) {
  return page.evaluate(
    () =>
      new Promise<{ key: string; name: string; words: number; pending: number }[]>((resolve, reject) => {
        const open = indexedDB.open("vocab-learn-v2", 1);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction("snapshots", "readonly");
          const store = tx.objectStore("snapshots");
          const keys = store.getAllKeys();
          const values = store.getAll();
          tx.oncomplete = () => {
            db.close();
            resolve(
              values.result.map((value, index) => {
                const snapshot = value.snapshot ?? value;
                return {
                  key: String(keys.result[index]),
                  name: snapshot.settings.name,
                  words: Object.keys(snapshot.progress).length,
                  pending: value.pending?.length ?? 0,
                };
              }),
            );
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
  );
}

test("Google login imports guest only on consent, syncs two devices, queues offline and isolates logout/account switch", async ({
  page,
  browser,
}, testInfo) => {
  test.setTimeout(120000);
  const email = `learner-${testInfo.project.name}-${crypto.randomUUID()}@example.test`;
  await page.goto("/settings");
  await page.getByLabel("Mình gọi bạn là gì?").fill("Dữ liệu khách");
  await page.getByRole("button", { name: "Lưu tuỳ chọn", exact: true }).click();
  await waitForSaved(page);
  await page.goto("/books/toeic-600/lessons/1");
  await page.getByRole("button", { name: "Học 5 từ tiếp theo", exact: true }).click();
  await page.getByRole("button", { name: "Đã xem, thử nhớ lại" }).click();
  await page.getByRole("button", { name: "Chưa nhớ, xem đáp án" }).click();
  await expect(page.locator(".answer-feedback")).toBeVisible();
  await waitForSaved(page);
  await page.goto("/settings");
  await googleLogin(page, email);
  await expect(page.getByLabel("Mình gọi bạn là gì?")).toHaveValue("");
  await page.getByRole("button", { name: "Nhập tiến độ vào tài khoản", exact: true }).click();
  await expect(page.getByLabel("Mình gọi bạn là gì?")).toHaveValue("Dữ liệu khách");
  await expect
    .poll(async () => (await savedProfiles(page)).find((profile) => profile.key.startsWith("user:"))?.pending)
    .toBe(0);
  const secondContext = await browser.newContext({ viewport: page.viewportSize() ?? undefined });
  try {
    const second = await secondContext.newPage();
    await second.goto("http://127.0.0.1:5174/settings");
    await googleLogin(second, email);
    await expect(second.getByLabel("Mình gọi bạn là gì?")).toHaveValue("Dữ liệu khách");
    await expect
      .poll(async () => (await savedProfiles(second)).find((profile) => profile.key.startsWith("user:"))?.words)
      .toBe(1);
    await page.context().setOffline(true);
    await page.getByLabel("Mình gọi bạn là gì?").fill("Học offline");
    await page.getByRole("button", { name: "Lưu tuỳ chọn", exact: true }).click();
    await expect
      .poll(async () => (await savedProfiles(page)).find((profile) => profile.key.startsWith("user:"))?.pending)
      .toBeGreaterThan(0);
    await expect(second.getByLabel("Mình gọi bạn là gì?")).toHaveValue("Dữ liệu khách");
    await page.context().setOffline(false);
    // The pending queue is confirmed above; reload deliberately tests its recovery.
    await page.reload();
    await expect(second.getByLabel("Mình gọi bạn là gì?")).toHaveValue("Học offline", { timeout: 20000 });
    await expect(page.getByLabel("Mình gọi bạn là gì?")).toHaveValue("Học offline");
    expect((await scanAccessibility(page)).violations).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath("account-sync-light.png"), fullPage: true });
    await toggleTheme(page);
    expect((await scanAccessibility(page)).violations).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath("account-sync-dark.png"), fullPage: true });
    await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
    await expect(page.getByLabel("Mình gọi bạn là gì?")).toHaveValue("Dữ liệu khách");
    const other = `other-${crypto.randomUUID()}@example.test`;
    await googleLogin(page, other);
    await page.getByRole("button", { name: "Giữ riêng dữ liệu khách", exact: true }).click();
    await expect(page.getByLabel("Mình gọi bạn là gì?")).toHaveValue("");
    const profiles = await savedProfiles(page);
    expect(profiles.find((profile) => profile.key === "guest")).toMatchObject({ name: "Dữ liệu khách", words: 1 });
    expect(
      profiles
        .filter((profile) => profile.key.startsWith("user:"))
        .map((profile) => profile.words)
        .sort(),
    ).toEqual([0, 1]);
    await expect(second.getByLabel("Mình gọi bạn là gì?")).toHaveValue("Học offline");
  } finally {
    await secondContext.close();
  }
});

test("closing Google popup leaves guest data usable", async ({ page }) => {
  await page.goto("/settings");
  const pending = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Đăng nhập bằng Google", exact: true }).click();
  const popup = await pending;
  await popup.waitForURL(/127\.0\.0\.1:9099\/emulator\/auth\/handler/);
  await expect(popup.getByRole("button", { name: /Add new account/ })).toBeVisible();
  await popup.close();
  await expect(
    page.getByText("Bạn đã đóng cửa sổ đăng nhập. Có thể thử lại khi sẵn sàng.", { exact: true }),
  ).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole("button", { name: "Đăng nhập bằng Google", exact: true })).toBeEnabled();
  await page.getByLabel("Mình gọi bạn là gì?").fill("Vẫn học được");
  await page.getByRole("button", { name: "Lưu tuỳ chọn", exact: true }).click();
  await expect(page.getByText("Đã lưu tuỳ chọn của bạn.", { exact: true })).toBeVisible();
});
