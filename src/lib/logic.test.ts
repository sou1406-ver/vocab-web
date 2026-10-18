import { describe, expect, it } from "vitest";
import { buildCatalog, familyLookup, freqLevel, termInfo, WORDS } from "./data";
import { mergeData } from "./merge";
import {
  dueAfterDays,
  dueReviewIds,
  displayedStatus,
  markReviewedToday,
  mergeDailyReviews,
  mergeSchedules,
  scheduleAnswer,
  scheduleFor,
  scheduleRating,
  shouldPromoteToMastered,
} from "./srs";
import { buildQs, findForm, formationQs, makeQuiz, QUIZ_LEN } from "./quiz";
import { searchWords } from "./search";
import { dayKey } from "./util";

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
  it("đồng bộ lại lịch khi trạng thái thuộc thắng nhưng lịch cũ ở hộp thấp", () => {
    const merged = mergeData(
      { ...base, status: { x: "mastered" as const }, statusAt: { x: 100 }, srs: { x: { box: 2, due: 200, at: 150 } } },
      {},
    );
    expect(merged.status.x).toBe("mastered");
    expect(merged.srs?.x.box).toBe(5);
    expect(merged.srs?.x.confirming).toBe(false);
  });
  it("khi cùng timestamp, trạng thái và lịch cùng theo cập nhật mới nhận", () => {
    const merged = mergeData(
      {
        ...base,
        status: { x: "mastered" as const },
        statusAt: { x: 100 },
        srs: { x: { box: 5, due: 200, at: 100 } },
      },
      {
        status: { x: "learning" as const },
        statusAt: { x: 100 },
        srs: { x: { box: 1, due: 300, at: 100 } },
      },
    );
    expect(merged.status.x).toBe("learning");
    expect(merged.srs?.x.box).toBe(1);
  });
  it("reset về Chưa học xoá lịch cũ nếu tombstone mới hơn", () => {
    const merged = mergeData(
      { ...base, srs: { x: { box: 2, due: 200, at: 100 } } },
      { status: {}, statusAt: { x: 101 } },
    );
    expect(merged.status.x).toBeUndefined();
    expect(merged.srs?.x).toBeUndefined();
  });
  it("trạng thái đang xác nhận không được ghi vào status chính khi đồng bộ", () => {
    const merged = mergeData(
      { ...base },
      { status: { x: "confirming" }, srs: { x: { box: 1, due: 2, at: 1, confirming: true } } },
    );
    expect(merged.status.x).toBe("learning");
    expect(merged.srs?.x.confirming).toBe(true);
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

describe("lịch ôn Leitner", () => {
  const now = new Date(2026, 0, 10, 12).getTime();
  it("tick Đã nhớ bắt đầu giai đoạn xác nhận, lượt đầu đến hạn ngày mai", () => {
    const next = scheduleRating("x", "confirming", {}, {}, {}, now);
    expect(next.box).toBe(1);
    expect(next.confirming).toBe(true);
    expect(next.confirmations).toBe(0);
    expect(next.due).toBe(dueAfterDays(now, 1));
  });
  it("cần ba lượt đúng đến hạn liên tiếp mới hoàn tất xác nhận", () => {
    let current = scheduleRating("x", "confirming", {}, {}, {}, now);
    let answeredAt = current.due;
    for (let pass = 1; pass <= 3; pass++) {
      current = scheduleAnswer("x", true, { x: "confirming" }, { x: current }, {}, answeredAt);
      expect(current.confirmations).toBe(pass);
      expect(current.confirming).toBe(pass < 3);
      if (pass < 3) answeredAt = current.due;
    }
    expect(current.box).toBe(5);
    expect(current.confirmations).toBe(3);
  });
  it("không tính câu đúng sớm và câu sai làm lại giai đoạn từ hộp 1", () => {
    const current = { x: scheduleRating("x", "confirming", {}, {}, {}, now) };
    const early = scheduleAnswer("x", true, { x: "confirming" }, current, {}, now);
    const earlyWrong = scheduleAnswer("x", false, { x: "confirming" }, current, {}, now);
    const wrong = scheduleAnswer("x", false, { x: "confirming" }, current, {}, current.x.due);
    expect(early.confirmations).toBe(0);
    expect(early.due).toBe(current.x.due);
    expect(earlyWrong.confirming).toBe(false);
    expect(earlyWrong.due).toBe(dueAfterDays(now, 1));
    expect(wrong.box).toBe(1);
    expect(wrong.due).toBe(dueAfterDays(current.x.due, 1));
    expect(wrong.confirming).toBe(false);
  });
  it("từ đã thuộc thật vẫn được đưa ra ôn sau 30 ngày", () => {
    const next = scheduleRating("x", "mastered", {}, {}, {}, now);
    expect(next.box).toBe(5);
    expect(next.due).toBe(dueAfterDays(now, 30));
  });
  it("dùng trạng thái cũ để lên lịch kiểm tra lại từ mốc đổi trạng thái", () => {
    const oldMasteredAt = dueAfterDays(now, -45);
    expect(scheduleFor("x", { x: "mastered" }, {}, { x: oldMasteredAt }, now)?.due).toBeLessThan(now);
  });
  it("tiến độ cũ không có timestamp được đưa ra ôn ngay", () => {
    expect(scheduleFor("x", { x: "mastered" }, {}, {}, now)?.due).toBe(now);
    expect(dueReviewIds(["x"], { x: "mastered" }, {}, {}, now)).toEqual(["x"]);
  });
  it("hiển thị đang xác nhận từ lịch riêng, không cần đổi trạng thái chính", () => {
    expect(displayedStatus("x", { x: "learning" }, { x: { box: 1, due: 10, at: 1, confirming: true } })).toBe(
      "confirming",
    );
    expect(displayedStatus("x", { x: "learning" }, { x: { box: 1, due: 10, at: 1 } })).toBe("learning");
  });
  it("đưa từ đã thuộc trở lại hàng đợi sau 30 ngày", () => {
    expect(
      dueReviewIds(["x"], { x: "mastered" }, { x: { box: 5, due: now - 1, at: now - 31 * 86400000 } }, {}, now),
    ).toEqual(["x"]);
  });
  it("không tăng hộp khi trả lời đúng trước ngày đến hạn", () => {
    const current = { x: { box: 2, due: dueAfterDays(now, 3), at: now } };
    const next = scheduleAnswer("x", true, { x: "learning" }, current, {}, now);
    expect(next).toBe(current.x);
    expect(shouldPromoteToMastered(current.x, next)).toBe(false);
  });
  it("trả lời đúng đúng hạn từ hộp 4 đạt hộp 5", () => {
    const previous = { box: 4, due: now, at: now };
    const next = scheduleAnswer("x", true, { x: "learning" }, { x: previous }, {}, now);
    expect(next.box).toBe(5);
    expect(shouldPromoteToMastered(previous, next)).toBe(true);
  });
  it("trả lời sai từ đã thuộc đưa lịch về hộp 1", () => {
    const next = scheduleAnswer("x", false, { x: "mastered" }, { x: { box: 5, due: now, at: now } }, {}, now);
    expect(next.box).toBe(1);
    expect(next.confirming).toBe(false);
  });
  it("trả lời đúng từ đã thuộc chuyển lần ôn tiếp theo sang 60 ngày", () => {
    const next = scheduleAnswer("x", true, { x: "mastered" }, { x: { box: 5, due: now, at: now } }, {}, now);
    expect(next.box).toBe(6);
    expect(next.due).toBe(dueAfterDays(now, 60));
  });
  it("hàng đợi chỉ lấy từ đến hạn, xếp quá hạn trước và giới hạn 20 từ", () => {
    const schedules = Object.fromEntries(
      Array.from({ length: 22 }, (_, i) => [String(i).padStart(2, "0"), { box: 1, due: now - i, at: now - 100 }]),
    );
    schedules.future = { box: 1, due: now + 1000, at: now };
    const due = dueReviewIds(Object.keys(schedules), {}, schedules, {}, now);
    expect(due).toHaveLength(20);
    expect(due[0]).toBe("21");
    expect(due).not.toContain("future");
  });
  it("trừ số từ đã ôn hôm nay khỏi giới hạn 20", () => {
    const schedules = Object.fromEntries(
      Array.from({ length: 22 }, (_, i) => [String(i).padStart(2, "0"), { box: 1, due: now - i, at: now - 100 }]),
    );
    const reviewedToday = { day: dayKey(new Date(now)), ids: ["20", "21", "22", "23"] };
    // Only reviewed IDs still present in the current dataset consume today's quota.
    expect(dueReviewIds(Object.keys(schedules), {}, schedules, {}, now, 20, reviewedToday)).toHaveLength(18);
    expect(markReviewedToday(reviewedToday, "24", now).ids).toContain("24");
  });
  it("đồng bộ lịch ôn theo timestamp của lần cập nhật gần nhất", () => {
    const merged = mergeSchedules(
      { x: { box: 2, due: 20, at: 10 } },
      { x: { box: 1, due: 30, at: 11 }, y: { box: 3, due: 40, at: 12 } },
    );
    expect(merged.x.box).toBe(1);
    expect(merged.y.box).toBe(3);
  });
  it("gộp danh sách đã ôn trong ngày giữa các thiết bị", () => {
    expect(mergeDailyReviews({ day: "2026-01-10", ids: ["a"] }, { day: "2026-01-10", ids: ["b"] })).toEqual({
      day: "2026-01-10",
      ids: ["a", "b"],
    });
  });
  it("câu đúng thông thường tăng hộp, câu sai đưa lịch về hộp 1", () => {
    const current = { x: { box: 2, due: now, at: now - 1 } };
    const right = scheduleAnswer("x", true, { x: "learning" }, current, {}, now);
    const wrong = scheduleAnswer("x", false, { x: "learning" }, current, {}, now);
    expect(right.box).toBe(3);
    expect(right.due).toBe(dueAfterDays(now, 7));
    expect(wrong.box).toBe(1);
    expect(wrong.due).toBe(dueAfterDays(now, 1));
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
