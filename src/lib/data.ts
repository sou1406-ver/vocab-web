import affixesJson from "@/data/affixes.json";
import exercisesJson from "@/data/exercises.json";
import lessonsJson from "@/data/lessons.json";
import termsJson from "@/data/terms.json";
import topicsJson from "@/data/topics.json";
import wordsJson from "@/data/words.json";
import type { Affix, Exercises, FamilyEntry, Lesson, Topic, Word } from "./types";
import { lower, same } from "./util";

// ---------------------------------------------------------------- dữ liệu sách
export const WORDS = wordsJson as Word[];
export const LESSONS = lessonsJson as Lesson[];
export const TOPICS = topicsJson as Topic[];
export const AFFIXES = affixesJson as unknown as Record<string, Affix>;
export const EXERCISES = exercisesJson as unknown as Exercises;
/** Nghĩa + độ phổ biến (thang Zipf) của từ đồng nghĩa / trái nghĩa */
export const TERMS = termsJson as Record<string, { vi: string; z: number; ipa?: string }>;

/** Mức phổ biến theo thang Zipf (tần suất trong tiếng Anh nói chung) */
export function freqLevel(z: number): { level: 0 | 1 | 2 | 3; label: string } {
  if (z >= 5) return { level: 3, label: "Rất phổ biến" };
  if (z >= 4.3) return { level: 2, label: "Phổ biến" };
  if (z >= 3.4) return { level: 1, label: "Ít gặp hơn" };
  return { level: 0, label: "Hiếm gặp" };
}
export const termInfo = (t: string): { vi: string; z: number; ipa?: string } => TERMS[lower(t)] ?? { vi: "", z: 0 };

export const LESSON_BY_N: Record<number, Lesson> = Object.fromEntries(LESSONS.map((l) => [l.n, l]));
export const CUSTOM_TOPIC: Topic = {
  id: "custom",
  name: "Tự thêm",
  en: "My word networks",
  icon: "folder",
  lessons: [],
};
export const TOPIC_BY_ID: Record<string, Topic> = Object.fromEntries([...TOPICS, CUSTOM_TOPIC].map((t) => [t.id, t]));
export const unitIndex = (unit: string) => TOPICS.findIndex((t) => t.id === unit);

// ---------------------------------------------------------------- hằng số
export const POS_LABEL: Record<string, string> = {
  n: "Danh từ",
  v: "Động từ",
  adj: "Tính từ",
  adv: "Trạng từ",
  phr: "Cụm từ",
  prep: "Giới từ",
  conj: "Liên từ",
};

export const POS_COLS = [
  { k: "n", title: "Danh từ (Noun)", cls: "b-indigo" },
  { k: "v", title: "Động từ (Verb)", cls: "b-violet" },
  { k: "adj", title: "Tính từ (Adj)", cls: "b-emerald" },
  { k: "adv", title: "Trạng từ (Adv)", cls: "b-amber" },
] as const;

export const STATUS_INFO = {
  new: { label: "Chưa học", emoji: "⚪" },
  learning: { label: "Đang học", emoji: "🟡" },
  mastered: { label: "Đã thuộc", emoji: "🟢" },
} as const;

/** Mục tiêu điểm TOEIC → số từ nên thuộc */
export const TARGETS: [score: number, words: number, level: string][] = [
  [450, 300, "Nền tảng"],
  [600, 420, "Trung cấp"],
  [750, 540, "Khá"],
  [900, 600, "Giỏi"],
];
export const targetInfo = (score: number) => TARGETS.find((t) => t[0] === +score) ?? TARGETS[1];

// Phụ tố cùng nhóm không được dùng làm phương án nhiễu cho nhau trong bài ghép từ
export const AFFIX_GROUPS = [
  ["-ion", "-tion", "-sion", "-ation", "-ition", "-ison"],
  ["-able", "-ible"],
  ["-er", "-or", "-itor"],
  ["-ance", "-ence", "-ancy", "-ency"],
  ["-ant", "-ent"],
  ["-al", "-ial", "-ual"],
  ["-ive", "-ative", "-itive"],
  ["-ic", "-ical", "-atic", "-tic"],
  ["-ory", "-atory", "-ary"],
  ["-ure", "-ture", "-ature"],
];
export const RARE_AFFIXES = new Set([
  "-ison", "-ele", "-s", "-is", "-se", "-ety", "-ise", "-ior", "-ite", "-n", "-ice", "-th", "-dom", "-ology",
  "ac-", "sur-", "a-", "mal-",
]); // prettier-ignore

