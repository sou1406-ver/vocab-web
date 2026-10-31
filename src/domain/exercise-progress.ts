import type { AnswerEvent, Question } from "./types";

const groups: { id: string; title: string; description: string; kinds: Question["kind"][] }[] = [
  { id: "recognition", title: "Nhận biết", description: "Chọn nghĩa · chọn từ", kinds: ["meaning", "word-choice"] },
  {
    id: "recall",
    title: "Tự nhớ & điền từ",
    description: "Gõ từ · điền chỗ trống",
    kinds: ["recall", "cloze", "cloze-choice"],
  },
  {
    id: "forms",
    title: "Dạng từ & ghép từ",
    description: "Biến đổi từ · gốc và phụ tố",
    kinds: ["word-form-choice", "word-form", "build"],
  },
  {
    id: "synonyms",
    title: "Đồng nghĩa",
    description: "Quan hệ từ · gần nghĩa trong câu",
    kinds: ["synonym-choice", "synonym-context"],
  },
  { id: "listening", title: "Nghe", description: "Nghe chọn · nghe gõ", kinds: ["listen-choice", "listen-type"] },
  { id: "match", title: "Nối từ", description: "Ghép từ Anh với nghĩa Việt", kinds: ["match"] },
];

export function exerciseProgress(events: readonly AnswerEvent[], wordIds: ReadonlySet<string>) {
  return groups.map((group) => {
    const answers = events.filter(
      (event) => wordIds.has(event.wordId) && event.questionKind && group.kinds.includes(event.questionKind),
    );
    const correct = answers.filter((event) => event.correct && !event.assisted).length;
    return {
      ...group,
      total: answers.length,
      correct,
      accuracy: answers.length ? Math.round((correct / answers.length) * 100) : null,
    };
  });
}
