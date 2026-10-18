import { expect, test, type Page } from "@playwright/test";

const flat = (s: string) => s.replace(/\s+/g, " ").slice(0, 260);

/** Một bước của robot làm bài */
async function step(page: Page): Promise<string> {
  if (await page.getByText("Hoàn thành lượt luyện!").isVisible()) return "done";
  const next = page.locator("#quiz-next");
  if (await next.isVisible()) {
    await next.click();
    return "next";
  }
  const left = page.locator(".match-column").first();
  if (await left.isVisible()) {
    for (let i = 0; i < 6; i++) {
      const w = left.locator("button:not([disabled])").first();
      if (!(await w.count())) break;
      await w.click();
      const m = page.locator(".match-column").nth(1).locator(".match-choice:not(.paired):not([disabled])").first();
      if (!(await m.count())) break;
      await m.click();
    }
    const check = page.getByRole("button", { name: /Kiểm tra/ });
    if (await check.first().isVisible()) await check.first().click();
    return "match";
  }
  const choice = page.locator(".choice:not([disabled])");
  const nc = await choice.count();
  if (nc > 0) {
    await choice.nth(Math.floor(Math.random() * nc)).click();
    return "choice";
  }
  const tiles = page.locator(".tiles .morph:not([disabled]):not(.used)");
  if ((await tiles.count()) > 0) {
    await tiles.first().click();
    const check = page.getByRole("button", { name: "Kiểm tra" });
    if ((await page.locator(".slots .morph").count()) >= 2 && (await check.isEnabled())) await check.click();
    return "tile";
  }
  const input = page.locator("#quiz-input:not([disabled]), .letter-slot-native-input:not([disabled])").first();
  if (await input.count()) {
    const slots = await page.locator(".letter-slot").count();
    await input.fill("a".repeat(Math.max(slots, 3)));
    const check = page.getByRole("button", { name: "Kiểm tra" });
    if (await check.isVisible()) await check.click();
    else await input.press("Enter");
    return "type";
  }
  return "nothing";
}

// Robot làm hết 7 dạng bài tới màn kết quả (trả lời ngẫu nhiên cả đúng lẫn sai):
// không được có lỗi JS, không được kẹt, và vượt giới hạn từ mới mỗi ngày phải có thông báo.
test("robot làm hết các dạng bài", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "chạy một lần trên màn hình rộng là đủ (mất ~1 phút)");
  test.setTimeout(500_000);
  page.setDefaultTimeout(4000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && !/fonts|firebase|googleapis/i.test(m.text())) errors.push(m.text());
  });

  // học trước 12 thẻ (vượt giới hạn 10 từ mới/ngày để xem app xử lý)
  await page.goto("#/flashcards");
  for (let i = 0; i < 12; i++) {
    const name = i % 2 ? /Đã nhớ/ : /Đang học/;
    const err = await page
      .getByRole("button", { name })
      .click()
      .then(() => "")
      .catch((e) => String(e).split("\n")[0]);
    const t = await page
      .locator(".toast")
      .last()
      .innerText()
      .catch(() => "");
    console.log(`FLASH ${i} ${err} toast=${flat(t)}`);
    if (i >= 10) expect(t).toContain("giới hạn");
  }

  const results: string[] = [];
  const types = [
    "Theo bậc",
    "Biến đổi từ loại",
    "Đồng nghĩa & Trái nghĩa",
    "Nghĩa của từ",
    "Ghép từ",
    "Điền từ vào câu",
    "Nghe & gõ từ",
  ];
  for (const type of types) {
    try {
      await page.goto("#/quiz");
      await page.reload();
      await page.getByRole("tab", { name: /Tự luyện/ }).click();
      await page.locator(".quiz-scope", { hasText: "Tất cả" }).click();
      if (type !== "Theo bậc") {
        await page.locator(".quiz-custom-types summary").click();
        await page.locator(".quiz-type-option", { hasText: type }).click();
      }
    } catch (e) {
      console.log(`TYPE ${type}: không mở được — ${String(e).split("\n")[0]}`);
      continue;
    }
    let last = "";
    let same = 0;
    let steps = 0;
    let result = "chưa xong";
    const kinds = new Set<string>();
    for (; steps < 150; steps++) {
      let r: string;
      try {
        r = await step(page);
      } catch (e) {
        result = `LỖI BẤM bước ${steps}: ${String(e).split("\n")[0].slice(0, 140)} | ${flat(
          await page
            .locator("main")
            .innerText()
            .catch(() => ""),
        )}`;
        break;
      }
      kinds.add(r);
      if (r === "done") {
        result = "xong";
        break;
      }
      const snap = await page
        .locator("main")
        .innerText()
        .catch(() => "");
      same = snap === last ? same + 1 : 0;
      last = snap;
      if (same >= 6 || r === "nothing") {
        result = `KẸT (${r}) | ${flat(snap)}`;
        break;
      }
    }
    console.log(`TYPE ${type}: ${result} — ${steps} bước [${[...kinds].join(",")}]`);
    results.push(`${type}: ${result}`);
  }
  console.log("ERRORS " + JSON.stringify([...new Set(errors)]));
  expect(errors).toEqual([]);
  expect(results.filter((r) => !r.endsWith(": xong"))).toEqual([]);
});
