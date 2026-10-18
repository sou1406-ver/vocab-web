import { AFFIX_GROUPS, AFFIXES, familyOf, RARE_AFFIXES, unitOf, type Catalog } from "./data";
import { scheduleFor } from "./srs";
import type { FamilyEntry, ReviewSchedule, Status, Word } from "./types";
import { escRe, lower, pick, same, shuffle, uniq } from "./util";

/* Sinh câu hỏi tự luyện từ dữ liệu trường từ. Hàm thuần — không đụng tới giao diện. */

export interface FormationQ {
  kind: "formation";
  root: Word;
  f: FamilyEntry;
  s: string;
  m: { index: number; text: string };
  base: string;
  options: string[];
}
export interface AdaptiveFormationChoiceQ extends Omit<FormationQ, "kind"> {
  kind: "adaptive-formation-choice";
  level: 3;
}
export interface SynonymQ {
  kind: "synonym";
  root: Word;
  ant: boolean;
  correct: string;
  options: string[];
}
export interface MeaningQ {
  kind: "meaning";
  root: Word;
  reverse: boolean;
  options: Word[];
}
export interface BuildQ {
  kind: "build";
  root: Word;
  f: FamilyEntry;
  tiles: string[];
}
export interface RecallQ {
  kind: "recall";
  root: Word;
  s: string;
  m: { index: number; text: string };
}
export interface ListeningQ {
  kind: "listening";
  root: Word;
}
export interface AdaptiveChoiceQ {
  kind: "adaptive-choice";
  root: Word;
  level: 1 | 2;
  options: string[];
}
export interface AdaptiveClozeQ {
  kind: "adaptive-cloze";
  root: Word;
  s: string;
  m: { index: number; text: string };
  entry: FamilyEntry;
  options: string[];
}
export interface AdaptiveHintQ {
  kind: "adaptive-hint";
  root: Word;
  s: string;
  m: { index: number; text: string };
  translation: string;
  alternatives: string[];
}
export interface AdaptiveFormationQ {
  kind: "adaptive-formation";
  root: Word;
  f: FamilyEntry;
  s: string;
  m: { index: number; text: string };
  alternatives: string[];
}
export interface AdaptiveRecallQ {
  kind: "adaptive-recall";
  root: Word;
  listening: boolean;
  alternatives: string[];
  level: 4 | 5 | 6;
}
export interface AdaptiveListenChoiceQ {
  kind: "adaptive-listen-choice";
  root: Word;
  options: string[];
}
export interface AdaptiveMatchQ {
  kind: "adaptive-match";
  root: Word;
  words: Word[];
  meanings: Word[];
}
export interface AdaptiveSynonymSentenceQ {
  kind: "adaptive-synonym-sentence";
  root: Word;
  sentence: string;
  synonym: string;
  options: string[];
}
export interface AdaptiveFormFixQ {
  kind: "adaptive-form-fix";
  root: Word;
  sentence: string;
  wrongForm: string;
  correctForm: string;
  entry: FamilyEntry;
  options: string[];
}
export type Question =
  | FormationQ
  | SynonymQ
  | MeaningQ
  | BuildQ
  | RecallQ
  | ListeningQ
  | AdaptiveChoiceQ
  | AdaptiveFormationChoiceQ
  | AdaptiveClozeQ
  | AdaptiveHintQ
  | AdaptiveFormationQ
  | AdaptiveRecallQ
  | AdaptiveListenChoiceQ
  | AdaptiveMatchQ
  | AdaptiveSynonymSentenceQ
  | AdaptiveFormFixQ;

export const QUIZ_LEN = 10;

/** Tìm dạng từ trong câu (chấp nhận -s, -ed, -ing…) */
export function findForm(sentence: string, form: string) {
  const base = lower(form);
  const variants = uniq([
    base,
    base + "s",
    base + "es",
    base + "d",
    base + "ed",
    base + "ing",
    base.replace(/e$/, "") + "ing",
    base.replace(/y$/, "ies"),
    base.replace(/y$/, "ied"),
  ]).sort((a, b) => b.length - a.length);
  const re = new RegExp(
    `(^|[^A-Za-z-])(${variants.map((v) => escRe(v).replace(/ /g, "\\s+")).join("|")})(?![A-Za-z])`,
    "i",
  );
  const m = re.exec(sentence);
  return m ? { index: m.index + m[1].length, text: m[2] } : null;
}

