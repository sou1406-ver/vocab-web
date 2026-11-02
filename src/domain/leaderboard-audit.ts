import { cultivationOf, cultivationRealms, readCultivator, type Cultivator } from "./cultivation";

export type AuditFlag = "invalid" | "over-count" | "duplicate-name" | "stale" | "future";
export const auditFlagLabels: Record<AuditFlag, string> = {
  invalid: "Dữ liệu sai định dạng",
  "over-count": "Vượt số từ trong sách",
  "duplicate-name": "Trùng username",
  stale: "Hơn 30 ngày chưa cập nhật",
  future: "Thời gian ở tương lai",
};
export interface RawLeaderboardEntry {
  id: string;
  data: unknown;
}
export interface AuditedEntry {
  id: string;
  entry: Cultivator | null;
  flags: AuditFlag[];
}
export interface LeaderboardAudit {
  entries: AuditedEntry[];
  flagged: number;
  average: number;
  highest: number;
  realms: number[];
}
const DAY = 86_400_000;

// Read-only health check of leaderboard documents; nothing here writes or hides anyone.
export function auditLeaderboard(raw: readonly RawLeaderboardEntry[], totalWords: number, at = Date.now()) {
  const entries: AuditedEntry[] = raw.map(({ id, data }) => {
    try {
      return { id, entry: readCultivator(id, data), flags: [] };
    } catch {
      return { id, entry: null, flags: ["invalid"] };
    }
  });
  const names = new Map<string, number>();
  for (const { entry } of entries) if (entry) names.set(entry.username, (names.get(entry.username) ?? 0) + 1);
  for (const item of entries) {
    const entry = item.entry;
    if (!entry) continue;
    if (entry.learnedCount > totalWords) item.flags.push("over-count");
    if ((names.get(entry.username) ?? 0) > 1) item.flags.push("duplicate-name");
    if (entry.updatedAt > at + 5 * 60_000) item.flags.push("future");
    else if (at - entry.updatedAt > 30 * DAY) item.flags.push("stale");
  }
  const valid = entries.flatMap((item) => (item.entry ? [item.entry] : []));
  const realms = cultivationRealms.map(() => 0);
  for (const entry of valid) realms[cultivationOf(entry.learnedCount).index]++;
  return {
    entries,
    flagged: entries.filter((item) => item.flags.length).length,
    average: valid.length ? Math.round(valid.reduce((sum, entry) => sum + entry.learnedCount, 0) / valid.length) : 0,
    highest: valid.reduce((max, entry) => Math.max(max, entry.learnedCount), 0),
    realms,
  } satisfies LeaderboardAudit;
}