export const affixType = (p: string): "prefix" | "suffix" | "root" =>
  p.length > 1 && p.endsWith("-") ? "prefix" : p.length > 1 && p.startsWith("-") ? "suffix" : "root";

export const isPhrase = (w: Word) => /\s/.test(w.word.trim());

/** Họ từ đầy đủ, luôn chứa chính từ gốc */
export function familyOf(w: Word): FamilyEntry[] {
  const fam = w.family.slice();
  if (!fam.some((f) => same(f.w, w.word)))
    fam.unshift({ w: w.word, pos: w.pos || "phr", parts: w.parts?.length ? w.parts : [w.word], vi: w.vi, ipa: w.ipa });
  return fam;
}
export const expandedCount = (w: Word) =>
  familyOf(w).filter((f) => !same(f.w, w.word)).length + w.syn.length + w.ant.length;

export const unitOf = (w: Word) => (w.lesson ? LESSON_BY_N[w.lesson].unit : "custom");
export const lessonLabel = (w: Word) => (w.lesson ? `Bài ${w.lesson}: ${LESSON_BY_N[w.lesson].title}` : "Tự thêm");

// ---------------------------------------------------------------- chỉ mục (sách + từ tự thêm)
export interface Catalog {
  all: Word[];
  byId: Record<string, Word>;
  formIndex: Record<string, string[]>;
  rootIdFor: (form: string, prefer?: string) => string | null;
  scope: (unit: string, lesson: string) => Word[];
  topics: Topic[];
  /** Từ đồng nghĩa / trái nghĩa → các từ gốc có nó trong danh sách */
  relIndex: Record<string, { id: string; kind: "syn" | "ant" }[]>;
}

export function buildCatalog(custom: Word[]): Catalog {
  const all = [...WORDS, ...custom];
  const byId = Object.fromEntries(all.map((w) => [w.id, w]));
  const formIndex: Record<string, string[]> = {};
  const add = (form: string, id: string) => {
    const k = lower(form);
    const ids = (formIndex[k] ??= []);
    if (!ids.includes(id)) ids.push(id);
  };
  const relIndex: Catalog["relIndex"] = {};
  for (const w of all) {
    add(w.word, w.id);
    for (const f of w.family) add(f.w, w.id);
    for (const t of w.syn) (relIndex[lower(t)] ??= []).push({ id: w.id, kind: "syn" });
    for (const t of w.ant) (relIndex[lower(t)] ??= []).push({ id: w.id, kind: "ant" });
  }
  return {
    all,
    byId,
    formIndex,
    rootIdFor(form, prefer) {
      const ids = formIndex[lower(form)];
      if (!ids) return null;
      return prefer && ids.includes(prefer) ? prefer : ids[0];
    },
    scope: (unit, lesson) =>
      all.filter(
        (w) => (unit === "all" || unitOf(w) === unit) && (lesson === "all" || String(w.lesson) === String(lesson)),
      ),
    topics: custom.length ? [...TOPICS, CUSTOM_TOPIC] : TOPICS,
    relIndex,
  };
}

/** Tìm họ từ chứa một từ/cụm trong phương án (vd "will cancel" → cancel) */
export function familyLookup(cat: Catalog, text: string) {
  const w = lower(text)
    .replace(/[^a-z' -]/g, "")
    .trim();
  const cands = [
    w,
    w.replace(/^(to|be|is|are|will|have|has|had|was|were|been|more|most|being) /, ""),
    w.split(" ").pop() ?? w,
  ];
  for (const c of cands) {
    const id = cat.rootIdFor(c);
    if (id) {
      const root = cat.byId[id];
      const fam = familyOf(root);
      return { root, f: fam.find((x) => same(x.w, c)) ?? fam[0] };
    }
  }
  return null;
}
