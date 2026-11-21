import { shuffleSeeded } from "./random";
import { CHOICE_KINDS } from "./study-shortcuts";
import type { Question, SemanticHint, StudyHint, StudyHintKind, StudySession, Word } from "./types";

export type StudyHintPrice = "free" | "letter" | "assisted";

export interface StudyHintOffer {
  hint: StudyHint;
  price: StudyHintPrice;
  blocked?: boolean;
}

const semanticKinds = ["example", "definition", "synonym"] as const;
const letterKinds = ["letter", "prefix", "suffix"] as const;
const typedKinds = ["recall", "cloze", "word-form", "listen-type"] as const;

const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");
const letterPositions = (answer: string) =>
  Array.from(answer).flatMap((char, index) => (/\p{L}/u.test(char) ? [index] : []));

export const hintAllowance = (answer: string) => Math.floor(letterPositions(answer).length * 0.3);
export const isSemanticHint = (hint: StudyHint): hint is SemanticHint => isSemanticKind(hint.kind);
const isSemanticKind = (kind: unknown) => semanticKinds.some((item) => kind === item);
const isLetterKind = (kind: unknown) => letterKinds.some((item) => kind === item);

export function hintKindFitsQuestion(kind: unknown, questionKind: unknown) {
  if (kind === "eliminate") return CHOICE_KINDS.some((item) => item === questionKind);
  if (isLetterKind(kind)) return typedKinds.some((item) => item === questionKind);
  if (kind === "pronunciation" || isSemanticKind(kind))
    return typedKinds.some((item) => item !== "listen-type" && item === questionKind);
  return false;
}

export function hintsRequireAssistance(kinds: readonly StudyHintKind[]) {
  return kinds.includes("eliminate") || kinds.includes("pronunciation") || kinds.filter(isSemanticKind).length > 1;
}

export function eliminatedOptions(session: StudySession | null) {
  const hint = session?.hints?.find((item) => item.kind === "eliminate");
  return hint?.value ?? [];
}

export function nextHintPosition(session: StudySession, index = session.index): number {
  const question = session.questions[index];
  if (
    session.phase !== "question" ||
    index !== session.index ||
    !question ||
    !hintKindFitsQuestion("letter", question.kind) ||
    typeof question.answer !== "string"
  )
    return -1;
  const letters = letterPositions(question.answer);
  const revealed = new Set(session.revealed ?? []);
  if (letters.filter((position) => !revealed.has(position)).length <= 1) return -1;
  const order = shuffleSeeded(letters, `${session.id}:${index}:hint`);
  if (letters.length >= 4 && order[0] === letters[0]) [order[0], order[1]] = [order[1], order[0]];
  return order.find((position) => !revealed.has(position)) ?? -1;
}

const normalizeExample = (text: string) => normalize(text.replace(/_+/g, "___"));
const cueText = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0 && value.length <= 4000;

function answerPattern(answer: string) {
  const escaped = answer
    .trim()
    .split(/\s+/)
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("\\s+");
  return `(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`;
}

export function studyHintFitsQuestion(value: unknown, question: Question): value is StudyHint {
  if (
    !value ||
    typeof value !== "object" ||
    !("kind" in value) ||
    typeof question.answer !== "string" ||
    !question.answer.trim()
  )
    return false;
  const { kind, value: content } = value as { kind: unknown; value?: unknown };
  if (!hintKindFitsQuestion(kind, question.kind)) return false;
  const { answer } = question;
  if (kind === "pronunciation") return content === undefined;
  if (kind === "eliminate") {
    const options: readonly string[] = question.options ?? [];
    return (
      Array.isArray(content) &&
      content.length === 2 &&
      new Set(content).size === 2 &&
      options.length === 4 &&
      content.every(
        (option) => typeof option === "string" && options.includes(option) && normalize(option) !== normalize(answer),
      )
    );
  }
  if (isSemanticKind(kind))
    return (
      cueText(content) &&
      !new RegExp(answerPattern(answer), "iu").test(content) &&
      (kind !== "example" ||
        (content.includes("___") &&
          normalizeExample(content) !==
            normalizeExample(
              question.kind === "word-form" ? question.prompt.replace(/\s+\([^()]*\)\s*$/, "") : question.prompt,
            )))
    );
  const letters = letterPositions(answer);
  if (kind === "letter") return typeof content === "number" && letters.includes(content);
  if (!Array.isArray(content) || !content.length || content.length >= letters.length) return false;
  const edge = kind === "prefix" ? letters.slice(0, content.length) : letters.slice(-content.length);
  return content.every((position, index) => position === edge[index]);
}

export function hintLetterPositions(hint: StudyHint): number[] {
  if (hint.kind === "letter") return [hint.value];
  if (hint.kind === "prefix" || hint.kind === "suffix") return hint.value;
  return [];
}

export function studyHintPrice(session: StudySession, hint: StudyHint): StudyHintPrice | null {
  const question = session.questions[session.index];
  if (
    session.phase !== "question" ||
    !question ||
    !studyHintFitsQuestion(hint, question) ||
    typeof question.answer !== "string" ||
    (hint.kind !== "letter" && session.hints?.some(({ kind }) => kind === hint.kind))
  )
    return null;
  if (isSemanticHint(hint)) return session.hints?.some(isSemanticHint) ? "assisted" : "free";
  if (hint.kind === "pronunciation" || hint.kind === "eliminate") return "assisted";
  if (hint.kind === "letter" && hint.value !== nextHintPosition(session)) return null;
  const used = new Set(session.revealed ?? []);
  const count = new Set([...used, ...hintLetterPositions(hint)]).size;
  const limit = hintAllowance(question.answer);
  if (count === used.size || count >= letterPositions(question.answer).length) return null;
  if (count <= limit) return "letter";
  return hint.kind === "letter" ? "assisted" : null;
}

