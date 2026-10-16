import type { DayLog, ProfileData } from "./types";

/** Gộp hai bản dữ liệu học: luôn giữ phần tiến bộ hơn → học trên nhiều máy không mất tiến độ */
export function mergeData(a: ProfileData, b: Partial<ProfileData>): ProfileData {
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

  const custom = [...(a.custom ?? [])];
  for (const w of b.custom ?? []) if (!custom.some((x) => x.id === w.id)) custom.push(w);

  return { custom, status, stats, book, log };
}

export const sameData = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
