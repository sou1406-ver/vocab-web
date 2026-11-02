import { makeQuestions, makeRecognitionQuestions } from "../domain/learning";
import { makeBuildQuestions } from "./build";
import { makeSynonymQuestions } from "./synonyms";
import { makeListeningQuestions } from "./listening";
import { makeMatchQuestions } from "./match";
import { makeCatalogClozeQuestions, makeWordFormQuestions } from "./cloze";
import type { Book } from "./catalog";
import type { ClozeChoiceQuestion, Lesson, Question } from "../domain/types";

export const previewFormats = [
  ["recall", "Gõ từ / điền câu"],
  ["recognition", "Chọn nghĩa / chọn từ"],
  ["cloze-choice", "Điền chỗ trống · chọn"],
  ["word-form-choice", "Dạng từ · chọn"],
  ["word-form", "Dạng từ · gõ"],
  ["build", "Ghép từ"],
  ["synonym-choice", "Đồng nghĩa / trái nghĩa"],
  ["synonym-context", "Gần nghĩa trong câu"],
  ["match", "Nối từ theo chủ đề"],
  ["listen-choice", "Nghe · chọn"],
  ["listen-type", "Nghe · gõ"],
] as const;
export type PreviewFormat = (typeof previewFormats)[number][0];
export const needsAuthoredPack = (format: PreviewFormat) =>
  format === "cloze-choice" || format === "word-form-choice" || format === "word-form";

// Builds one lesson's questions with the same generators as the learner screens, as if no word were studied yet.
export function previewQuestions(
  format: PreviewFormat,
  book: Book,
  lesson: Lesson,
  authored: readonly ClozeChoiceQuestion[],
  seed: string,
): Question[] {
  const words = book.catalog.words.filter((word) => word.lesson === lesson.id);
  switch (format) {
    case "recall":
      return makeQuestions(words, book.catalog.words, "practice", seed, {});
    case "recognition":
      return makeRecognitionQuestions(words, book.catalog.words, seed, {});
    case "cloze-choice":
    case "word-form-choice":
      return makeCatalogClozeQuestions(
        authored.filter((q) => q.kind === format),
        book.catalog,
        seed,
        {},
      );
    case "word-form":
      return makeWordFormQuestions([...authored], book.catalog.words);
    case "build":
      return makeBuildQuestions(words, seed);
    case "synonym-choice":
    case "synonym-context":
      return makeSynonymQuestions(words, book.catalog.words, format, seed, {});
    case "match":
      return makeMatchQuestions(book.catalog, lesson.topicId, {}, seed);
    case "listen-choice":
    case "listen-type":
      return makeListeningQuestions(words, book.catalog, format, seed, {});
  }
}