export function formationQs(roots: Word[]): FormationQ[] {
  const qs: FormationQ[] = [];
  for (const w of roots) {
    const fam = familyOf(w);
    const self = fam.find((f) => same(f.w, w.word))!;
    const sentences = fam.filter((f) => f.ex).map((f) => ({ f, s: f.ex! }));
    for (const s of w.ex ?? []) sentences.push({ f: self, s });
    for (const { f, s } of sentences) {
      const m = findForm(s, f.w);
      const others = fam.filter((x) => !same(x.w, f.w));
      if (!m || !others.length) continue;
      const baseEntry = !same(f.w, w.word) ? self : (others.find((x) => x.parts.length === 1) ?? others[0]);
      const options = shuffle(uniq([m.text, ...shuffle(others).map((o) => o.w)]).slice(0, 4));
      qs.push({ kind: "formation", root: w, f, s, m, base: baseEntry.w, options });
    }
  }
  return qs;
}

/** Câu điền khuyết lấy từ ví dụ có sẵn; đáp án được so không phân biệt hoa thường. */
export function recallQs(roots: Word[]): RecallQ[] {
  return roots.flatMap((root) => {
    const family = familyOf(root);
    const examples = [
      ...family.flatMap((entry) => (entry.ex ? [{ entry, sentence: entry.ex }] : [])),
      ...(root.ex ?? []).map((sentence) => ({
        entry: family.find((entry) => same(entry.w, root.word))!,
        sentence,
      })),
    ];
    const candidates = uniq(examples, (example) => example.sentence.toLocaleLowerCase()).flatMap(
      ({ entry, sentence }) => {
        const match = findForm(sentence, entry.w);
        return match ? [{ kind: "recall" as const, root, s: sentence, m: match }] : [];
      },
    );
    return candidates.length ? [pick(candidates)] : [];
  });
}

export function typedAnswerMatches(answer: string, expected: string) {
  return lower(answer) === lower(expected);
}

/** A one-character typo or another form from the same family is close, not a failed review. */
export function typedAnswerQuality(answer: string, expected: string, alternatives: string[] = []) {
  const normalize = (value: string) => lower(value).replace(/\s+/g, " ");
  const actual = normalize(answer);
  const accepted = normalize(expected);
  if (actual === accepted) return "correct" as const;
  const candidates = [expected, ...alternatives].map(normalize).filter(Boolean);
  if (candidates.some((candidate) => actual === candidate)) return "close" as const;
  if (candidates.some((candidate) => actual.length >= 5 && candidate.length >= 5 && withinOneEdit(actual, candidate)))
    return "close" as const;
  return "wrong" as const;
}

function withinOneEdit(a: string, b: string) {
  if (!a || !b || Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
    } else {
      if (++edits > 1) return false;
      if (a.length > b.length) i++;
      else if (b.length > a.length) j++;
      else {
        i++;
        j++;
      }
    }
  }
  return edits + Number(i < a.length || j < b.length) <= 1;
}

export function listeningQs(roots: Word[]): ListeningQ[] {
  return roots.map((root) => ({ kind: "listening", root }));
}

export function synonymQs(cat: Catalog, roots: Word[]): SynonymQ[] {
  const pool = uniq(cat.all.flatMap((x) => [...x.syn, x.word]));
  return roots
    .filter((w) => w.syn.length || w.ant.length)
    .map((w) => {
      const ant = !!w.ant.length && (!w.syn.length || Math.random() < 0.35);
      const correct = pick(ant ? w.ant : w.syn);
      const exclude = new Set([...w.syn, ...w.ant, w.word, ...w.family.map((f) => f.w)].map(lower));
      const distract = shuffle(pool)
        .filter((x) => !exclude.has(lower(x)))
        .slice(0, 3);
      return { kind: "synonym", root: w, ant, correct, options: shuffle([correct, ...distract]) };
    });
}

export function meaningQs(cat: Catalog, roots: Word[]): MeaningQ[] {
  return roots.map((w) => {
    const reverse = Math.random() < 0.4;
    const key = (x: Word) => (reverse ? x.word : x.vi);
    const rank = (x: Word) => (x.lesson === w.lesson ? 0 : unitOf(x) === unitOf(w) ? 1 : 2);
    const distract = uniq(
      shuffle(cat.all.filter((x) => x !== w)).sort((a, b) => rank(a) - rank(b)),
      key,
    )
      .filter((x) => key(x) !== key(w))
      .slice(0, 3);
    return { kind: "meaning", root: w, reverse, options: shuffle([w, ...distract]) };
  });
}

export function buildQs(roots: Word[]): BuildQ[] {
  const items = roots.flatMap((w) =>
    familyOf(w)
      .filter((f) => f.parts && f.parts.length >= 2)
      .map((f) => ({ w, f })),
  );
  return items.map(({ w, f }) => {
    const banned = new Set(f.parts);
    for (const g of AFFIX_GROUPS) if (g.some((x) => banned.has(x))) g.forEach((x) => banned.add(x));
    const pool = (type: "prefix" | "suffix") =>
      shuffle(Object.keys(AFFIXES).filter((k) => AFFIXES[k].type === type && !banned.has(k) && !RARE_AFFIXES.has(k)));
    const distract = [...pool("prefix").slice(0, 1), ...pool("suffix").slice(0, 2)];
    return { kind: "build", root: w, f, tiles: shuffle([...f.parts, ...distract]) };
  });
}

