import { describe, expect, it } from "vitest";
import type { RootEntry, RootWord } from "./roots";
import { selectStudyRootFeedback } from "./study-root-feedback";
import type { Question, Word } from "./types";

function rootWord(text: string, wordId: string): RootWord {
  return {
    text,
    pos: "",
    meaning: "",
    book: { wordId, match: text === "disrupt" ? "family" : "headword" },
    parts: [{ text: "rupt", role: "root" }],
    logic: "Làm gián đoạn",
    family: [{ text: "related", pos: "", meaning: "", book: { wordId: "related" } }],
  };
}

function root(id: string, ...words: RootWord[]): RootEntry {
  return { id, words, forms: [], origin: "", meaning: "", image: "" };
}

const words: Pick<Word, "id" | "groupWordId" | "text">[] = [
  { id: "disruption", text: "disruption" },
  { id: "disruption#sense", groupWordId: "disruption", text: "disruption" },
  { id: "other", text: "interrupt" },
  { id: "foreign:disruption", groupWordId: "disruption", text: "disruption" },
  { id: "unknown", text: "rupture" },
  { id: "related", text: "related" },
  { id: "lookalike", text: "interrupt" },
  { id: "core", text: "  Take   OFF  " },
  { id: "core-lookalike", text: "take off again" },
  { id: "accented", text: "táke off" },
];

const sources = {
  roots: [
    root("rupt", rootWord("disrupt", "disruption"), rootWord("interrupt", "other"), rootWord("rupture", "unknown")),
    root("second", rootWord("disrupt", "disruption")),
  ],
  coreWords: [
    { word: "take off", core: "Rời khỏi một điểm" },
    { word: "disruption", core: "Core fallback" },
  ],
  wordById: (id: string) => words.find((word) => word.id === id),
  bookOfWord: (id: string) => {
    if (id === "unknown") return undefined;
    return { id: id.startsWith("foreign:") ? "foreign" : "toeic-600" };
  },
};

function select(
  wordIds: string[],
  answered: string[],
  priorMatch = false,
  phase: "feedback" | "question" = "feedback",
) {
  const questions = wordIds.map((wordId, index) => ({
    wordId,
    kind: priorMatch && index === 0 ? "match" : "recall",
  })) satisfies Pick<Question, "wordId" | "kind">[];
  return selectStudyRootFeedback(
    { id: "session", questions, index: questions.length - 1, phase },
    answered.map((id) => ({ id })),
    sources,
  );
}

describe("selectStudyRootFeedback", () => {
  it("uses the exact linked group ID and labels the authored decomposition", () => {
    expect(select(["disruption#sense"], ["session:0"])).toEqual({
      label: "disrupt",
      parts: ["rupt"],
      explanation: "Làm gián đoạn",
      href: "/roots/rupt",
    });
    expect(select(["other"], ["session:0"])).toMatchObject({ label: undefined, href: "/roots/rupt" });
  });

  it("matches core headwords by case and whitespace and suppresses a repeated core", () => {
    expect(select(["core"], ["session:0"])).toEqual({
      explanation: "Rời khỏi một điểm",
      href: "/core-words#take%20off",
    });
    expect(select(["core", "core"], ["session:0", "session:1"])).toBeUndefined();
    expect(select(["core", "core"], ["session:1"])).toMatchObject({ href: "/core-words#take%20off" });
    expect(select(["core-lookalike"], ["session:0"])).toBeUndefined();
    expect(select(["accented"], ["session:0"])).toBeUndefined();
  });

  it("rejects spelling and nested family matches and requires known equal owners", () => {
    expect(select(["lookalike"], ["session:0"])).toBeUndefined();
    expect(select(["related"], ["session:0"])).toBeUndefined();
    expect(select(["unknown"], ["session:0"])).toBeUndefined();
    expect(select(["foreign:disruption"], ["session:0"])).toMatchObject({ href: "/core-words#disruption" });
    expect(select(["missing"], ["session:0"])).toBeUndefined();
  });

  it("replays only exact earlier answer events and counts only the selected root", () => {
    const wordIds = ["disruption", "disruption"];
    expect(select(wordIds, ["session:01", "other:0", "session:1", "session:2"])).toMatchObject({
      href: "/roots/rupt",
    });
    const answered = ["session:0", "session:1"];
    const feedback = select(wordIds, answered);
    expect(feedback).toMatchObject({ href: "/roots/second" });
    expect(select(wordIds, answered)).toEqual(feedback);
    expect(select([...wordIds, "disruption"], [...answered, "session:2"])).toBeUndefined();
  });

  it("ignores grouped Match events and unanswered questions", () => {
    expect(select(["disruption", "other"], ["session:0", "session:1"], true)).toMatchObject({
      href: "/roots/rupt",
    });
    expect(select(["other"], ["session:0"], true)).toBeUndefined();
    expect(select(["other"], [])).toBeUndefined();
    expect(select(["other"], ["session:0"], false, "question")).toBeUndefined();
  });
});
