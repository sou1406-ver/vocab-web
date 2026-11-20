import { countLearnedWords, cultivationOf, cultivationRealms } from "./cultivation";
import { isWordStable, replaySkills } from "./skills";
import { learningStreak } from "./streak";
import type { Snapshot, Word } from "./types";

export interface StudyBaseline {
  learnedIds: string[];
  stableIds: string[];
}
const learnedIds = (snapshot: Snapshot) => [
  ...new Set(
    Object.entries(snapshot.progress)
      .filter(([, progress]) => progress.tested)
      .map(([id, progress]) => progress.groupWordId ?? id),
  ),
];
const stableIds = (snapshot: Snapshot, words: readonly Word[]) => {
  const skills = replaySkills(snapshot.events, snapshot.settings.timezone);
  return [
    ...new Set(
      words.filter((word) => isWordStable(word, snapshot.progress, skills)).map((word) => word.groupWordId ?? word.id),
    ),
  ];
};
export function captureStudyBaseline(snapshot: Snapshot, words: readonly Word[]): StudyBaseline {
  return { learnedIds: learnedIds(snapshot), stableIds: stableIds(snapshot, words) };
}
export function crossedCultivation(before: Snapshot, after: Snapshot, isCatalogWord: (id: string) => boolean) {
  const previous = countLearnedWords(before.progress, isCatalogWord);
  const current = countLearnedWords(after.progress, isCatalogWord);
  return cultivationRealms
    .filter(
      (realm) =>
        realm.words > previous && realm.words <= current && !(before.cultivationSeen ?? []).includes(realm.words),
    )
    .map((realm) => realm.words);
}
// Presentation metadata only: the answer, skill and scheduling records remain untouched.
export function acknowledgeCultivation(
  before: Snapshot,
  after: Snapshot,
  isCatalogWord: (id: string) => boolean,
): Snapshot {
  const crossed = crossedCultivation(before, after, isCatalogWord);
  return crossed.length
    ? { ...after, cultivationSeen: [...new Set([...(after.cultivationSeen ?? []), ...crossed])].sort((a, b) => a - b) }
    : after;
}
export function studySummary(
  snapshot: Snapshot,
  words: readonly Word[],
  isCatalogWord: (id: string) => boolean,
  at = Date.now(),
) {
  const session = snapshot.session;
  const events = snapshot.events.filter((event) => event.sessionId === session?.id);
  const answered = new Set(
    events.map((event) => event.senseCheck?.wordId ?? snapshot.progress[event.wordId]?.groupWordId ?? event.wordId),
  );
  const baseline = session?.progressBaseline;
  const delta = (now: string[], previous: string[]) =>
    now.filter((id) => answered.has(id) && !previous.includes(id)).length;
  const realm = cultivationOf(countLearnedWords(snapshot.progress, isCatalogWord));
  return {
    correct: events.filter((event) => event.correct).length,
    total: events.length,
    newLearned: baseline ? delta(learnedIds(snapshot), baseline.learnedIds) : null,
    newStable: baseline ? delta(stableIds(snapshot, words), baseline.stableIds) : null,
    remaining: realm.next === null ? 0 : Math.max(0, realm.next - realm.count),
    streak: learningStreak(snapshot.events, at),
  };
}
