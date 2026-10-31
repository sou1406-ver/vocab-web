import { describe, it, expect } from "vitest";
import { projectRevealed, editRevealed, slotSelection } from "./letter-slots-edit";

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
