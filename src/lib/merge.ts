import type { DailyReviewLog, DayLog, ProfileData, ReviewSchedule, Word } from "./types";
import { dueAfterDays, mergeDailyReviews, mergeSchedules, scheduleFor } from "./srs";

/** Gộp hai bản dữ liệu học (máy này + đám mây / máy khác) mà không mất tiến độ:
    - tiến độ: giữ phần tiến bộ hơn (trạng thái cao hơn, số lần đúng/sai lớn hơn, điểm bài tập cao hơn);
    - "Xoá toàn bộ tiến độ": bên xoá gần đây hơn thắng → máy khác không hồi lại tiến độ cũ;
    - trường từ tự thêm: bản sửa mới hơn thắng, từ đã xoá (có dấu đã xoá) không quay lại. */
export function mergeData(a: ProfileData, b: Partial<ProfileData>): ProfileData {
  const resetA = a.meta?.resetAt ?? 0;
  const resetB = b.meta?.resetAt ?? 0;
  const deleted = [...new Set([...(a.meta?.deleted ?? []), ...(b.meta?.deleted ?? [])])];
  const meta = {
    ...(Math.max(resetA, resetB) ? { resetAt: Math.max(resetA, resetB) } : {}),
    ...(deleted.length ? { deleted } : {}),
  };

  const custom = mergeCustom(a.custom ?? [], b.custom ?? [], new Set(deleted));

  // Một bên vừa xoá tiến độ sau lần xoá của bên kia → tiến độ của bên đó là bản đúng
  if (resetB > resetA) {
    const status = cleanStatus(b.status);
    const statusAt = { ...b.statusAt };
    const srs = { ...b.srs };
    reconcileSchedules(status, statusAt, srs);
    return {
      meta,
      custom,
      status,
      statusAt,
      srs,
      reviewedToday: b.reviewedToday,
      stats: { ...b.stats },
      book: { ...b.book },
      log: { ...b.log },
    };
  }
  if (resetA > resetB) {
    const status = cleanStatus(a.status);
    const statusAt = { ...a.statusAt };
    const srs = { ...a.srs };
    reconcileSchedules(status, statusAt, srs);
    return { ...a, meta, custom, status, statusAt, srs };
  }

  const rank: Record<string, number> = { mastered: 3, confirming: 2, learning: 1 };
  const status: ProfileData["status"] = {};
  const statusAt: Record<string, number> = {};
  const statusIds = new Set([
    ...Object.keys(a.status ?? {}),
    ...Object.keys(b.status ?? {}),
    ...Object.keys(a.statusAt ?? {}),
    ...Object.keys(b.statusAt ?? {}),
  ]);
  for (const id of statusIds) {
    const aAt = a.statusAt?.[id] ?? 0;
    const bAt = b.statusAt?.[id] ?? 0;
    const aStatus = a.status?.[id];
    const bStatus = b.status?.[id];
    let winner: "a" | "b";
    if (aAt !== bAt) winner = bAt > aAt ? "b" : "a";
    else if (bAt > 0) winner = "b";
    else winner = (rank[bStatus ?? "new"] ?? 0) > (rank[aStatus ?? "new"] ?? 0) ? "b" : "a";

    const selected = winner === "a" ? aStatus : bStatus;
    const timestamp = Math.max(aAt, bAt);
    if (timestamp) statusAt[id] = timestamp;
    // Missing status with a timestamp means an explicit reset to “new”.
    if (selected) status[id] = selected === "confirming" ? "learning" : selected;
  }

  const stats = { ...a.stats };
  for (const [id, s] of Object.entries(b.stats ?? {})) {
    const o = stats[id] ?? { c: 0, w: 0 };
    stats[id] = { c: Math.max(o.c, s.c || 0), w: Math.max(o.w, s.w || 0) };
  }

  const book = { ...a.book };
  for (const [k, v] of Object.entries(b.book ?? {})) {
    const o = book[k];
    const rv = v.right / v.total;
    if (!o || rv > o.right / o.total || (rv === o.right / o.total && v.at > o.at)) book[k] = v;
  }

  const log: Record<string, DayLog> = { ...a.log };
  for (const [k, v] of Object.entries(b.log ?? {})) {
    const o = log[k] ?? { a: 0, c: 0, f: 0, m: 0 };
    log[k] = {
      a: Math.max(o.a, v.a || 0),
      c: Math.max(o.c, v.c || 0),
      f: Math.max(o.f, v.f || 0),
      m: Math.max(o.m, v.m || 0),
    };
  }

  const srs: Record<string, ReviewSchedule> = mergeSchedules(a.srs, b.srs);
  const reviewedToday: DailyReviewLog | undefined = mergeDailyReviews(a.reviewedToday, b.reviewedToday);
  reconcileSchedules(status, statusAt, srs);

  return { meta, custom, status, statusAt, srs, reviewedToday, stats, book, log };
}

function cleanStatus(status: ProfileData["status"] = {}) {
  return Object.fromEntries(
    Object.entries(status).map(([id, value]) => [id, value === "confirming" ? "learning" : value]),
  );
}

function reconcileSchedules(
  status: ProfileData["status"],
  statusAt: Record<string, number>,
  schedules: Record<string, ReviewSchedule>,
) {
  const now = Date.now();
  for (const [id, schedule] of Object.entries(schedules)) {
    if ((!status[id] || status[id] === "new") && (statusAt[id] ?? 0) >= schedule.at) delete schedules[id];
  }
  for (const [id, state] of Object.entries(status)) {
    let schedule = schedules[id] ?? scheduleFor(id, status, schedules, statusAt, now);
    if (!schedule) continue;
    if (state === "mastered") {
      const at = statusAt[id] ?? 0;
      if (schedule.confirming && schedule.at > at) {
        status[id] = "learning";
        statusAt[id] = schedule.at;
        continue;
      }
      if (schedule.confirming || schedule.box < 5) {
        const reconciledAt = Math.max(schedule.at, at);
        statusAt[id] = reconciledAt;
        schedule = {
          ...schedule,
          box: 5,
          at: reconciledAt,
          due: reconciledAt ? dueAfterDays(reconciledAt, 30) : now,
          confirming: false,
          confirmations: 3,
        };
      } else if (schedule.at > at) statusAt[id] = schedule.at;
    }
    schedules[id] = schedule;
  }
}

function mergeCustom(a: Word[], b: Word[], deleted: Set<string>): Word[] {
  const out = a.filter((w) => !deleted.has(w.id));
  for (const w of b) {
    if (deleted.has(w.id)) continue;
    const i = out.findIndex((x) => x.id === w.id);
    if (i < 0) out.push(w);
    else if ((w.updated ?? 0) > (out[i].updated ?? 0)) out[i] = w;
  }
  return out;
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => [key, stable(item)]),
  );
}

export const sameData = (a: unknown, b: unknown) => JSON.stringify(stable(a)) === JSON.stringify(stable(b));
