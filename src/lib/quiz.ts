import { AFFIX_GROUPS, AFFIXES, familyOf, RARE_AFFIXES, unitOf, type Catalog } from "./data";
import type { FamilyEntry, Word } from "./types";
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
export type Question = FormationQ | SynonymQ | MeaningQ | BuildQ;

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

export function makeQuiz(cat: Catalog, type: string, roots: Word[]): Question[] {
  const gen: Record<string, () => Question[]> = {
    formation: () => formationQs(roots),
    synonym: () => synonymQs(cat, roots),
    meaning: () => meaningQs(cat, roots),
    build: () => buildQs(roots),
  };
  const qs =
    type === "mixed" ? shuffle(Object.values(gen).flatMap((g) => shuffle(g()).slice(0, 4))) : (gen[type]?.() ?? []);
  return shuffle(qs).slice(0, QUIZ_LEN);
}

/** Đáp án đúng cho câu chọn đáp án */
export function isRightChoice(q: Question, i: number) {
  if (q.kind === "formation") return same(q.options[i], q.m.text);
  if (q.kind === "synonym") return same(q.options[i], q.correct);
  if (q.kind === "meaning") return q.options[i] === q.root;
  return false;
}
