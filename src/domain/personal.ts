import type { Snapshot } from "./types";
export function setWordSaved(snapshot: Snapshot, wordId: string, saved: boolean): Snapshot {
  if (!wordId || wordId.length > 200 || ["__proto__", "constructor", "prototype"].includes(wordId))
    throw new Error("ID từ không hợp lệ.");
  const ids = new Set(snapshot.savedWords ?? []);
  if (saved) ids.add(wordId);
  else ids.delete(wordId);
  return { ...snapshot, savedWords: [...ids] };
}
