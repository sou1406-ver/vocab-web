import type { DailyReviewLog, ReviewSchedule, Status } from "./types";
import { dayKey } from "./util";

export const REVIEW_INTERVAL_DAYS = [1, 3, 7, 14, 30, 60] as const;
export const DAILY_REVIEW_LIMIT = 20;
export const DEFAULT_NEW_WORD_LIMIT = 10;

/** Everyday vocabulary has its own collection and never consumes the TOEIC new-word quota. */
export function canStartNewWord(
  id: string,
  status: Record<string, Status>,
  daily?: DailyReviewLog,
  limit = DEFAULT_NEW_WORD_LIMIT,
  now = Date.now(),
) {
  if (id.startsWith("everyday:") || status[id]) return true;
  const today = dayKey(new Date(now));
  const introduced = daily?.day === today ? daily.ids : [];
  if (introduced.includes(id)) return true;
  const toeicIntroduced = introduced.filter((wordId) => !wordId.startsWith("everyday:")).length;
  return toeicIntroduced < limit;
}

export function shouldPromoteToMastered(previous: ReviewSchedule | undefined, next: ReviewSchedule) {
  return !next.confirming && next.box >= 5 && next.at > (previous?.at ?? -1);
}

/** Pending confirmation is shown in the UI, but never replaces the saved learning status. */
export function displayedStatus(
  id: string,
  status: Record<string, Status>,
  schedules: Record<string, ReviewSchedule> = {},
): Status {
  return status[id] === "confirming" || schedules[id]?.confirming ? "confirming" : (status[id] ?? "new");
}
/** Due dates use local calendar days so a 1-day interval means tomorrow, not 24 hours later. */
export function dueAfterDays(from: number, days: number) {
  const due = new Date(from);
  due.setHours(0, 0, 0, 0);
  due.setDate(due.getDate() + days);
  return due.getTime();
}

function stamp(now: number, previous = 0) {
  return Math.max(now, previous + 1);
}

/** Build a schedule for legacy progress that predates Leitner data. */
export function scheduleFor(
  id: string,
  status: Record<string, Status>,
  schedules: Record<string, ReviewSchedule>,
  statusAt: Record<string, number> = {},
  now = Date.now(),
): ReviewSchedule | undefined {
  const saved = schedules[id];
  if (saved) return saved;
  const state = status[id];
  if (!state || state === "new") return undefined;
  if (state === "confirming") {
    const at = statusAt[id] ?? 0;
    return { box: 1, at, due: at ? dueAfterDays(at, 1) : now, confirming: true, confirmations: 0 };
  }
  const box = state === "mastered" ? 5 : 1;
  const at = statusAt[id] ?? 0;
  return { box, at, due: at ? dueAfterDays(at, REVIEW_INTERVAL_DAYS[box - 1]) : now, confirmations: 0 };
}

export function scheduleRating(
  id: string,
  rating: Status,
  status: Record<string, Status>,
  schedules: Record<string, ReviewSchedule>,
  statusAt: Record<string, number> = {},
  now = Date.now(),
): ReviewSchedule {
  const current = scheduleFor(id, status, schedules, statusAt, now);
  const at = stamp(now, current?.at);
  if (rating === "confirming") return { box: 1, at, due: dueAfterDays(now, 1), confirming: true, confirmations: 0 };
  if (rating === "mastered") {
    const box = 5;
    return { box, at, due: dueAfterDays(now, REVIEW_INTERVAL_DAYS[box - 1]), confirming: false, confirmations: 0 };
  }
  return { box: 1, at, due: dueAfterDays(now, 1), confirming: false, confirmations: 0 };
}

export function scheduleAnswer(
  id: string,
  correct: boolean,
  status: Record<string, Status>,
  schedules: Record<string, ReviewSchedule>,
  statusAt: Record<string, number> = {},
  now = Date.now(),
): ReviewSchedule {
  const current = scheduleFor(id, status, schedules, statusAt, now);
  if (current && current.due > now && correct) return current;
  if (current?.confirming) {
    if (!correct) {
      const at = stamp(now, current.at);
      return { box: 1, at, due: dueAfterDays(now, 1), confirming: false, confirmations: 0 };
    }
    // Only a test taken on or after its scheduled day counts toward real mastery.
    if (current.due > now) return current;
    const confirmations = (current.confirmations ?? 0) + 1;
    const box = confirmations >= 3 ? 5 : Math.min(REVIEW_INTERVAL_DAYS.length, current.box + 1);
    const at = stamp(now, current.at);
    return {
      box,
      at,
      due: dueAfterDays(now, REVIEW_INTERVAL_DAYS[box - 1]),
      confirming: confirmations < 3,
      confirmations,
    };
  }
  const box = correct ? Math.min(REVIEW_INTERVAL_DAYS.length, (current?.box ?? 0) + 1) : 1;
  const at = stamp(now, current?.at);
  return { box, at, due: dueAfterDays(now, REVIEW_INTERVAL_DAYS[box - 1]), confirming: false, confirmations: 0 };
}

export function dueReviewIds(
  ids: string[],
  status: Record<string, Status>,
  schedules: Record<string, ReviewSchedule>,
  statusAt: Record<string, number> = {},
  now = Date.now(),
  limit = DAILY_REVIEW_LIMIT,
  reviewedToday?: DailyReviewLog,
) {
  const today = dayKey(new Date(now));
  const candidates = new Set(ids);
  const reviewed =
    reviewedToday?.day === today ? new Set(reviewedToday.ids.filter((id) => candidates.has(id))) : new Set<string>();
  const remaining = Math.max(0, limit - reviewed.size);
  if (!remaining) return [];
  return ids
    .map((id) => ({ id, schedule: scheduleFor(id, status, schedules, statusAt, now) }))
    .filter(
      (entry): entry is { id: string; schedule: ReviewSchedule } =>
        !!entry.schedule && entry.schedule.due <= now && !reviewed.has(entry.id),
    )
    .sort((a, b) => a.schedule.due - b.schedule.due || a.id.localeCompare(b.id))
    .slice(0, remaining)
    .map(({ id }) => id);
}

export function markReviewedToday(current: DailyReviewLog | undefined, id: string, now = Date.now()): DailyReviewLog {
  const today = dayKey(new Date(now));
  const ids = current?.day === today ? current.ids : [];
  return { day: today, ids: ids.includes(id) ? ids : [...ids, id] };
}

export function mergeDailyReviews(a?: DailyReviewLog, b?: DailyReviewLog): DailyReviewLog | undefined {
  if (!a) return b;
  if (!b) return a;
  if (a.day !== b.day) return a.day > b.day ? a : b;
  return { day: a.day, ids: [...new Set([...a.ids, ...b.ids])] };
}

export function mergeSchedules(
  a: Record<string, ReviewSchedule> = {},
  b: Record<string, ReviewSchedule> = {},
): Record<string, ReviewSchedule> {
  const merged = { ...a };
  for (const [id, incoming] of Object.entries(b)) {
    if (!merged[id] || incoming.at >= merged[id].at) merged[id] = incoming;
  }
  return merged;
}
