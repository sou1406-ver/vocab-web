import { describe, expect, it } from "vitest";
import { studyShortcut } from "./study-shortcuts";

const question = { phase: "question" as const, choices: 4, listening: false };

describe("study keyboard shortcuts", () => {
  it("picks options by number or by the letter shown on the button", () => {
    expect(studyShortcut("1", question)).toEqual({ type: "choose", index: 0 });
    expect(studyShortcut("4", question)).toEqual({ type: "choose", index: 3 });
    expect(studyShortcut("b", question)).toEqual({ type: "choose", index: 1 });
    expect(studyShortcut("D", question)).toEqual({ type: "choose", index: 3 });
  });
  it("ignores keys beyond the available options and on typed questions", () => {
    expect(studyShortcut("5", question)).toBeNull();
    expect(studyShortcut("e", question)).toBeNull();
    expect(studyShortcut("1", { ...question, choices: 0 })).toBeNull();
    expect(studyShortcut("Enter", question)).toBeNull();
  });
  it("moves on with Enter only while learning or reading feedback", () => {
    expect(studyShortcut("Enter", { ...question, phase: "feedback" })).toEqual({ type: "next" });
    expect(studyShortcut("Enter", { ...question, phase: "learn" })).toEqual({ type: "next" });
    expect(studyShortcut("1", { ...question, phase: "feedback" })).toBeNull();
  });
  it("replays audio with R only on listening questions", () => {
    expect(studyShortcut("r", { ...question, listening: true })).toEqual({ type: "replay" });
    expect(studyShortcut("r", question)).toBeNull();
  });
});
