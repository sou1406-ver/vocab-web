import { describe, expect, it } from "vitest";
import { makeMatchQuestions } from "./match";
import { defaultBook } from "./catalog";
const catalog = defaultBook.catalog;
import type { Catalog, Word, WordProgress } from "../domain/types";

const word = (id: string, meaning: string, lesson = 1): Word => ({
  id,
  text: id,
  meaning,
  lesson,
  pos: "n",
  ipa: "",
  definition: "",
  examples: [],
  family: [],
  synonyms: [],
  antonyms: [],
  parts: [],
});
const source: Catalog = {
  version: "fixture",
  topics: [
    { id: "business", title: "Kinh doanh", english: "Business" },
    { id: "travel", title: "Du lịch", english: "Travel" },
  ],
  lessons: [
    { id: 1, topicId: "business", title: "One", translation: "" },
    { id: 2, topicId: "business", title: "Two", translation: "" },
    { id: 3, topicId: "travel", title: "Three", translation: "" },
  ],
  words: [
    word("agreement", "thỏa thuận; cam kết"),
    word("commitment", " SỰ CAM KẾT "),
    word("office", "văn phòng"),
    word("price", "giá cả"),
    word("delivery", "giao hàng", 2),
    word("budget", "ngân sách", 2),
    word("invoice", "hóa đơn", 2),
    word("meeting", "cuộc họp", 2),
    word("hotel", "khách sạn", 3),
  ],
};
const learned: WordProgress = {
  startedAt: 1,
  startedDay: "2026-10-25",
  box: 3,
  dueAt: 2,
  correct: 1,
  incorrect: 0,
  tested: true,
  policyVersion: 1,
};

describe("Topic match questions", () => {
  it("selects six seeded distinct pairs in one topic, preferring tested progress and preserving the catalog", () => {
    const before = JSON.stringify(source);
    const progress = { office: learned, price: learned, hotel: learned, budget: { ...learned, tested: false } };
    const questions = makeMatchQuestions(source, "business", progress, "s");
    expect(questions).toHaveLength(6);
    expect(questions.map((q) => q.wordId)).toEqual(expect.arrayContaining(["office", "price"]));
    expect(questions.map((q) => q.wordId)).not.toContain("hotel");
    expect(new Set(questions.map((q) => q.groupId)).size).toBe(1);
    expect(questions[0].groupId).toBeTruthy();
    for (const q of questions) {
      const root = source.words.find((w) => w.id === q.wordId)!;
      expect(q).toMatchObject({
        kind: "match",
        prompt: root.text,
        answer: root.meaning,
        sourceId: `match:business:${root.id}`,
        sourceVersion: source.version,
      });
    }
    expect(makeMatchQuestions(source, "business", progress, "s")).toEqual(questions);
    expect(JSON.stringify(source)).toBe(before);
    expect(
      new Set(
        Array.from({ length: 16 }, (_, n) =>
          JSON.stringify(makeMatchQuestions(source, "business", progress, `s-${n}`).map((q) => q.wordId)),
        ),
      ).size,
    ).toBeGreaterThan(1);
  });
  it("uses only learned words when six unambiguous learned words are available", () => {
    const ids = ["office", "price", "delivery", "budget", "invoice", "meeting"];
    const progress = Object.fromEntries(ids.map((id) => [id, learned]));
    for (let n = 0; n < 12; n++)
      expect(new Set(makeMatchQuestions(source, "business", progress, `s-${n}`).map((q) => q.wordId))).toEqual(
        new Set(ids),
      );
  });
  it("never selects duplicate or overlapping Vietnamese glosses or English labels", () => {
    const pool = {
      ...source,
      words: [...source.words, word("duplicate", "  VĂN PHÒNG  "), { ...word("alias", "nghĩa khác"), text: "OFFICE" }],
    };
    for (let n = 0; n < 24; n++) {
      const questions = makeMatchQuestions(pool, "business", {}, `s-${n}`);
      expect(questions).toHaveLength(6);
      for (let i = 0; i < questions.length; i++)
        for (let j = i + 1; j < questions.length; j++) {
          expect(questions[i].prompt.trim().toLowerCase()).not.toBe(questions[j].prompt.trim().toLowerCase());
          const glosses = (meaning: string) =>
            meaning
              .trim()
              .toLowerCase()
              .split(/[;,]/)
              .map((s) => s.trim())
              .filter(Boolean);
          for (const a of glosses(questions[i].answer))
            for (const b of glosses(questions[j].answer)) expect(a.includes(b) || b.includes(a)).toBe(false);
        }
    }
  });
  it("returns no incomplete board, and every real topic can produce a six-pair board", () => {
    expect(makeMatchQuestions(source, "travel", {}, "s")).toEqual([]);
    expect(makeMatchQuestions(source, "missing", {}, "s")).toEqual([]);
    for (const topic of catalog.topics) expect(makeMatchQuestions(catalog, topic.id, {}, "s")).toHaveLength(6);
  });
});
