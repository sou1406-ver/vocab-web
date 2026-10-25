import type { Snapshot, Word } from "../domain/types";

export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Dữ liệu không đúng định dạng.");
  return value as Record<string, unknown>;
}
const number = (v: unknown) => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 8_640_000_000_000_000;
const string = (v: unknown) => typeof v === "string";
const nonempty = (v: unknown) => typeof v === "string" && v.trim().length > 0 && v.length <= 500;
const questionKinds = ["meaning", "cloze", "recall"];
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
        return [x.text, x.pos, x.meaning].every(string);
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
    !["light", "dark", "system"].includes(settings.theme as string)
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
      (e.questionKind !== undefined && !questionKinds.includes(e.questionKind as string)) ||
      (e.contentVersion !== undefined && !nonempty(e.contentVersion)) ||
      (e.skill !== undefined && e.skill !== "vocabulary") ||
      (e.scoringVersion !== undefined && e.scoringVersion !== 1)
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
      if (![q.wordId, q.prompt, q.answer].every(string) || !questionKinds.includes(q.kind as string)) fail();
      if (
        q.kind === "meaning" &&
        (!Array.isArray(q.options) ||
          !q.options.every(string) ||
          !(q.options as string[]).includes(q.answer as string) ||
          new Set(q.options as string[]).size !== (q.options as string[]).length)
      )
        fail();
      // Accept omission, but writers retain [] while schema-2 clients may still be open.
      if (q.kind !== "meaning" && q.options !== undefined && (!Array.isArray(q.options) || q.options.length !== 0))
        fail();
    }
    if (session.feedback !== null) {
      const f = record(session.feedback);
      if (typeof f.correct !== "boolean" || typeof f.assisted !== "boolean" || !string(f.answer) || !string(f.input))
        fail();
    } else if (session.phase === "feedback") fail();
    if (session.finishedAt !== undefined && !number(session.finishedAt)) fail();
    if (session.peeked !== undefined && typeof session.peeked !== "boolean") fail();
    if (
      session.returnTo !== undefined &&
      (typeof session.returnTo !== "string" || !/^\/knowledge\/[a-z0-9-]+$/.test(session.returnTo))
    )
      fail();
  }
  return value as Snapshot;
}
