import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { readFileSync } from "node:fs";
import { dayKey, emptySnapshot } from "../src/domain/learning";
import { waitForSaved, waitForResult, scanAccessibility, setTheme } from "./app-ready";
import { readSnapshot } from "./speech-mock";

async function capture(page: Page, info: TestInfo, screen: string) {
  const width = info.project.name === "mobile" ? 390 : 1440;
  await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
  for (const theme of ["light", "dark"] as const) {
    await setTheme(page, theme);
    expect((await scanAccessibility(page)).violations).toEqual([]);
    await page.evaluate(() => {
      const activeElement = document.activeElement;
      if (activeElement instanceof HTMLElement && activeElement.matches(".skip-link")) {
        activeElement.blur();
      }
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`study-${screen}-${theme}-${width}.png`), fullPage: true });
  }
}

test("a real tenth learned word shows Luyện Khí once and survives reload with unchanged event IDs", async ({
  page,
}, info) => {
  test.setTimeout(90000);
  await page.goto("/");
  await waitForSaved(page);
  const seed = emptySnapshot();
  const at = Date.now();
  seed.revision = 100;
  const book = JSON.parse(readFileSync(new URL("../data/source/book.json", import.meta.url), "utf8")) as {
    n: number;
    entries: { word: string }[];
  }[];
  const seedIds = book
    .filter((lesson) => lesson.n > 1)
    .flatMap((lesson) =>
      lesson.entries.map(
        (entry) =>
          `${entry.word
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "")}-${lesson.n}`,
      ),
    )
    .slice(0, 9);
  seed.progress = Object.fromEntries(
    seedIds.map((id) => [
      id,
      {
        startedAt: at - 86400000,
        startedDay: dayKey(at - 86400000),
        tested: true,
        box: 1,
        dueAt: at + 86400000,
        correct: 1,
        incorrect: 0,
        policyVersion: 1 as const,
      },
    ]),
  );
  await page.evaluate(
    (snapshot) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open("vocab-learn-v2", 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction("snapshots", "readwrite");
          tx.objectStore("snapshots").put(snapshot, "guest");
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    seed,
  );
  await page.reload();
  await waitForSaved(page);
  await page.getByRole("button", { name: "Bắt đầu học", exact: true }).click();
  await expect(page.getByRole("region", { name: "Tu vi trong lượt" })).toContainText("9 / 10 từ");
  await capture(page, info, "bar");
  await page.getByRole("button", { name: "Đã xem, thử nhớ lại" }).click();
  const before = await readSnapshot(page);
  const answer = before.session!.questions[0].answer;
  await page
    .locator(".answer-option")
    .filter({ hasText: answer as string })
    .click();
  await expect(page.getByRole("heading", { name: "Luyện Khí", exact: true })).toBeVisible();
  await waitForSaved(page);
  await capture(page, info, "breakthrough");
  await page.keyboard.press("1");
  const earned = await readSnapshot(page);
  expect(earned.cultivationSeen).toEqual([10]);
  expect(earned.events).toHaveLength(1);
  expect(earned.events[0].id).toBe(`${earned.session!.id}:0`);
  await page.reload();
  await waitForSaved(page);
  await expect(page.getByRole("heading", { name: "Luyện Khí", exact: true })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Tu vi trong lượt" })).toContainText("10 / 25 từ");
  await page.getByRole("button", { name: "Kết thúc tại đây", exact: true }).click();
  await waitForResult(page);
  await expect(page.locator(".result-score b")).toHaveText("1/1");
  await expect(page.locator(".study-summary-stats > div").filter({ hasText: "Từ mới đã học" })).toContainText("1");
  await expect(page.locator(".study-summary-stats > div").filter({ hasText: "Mới nhớ ổn định" })).toContainText("0");
  await capture(page, info, "summary");
  expect((await readSnapshot(page)).events).toEqual(earned.events);
  await page.setViewportSize({ width: 360, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
