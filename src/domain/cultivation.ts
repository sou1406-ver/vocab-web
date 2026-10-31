import { validUsername } from "./account";
import type { Snapshot } from "./types";

export const cultivationRealms = [
  { name: "Phàm Nhân", words: 0 },
  { name: "Luyện Khí", words: 10 },
  { name: "Trúc Cơ", words: 25 },
  { name: "Kim Đan", words: 50 },
  { name: "Nguyên Anh", words: 80 },
  { name: "Hóa Thần", words: 120 },
  { name: "Luyện Hư", words: 180 },
  { name: "Hợp Thể", words: 250 },
  { name: "Đại Thừa", words: 330 },
  { name: "Độ Kiếp", words: 420 },
  { name: "Chân Tiên", words: 520 },
  { name: "Tiên Đế", words: 600 },
] as const;

export function cultivationOf(words: number) {
  const count = Number.isFinite(words) ? Math.max(0, Math.floor(words)) : 0;
  let index = 0;
  for (let i = 1; i < cultivationRealms.length; i++) if (count >= cultivationRealms[i].words) index = i;
  const realm = cultivationRealms[index];
  const next = cultivationRealms[index + 1]?.words ?? null;
  return {
    ...realm,
    index,
    count,
    next,
    progress: next === null ? 100 : ((count - realm.words) / (next - realm.words)) * 100,
  };
}

export function countLearnedWords(progress: Readonly<Snapshot["progress"]>, isCatalogWord: (id: string) => boolean) {
  return Object.entries(progress).filter(([id, word]) => word.tested && isCatalogWord(id)).length;
}

export interface Cultivator {
  id: string;
  username: string;
  avatar: number;
  learnedCount: number;
  updatedAt: number;
}

export function readCultivator(id: string, value: unknown): Cultivator {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Hồ sơ xếp hạng không hợp lệ.");
  const raw = value as Record<string, unknown>;
  if (
    Object.keys(raw).some((key) => !["version", "username", "avatar", "learnedCount", "updatedAt"].includes(key)) ||
    raw.version !== 1 ||
    typeof raw.username !== "string" ||
    !validUsername(raw.username) ||
    typeof raw.avatar !== "number" ||
    !Number.isInteger(raw.avatar) ||
    raw.avatar < 0 ||
    raw.avatar > 19 ||
    typeof raw.learnedCount !== "number" ||
    !Number.isSafeInteger(raw.learnedCount) ||
    raw.learnedCount < 0 ||
    raw.learnedCount > 100000 ||
    typeof raw.updatedAt !== "number" ||
    !Number.isFinite(raw.updatedAt) ||
    raw.updatedAt < 0 ||
    !id ||
    id.length > 128
  )
    throw new Error("Hồ sơ xếp hạng không hợp lệ.");
  return { id, username: raw.username, avatar: raw.avatar, learnedCount: raw.learnedCount, updatedAt: raw.updatedAt };
}

export function rankCultivators(entries: readonly Cultivator[]) {
  const sorted = [...entries].sort((a, b) => b.learnedCount - a.learnedCount || a.id.localeCompare(b.id));
  let rank = 0;
  return sorted.map((entry, index) => {
    if (!index || entry.learnedCount !== sorted[index - 1].learnedCount) rank = index + 1;
    return { ...entry, rank };
  });
}