function choicesFor(correct: string, preferred: string[], fallback: string[]) {
  const options = uniq([correct, ...shuffle(preferred), ...shuffle(fallback)]).slice(0, 4);
  return shuffle(options);
}

function familyAlternatives(root: Word, expected = "") {
  return uniq(
    familyOf(root)
      .map((entry) => entry.w)
      .filter((word) => !same(word, expected)),
  );
}

function distractors(cat: Catalog, root: Word, level: 1 | 2, n = 3) {
  const pool = cat.all.filter((word) => word.id !== root.id);
  const near = (word: Word) => word.lesson === root.lesson || word.pos === root.pos;
  const primary =
    level === 1
      ? pool.filter((word) => !near(word) && lower(word.word)[0] !== lower(root.word)[0])
      : pool.filter((word) => word.lesson === root.lesson && word.pos === root.pos);
  const secondary = pool.filter((word) => !primary.includes(word));
  return shuffle(uniq([...primary, ...secondary].map((word) => word.word))).slice(0, n);
}

function clozeExamples(root: Word) {
  const family = familyOf(root);
  const self = family.find((entry) => same(entry.w, root.word)) ?? family[0];
  const candidates = [
    ...family.flatMap((entry) => (entry.ex ? [{ entry, sentence: entry.ex, translation: entry.exVi ?? "" }] : [])),
    ...(root.ex ?? []).map((sentence, index) => ({
      entry: self,
      sentence,
      translation: root.exVi?.[index] ?? "",
    })),
  ];
  return uniq(candidates, (candidate) => candidate.sentence.toLocaleLowerCase()).flatMap((candidate) => {
    const match = findForm(candidate.sentence, candidate.entry.w);
    return match ? [{ ...candidate, match }] : [];
  });
}

function formationExamples(root: Word) {
  return familyOf(root).flatMap((entry) => {
    if (!entry.ex || !entry.pos || same(entry.w, root.word) || entry.pos === root.pos) return [];
    const match = findForm(entry.ex, entry.w);
    return match ? [{ entry, sentence: entry.ex, match }] : [];
  });
}

function adaptiveMatch(cat: Catalog, root: Word): AdaptiveMatchQ | undefined {
  const pool = shuffle(cat.all.filter((word) => word.id !== root.id && word.vi && word.vi !== root.vi));
  const words = uniq([root, ...pool], (word) => word.vi).slice(0, 4);
  if (words.length < 4) return undefined;
  return { kind: "adaptive-match", root, words, meanings: shuffle(words) };
}

function adaptiveSynonymSentence(cat: Catalog, root: Word): AdaptiveSynonymSentenceQ | undefined {
  const synonyms = root.syn.flatMap((value) => value.split(/[;,]/).map((item) => item.trim())).filter(Boolean);
  const candidates = (root.ex ?? []).filter((sentence) => findForm(sentence, root.word));
  if (!synonyms.length || !candidates.length) return undefined;
  const sentence = pick(candidates);
  const match = findForm(sentence, root.word)!;
  const synonym = pick(synonyms);
  const distractors = shuffle(cat.all.flatMap((word) => [...word.syn, ...word.ant, word.word])).flatMap((value) =>
    value.split(/[;,]/).map((item) => item.trim()),
  );
  return {
    kind: "adaptive-synonym-sentence",
    root,
    sentence: sentence.slice(0, match.index) + "______" + sentence.slice(match.index + match.text.length),
    synonym,
    options: choicesFor(
      synonym,
      distractors.filter((item) => !same(item, synonym)),
      [root.word],
    ),
  };
}

function adaptiveFormFix(root: Word): AdaptiveFormFixQ | undefined {
  const example = pick(formationExamples(root));
  if (!example) return undefined;
  const alternatives = familyAlternatives(root, example.match.text).filter((form) => form.length > 2);
  const wrongForm = pick(alternatives);
  if (!wrongForm) return undefined;
  return {
    kind: "adaptive-form-fix",
    root,
    sentence:
      example.sentence.slice(0, example.match.index) +
      wrongForm +
      example.sentence.slice(example.match.index + example.match.text.length),
    wrongForm,
    correctForm: example.match.text,
    entry: example.entry,
    options: choicesFor(
      example.match.text,
      alternatives,
      familyOf(root).map((entry) => entry.w),
    ),
  };
}

