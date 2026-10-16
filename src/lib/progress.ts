import { LESSONS } from "./data";
import type { Catalog } from "./data";
import type { BookScore, Status } from "./types";

export function lessonProgress(cat: Catalog, status: Record<string, Status>, n: number) {
  const words = cat.all.filter((w) => w.lesson === n);
  const mastered = words.filter((w) => status[w.id] === "mastered").length;
  const started = words.some((w) => !!status[w.id]);
  return { total: words.length, mastered, started };
}

/** Bài nên học tiếp: bài đang học dở đầu tiên, nếu không có thì bài chưa xong đầu tiên */
export function resumeLesson(cat: Catalog, status: Record<string, Status>) {
  const open = LESSONS.filter((l) => {
    const p = lessonProgress(cat, status, l.n);
    return p.mastered < p.total;
  });
  return open.find((l) => lessonProgress(cat, status, l.n).started) ?? open[0] ?? LESSONS[0];
}

/** Đã làm đủ các phần bài tập sách của một bài chưa */
export const lessonBookDone = (book: Record<string, BookScore>, n: number) =>
  ["wic", "p5", "p6"].every((s) => book[`L${n}:${s}`]);

export const pct = (a: number, b: number) => (b ? (a / b) * 100 : 0);
