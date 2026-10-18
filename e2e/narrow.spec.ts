import { expect, test } from "@playwright/test";

// Điện thoại nhỏ (iPhone SE, 375px): không khối chữ nào bị ép hẹp (dài nhưng rộng < 130px) và không tràn ngang,
// kể cả các tab con trong trang. Bắt lỗi kiểu bố cục nhiều cột chưa xuống dòng trên màn hẹp.

const PAGES = [
  "#/",
  "#/topics",
  "#/network/agreement-1",
  "#/term/program",
  "#/flashcards",
  "#/quiz",
  "#/practice",
  "#/review",
  "#/knowledge",
  "#/everyday",
  "#/affixes",
  "#/affixes/-ment",
  "#/manage",
];

test("điện thoại 375px: không chữ bị ép, không tràn ngang", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "tự đặt bề ngang 375px, chạy một lần là đủ");
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 375, height: 667 });
  const out: string[] = [];
  for (const p of PAGES) {
    for (const extra of [false, true]) {
      await page.goto(p);
      if (extra) {
        // mở thêm các tab / nhóm con trong trang (Ngữ pháp, Tự luyện…)
        const tabs = page.locator("main [role=tab], main .knowledge-switch button, main .mode-switch button");
        const n = await tabs.count();
        if (!n) continue;
        await tabs
          .nth(n - 1)
          .click()
          .catch(() => {});
      }
      await page.waitForTimeout(900);
      const r = await page.evaluate(() => {
        const vw = document.documentElement.clientWidth;
        const res: string[] = [];
        const els = [
          ...document.querySelectorAll<HTMLElement>(
            "main p, main span, main div, main h2, main h3, main li, main a, main button",
          ),
        ];
        for (const e of els) {
          const txt = (e.innerText || "").trim();
          if (txt.length < 40 || e.children.length > 2) continue;
          const b = e.getBoundingClientRect();
          if (b.width > 0 && b.width < 130 && b.height > 70)
            res.push(
              `ÉP ${Math.round(b.width)}px×${Math.round(b.height)} .${(e.className || e.tagName).toString().split(" ")[0]} “${txt.slice(0, 40)}”`,
            );
          if (b.right > vw + 2)
            res.push(`TRÀN ${Math.round(b.right - vw)}px .${(e.className || e.tagName).toString().split(" ")[0]}`);
        }
        return [...new Set(res)].slice(0, 8);
      });
      if (r.length) out.push(`${p}${extra ? " (tab khác)" : ""}\n  ` + r.join("\n  "));
    }
  }
  expect(out).toEqual([]);
});
