import { INTERVALS, dayKey, emptySnapshot, nextDue } from "./learning";
import type { Catalog, Snapshot, WordProgress } from "./types";

export interface SimulatedProgress {
  learned: number;
  due: number;
  streak: number;
  introducedToday: number;
}
const DAY = 86_400_000;

// Builds a throwaway snapshot for the admin sandbox. It is never written to IndexedDB or synced.
export function simulateSnapshot(
  settings: Snapshot["settings"],
  catalog: Catalog,
  wanted: SimulatedProgress,
  at = Date.now(),
): Snapshot {
  const clamp = (value: number, max: number) => Math.max(0, Math.min(max, Math.floor(value) || 0));
  const learned = clamp(wanted.learned, catalog.words.length);
  const due = clamp(wanted.due, learned);
  const fresh = clamp(wanted.introducedToday, learned);
  const streak = clamp(wanted.streak, 3650);
  const words = catalog.words.slice(0, learned);
  const progress: Record<string, WordProgress> = {};
  words.forEach((word, index) => {
    const today = index >= learned - fresh;
    const startedAt = today ? at : at - 30 * DAY;
    progress[word.id] = {
      startedAt,
      startedDay: dayKey(startedAt),
      box: today ? 1 : 2,
      dueAt: index < due ? at - DAY : nextDue(at, INTERVALS[today ? 0 : 1]),
      correct: 1,
      incorrect: 0,
      tested: true,
      policyVersion: 1,
    };
  });
  const sample = words[0] ?? catalog.words[0];
  const events = Array.from({ length: streak }, (_, offset) => {
    const eventAt = at - offset * DAY;
    return {
      id: `simulated:${offset}`,
      sessionId: "simulated",
      wordId: words[offset % Math.max(1, words.length)]?.id ?? sample.id,
      at: eventAt,
      day: dayKey(eventAt),
      correct: true,
      assisted: false,
      mode: "review" as const,
    };
  });
  return { ...emptySnapshot(), settings: { ...settings }, progress, events };
}
