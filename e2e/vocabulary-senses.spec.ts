import { test, expect } from "@playwright/test";
import { waitForSaved, scanAccessibility } from "./app-ready";
import type { Snapshot } from "../src/domain/types";

async function guest(page: import("@playwright/test").Page): Promise<Snapshot> {
  return page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open("vocab-learn-v2", 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const read = db.transaction("snapshots").objectStore("snapshots").get("guest");
          read.onsuccess = () => {
            resolve(read.result);
            db.close();
          };
          read.onerror = () => reject(read.error);
        };
      }),
  );
}

test("learning card fills desktop columns and stacks on mobile in both themes", async ({ page }) => {
  await page.goto("/books/toeic-600/lessons/19");
  await page.getByRole("button", { name: "Học 5 từ tiếp theo", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Làm quen với từ này" })).toBeVisible({ timeout: 20000 });
  const reading = page.locator(".study-card .word-reading");
  const reference = page.locator(".study-card .word-reference");
  await expect(reading).toBeVisible({ timeout: 5000 });
  await expect(reference).toBeVisible();
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const theme of ["light", "dark"]) {
      await page.evaluate((value) => document.documentElement.setAttribute("data-theme", value), theme);
      const left = (await reading.boundingBox())!;
      const right = (await reference.boundingBox())!;
      if (width === 1440) {
        expect(right.x).toBeGreaterThan(left.x + left.width);
        expect(Math.abs(right.y - left.y)).toBeLessThan(8);
      } else expect(right.y).toBeGreaterThan(left.y);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: `test-results/vocabulary-card-${width}-${theme}.png`, fullPage: true });
    }
  }
  expect((await scanAccessibility(page)).violations).toEqual([]);
  await waitForSaved(page);
});

test("pilot checks remaining meanings once, reloads the repair and retains original failed events", async ({
  page,
}) => {
  await page.goto("/books/toeic-600/lessons/19");
  await page.getByRole("button", { name: "Học 5 từ tiếp theo", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Làm quen với từ này" })).toBeVisible({ timeout: 20000 });
  await waitForSaved(page);
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open("vocab-learn-v2", 1);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction("snapshots", "readwrite");
          const store = tx.objectStore("snapshots");
          const read = store.get("guest");
          read.onsuccess = () => {
            const data = read.result;
            data.session.questions = data.session.questions.filter(
              (q: { senseCheck?: { wordId: string } }) => q.senseCheck?.wordId === "charge-19",
            );
            store.put(data, "guest");
          };
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onabort = () => reject(tx.error);
        };
        request.onerror = () => reject(request.error);
      }),
  );
  await page.reload();
  const answer = async (correct: boolean) => {
    const state = await guest(page);
    const question = state.session!.questions[state.session!.index];
    await page.getByRole("button", { name: "Đã xem, thử nhớ lại" }).click();
    if ("options" in question && question.options?.length) {
      const value = correct ? question.answer : question.options.find((option) => option !== question.answer)!;
      await page
        .locator(".answer-option")
        .filter({ hasText: value as string })
        .click();
    } else {
      await page.getByRole("textbox", { name: "Đáp án của bạn" }).fill(correct ? (question.answer as string) : "wrong");
      await page.getByRole("button", { name: "Kiểm tra", exact: true }).click();
    }
    await expect(page.locator(".answer-feedback")).toBeVisible();
    await waitForSaved(page);
  };
  await answer(false);
  await page.getByRole("button", { name: "Từ tiếp theo", exact: true }).click();
  await answer(true);
  await page.getByRole("button", { name: "Từ tiếp theo", exact: true }).click();
  await answer(true);
  const before = await guest(page);
  expect(before.session!.questions).toHaveLength(4);
  expect(before.events.map((e) => e.senseCheck?.role)).toEqual(["scheduled", "scheduled", "scheduled"]);
  await page.getByRole("button", { name: "Từ tiếp theo", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Học lại nghĩa này" })).toBeVisible();
  await waitForSaved(page);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Học lại nghĩa này" })).toBeVisible();
  await answer(true);
  const after = await guest(page);
  expect(after.progress).toEqual(before.progress);
  expect(after.events).toHaveLength(4);
  expect(after.events[0].correct).toBe(false);
  expect(after.events[3].senseCheck?.role).toBe("repair");
  await page.getByRole("button", { name: "Xem kết quả", exact: true }).click();
  await expect(page.getByText("Đã qua các nghĩa cần học", { exact: true })).toBeVisible();
});

