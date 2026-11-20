import { describe, it, expect } from "vitest";
import { projectRevealed, editRevealed, slotSelection, remainingSlots } from "./letter-slots-edit";

describe("Answer-sized input", () => {
  it("ignores overflow while preserving wrong spellings and editable caret", () => {
    expect(editRevealed("agreement", "agreements", "agreement", [])).toEqual({ value: "agreement", caret: 9 });
    expect(editRevealed("", "agreements and more", "agreement", []).value).toBe("agreement");
    expect(editRevealed("", "xxxxxxxxx", "agreement", []).value).toBe("xxxxxxxxx");
    expect(editRevealed("agreement", "axgreement", "agreement", []).value).toBe("agreement");
    expect(projectRevealed("agreements", "agreement", [])).toBe("agreement");
  });
  it("fills around a hint at the last position without blocking native insertion", () => {
    expect(editRevealed("        t", "a        t", "agreement", [8])).toEqual({ value: "a       t", caret: 1 });
    expect(editRevealed("a       t", "ag       t", "agreement", [8])).toEqual({ value: "ag      t", caret: 2 });
    expect(editRevealed("        t", "agreement extra", "agreement", [8]).value).toBe("agreement");
    expect(remainingSlots("        t", "agreement", [8])).toBe(8);
    expect(editRevealed("      b", "abideby", "abide by", [6]).value).toBe("abide by");
    expect(editRevealed("       u", "followup", "follow-up", [7]).value).toBe("follow-up");
  });
  it("uses available sparse cells when typing after a revealed final letter", () => {
    expect(editRevealed("        t", "        ta", "agreement", [8])).toEqual({ value: "a       t", caret: 1 });
    expect(editRevealed("       nt", "       nta", "agreement", [8])).toEqual({ value: "a      nt", caret: 1 });
  });
  it("honors the native deletion range between repeated letters", () => {
    expect(
      editRevealed("agreement", "agrement", "agreement", [], { start: 4, end: 4, inputType: "deleteContentBackward" }),
    ).toEqual({ value: "agrement", caret: 3 });
    expect(
      editRevealed("agrement", "agreement", "agreement", [], { start: 3, end: 3, inputType: "insertText" }),
    ).toEqual({ value: "agreement", caret: 4 });
  });
  it("trims pasted edge whitespace before applying the capacity limit without removing sparse padding", () => {
    expect(editRevealed("", "  AGREEMENT  ", "agreement", []).value).toBe("AGREEMENT");
    expect(
      editRevealed("        t", "  agreement  ", "agreement", [8], { start: 0, end: 9, inputType: "insertFromPaste" })
        .value,
    ).toBe("agreement");
    expect(editRevealed("", "  set up  ", "set up", []).value).toBe("set up");
  });
  it("supplies phrase spaces and hyphens without consuming entered letters", () => {
    expect(editRevealed("", "setup", "set up", [])).toEqual({ value: "set up", caret: 6 });
    expect(editRevealed("", "set up extra", "set up", []).value).toBe("set up");
    expect(editRevealed("", "followup", "follow-up", []).value).toBe("follow-up");
    expect(editRevealed("follow-up", "follow-up-extra", "follow-up", []).value).toBe("follow-up");
    expect(slotSelection("set up", 3, "set up")).toEqual({ start: 4, end: 5 });
    expect(remainingSlots("set", "set up")).toBe(2);
    expect(remainingSlots("follow-up", "follow-up")).toBe(0);
    expect(remainingSlots("wrongxxxx", "agreement")).toBe(0);
  });
  it("preserves selection replacement, separator deletion and Unicode offsets", () => {
    expect(editRevealed("set up", "setup", "set up", []).value).toBe("set up");
    expect(editRevealed("follow-up", "followup", "follow-up", []).value).toBe("follow-up");
    expect(editRevealed("agreement", "agxeement", "agreement", []).value).toBe("agxeement");
    expect(editRevealed("", "😀abextra", "😀ab", [])).toEqual({ value: "😀ab", caret: 4 });
  });
});

describe("Locked hint letters", () => {
  it("reveals only requested letters and preserves other input", () => {
    expect(projectRevealed("", "test", [0])).toBe("t");
    expect(projectRevealed("xest", "test", [0])).toBe("test");
    expect(projectRevealed("", "abide by", [0, 5, -1, 500])).toBe("a");
  });
  it("keeps letters locked after deletion and typing before the locked prefix", () => {
    expect(editRevealed("t", "", "test", [0])).toEqual({ value: "t", caret: 1 });
    expect(editRevealed("t", "at", "test", [0]).value).toBe("ta");
    expect(editRevealed("t", "test", "test", [0]).value).toBe("test");
    expect(editRevealed("t", "TEST", "test", [0]).value).toBe("tEST");
  });
  it("supports paste and replace-all with noncontiguous revealed letters", () => {
    expect(editRevealed("test", "", "test", [0, 2]).value).toBe("t s");
    expect(editRevealed("t s", "test", "test", [0, 2]).value).toBe("test");
    expect(editRevealed("t s", "tes", "test", [0, 2])).toEqual({ value: "tes", caret: 3 });
  });
});

describe("Selecting a cell for editing", () => {
  it("selects the clicked letter, not the insertion point before it", () => {
    expect(slotSelection("definition", 4, "definition")).toEqual({ start: 4, end: 5 });
    expect(slotSelection("de", 8, "definition")).toEqual({ start: 2, end: 2 });
  });
  it("skips locked hints and uses native UTF-16 offsets for a whole character", () => {
    expect(slotSelection("definition", 3, "definition", [3, 4])).toEqual({ start: 5, end: 6 });
    expect(slotSelection("😀ab", 1, "😀ab")).toEqual({ start: 2, end: 3 });
  });
});
