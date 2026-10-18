import { describe, expect, it } from "vitest";
import { buildCatalog, familyLookup, freqLevel, termInfo, WORDS } from "./data";
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
  const base = { meta: {}, custom: [], status: {}, stats: {}, book: {}, log: {} };
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
  it("xoá toàn bộ tiến độ ở máy này không bị máy khác hồi lại", () => {
    const old = { ...base, status: { x: "mastered" as const }, stats: { x: { c: 5, w: 0 } } };
    const wiped = { ...base, meta: { resetAt: 1000 } };
    expect(mergeData(old, wiped).status).toEqual({});
    expect(mergeData(wiped, old).status).toEqual({});
    expect(mergeData(wiped, old).meta.resetAt).toBe(1000);
  });
  it("trường từ tự thêm: bản sửa mới hơn thắng, từ đã xoá không quay lại", () => {
    const w = (id: string, vi: string, updated: number) => ({ ...WORDS[0], id, vi, lesson: 0, updated });
    const here = { ...base, custom: [w("c-a", "cũ", 1)], meta: { deleted: ["c-b"] } };
    const there = { ...base, custom: [w("c-a", "mới", 2), w("c-b", "đã xoá", 1), w("c-c", "khác", 1)] };
    const m = mergeData(here, there);
    expect(m.custom.map((x) => x.id)).toEqual(["c-a", "c-c"]);
    expect(m.custom[0].vi).toBe("mới");
  });
  it("không hạ trạng thái đã thuộc", () => {
    expect(mergeData({ ...base, status: { x: "mastered" } }, { status: { x: "learning" } }).status.x).toBe("mastered");
  });
  it("trạng thái mới hơn thắng dù bậc thấp hơn", () => {
    const merged = mergeData(
      { ...base, status: { x: "mastered" as const }, statusAt: { x: 200 } },
      { status: { x: "learning" as const }, statusAt: { x: 300 } },
    );
    expect(merged.status.x).toBe("learning");
    expect(merged.statusAt?.x).toBe(300);
  });
  it("bỏ qua trạng thái có timestamp cũ hơn", () => {
    const merged = mergeData(
      { ...base, status: { x: "learning" as const }, statusAt: { x: 300 } },
      { status: { x: "mastered" as const }, statusAt: { x: 200 } },
    );
    expect(merged.status.x).toBe("learning");
  });
  it("tombstone mới đưa từ về Chưa nhớ và thắng trạng thái cloud cũ", () => {
    const merged = mergeData({ ...base, status: { x: "mastered" as const } }, { status: {}, statusAt: { x: 300 } });
    expect(merged.status.x).toBeUndefined();
    expect(merged.statusAt?.x).toBe(300);
  });
  it("dữ liệu cũ chưa có timestamp vẫn giữ bậc trạng thái cao hơn", () => {
    const merged = mergeData({ ...base, status: { x: "learning" as const } }, { status: { x: "mastered" as const } });
    expect(merged.status.x).toBe("mastered");
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

describe("đồng nghĩa / trái nghĩa", () => {
  it("mọi từ đồng nghĩa / trái nghĩa đều có nghĩa tiếng Việt và độ phổ biến", () => {
    for (const w of WORDS)
      for (const t of [...w.syn, ...w.ant]) {
        expect(termInfo(t).vi, `${w.word} › ${t}`).not.toBe("");
        expect(typeof termInfo(t).z).toBe("number");
      }
  });
  it("mức phổ biến theo thang Zipf", () => {
    expect(freqLevel(termInfo("follow").z).level).toBe(3);
    expect(freqLevel(termInfo("disobey").z).level).toBeLessThan(2);
  });
  it("chỉ mục liên kết ngược: follow là đồng nghĩa của nhiều từ gốc", () => {
    expect((cat.relIndex["follow"] ?? []).length).toBeGreaterThan(1);
  });
});
