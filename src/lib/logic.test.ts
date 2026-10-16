import { describe, expect, it } from "vitest";
import { buildCatalog, familyLookup, WORDS } from "./data";
import { mergeData } from "./merge";
import { buildQs, findForm, formationQs, makeQuiz, QUIZ_LEN } from "./quiz";
import { searchWords } from "./search";

const cat = buildCatalog([]);

describe("dữ liệu", () => {
  it("đủ 600 từ, mọi câu ví dụ đều có bản dịch", () => {
    expect(WORDS).toHaveLength(600);
    for (const w of WORDS) {
      expect(w.exVi?.length).toBe(w.ex.length);
      w.exVi!.forEach((v) => expect(v).not.toBe(""));
      for (const f of w.family) if (f.ex) expect(f.exVi, `${w.word} › ${f.w}`).toBeTruthy();
    }
  });
});

describe("mergeData", () => {
  const base = { custom: [], status: {}, stats: {}, book: {}, log: {} };
  it("giữ trạng thái tiến bộ hơn và điểm cao hơn", () => {
    const a = {
      ...base,
      status: { x: "learning" as const },
      stats: { x: { c: 3, w: 1 } },
      book: { "L1:p5": { right: 3, total: 6, at: 1 } },
    };
    const b = {
      status: { x: "mastered" as const },
      stats: { x: { c: 1, w: 4 } },
      book: { "L1:p5": { right: 5, total: 6, at: 2 } },
    };
    const m = mergeData(a, b);
    expect(m.status.x).toBe("mastered");
    expect(m.stats.x).toEqual({ c: 3, w: 4 });
    expect(m.book["L1:p5"].right).toBe(5);
  });
  it("không hạ trạng thái đã thuộc", () => {
    expect(mergeData({ ...base, status: { x: "mastered" } }, { status: { x: "learning" } }).status.x).toBe("mastered");
  });
});

describe("sinh câu hỏi", () => {
  it("findForm nhận dạng chia -ed / -ing", () => {
    expect(findForm("The man canceled his subscription.", "cancel")?.text).toBe("canceled");
    expect(findForm("Before engaging in a new business", "engage")?.text).toBe("engaging");
  });
  it("câu biến đổi từ luôn chứa đáp án trong 4 lựa chọn", () => {
    const qs = formationQs(WORDS.slice(0, 60));
    expect(qs.length).toBeGreaterThan(50);
    for (const q of qs) expect(q.options.map((o) => o.toLowerCase())).toContain(q.m.text.toLowerCase());
  });
  it("bài ghép từ có đủ mảnh đúng", () => {
    for (const q of buildQs(WORDS.slice(0, 30))) for (const p of q.f.parts) expect(q.tiles).toContain(p);
  });
  it("đề tổng hợp tối đa 10 câu", () => {
    expect(makeQuiz(cat, "mixed", WORDS.slice(0, 12)).length).toBeLessThanOrEqual(QUIZ_LEN);
  });
});

describe("tìm kiếm", () => {
  it("tìm không dấu theo nghĩa Việt và theo họ từ", () => {
    expect(searchWords(cat, "hop dong").some((e) => e.root.word === "agreement")).toBe(true);
    expect(searchWords(cat, "agree")[0].form).toBe("agree");
  });
  it("familyLookup bỏ trợ động từ", () => {
    expect(familyLookup(cat, "will cancel")?.root.word).toBe("cancellation");
  });
});
