import type { Snapshot, Word } from "../domain/types";
import { singleWordMatch } from "../domain/word-match";
import { matchGlosses, matchMeaningsOverlap } from "./match";
import { LISTEN_PROMPTS } from "./listening";

export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Dữ liệu không đúng định dạng.");
  return value as Record<string, unknown>;
}
const number = (v: unknown) => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 8_640_000_000_000_000;
const string = (v: unknown) => typeof v === "string";
const nonempty = (v: unknown) => typeof v === "string" && v.trim().length > 0 && v.length <= 500;
const questionKinds = [
  "meaning",
  "cloze",
  "recall",
  "cloze-choice",
  "word-form-choice",
  "word-choice",
  "word-form",
  "build",
  "synonym-choice",
  "synonym-context",
  "match",
  "listen-choice",
  "listen-type",
];
const count = (value: unknown) => Number.isSafeInteger(value) && number(value);
const day = (v: unknown) => string(v) && /^\d{4}-\d{2}-\d{2}$/.test(v as string);
const safeId = (v: string) => v !== "__proto__" && v !== "constructor" && v !== "prototype";
export function isWord(value: unknown): value is Word {
  try {
    const w = record(value);
    return (
      [w.id, w.text, w.pos, w.ipa, w.meaning, w.definition].every(string) &&
      Boolean(w.id) &&
      safeId(w.id as string) &&
      Boolean(w.text) &&
      Boolean(w.meaning) &&
      number(w.lesson) &&
      Array.isArray(w.examples) &&
      w.examples.every((e) => {
        const x = record(e);
        return string(x.text) && string(x.translation);
      }) &&
      Array.isArray(w.family) &&
      w.family.every((f) => {
        const x = record(f);
        return (
          [x.text, x.pos, x.meaning].every(string) &&
          (x.parts === undefined || (Array.isArray(x.parts) && x.parts.every(string)))
        );
      }) &&
      [w.synonyms, w.antonyms, w.parts].every((a) => Array.isArray(a) && a.every(string))
    );
  } catch {
    return false;
  }
}
export function validateSnapshot(value: unknown): Snapshot {
  const s = record(value);
  const fail = () => {
    throw new Error("Bản sao lưu V2 thiếu dữ liệu hoặc có giá trị không hợp lệ. Dữ liệu hiện tại được giữ nguyên.");
  };
  if (s.schemaVersion !== 2 || !Number.isSafeInteger(s.revision) || !number(s.revision)) fail();
  if (
    s.savedWords !== undefined &&
    (!Array.isArray(s.savedWords) ||
      s.savedWords.length > 100_000 ||
      !s.savedWords.every((id) => typeof id === "string" && id.length > 0 && id.length <= 200 && safeId(id)) ||
      new Set(s.savedWords).size !== s.savedWords.length)
  )
    fail();
  const settings = record(s.settings);
  if (
    !string(settings.name) ||
    (settings.name as string).length > 60 ||
    !Number.isInteger(settings.dailyNew) ||
    (settings.dailyNew as number) < 1 ||
    (settings.dailyNew as number) > 50 ||
    !["light", "dark", "system"].includes(settings.theme as string) ||
    (settings.avatarSeed !== undefined &&
      (!nonempty(settings.avatarSeed) || (settings.avatarSeed as string).length > 200))
  )
    fail();
  try {
    new Intl.DateTimeFormat("en", { timeZone: settings.timezone as string }).format();
  } catch {
    fail();
  }
  if (!string(settings.timezone)) fail();
  for (const [id, raw] of Object.entries(record(s.progress))) {
    const p = record(raw);
    if (
      !safeId(id) ||
      ![p.startedAt, p.dueAt, p.correct, p.incorrect].every(number) ||
      !Number.isInteger(p.box) ||
      (p.box as number) < 0 ||
      (p.box as number) > 6 ||
      !day(p.startedDay) ||
      typeof p.tested !== "boolean" ||
      p.policyVersion !== 1 ||
      (p.reviewedDay !== undefined && !day(p.reviewedDay))
    )
      fail();
  }
  if (!Array.isArray(s.customWords) || !s.customWords.every(isWord)) fail();
  if (new Set((s.customWords as Word[]).map((w) => w.id)).size !== (s.customWords as Word[]).length) fail();
  if (!Array.isArray(s.events) || s.events.length > 100_000) fail();
  const eventIds = new Set();
  for (const raw of s.events as unknown[]) {
    const e = record(raw);
    if (
      ![e.id, e.sessionId, e.wordId].every(string) ||
      !number(e.at) ||
      !day(e.day) ||
      typeof e.correct !== "boolean" ||
      typeof e.assisted !== "boolean" ||
      !["learn", "review", "practice"].includes(e.mode as string) ||
      eventIds.has(e.id)
    )
      fail();
    eventIds.add(e.id);
    if (
      (e.questionId !== undefined && !nonempty(e.questionId)) ||
      ((e.questionKind === "listen-choice" || e.questionKind === "listen-type") && e.mode !== "practice") ||
      (e.questionKind !== undefined && !questionKinds.includes(e.questionKind as string)) ||
      (e.direction !== undefined &&
        ((e.direction !== "synonym" && e.direction !== "antonym") ||
          (e.questionKind !== "synonym-choice" && e.questionKind !== "synonym-context") ||
          (e.questionKind === "synonym-context" && e.direction !== "synonym"))) ||
      (e.contentVersion !== undefined && !nonempty(e.contentVersion)) ||
      (e.skill !== undefined && e.skill !== "vocabulary") ||
      (e.scoringVersion !== undefined && ![1, 2, 3, 4].includes(e.scoringVersion as number)) ||
      (e.scoringVersion === 3 &&
        (e.questionKind !== "build" || e.mode !== "practice" || e.hintCount !== 0 || e.hintLimit !== 0)) ||
      (e.scoringVersion === 4 &&
        (e.questionKind !== "match" || e.mode !== "practice" || e.hintCount !== 0 || e.hintLimit !== 0)) ||
      (e.questionKind === "match" &&
        (e.mode !== "practice" || (e.scoringVersion !== undefined && e.scoringVersion !== 4))) ||
      (e.sourceQuestionId !== undefined && !nonempty(e.sourceQuestionId)) ||
      (e.sourceVersion !== undefined && !nonempty(e.sourceVersion)) ||
      (e.hintCount !== undefined && !count(e.hintCount)) ||
      (e.hintLimit !== undefined && !count(e.hintLimit)) ||
      ((e.scoringVersion === 2 || e.scoringVersion === 3 || e.scoringVersion === 4) &&
        (!count(e.hintCount) ||
          !count(e.hintLimit) ||
          ((e.hintCount as number) > (e.hintLimit as number) && !e.assisted) ||
          (e.correct && e.assisted)))
    )
      fail();
  }
  if (
    !Array.isArray(s.history) ||
    !Array.isArray(s.imports) ||
    !s.imports.every(string) ||
    !Array.isArray(s.legacyArchives)
  )
    fail();
  for (const raw of s.history as unknown[]) {
    const h = record(raw);
    if (
      ![h.id, h.title].every(string) ||
      ![h.at, h.correct, h.total].every(number) ||
      (h.correct as number) > (h.total as number) ||
      typeof h.finished !== "boolean" ||
      !["learn", "review", "practice"].includes(h.mode as string)
    )
      fail();
  }
  if (s.session !== null) {
    const session = record(s.session);
    if (
      ![session.id, session.title, session.contentVersion].every(string) ||
      !number(session.startedAt) ||
      !["learn", "review", "practice"].includes(session.mode as string) ||
      !["learn", "question", "feedback", "complete"].includes(session.phase as string) ||
      !Array.isArray(session.questions) ||
      !session.questions.length ||
      session.questions.length > 600 ||
      !Number.isInteger(session.index) ||
      (session.index as number) < 0 ||
      (session.index as number) >= session.questions.length
    )
      fail();
    for (const raw of session.questions as unknown[]) {
      const q = record(raw);
      if (![q.wordId, q.prompt].every(string) || !questionKinds.includes(q.kind as string)) fail();
      if (q.kind === "build") {
        if (
          session.mode !== "practice" ||
          !Array.isArray(q.answer) ||
          q.answer.length < 2 ||
          !q.answer.every(nonempty) ||
          new Set(q.answer.map((part: string) => part.trim().toLowerCase())).size !== q.answer.length ||
          !Array.isArray(q.tiles) ||
          q.tiles.length !== q.answer.length + 3 ||
          !q.tiles.every(nonempty) ||
          new Set(q.tiles.map((part: string) => part.trim().toLowerCase())).size !== q.tiles.length ||
          !q.answer.every((part) => (q.tiles as string[]).includes(part)) ||
          (q.form !== undefined && !nonempty(q.form)) ||
          (q.sourceId !== undefined &&
            (!nonempty(q.sourceId) || !(q.sourceId as string).startsWith(`build:${q.wordId}:`))) ||
          (q.sourceVersion !== undefined && !nonempty(q.sourceVersion)) ||
          (q.sourceId === undefined) !== (q.sourceVersion === undefined) ||
          (q.options !== undefined && (!Array.isArray(q.options) || q.options.length !== 0))
        )
          fail();
      } else if (!string(q.answer)) fail();
      if (
        q.kind === "match" &&
        (session.mode !== "practice" ||
          !nonempty(q.prompt) ||
          !nonempty(q.answer) ||
          !matchGlosses(q.answer as string).length ||
          (q.groupId !== undefined && !nonempty(q.groupId)) ||
          (q.sourceId !== undefined &&
            (!nonempty(q.sourceId) ||
              !(q.sourceId as string).startsWith("match:") ||
              !(q.sourceId as string).endsWith(`:${q.wordId}`))) ||
          (q.sourceVersion !== undefined && !nonempty(q.sourceVersion)) ||
          (q.sourceId === undefined) !== (q.sourceVersion === undefined) ||
          (q.options !== undefined && (!Array.isArray(q.options) || q.options.length !== 0)))
      )
        fail();
      if (
        (q.kind === "meaning" ||
          q.kind === "cloze-choice" ||
          q.kind === "word-form-choice" ||
          q.kind === "synonym-choice" ||
          q.kind === "synonym-context" ||
          q.kind === "word-choice" ||
          q.kind === "listen-choice") &&
        (!Array.isArray(q.options) ||
          !q.options.every(string) ||
          !(q.options as string[]).includes(q.answer as string) ||
          new Set(q.options as string[]).size !== (q.options as string[]).length)
      )
        fail();
      if (q.kind === "listen-choice" || q.kind === "listen-type") {
        if (
          session.mode !== "practice" ||
          q.prompt !== LISTEN_PROMPTS[q.kind] ||
          !nonempty(q.answer) ||
          (q.sourceId !== undefined && (!nonempty(q.sourceId) || q.sourceId !== `${q.kind}:${q.wordId}`)) ||
          (q.sourceVersion !== undefined && !nonempty(q.sourceVersion)) ||
          (q.sourceId === undefined) !== (q.sourceVersion === undefined) ||
          (q.kind === "listen-choice" &&
            ((q.options as string[]).length !== 4 ||
              (q.options as string[]).some((option) => !option.trim()) ||
              new Set((q.options as string[]).map((option) => option.trim().toLowerCase().replace(/\s+/g, " ")))
                .size !== 4)) ||
          (q.kind === "listen-type" && q.options !== undefined && (!Array.isArray(q.options) || q.options.length !== 0))
        )
          fail();
      }
      if (q.kind === "synonym-choice" || q.kind === "synonym-context") {
        if (
          session.mode !== "practice" ||
          (q.options as unknown[]).length !== 4 ||
          new Set((q.options as string[]).map((option) => option.trim().toLowerCase().replace(/\s+/g, " "))).size !==
            4 ||
          (q.options as string[]).some((option) => !option.trim()) ||
          (q.direction !== undefined && q.direction !== "synonym" && q.direction !== "antonym") ||
          (q.kind === "synonym-context" &&
            (q.direction === "antonym" ||
              /_{3,}/.test(q.prompt as string) ||
              (q.target !== undefined &&
                (!nonempty(q.target) || !singleWordMatch(q.prompt as string, q.target as string))))) ||
          (q.kind === "synonym-choice" &&
            (q.prompt as string).startsWith("TRÁI NGHĨA: ") &&
            q.direction !== "antonym") ||
          (q.sourceId !== undefined && !nonempty(q.sourceId)) ||
          (q.sourceVersion !== undefined && !nonempty(q.sourceVersion)) ||
          (q.sourceId === undefined) !== (q.sourceVersion === undefined)
        )
          fail();
      }
      if (
        q.kind === "word-choice" &&
        ((q.options as string[]).length < 2 ||
          (q.options as string[]).length > 4 ||
          new Set((q.options as string[]).map((v) => v.trim().toLowerCase())).size !== (q.options as string[]).length)
      )
        fail();
      // Accept omission, but writers retain [] while schema-2 clients may still be open.
      if (
        (q.kind === "cloze" || q.kind === "recall" || q.kind === "word-form") &&
        q.options !== undefined &&
        (!Array.isArray(q.options) || q.options.length !== 0)
      )
        fail();
      if (
        q.kind === "word-form" &&
        ((q.prompt as string).match(/_{3,}/g)?.length !== 1 ||
          (q.sourceId !== undefined && !nonempty(q.sourceId)) ||
          (q.sourceVersion !== undefined && !nonempty(q.sourceVersion)) ||
          (q.sourceId === undefined) !== (q.sourceVersion === undefined))
      )
        fail();
      if (
        (q.kind === "cloze-choice" || q.kind === "word-form-choice") &&
        (!nonempty(q.sourceId) ||
          !nonempty(q.sourceVersion) ||
          (q.prompt as string).match(/_{3,}/g)?.length !== 1 ||
          (q.options as string[]).length !== 4 ||
          new Set((q.options as string[]).map((v) => v.trim().toLowerCase())).size !== 4)
      )
        fail();
    }
    const questions = session.questions as unknown[];
    const matches = questions.map(record).filter((q) => q.kind === "match");
    if (matches.length) {
      if (
        matches.length !== questions.length ||
        matches.length % 6 !== 0 ||
        (session.index as number) % 6 !== 0 ||
        session.phase === "learn"
      )
        fail();
      const groups = new Set<string>();
      for (let start = 0; start < matches.length; start += 6) {
        const group = matches.slice(start, start + 6);
        const id = group[0].groupId;
        if (id !== undefined && groups.has(id as string)) fail();
        if (id !== undefined) groups.add(id as string);
        if (
          group.some((q) => q.groupId !== id) ||
          new Set(group.map((q) => q.wordId)).size !== 6 ||
          new Set(group.map((q) => (q.prompt as string).trim().toLowerCase().replace(/\s+/g, " "))).size !== 6
        )
          fail();
        for (let a = 0; a < group.length; a++)
          for (let b = a + 1; b < group.length; b++)
            if (matchMeaningsOverlap(group[a].answer as string, group[b].answer as string)) fail();
      }
      const current = matches.slice(session.index as number, (session.index as number) + 6);
      for (const event of s.events as Record<string, unknown>[]) {
        if (event.sessionId !== session.id) continue;
        const prefix = `${session.id}:`;
        const index =
          typeof event.id === "string" && event.id.startsWith(prefix) ? Number(event.id.slice(prefix.length)) : -1;
        if (
          !Number.isInteger(index) ||
          index < 0 ||
          index >= matches.length ||
          event.id !== `${prefix}${index}` ||
          event.wordId !== matches[index].wordId ||
          event.questionKind !== "match" ||
          event.mode !== "practice"
        )
          fail();
      }
      const complete = current.every((_, index) =>
        (s.events as Record<string, unknown>[]).some(
          (event) => event.id === `${session.id}:${(session.index as number) + index}`,
        ),
      );
      if ((session.phase === "feedback" && !complete) || (session.phase === "question" && complete)) fail();
    }
    if (
      session.matchMistakes !== undefined &&
      (!Array.isArray(session.matchMistakes) ||
        new Set(session.matchMistakes).size !== session.matchMistakes.length ||
        !session.matchMistakes.every(
          (index) =>
            Number.isInteger(index) &&
            index >= 0 &&
            index < questions.length &&
            record(questions[index]).kind === "match",
        ))
    )
      fail();
    if (session.feedback !== null) {
      const f = record(session.feedback);
      if (typeof f.correct !== "boolean" || typeof f.assisted !== "boolean" || !string(f.answer) || !string(f.input))
        fail();
      if (f.selectedParts !== undefined) {
        const q = record((session.questions as unknown[])[session.index as number]);
        if (
          q.kind !== "build" ||
          !Array.isArray(f.selectedParts) ||
          !f.selectedParts.every((part) => string(part) && (q.tiles as string[]).includes(part)) ||
          new Set(f.selectedParts).size !== f.selectedParts.length
        )
          fail();
      }
    } else if (session.phase === "feedback") fail();
    if (session.finishedAt !== undefined && !number(session.finishedAt)) fail();
    if (session.peeked !== undefined && typeof session.peeked !== "boolean") fail();
    if (session.revealed !== undefined) {
      const q = record((session.questions as unknown[])[session.index as number]);
      const chars = typeof q.answer === "string" ? Array.from(q.answer) : [];
      if (
        !Array.isArray(session.revealed) ||
        new Set(session.revealed).size !== session.revealed.length ||
        !session.revealed.every(
          (position) =>
            Number.isInteger(position) && position >= 0 && position < chars.length && /\p{L}/u.test(chars[position]),
        ) ||
        (session.revealed.length &&
          q.kind !== "recall" &&
          q.kind !== "cloze" &&
          q.kind !== "word-form" &&
          q.kind !== "listen-type")
      )
        fail();
    }
    if (
      session.returnTo !== undefined &&
      (typeof session.returnTo !== "string" || !/^\/knowledge\/[a-z0-9-]+$/.test(session.returnTo))
    )
      fail();
  }
  return value as Snapshot;
}
