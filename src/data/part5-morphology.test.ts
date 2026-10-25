import { describe, expect, it } from "vitest";
import { convertLesson } from "../../scripts/lib/cloze-content.mjs";
import { catalog } from "./catalog";
const make = (answer: string, options: string[], n = 1) => ({
  n,
  text: "Choose ___ here.",
  answer: String.fromCharCode(65 + options.indexOf(answer)),
  options: Object.fromEntries(options.map((value, i) => [String.fromCharCode(65 + i), value])),
});

describe("Part 5 family classification and inflection links", () => {
  it("labels four related options as word form and leaves unrelated choices as cloze", () => {
    const form = convertLesson(1, [make("agreement", ["agreement", "agree", "agreeable", "agreed"])], catalog.words);
    expect(form.questions[0].kind).toBe("word-form-choice");
    const cloze = convertLesson(
      1,
      [make("agreement", ["agreement", "party", "assurance", "cancellation"])],
      catalog.words,
    );
    expect(cloze.questions[0].kind).toBe("cloze-choice");
  });
  it("classifies three related options as word form, but not just two", () => {
    const three = convertLesson(1, [make("agreement", ["agreement", "agree", "agreeable", "party"])], catalog.words);
    expect(three.questions[0].kind).toBe("word-form-choice");
    const two = convertLesson(1, [make("agreement", ["agreement", "agree", "assurance", "party"])], catalog.words);
    expect(two.questions[0].kind).toBe("cloze-choice");
  });
  it("classifies popular variants as word form even with population as a distractor", () => {
    const word = catalog.words.find((w) => w.text === "agreement")!;
    const popular = {
      ...word,
      text: "popular",
      pos: "adj",
      family: [
        { text: "popularize", pos: "v", meaning: "phổ biến" },
        { text: "popularity", pos: "n", meaning: "sự phổ biến" },
      ],
    };
    const result = convertLesson(
      1,
      [make("popular", ["popular", "popularize", "popularity", "population"])],
      [popular],
    );
    expect(result.questions[0].kind).toBe("word-form-choice");
  });
  it.each([
    [1, "provisions", ["provisions", "provision", "provide", "providing"]],
    [11, "submitting", ["submitting", "submit", "submitted", "submission"]],
    [12, "applied", ["applied", "apply", "application", "applicant"]],
    [22, "built up", ["built up", "build up", "building up", "buildup"]],
    [32, "forgotten", ["forgotten", "forget", "forgetful", "forgetfulness"]],
    [33, "deliveries", ["deliveries", "deliver", "delivered", "delivering"]],
  ])("restores %s %s using lemma/family inflections", (lesson, answer, options) => {
    const result = convertLesson(lesson as number, [make(answer as string, options as string[])], catalog.words);
    expect(result.questions).toHaveLength(1);
    expect(result.questions[0].answer).toBe(answer);
    expect(result.questions[0].kind).toBe("word-form-choice");
  });
  it("skips even an exact hit when inflection also matches a second word", () => {
    const word = catalog.words.find((w) => w.text === "agreement")!;
    const other = { ...word, id: "another", text: "agreements", family: [] };
    expect(
      convertLesson(1, [make("agreements", ["agreements", "agree", "agreed", "agreeable"])], [word, other]).skipped[0]
        .reason,
    ).toBe("ambiguous-word");
  });
});
