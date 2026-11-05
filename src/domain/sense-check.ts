import type { AnswerEvent, StudySession } from "./types";

export function senseOutcome(session: StudySession, events: readonly AnswerEvent[], wordId: string) {
  const questions = session.questions.filter((q) => q.senseCheck?.wordId === wordId);
  const check = questions[0]?.senseCheck;
  if (!check) return null;
  const answers = events.filter((e) => e.sessionId === session.id && e.senseCheck?.wordId === wordId);
  return outcome(check, answers);
}

function outcome(check: NonNullable<AnswerEvent["senseCheck"]>, answers: readonly AnswerEvent[]) {
  const first = answers.filter((e) => e.senseCheck!.role !== "repair");
  if (!check.itemIds.every((id) => first.some((e) => e.wordId === id))) return "pending";
  const wrong = first.filter((e) => !e.correct);
  if (wrong.length > 1) return "unlearned";
  if (wrong.length === 1) {
    const repair = answers.find((e) => e.senseCheck!.role === "repair");
    if (!repair) return "pending";
    if (!repair.correct) return "unlearned";
  }
  return check.requiredItemIds.length === check.itemIds.length ? "passed" : "unintroduced";
}

export function latestSenseOutcome(events: readonly AnswerEvent[], wordId: string) {
  const latest = events
    .filter((e) => e.mode !== "practice" && e.senseCheck?.wordId === wordId)
    .reduce<
      AnswerEvent | undefined
    >((best, event) => (!best || event.at > best.at || (event.at === best.at && `${event.sessionId}:${event.id}` > `${best.sessionId}:${best.id}`) ? event : best), undefined);
  if (!latest?.senseCheck) return null;
  return outcome(
    latest.senseCheck,
    events.filter((e) => e.sessionId === latest.sessionId && e.senseCheck?.wordId === wordId),
  );
}

// Append a repair rather than inserting it: existing session indexes and event IDs never move.
export function queueSenseRepair(session: StudySession, events: readonly AnswerEvent[]): StudySession {
  const check = session.questions[session.index].senseCheck;
  if (!check || check.role === "repair" || session.mode === "practice") return session;
  const answers = events.filter(
    (e) => e.sessionId === session.id && e.senseCheck?.wordId === check.wordId && e.senseCheck.role !== "repair",
  );
  if (!check.itemIds.every((id) => answers.some((e) => e.wordId === id))) return session;
  const wrong = answers.filter((e) => !e.correct);
  if (
    wrong.length !== 1 ||
    session.questions.some((q) => q.senseCheck?.wordId === check.wordId && q.senseCheck.role === "repair")
  )
    return session;
  const original = session.questions.find(
    (q) => q.wordId === wrong[0].wordId && q.senseCheck?.wordId === check.wordId,
  )!;
  return {
    ...session,
    questions: [...session.questions, { ...original, senseCheck: { ...original.senseCheck!, role: "repair" } }],
  };
}

export const schedulesAnswer = (event: { senseCheck?: { role: string } }) =>
  !event.senseCheck || event.senseCheck.role === "scheduled";
