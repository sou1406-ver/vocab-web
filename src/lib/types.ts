// Kiểu dữ liệu sinh ra bởi tools/build_data.py (src/data/*.json)

/** Một dạng trong họ từ, ví dụ agreement = agree + -ment */
export interface FamilyEntry {
  w: string;
  pos: string;
  parts: string[];
  vi: string;
  note?: string;
  ex?: string;
  exVi?: string;
  ipa?: string;
}

/** Từ gốc trong sách (lesson 1–50) hoặc từ người học tự thêm (lesson 0) */
export interface Word {
  id: string;
  lesson: number;
  word: string;
  pos: string;
  ipa?: string;
  def: string;
  /** Các nghĩa tách theo từ loại khi một từ có nhiều cách dùng. */
  senses?: WordSense[];
  ex: string[];
  exVi?: string[];
  vi: string;
  syn: string[];
  ant: string[];
  parts: string[];
  family: FamilyEntry[];
  /** thời điểm sửa gần nhất (chỉ từ tự thêm) — để gộp khi đồng bộ nhiều máy */
  updated?: number;
}

export interface WordSense {
  pos: string;
  meaning?: string;
  definition?: string;
  definitions?: string[];
  ex?: string[];
  exVi?: string[];
}

export interface Lesson {
  n: number;
  title: string;
  vi: string;
  unit: string;
}

export interface Topic {
  id: string;
  name: string;
  en: string;
  icon: string;
  lessons: number[];
}

export interface Affix {
  type: "prefix" | "suffix";
  makes: string | null;
  vi: string;
  fn: string;
}

export type OptionKey = "A" | "B" | "C" | "D";

export interface McqQuestion {
  n: number;
  text?: string;
  options: Record<OptionKey, string>;
  answer: OptionKey;
}

export interface ClozeBlock {
  text: string;
  questions: McqQuestion[];
}

export interface WordsInContext {
  text: string;
  /** Mỗi chỗ trống có thể nhận nhiều đáp án tương đương */
  answers: string[][];
}

export interface LessonExercises {
  wic?: WordsInContext;
  part5: McqQuestion[];
  part6?: ClozeBlock;
}

export interface ReviewExercises {
  part5: McqQuestion[];
  part6: ClozeBlock[];
}

export interface Exercises {
  lessons: Record<string, LessonExercises>;
  reviews: Record<string, ReviewExercises>;
}

// ---------------------------------------------------------------- dữ liệu học tập của một hồ sơ

export type Status = "new" | "learning" | "mastered";

export interface WordStat {
  c: number; // số lần đúng
  w: number; // số lần sai
}

export interface DayLog {
  a: number; // câu đã làm
  c: number; // câu đúng
  f: number; // thẻ flashcard đã ôn
  m: number; // từ mới thuộc
}

export interface BookScore {
  right: number;
  total: number;
  at: number;
}

/** Thông tin phục vụ đồng bộ: thao tác xoá phải "thắng" khi gộp dữ liệu nhiều máy */
export interface SyncMeta {
  /** lần cuối bấm "Xoá toàn bộ tiến độ" */
  resetAt?: number;
  /** id các trường từ tự thêm đã xoá */
  deleted?: string[];
}

export interface ProfileData {
  meta: SyncMeta;
  custom: Word[];
  status: Record<string, Status>;
  /** Timestamp of the most recent learning-state change for each word. */
  statusAt?: Record<string, number>;
  stats: Record<string, WordStat>;
  book: Record<string, BookScore>;
  log: Record<string, DayLog>;
}

export interface Profile {
  id: string;
  name: string;
  color: string;
  goal: number;
  target: number;
  created: number;
  setup: boolean;
  cloud?: { uid: string; email: string; photo: string };
}
