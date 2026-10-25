import { dayKey } from "./learning";
import type { AnswerEvent, MatchQuestion, Snapshot, StudySession } from "./types";

export function matchGroup(session: StudySession): MatchQuestion[] {
  const group = session.questions.slice(session.index, session.index + 6);
  const first = group[0];
  if (
    session.index % 6 !== 0 ||
    group.length !== 6 ||
    first.kind !== "match" ||
    group.some((q) => q.kind !== "match" || q.groupId !== first.groupId)
  )
    throw new Error("Bảng nối từ cần đúng 6 cặp cùng nhóm.");
  return group as MatchQuestion[];
}

export function answerMatchPair(
  snapshot: Snapshot,
  sessionId: string,
  expectedIndex: number,
  leftIndex: number,
  rightIndex: number,
  at = Date.now(),
): Snapshot {
  const session = snapshot.session;
  if (!session || session.id !== sessionId || session.index !== expectedIndex)
    throw new Error("Lượt học đã thay đổi. Hãy mở lại bảng nối hiện tại.");
  if (session.mode !== "practice") throw new Error("Nối từ chỉ dùng trong lượt luyện thêm.");
  const group = matchGroup(session);
  for (const index of [leftIndex, rightIndex])
    if (!Number.isInteger(index) || index < expectedIndex || index >= expectedIndex + group.length)
      throw new Error("Cặp không thuộc bảng nối hiện tại.");
  if (session.phase === "feedback" || session.phase === "complete") return snapshot;
  if (session.phase !== "question") throw new Error("Bảng nối chưa sẵn sàng.");
  const eventId = (index: number) => `${sessionId}:${index}`;
  if (snapshot.events.some((event) => event.id === eventId(leftIndex) || event.id === eventId(rightIndex)))
    return snapshot;
  const mistakes = session.matchMistakes ?? [];
  // Only the selected English word is marked wrong; the unselected word is unaffected.
  if (leftIndex !== rightIndex)
    return mistakes.includes(leftIndex)
      ? snapshot
      : { ...snapshot, session: { ...session, matchMistakes: [...mistakes, leftIndex] } };
  const q = group[leftIndex - expectedIndex];
  const event: AnswerEvent = {
    id: eventId(leftIndex),
    questionId: eventId(leftIndex),
    sessionId,
    wordId: q.wordId,
    at,
    day: dayKey(at, snapshot.settings.timezone),
    correct: !mistakes.includes(leftIndex),
    assisted: false,
    mode: "practice",
    questionKind: "match",
    contentVersion: session.contentVersion,
    skill: "vocabulary",
    scoringVersion: 4,
    hintCount: 0,
    hintLimit: 0,
    ...(q.sourceId && q.sourceVersion ? { sourceQuestionId: q.sourceId, sourceVersion: q.sourceVersion } : {}),
  };
  const events = [...snapshot.events, event];
  const answers = events.filter((item) => group.some((_, index) => item.id === eventId(expectedIndex + index)));
  const complete = answers.length === 6;
  return {
    ...snapshot,
    events,
    session: {
      ...session,
      phase: complete ? "feedback" : "question",
      feedback: complete
        ? {
            correct: answers.every((answer) => answer.correct),
            assisted: false,
            answer: "Đã nối đủ 6 cặp.",
            input: `${answers.filter((answer) => answer.correct).length}/6 cặp đúng từ lần đầu.`,
          }
        : null,
    },
  };
}
