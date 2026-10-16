import type { DayLog, ProfileData, Word } from "./types";

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
  if (resetB > resetA)
    return { meta, custom, status: { ...b.status }, stats: { ...b.stats }, book: { ...b.book }, log: { ...b.log } };
  if (resetA > resetB) return { ...a, meta, custom };

  const rank: Record<string, number> = { mastered: 2, learning: 1 };
  const status = { ...a.status };
  for (const [id, s] of Object.entries(b.status ?? {})) if ((rank[s] ?? 0) > (rank[status[id]] ?? 0)) status[id] = s;

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

  return { meta, custom, status, stats, book, log };
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

export const sameData = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
