import type {
  AnswerEvent,
  Catalog,
  Feedback,
  Question,
  SessionMode,
  Snapshot,
  StudySession,
  Word,
  WordProgress,
  RecognitionQuestion,
} from "./types";
import { shuffleSeeded } from "./random";

export const INTERVALS = [1, 3, 7, 14, 30, 60];
export const TIMEZONE = "Asia/Ho_Chi_Minh";
export function dayKey(at = Date.now(), timezone = TIMEZONE) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(at);
  return ["year", "month", "day"].map((name) => parts.find((part) => part.type === name)?.value).join("-");
}
export function nextDue(at: number, days: number, timezone = TIMEZONE) {
  const date = new Date(dayKey(at, timezone) + "T00:00:00Z");
  date.setUTCDate(date.getUTCDate() + days);
  const targetDay = date.toISOString().slice(0, 10);
  // Binary search local midnight, independent of OS timezone and DST offsets.
  let low = date.getTime() - 18 * 3_600_000;
  let high = date.getTime() + 18 * 3_600_000;
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    if (dayKey(middle, timezone) < targetDay) low = middle;
    else high = middle;
  }
  return high;
}
export function emptySnapshot(): Snapshot {
  return {
    schemaVersion: 2,
    revision: 0,
    settings: { name: "", dailyNew: 10, timezone: TIMEZONE, theme: "light" },
    progress: {},
    events: [],
    session: null,
    history: [],
    customWords: [],
    imports: [],
    legacyArchives: [],
  };
}
export function statusOf(progress?: WordProgress) {
  if (!progress) return "Chưa học";
  if (!progress.tested) return "Đang học";
  return progress.box >= 5 ? "Nhớ ổn định" : "Đang ôn";
}
export function dueIds(snapshot: Snapshot, at = Date.now()) {
  const day = dayKey(at, snapshot.settings.timezone);
  return Object.entries(snapshot.progress)
    .filter(([, p]) => p.tested && p.dueAt <= at && p.reviewedDay !== day)
    .sort(([a, x], [b, y]) => x.dueAt - y.dueAt || a.localeCompare(b))
    .map(([id]) => id);
}
export function introducedToday(snapshot: Snapshot, at = Date.now()) {
  const day = dayKey(at, snapshot.settings.timezone);
  return Object.values(snapshot.progress).filter((p) => p.startedDay === day).length;
}
export const normalizeAnswer = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");
export const questionAnswerText = (question: Question) =>
  question.kind === "build"
    ? (question.form ?? question.answer.map((part) => part.replace(/^-|-$/g, "")).join(""))
    : question.answer;
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export const hintAllowance = (answer: string) =>
  Math.floor(Array.from(answer).filter((char) => /\p{L}/u.test(char)).length * 0.3);