export function savedLetterHintsValid(session: StudySession): boolean {
  const actions = (session.hints ?? []).filter(({ kind }) => isLetterKind(kind));
  if (!actions.length) return true;
  const revealed = session.revealed ?? [];
  const seen = new Set<number>();
  const firstSeen = actions.map((action) =>
    hintLetterPositions(action).filter((position) => {
      if (seen.has(position)) return false;
      seen.add(position);
      return true;
    }),
  );

  // Each action appends its new positions. Walk the appends backward to recover the legacy prefix.
  let start = revealed.length;
  for (let index = firstSeen.length - 1; index >= 0; index--) {
    const before = start;
    for (const position of firstSeen[index].toReversed()) {
      if (revealed[start - 1] === position) start--;
    }
    if (start === before) return false;
  }

  const replay: StudySession = { ...session, phase: "question", hints: [], revealed: revealed.slice(0, start) };
  for (const action of actions) {
    const price = studyHintPrice(replay, action);
    if (!price || (price === "assisted" && !session.peeked)) return false;
    replay.revealed = [...new Set([...(replay.revealed ?? []), ...hintLetterPositions(action)])];
  }
  return (
    replay.revealed?.length === revealed.length && replay.revealed.every((value, index) => value === revealed[index])
  );
}

function sourceForAnswer(word: Word, answer: string, all: readonly Word[]) {
  if (normalize(word.text) === normalize(answer)) return word;
  const form = word.family.find((item) => normalize(item.text) === normalize(answer));
  if (!form) return;
  const matches = all.filter(
    (item) =>
      normalize(item.text) === normalize(answer) &&
      normalize(item.pos) === normalize(form.pos) &&
      normalize(item.meaning) === normalize(form.meaning),
  );
  return matches.length === 1 ? matches[0] : undefined;
}

function semanticHints(question: Question, source: Word): SemanticHint[] {
  if (typeof question.answer !== "string" || !question.answer.trim()) return [];
  const fields = source.senseId
    ? source.lexeme?.senses.find((sense) => sense.id === source.senseId && sense.status === "reviewed")
    : source.lexeme
      ? undefined
      : source;
  if (!fields) return [];
  const pattern = new RegExp(answerPattern(question.answer), "giu");
  const example = fields.examples
    .flatMap(({ text }) => {
      const masked = text.replace(pattern, "___");
      return masked === text ? [] : [masked.trim()];
    })
    .find((value) => studyHintFitsQuestion({ kind: "example", value }, question));
  const definition = fields.definition.trim();
  const synonym = fields.synonyms.find((value) =>
    studyHintFitsQuestion({ kind: "synonym", value: value.trim() }, question),
  );
  return [
    ...(example ? [{ kind: "example" as const, value: example }] : []),
    ...(definition && studyHintFitsQuestion({ kind: "definition", value: definition }, question)
      ? [{ kind: "definition" as const, value: definition }]
      : []),
    ...(synonym ? [{ kind: "synonym" as const, value: synonym.trim() }] : []),
  ];
}

function affixHint(word: Word, answer: string, kind: "prefix" | "suffix"): StudyHint | undefined {
  const form =
    normalize(word.text) === normalize(answer)
      ? word
      : word.family.find((item) => normalize(item.text) === normalize(answer));
  const marked = kind === "prefix" ? form?.parts?.[0] : form?.parts?.at(-1);
  const affix = marked?.match(kind === "prefix" ? /^(\p{L}+)-$/u : /^-(\p{L}+)$/u)?.[1];
  if (!affix) return;
  const letters = letterPositions(answer);
  const length = Array.from(affix).length;
  const matches =
    kind === "prefix" ? normalize(answer).startsWith(normalize(affix)) : normalize(answer).endsWith(normalize(affix));
  if (!matches || length >= letters.length) return;
  return { kind, value: kind === "prefix" ? letters.slice(0, length) : letters.slice(-length) };
}

export function studyHintOffers(
  session: StudySession,
  word: Word,
  all: readonly Word[],
  canSpeak: boolean,
): StudyHintOffer[] {
  const question = session.questions[session.index];
  if (session.phase !== "question" || typeof question.answer !== "string") return [];
  const offers: StudyHintOffer[] = [];
  const add = (hint?: StudyHint) => {
    if (!hint) return;
    const price = studyHintPrice(session, hint);
    if (price) offers.push({ hint, price });
    else if (
      (hint.kind === "prefix" || hint.kind === "suffix") &&
      !session.hints?.some(({ kind }) => kind === hint.kind) &&
      hint.value.some((position) => !session.revealed?.includes(position))
    )
      offers.push({ hint, price: "letter", blocked: true });
  };
  if (hintKindFitsQuestion("example", question.kind)) {
    const source = sourceForAnswer(word, question.answer, all);
    if (source) semanticHints(question, source).forEach(add);
  }
  const position = nextHintPosition(session);
  if (position >= 0) add({ kind: "letter", value: position });
  if (hintKindFitsQuestion("letter", question.kind)) {
    add(affixHint(word, question.answer, "prefix"));
    add(affixHint(word, question.answer, "suffix"));
  }
  if (canSpeak && hintKindFitsQuestion("pronunciation", question.kind)) add({ kind: "pronunciation" });
  if (hintKindFitsQuestion("eliminate", question.kind) && question.options?.length === 4) {
    const wrong = question.options.filter((option) => normalize(option) !== normalize(question.answer as string));
    add({ kind: "eliminate", value: shuffleSeeded(wrong, `${session.id}:${session.index}:eliminate`).slice(0, 2) });
  }
  return offers;
}
