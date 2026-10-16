import { expect, test, type Page } from "@playwright/test";

/** Ghi lại lỗi JS / console.error để mỗi test tự kiểm tra trang không lỗi */
function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && !/fonts\.g|firebase|identitytoolkit|googleapis|ERR_/i.test(m.text()))
      errors.push(m.text());
  });
  return errors;
}

const ROUTES = [
  "#/",
  "#/topics",
  "#/network",
  "#/network/agreement-1",
  "#/flashcards",
  "#/quiz",
  "#/affixes",
  "#/affixes/-ment",
  "#/manage",
];

for (const r of ROUTES) {
  test(`mở ${r} không lỗi`, async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto(r);
    await expect(page.locator("#app")).not.toBeEmpty();
    await page.waitForTimeout(300);
    expect(errors).toEqual([]);
    // không có cuộn ngang
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
}

test("trường từ: cụm từ ẩn mục cấu tạo + họ từ, đánh số lại", async ({ page }) => {
  await page.goto("#/network/abide-by-1");
  const heads = page.locator("#canvas .branch-head h3");
  await expect(heads).toHaveText(["Đồng nghĩa & trái nghĩa", "Luyện riêng họ từ này"]);
  await expect(page.locator("#canvas .branch-no")).toHaveText(["01", "02"]);
  await expect(page.locator(".book-ex .ex-vi").first()).toContainText("Hai bên đồng ý");
});

test("trường từ: chỉ hiện cột từ loại có dữ liệu", async ({ page }) => {
  await page.goto("#/network/agreement-1");
  await expect(page.locator("#canvas .branch-no")).toHaveText(["01", "02", "03", "04"]);
  await expect(page.locator(".pos-col")).toHaveCount(3);
  await expect(page.getByText("Không có dạng này")).toHaveCount(0);
  await expect(page.locator(".wcard .ex-vi").first()).not.toBeEmpty();
});

test("trường từ: link có dạng từ thì nháy thẻ đó, lọc + tìm kiếm", async ({ page }) => {
  await page.goto("#/network/agreement-1/agree");
  await expect(page.locator('.wcard[data-w="agree"]')).toHaveClass(/flash/);
  await page.fill("#net-search", "huỷ");
  await expect(page.locator(".root-item").first()).toContainText("cancellation");
  await page.fill("#net-search", "");
  await page.getByRole("button", { name: "Văn phòng" }).click();
  await expect(page.locator(".lesson-nav")).toBeVisible();
});

test("tìm toàn trang bằng phím / và Enter", async ({ page, isMobile }) => {
  test.skip(isMobile, "phím tắt chỉ dành cho bàn phím");
  await page.goto("#/");
  await page.keyboard.press("/");
  await page.keyboard.type("assur");
  await expect(page.locator(".gs-item").first()).toContainText("assurance");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#\/network\/assurance-1/);
  await expect(page.locator(".root-banner h2")).toHaveText("assurance");
});

test("flashcard: lật thẻ, chấm Đã thuộc ghi vào tổng quan", async ({ page }) => {
  await page.goto("#/flashcards");
  const word = await page.locator(".fc-front .fc-word").innerText();
  await page.locator("#fc-card").click();
  await expect(page.locator("#fc-card")).toHaveClass(/flipped/);
  await page.getByRole("button", { name: /Đã thuộc/ }).click();
  await expect(page.locator(".toast").first()).toContainText(word);
  await page.goto("#/");
  await expect(page.locator(".d-today-list li").nth(1)).toContainText("1");
});

test("tự luyện: trả lời đủ 10 câu tới màn kết quả", async ({ page }) => {
  await page.goto("#/quiz");
  await page.getByRole("tab", { name: /Tự luyện/ }).click();
  await page.getByRole("button", { name: /Nghĩa của từ/ }).click();
  for (let i = 0; i < 10; i++) {
    await page.locator(".choice").first().click();
    await page.locator("#quiz-next").click();
  }
  await expect(page.getByText("Hoàn thành bài luyện tập!")).toBeVisible();
});

test("bài tập sách: điền Words in Context và Part 5 rồi chấm điểm", async ({ page }) => {
  await page.goto("#/quiz");
  await page.locator(".select").nth(1).selectOption("1");
  const chips = page.locator(".bank-chip:not([disabled])");
  while ((await chips.count()) > 0) await chips.first().click();
  await page.locator("#sec-wic .ex-actions .btn.primary").click();
  await expect(page.locator("#sec-wic .ex-score .badge")).toContainText("đúng");
  const opts = page.locator("#sec-p5 .mcq");
  const n = await opts.count();
  for (let i = 0; i < n; i++) await opts.nth(i).locator(".opt").first().click();
  await page.locator("#sec-p5 .ex-actions .btn.primary").click();
  await expect(page.locator("#sec-p5 .mcq-fb").first()).toBeVisible();
});

test("hồ sơ: tạo hồ sơ mới, đổi giao diện tối", async ({ page }) => {
  await page.goto("#/");
  await page.locator("#avatar-btn").click();
  await page.getByRole("menuitem", { name: /Thêm hồ sơ mới/ }).click();
  await page.fill('input[name="name"]', "Minh Anh");
  await page.getByRole("button", { name: /Tạo hồ sơ/ }).click();
  await expect(page.locator(".d-hello h1")).toHaveText("Minh Anh");
  await page.locator("#avatar-btn").click();
  await page.getByRole("radio", { name: /Tối/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("thêm trường từ tự tạo rồi mở sơ đồ của nó", async ({ page }) => {
  await page.goto("#/manage");
  await page.getByRole("button", { name: /Thêm trường từ đầu tiên/ }).click();
  await page.fill('input[name="word"]', "predict");
  await page.fill('input[name="vi"]', "dự đoán");
  await page.fill('textarea[name="family"]', "prediction | n | predict+-ion | sự dự đoán");
  await page.getByRole("button", { name: /Lưu trường từ/ }).click();
  await expect(page.locator(".root-banner h2")).toHaveText("predict");
  await expect(page.locator(".formula")).toHaveCount(1);
});