export function revealQuestionLetter(snapshot: Snapshot, sessionId: string, index: number): Snapshot {
  const session = snapshot.session;
  if (!session || session.id !== sessionId || session.index !== index || session.phase !== "question")
    throw new Error("Lượt học đã thay đổi. Hãy mở lại câu hiện tại.");
  const q = session.questions[index];
  if (q.kind !== "recall" && q.kind !== "cloze" && q.kind !== "word-form")
    throw new Error("Câu này không dùng gợi ý chữ.");
  const revealed = session.revealed ?? [];
  const next = Array.from(q.answer).findIndex((char, position) => /\p{L}/u.test(char) && !revealed.includes(position));
  if (next < 0) return snapshot;
  const indices = [...revealed, next];
  return {
    ...snapshot,
    session: {
      ...session,
      revealed: indices,
      peeked: Boolean(session.peeked) || indices.length > hintAllowance(q.answer),
    },
  };
}
export function makeQuestions(words: Word[], all: Word[], mode: SessionMode, sessionId = "preview"): Question[] {
  return words.map((word, i) => {
    const match = word.examples.find((example) =>
      new RegExp(`\\b${escapeRegex(word.text)}\\b`, "i").test(example.text),
    );
    const kind = mode === "learn" ? i % 3 : (i % 2) + 1;
    if (kind === 1 && match)
      return {
        wordId: word.id,
        kind: "cloze",
        prompt: match.text.replace(new RegExp(`\\b${escapeRegex(word.text)}\\b`, "gi"), "________"),
        answer: word.text,
        options: [],
      };
    if (kind !== 0) return { wordId: word.id, kind: "recall", prompt: word.meaning, answer: word.text, options: [] };
    const meanings = new Set([word.meaning]);
    const choices = [word.meaning];
    for (const candidate of [...all.filter((w) => w.pos === word.pos), ...all]) {
      if (candidate.text === word.text || meanings.has(candidate.meaning)) continue;
      if (candidate.meaning.split(/[;,]/).some((part) => word.meaning.includes(part.trim()))) continue;
      choices.push(candidate.meaning);
      meanings.add(candidate.meaning);
      if (choices.length === 4) break;
    }
    return {
      wordId: word.id,
      kind: "meaning",
      prompt: word.text,
      answer: word.meaning,
      options: shuffleSeeded(choices, `${sessionId}:${word.id}:meaning`),
    };
  });
}
export function beginSession(
  snapshot: Snapshot,
  catalog: Catalog,
  words: Word[],
  mode: SessionMode,
  title: string,
  id: string,
  at = Date.now(),
): Snapshot {
  if (snapshot.session && snapshot.session.phase !== "complete")
    throw new Error("Bạn còn một lượt đang học. Hãy tiếp tục hoặc kết thúc lượt đó trước.");
  if (!words.length) throw new Error("Chưa có từ phù hợp cho lượt này.");
  const session: StudySession = {
    id,
    title,
    mode,
    questions: makeQuestions(words, catalog.words, mode, id),
    contentVersion: catalog.version,
    index: 0,
    phase: mode === "learn" ? "learn" : "question",
    feedback: null,
    startedAt: at,
  };
  const next = { ...snapshot, session };
  return mode === "learn" ? introduce(next, words[0].id, at) : next;
}
export function makeRecognitionQuestions(words: Word[], all: Word[], sessionId = "preview"): RecognitionQuestion[] {
  const glosses = (value: string) =>
    normalizeAnswer(value)
      .split(/[;,]/)
      .map((part) => part.trim())
      .filter(Boolean);
  return words.flatMap((word): RecognitionQuestion[] => {
    const related = new Set([word.text, ...word.synonyms, ...word.family.map((f) => f.text)].map(normalizeAnswer));
    const pool = [...all.filter((w) => w.pos === word.pos), ...all.filter((w) => w.pos !== word.pos)];
    const chosen = [word];
    const names = new Set([normalizeAnswer(word.text)]);
    const meanings = new Set([normalizeAnswer(word.meaning)]);
    for (const candidate of pool) {
      if (
        candidate.id === word.id ||
        related.has(normalizeAnswer(candidate.text)) ||
        names.has(normalizeAnswer(candidate.text)) ||
        meanings.has(normalizeAnswer(candidate.meaning))
      )
        continue;
      if (
        candidate.synonyms.map(normalizeAnswer).includes(normalizeAnswer(word.text)) ||
        candidate.family.some((f) => normalizeAnswer(f.text) === normalizeAnswer(word.text))
      )
        continue;
      if (
        glosses(candidate.meaning).some((part) =>
          glosses(word.meaning).some((target) => part.includes(target) || target.includes(part)),
        )
      )
        continue;
      chosen.push(candidate);
      names.add(normalizeAnswer(candidate.text));
      meanings.add(normalizeAnswer(candidate.meaning));
      if (chosen.length === 4) break;
    }
    if (chosen.length < 2) throw new Error("Chưa đủ đáp án khác nhau để luyện chọn từ. Hãy chọn bài khác.");
    return [
      {
        kind: "meaning",
        wordId: word.id,
        prompt: word.text,
        answer: word.meaning,
        options: shuffleSeeded(
          chosen.map((w) => w.meaning),
          `${sessionId}:${word.id}:meaning`,
        ),
      },
      {
        kind: "word-choice",
        wordId: word.id,
        prompt: word.meaning,
        answer: word.text,
        options: shuffleSeeded(
          chosen.map((w) => w.text),
          `${sessionId}:${word.id}:word-choice`,
        ),
      },
    ];
  });
}
export function beginExerciseSession(
  snapshot: Snapshot,
  catalog: Catalog,
  questions: Question[],
  title: string,
  id: string,
  at = Date.now(),
): Snapshot {
  const words = questions.map((q) => catalog.words.find((w) => w.id === q.wordId));
  if (words.some((word) => !word)) throw new Error("Bài tập có liên kết từ không hợp lệ.");
  const next = beginSession(snapshot, catalog, words as Word[], "practice", title, id, at);
  return { ...next, session: { ...next.session!, questions } };
}
function introduce(snapshot: Snapshot, wordId: string, at: number): Snapshot {
  if (snapshot.progress[wordId]) return snapshot;
  const progress: WordProgress = {
    startedAt: at,
    startedDay: dayKey(at, snapshot.settings.timezone),
    box: 0,
    dueAt: 0,
    correct: 0,
    incorrect: 0,
    tested: false,
    policyVersion: 1,
  };
  return { ...snapshot, progress: { ...snapshot.progress, [wordId]: progress } };
}
export function answerQuestion(
  snapshot: Snapshot,
  sessionId: string,
  index: number,
  input: string | string[],
  assisted: boolean,
  at = Date.now(),
): Snapshot {
  const session = snapshot.session;
  if (!session || session.id !== sessionId || session.index !== index)
    throw new Error("Lượt học đã thay đổi ở cửa sổ khác. Hãy mở lại lượt hiện tại.");
  if (session.phase === "feedback" || session.phase === "complete") return snapshot;
  if (session.phase !== "question") throw new Error("Hãy xem từ trước khi trả lời.");
  const id = `${sessionId}:${index}`;
  if (snapshot.events.some((event) => event.id === id)) return snapshot;
  const q = session.questions[index];
  const hintCount = session.revealed?.length ?? 0;
  if (q.kind === "match") throw new Error("Hãy trả lời trên bảng nối từ.");
  if ((q.kind === "synonym-choice" || q.kind === "synonym-context") && session.mode !== "practice")
    throw new Error("Đồng nghĩa chỉ dùng trong lượt luyện thêm.");
  if (q.kind === "build" && session.mode !== "practice") throw new Error("Ghép từ chỉ dùng trong lượt luyện thêm.");
  const hintLimit = q.kind === "recall" || q.kind === "cloze" || q.kind === "word-form" ? hintAllowance(q.answer) : 0;
  assisted = assisted || Boolean(session.peeked) || hintCount > hintLimit;
  const correct =
    !assisted &&
    (q.kind === "build"
      ? Array.isArray(input) &&
        input.length === q.answer.length &&
        input.every((part, position) => part === q.answer[position])
      : typeof input === "string" && normalizeAnswer(input) === normalizeAnswer(q.answer));
  const day = dayKey(at, snapshot.settings.timezone);
  const event: AnswerEvent = {
    id,
    sessionId,
    wordId: q.wordId,
    at,
    day,
    correct,
    assisted,
    mode: session.mode,
    questionId: id,
    questionKind: q.kind,
    contentVersion: session.contentVersion,
    ...((q.kind === "cloze-choice" ||
      q.kind === "word-form-choice" ||
      q.kind === "word-form" ||
      q.kind === "build" ||
      q.kind === "synonym-choice" ||
      q.kind === "synonym-context") &&
    q.sourceId &&
    q.sourceVersion
      ? { sourceQuestionId: q.sourceId, sourceVersion: q.sourceVersion }
      : {}),
    skill: "vocabulary",
    ...(q.kind === "synonym-choice" || q.kind === "synonym-context" ? { direction: q.direction ?? "synonym" } : {}),
    scoringVersion: q.kind === "build" ? 3 : 2,
    hintCount,
    hintLimit,
  };
  const feedback: Feedback = {
    correct,
    assisted,
    answer: questionAnswerText(q),
    input: Array.isArray(input) ? input.join(" + ") : input,
    ...(q.kind === "build" ? { selectedParts: Array.isArray(input) ? [...input] : [] } : {}),
  };
  const previous = snapshot.progress[q.wordId];
  const p: WordProgress = previous ?? {
    startedAt: at,
    startedDay: day,
    box: 0,
    dueAt: 0,
    correct: 0,
    incorrect: 0,
    tested: false,
    policyVersion: 1,
  };
  const nextProgress = { ...p, correct: p.correct + Number(correct), incorrect: p.incorrect + Number(!correct) };
  if (session.mode === "learn" && !p.tested) {
    nextProgress.tested = true;
    nextProgress.box = 1;
    nextProgress.dueAt = nextDue(at, 1, snapshot.settings.timezone);
  } else if (session.mode === "review" && p.tested && p.dueAt <= at && p.reviewedDay !== day) {
    nextProgress.box = correct ? Math.min(6, p.box + 1) : 1;
    nextProgress.dueAt = nextDue(at, INTERVALS[nextProgress.box - 1], snapshot.settings.timezone);
    nextProgress.reviewedDay = day;
  }
  const progress =
    session.mode === "practice" && !previous ? snapshot.progress : { ...snapshot.progress, [q.wordId]: nextProgress };
  return {
    ...snapshot,
    progress,
    events: [...snapshot.events, event],
    session: { ...session, phase: "feedback", feedback },
  };
}
export function advanceSession(
  snapshot: Snapshot,
  sessionId: string,
  expectedIndex: number,
  at = Date.now(),
): Snapshot {
  const session = snapshot.session;
  if (!session || session.id !== sessionId || session.index !== expectedIndex)
    throw new Error("Lượt học đã thay đổi. Hãy tiếp tục từ vị trí mới nhất.");
  if (session.phase === "learn") return { ...snapshot, session: { ...session, phase: "question" } };
  if (session.phase !== "feedback") return snapshot;
  const nextIndex = session.index + (session.questions[session.index].kind === "match" ? 6 : 1);
  if (nextIndex >= session.questions.length) return finishSession(snapshot, true, at);
  const wordId = session.questions[nextIndex].wordId;
  const next: Snapshot = {
    ...snapshot,
    session: {
      ...session,
      index: nextIndex,
      phase: session.mode === "learn" ? "learn" : "question",
      feedback: null,
      peeked: false,
      revealed: [],
    },
  };
  return session.mode === "learn" ? introduce(next, wordId, at) : next;
}
export function finishSession(snapshot: Snapshot, finished: boolean, at = Date.now()): Snapshot {
  const session = snapshot.session;
  if (!session || session.phase === "complete") return snapshot;
  const answers = snapshot.events.filter((event) => event.sessionId === session.id);
  return {
    ...snapshot,
    session: { ...session, phase: "complete", finishedAt: at },
    history: [
      ...snapshot.history.filter((item) => item.id !== session.id),
      {
        id: session.id,
        title: session.title,
        mode: session.mode,
        at,
        correct: answers.filter((a) => a.correct).length,
        total: answers.length,
        finished,
      },
    ],
  };
}