function adaptiveQuestion(cat: Catalog, root: Word, box: number): Question {
  const family = familyOf(root);
  const closeForms = familyAlternatives(root);
  if (box <= 1 || box === 2) {
    if (box === 1 && Math.random() < 0.34) {
      const listeningOptions = choicesFor(root.word, distractors(cat, root, 1), distractors(cat, root, 2));
      return { kind: "adaptive-listen-choice", root, options: listeningOptions };
    }
    if (box === 2 && Math.random() < 0.3) {
      const match = adaptiveMatch(cat, root);
      if (match) return match;
    }
    if (box === 1 && Math.random() < 0.3) return { ...meaningQs(cat, [root])[0], reverse: false };
    const level = box <= 1 ? 1 : 2;
    const options = choicesFor(root.word, distractors(cat, root, level), distractors(cat, root, level === 1 ? 2 : 1));
    return { kind: "adaptive-choice", root, level, options };
  }
  if (box === 3) {
    const synonymSentence = adaptiveSynonymSentence(cat, root);
    if (synonymSentence && Math.random() < 0.25) return synonymSentence;
    const formation = pick(formationQs([root]));
    if (formation && Math.random() < 0.45) return { ...formation, kind: "adaptive-formation-choice", level: 3 };
    const example = pick(clozeExamples(root));
    if (!example)
      return { kind: "adaptive-choice", root, level: 2, options: choicesFor(root.word, [], distractors(cat, root, 2)) };
    const siblings = family.map((entry) => entry.w).filter((word) => !same(word, example.match.text));
    return {
      kind: "adaptive-cloze",
      root,
      s: example.sentence,
      m: example.match,
      entry: example.entry,
      options: choicesFor(example.match.text, siblings, distractors(cat, root, 2)),
    };
  }
  if (box === 4) {
    const formFix = adaptiveFormFix(root);
    if (formFix && Math.random() < 0.25) return formFix;
    const formation = pick(formationExamples(root));
    const example = pick(clozeExamples(root));
    const format = Math.random();
    if (formation && format < 0.4)
      return {
        kind: "adaptive-formation",
        root,
        f: formation.entry,
        s: formation.sentence,
        m: formation.match,
        alternatives: familyAlternatives(root, formation.match.text),
      };
    if (example && (format < 0.8 || !formation))
      return {
        kind: "adaptive-hint",
        root,
        s: example.sentence,
        m: example.match,
        translation: example.translation,
        alternatives: familyAlternatives(root, example.match.text),
      };
    return { kind: "adaptive-recall", root, listening: true, alternatives: closeForms, level: 4 };
  }
  return {
    kind: "adaptive-recall",
    root,
    listening: box >= 6 || Math.random() < 0.5,
    alternatives: closeForms,
    level: box >= 6 ? 6 : 5,
  };
}

export function makeQuiz(
  cat: Catalog,
  type: string,
  roots: Word[],
  schedules: Record<string, ReviewSchedule> = {},
  status: Record<string, Status> = {},
  statusAt: Record<string, number> = {},
): Question[] {
  if (type === "mixed") {
    const questions = shuffle(roots)
      .slice(0, QUIZ_LEN)
      .map((root) => {
        const box = scheduleFor(root.id, status, schedules, statusAt)?.box ?? 1;
        return adaptiveQuestion(cat, root, box);
      });
    const format = (question: Question) => question.kind;
    for (let index = 2; index < questions.length; index++) {
      if (
        format(questions[index]) !== format(questions[index - 1]) ||
        format(questions[index]) !== format(questions[index - 2])
      )
        continue;
      const alternative = questions.findIndex(
        (candidate, candidateIndex) => candidateIndex > index && format(candidate) !== format(questions[index]),
      );
      if (alternative !== -1) [questions[index], questions[alternative]] = [questions[alternative], questions[index]];
    }
    return questions;
  }
  const gen: Record<string, () => Question[]> = {
    formation: () => formationQs(roots),
    synonym: () => synonymQs(cat, roots),
    meaning: () => meaningQs(cat, roots),
    build: () => buildQs(roots),
    recall: () => recallQs(roots),
    listening: () => listeningQs(roots),
  };
  const qs = gen[type]?.() ?? [];
  return shuffle(qs).slice(0, QUIZ_LEN);
}

/** Đáp án đúng cho câu chọn đáp án */
export function isRightChoice(q: Question, i: number) {
  if (q.kind === "formation" || q.kind === "adaptive-formation-choice") return same(q.options[i], q.m.text);
  if (q.kind === "adaptive-choice") return same(q.options[i], q.root.word);
  if (q.kind === "adaptive-cloze") return same(q.options[i], q.m.text);
  if (q.kind === "adaptive-listen-choice") return same(q.options[i], q.root.word);
  if (q.kind === "adaptive-synonym-sentence") return same(q.options[i], q.synonym);
  if (q.kind === "adaptive-form-fix") return same(q.options[i], q.correctForm);
  if (q.kind === "synonym") return same(q.options[i], q.correct);
  if (q.kind === "meaning") return q.options[i] === q.root;
  return false;
}
