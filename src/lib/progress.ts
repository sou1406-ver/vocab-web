import { LESSONS } from "./data";
import type { Catalog } from "./data";
import type { BookScore, Status } from "./types";
import type { CheckpointRecord } from "./types";

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

/** Existing learners retain access through their highest lesson with recorded progress. */
export function legacyLessonThrough(cat: Catalog, status: Record<string, Status>) {
  return cat.all.reduce((highest, word) => (status[word.id] ? Math.max(highest, word.lesson) : highest), 0);
}

export function isLessonUnlocked(lesson: number, legacyThrough: number, checkpoints: Record<string, CheckpointRecord>) {
  if (lesson <= Math.max(1, legacyThrough)) return true;
  for (let previous = legacyThrough || 1; previous < lesson; previous++) {
    if (!checkpoints[`lesson:${previous}`]?.passed) return false;
  }
  return true;
}

export function weekPeriodKey(date = new Date()) {
  const monday = new Date(date);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const localDate = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
  return `week:${localDate}`;
}

export function monthPeriodKey(date = new Date()) {
  return `month:${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export const pct = (a: number, b: number) => (b ? (a / b) * 100 : 0);