test("saved legacy pilot word learns missing meanings instead of starting practice", async ({ page }) => {
  await page.goto("/books/toeic-600/lessons/19");
  await page.getByRole("button", { name: "Học 5 từ tiếp theo", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Làm quen với từ này" })).toBeVisible({ timeout: 20000 });
  await waitForSaved(page);
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open("vocab-learn-v2", 1);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction("snapshots", "readwrite");
          const store = tx.objectStore("snapshots");
          const read = store.get("guest");
          read.onsuccess = () => {
            const data = read.result;
            data.session = null;
            data.savedWords = ["charge-19"];
            data.progress["charge-19"] = { ...data.progress["charge-19"], tested: true, box: 5 };
            store.put(data, "guest");
          };
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onabort = () => reject(tx.error);
        };
        request.onerror = () => reject(request.error);
      }),
  );
  await page.goto("/library?filter=saved");
  await expect(page.getByText("Còn nghĩa chưa học", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Học từ đã lưu", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Làm quen với từ này" })).toBeVisible();
  const state = await guest(page);
  expect(state.session!.mode).toBe("learn");
  expect(state.session!.questions).toHaveLength(3);
});

test("old fingerprint session preserves its answers and progress when ended after the content update", async ({
  page,
}) => {
  await page.goto("/books/toeic-600/lessons/19");
  await page.getByRole("button", { name: "Học 5 từ tiếp theo", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Làm quen với từ này" })).toBeVisible({ timeout: 20000 });
  await waitForSaved(page);
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open("vocab-learn-v2", 1);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction("snapshots", "readwrite");
          const store = tx.objectStore("snapshots");
          const read = store.get("guest");
          read.onsuccess = () => {
            const data = read.result;
            const at = Date.now() - 86400000;
            const day = new Date(at).toISOString().slice(0, 10);
            data.progress["charge-19"] = {
              startedAt: at,
              startedDay: day,
              box: 4,
              dueAt: Date.now() + 86400000,
              correct: 9,
              incorrect: 2,
              tested: true,
              policyVersion: 1,
            };
            data.events = [
              {
                id: "legacy:0",
                sessionId: "legacy",
                wordId: "charge-19",
                at,
                day,
                correct: true,
                assisted: false,
                mode: "learn",
                questionKind: "recall",
                contentVersion: "cbd94fa970e5",
                scoringVersion: 2,
                hintCount: 0,
                hintLimit: 1,
              },
            ];
            data.session = {
              id: "legacy",
              title: "Bài 19 cũ",
              mode: "learn",
              contentVersion: "cbd94fa970e5",
              index: 1,
              phase: "question",
              feedback: null,
              startedAt: at,
              questions: [
                { wordId: "charge-19", kind: "recall", prompt: "thu phí; khoản phí", answer: "charge", options: [] },
                { wordId: "order-19", kind: "recall", prompt: "đơn hàng; ra lệnh", answer: "order", options: [] },
              ],
            };
            store.put(data, "guest");
          };
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onabort = () => reject(tx.error);
        };
        request.onerror = () => reject(request.error);
      }),
  );
  const before = await guest(page);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Nội dung bài học đã cập nhật" })).toBeVisible();
  await page.getByRole("button", { name: "Giữ kết quả và kết thúc lượt" }).click();
  await waitForSaved(page);
  const after = await guest(page);
  expect(after.events).toEqual(before.events);
  expect(after.progress).toEqual(before.progress);
  expect(after.session!.contentVersion).toBe("cbd94fa970e5");
  expect(after.session!.phase).toBe("complete");
});
