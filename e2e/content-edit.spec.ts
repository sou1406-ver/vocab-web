import { scanAccessibility, waitForSaved } from "./app-ready";
import { test, expect, type Page } from "@playwright/test";

// Full admin content flow against the Auth + Firestore emulators (dev server built with NEXT_PUBLIC_FIREBASE_EMULATORS=1).
test.describe.configure({ mode: "serial" });

const AUTH = "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1";
const API_KEY = "AIzaSyCwcc6NYcrLS8CbnSvIJZ2AX4W50D8uENo";

// Signs in without the Google popup (it needs apis.google.com): mint an emulator session over REST, grant the
// reviewer claim, then store the session where Firebase Auth keeps it so the app restores it on reload.
async function signInAsReviewer(page: Page, request: import("@playwright/test").APIRequestContext, name: string) {
  const idp = () =>
    request
      .post(`${AUTH}/accounts:signInWithIdp?key=${API_KEY}`, {
        data: {
          requestUri: "http://127.0.0.1:5174",
          returnSecureToken: true,
          postBody: `id_token=${encodeURIComponent(
            JSON.stringify({ sub: name, email: `${name}@example.test`, email_verified: true }),
          )}&providerId=google.com`,
        },
      })
      .then((response) => response.json());
  const first = await idp();
  const grant = await request.post(`${AUTH}/projects/demo-vocab-sync/accounts:update`, {
    headers: { Authorization: "Bearer owner" },
    data: { localId: first.localId, customAttributes: JSON.stringify({ contentReviewer: true }) },
  });
  expect(grant.ok()).toBe(true);
  const session = await idp();
  await page.goto("/settings");
  await page.evaluate(
    ({ session, apiKey }) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open("firebaseLocalStorageDb", 1);
        open.onupgradeneeded = () => open.result.createObjectStore("firebaseLocalStorage", { keyPath: "fbase_key" });
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const key = `firebase:authUser:${apiKey}:vocab-web-next`;
          const value = {
            uid: session.localId,
            email: session.email,
            emailVerified: true,
            isAnonymous: false,
            providerData: [
              {
                providerId: "google.com",
                uid: session.email,
                email: session.email,
                displayName: null,
                phoneNumber: null,
                photoURL: null,
              },
            ],
            stsTokenManager: {
              refreshToken: session.refreshToken,
              accessToken: session.idToken,
              expirationTime: Date.now() + 3_000_000,
            },
            createdAt: String(Date.now()),
            lastLoginAt: String(Date.now()),
            apiKey,
            appName: "vocab-web-next",
          };
          const tx = open.result.transaction("firebaseLocalStorage", "readwrite");
          tx.objectStore("firebaseLocalStorage").put({ fbase_key: key, value });
          tx.oncomplete = () => {
            open.result.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    { session, apiKey: API_KEY },
  );
  await page.reload();
  await page.getByRole("textbox", { name: "Username", exact: true }).fill(name);
  await page.getByRole("button", { name: "Tạo tài khoản", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Chọn username", exact: true })).toHaveCount(0);
  await waitForSaved(page);
}

async function libraryMeaning(page: Page, word: string) {
  await page.goto("/library");
  await page.getByPlaceholder(/Tìm từ/).fill(word);
  const card = page.locator(".vocabulary-card").filter({ has: page.getByRole("heading", { name: word, exact: true }) });
  return card;
}

test("an admin edits, hides, adds and reverts content that learners then see", async ({
  page,
  browser,
  request,
}, testInfo) => {
  test.skip(process.env.FIREBASE_SYNC_EMULATOR_TEST !== "1", "Requires local Firebase emulators.");
  test.skip(testInfo.project.name !== "desktop", "One run is enough: the flow writes shared emulator data.");
  test.setTimeout(150000);
  const run = crypto.randomUUID().slice(0, 6);
  await signInAsReviewer(page, request, `ed_${run}`);
  await page.goto("/admin#content");
  const words = page.locator(".admin-panel");
  await expect(words).toBeVisible();

  // Edit a meaning.
  const row = words.locator(".admin-word-list li").filter({ hasText: "abide by" });
  await row.getByRole("button", { name: "Sửa", exact: true }).click();
  expect((await scanAccessibility(page)).violations).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("word-form.png"), fullPage: true });
  await page.getByLabel("Nghĩa tiếng Việt *").fill(`tuân thủ ${run}`);
  await page.getByRole("button", { name: "Lưu", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Đã lưu “abide by”." })).toBeVisible();
  await expect(row.getByText("Đã sửa", { exact: true })).toBeVisible();

  // Hide another word.
  const agreement = words.locator(".admin-word-list li").filter({ hasText: "agreement" });
  await agreement.getByRole("button", { name: "Ẩn", exact: true }).click();
  await expect(agreement.getByText("Đã ẩn", { exact: true })).toBeVisible();

  // Add a word.
  await page.getByRole("button", { name: "Thêm từ vào bài 1", exact: true }).click();
  await page.getByLabel("Từ *").fill(`zeta${run}`);
  await page.getByLabel("Nghĩa tiếng Việt *").fill("từ thử nghiệm");
  await page.getByRole("button", { name: "Lưu", exact: true }).click();
  await expect(words.locator(".admin-word-list li").filter({ hasText: `zeta${run}` })).toBeVisible();

  expect((await scanAccessibility(page)).violations).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("word-list.png"), fullPage: true });

  // Rename lesson 1.
  await page.getByRole("tab", { name: "Bài & chủ đề", exact: true }).click();
  expect((await scanAccessibility(page)).violations).toEqual([]);
  await page.getByLabel("Tên bài · Bài 1", { exact: true }).fill(`Contracts ${run}`);
  await page
    .locator(".admin-rename-row")
    .filter({ has: page.getByLabel("Tên bài · Bài 1", { exact: true }) })
    .getByRole("button", { name: "Lưu" })
    .click();
  await expect(page.getByRole("status").filter({ hasText: "Đã lưu bài 1." })).toBeVisible();

  // A fresh learner (no cache) sees every change.
  const learner = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const other = await learner.newPage();
  await expect((await libraryMeaning(other, "abide by")).getByText(`tuân thủ ${run}`)).toBeVisible();
  await expect(await libraryMeaning(other, "agreement")).toHaveCount(0);
  await expect((await libraryMeaning(other, `zeta${run}`)).getByText("từ thử nghiệm")).toBeVisible();
  await other.goto("/lessons");
  await expect(other.getByRole("heading", { name: `Contracts ${run}` })).toBeVisible();
  await learner.close();

  // Revert everything; this browser shows the originals again.
  await page.goto("/admin#content");
  await page.getByRole("tab", { name: "Bài & chủ đề", exact: true }).click();
  await page
    .locator(".admin-rename-row")
    .filter({ hasText: "Bài 1" })
    .getByRole("button", { name: "Hoàn tác" })
    .click();
  await expect(page.getByRole("status").filter({ hasText: "Đã trả bài 1 về tên gốc." })).toBeVisible();
  await page.getByRole("tab", { name: "Từ vựng", exact: true }).click();
  await words
    .locator(".admin-word-list li")
    .filter({ hasText: "abide by" })
    .getByRole("button", { name: "Hoàn tác" })
    .click();
  await expect(page.getByRole("status").filter({ hasText: "về bản gốc" })).toBeVisible();
  await words
    .locator(".admin-word-list li")
    .filter({ hasText: "agreement" })
    .getByRole("button", { name: "Hiện lại" })
    .click();
  await expect(page.getByRole("status").filter({ hasText: "Đã hiện lại “agreement”." })).toBeVisible();
  await words
    .locator(".admin-word-list li")
    .filter({ hasText: `zeta${run}` })
    .getByRole("button", { name: "Ẩn" })
    .click();
  await expect((await libraryMeaning(page, "abide by")).getByText("tuân thủ, chấp hành")).toBeVisible();
  await expect(await libraryMeaning(page, `zeta${run}`)).toHaveCount(0);
});
