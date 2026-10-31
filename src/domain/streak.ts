import { dayKey } from "./learning";
import type { AnswerEvent } from "./types";

// Recompute from timestamps so imported/device timezone labels cannot shift a streak.
export function learningStreak(events: readonly Pick<AnswerEvent, "at">[], at = Date.now()) {
  const today = dayKey(at);
  const days = new Set(
    events.filter((event) => Number.isFinite(event.at) && dayKey(event.at) <= today).map((event) => dayKey(event.at)),
  );
  let cursor = Date.parse(today + "T00:00:00Z");
  const key = () => new Date(cursor).toISOString().slice(0, 10);
  if (!days.has(key())) cursor -= 86_400_000;
  let count = 0;
  while (days.has(key())) {
    count++;
    cursor -= 86_400_000;
  }
  return count;
}
