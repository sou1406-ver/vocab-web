import { describe, expect, it } from "vitest";
import { emptySnapshot } from "../domain/learning";
import { validateSnapshot } from "./validation";
import { createChange, materialize } from "./sync";

describe("Optional deep roots setting", () => {
  it("reads older snapshots unchanged and defaults the feature to off", () => {
    const old = emptySnapshot();
    expect(Object.hasOwn(old.settings, "deepRoots")).toBe(false);
    expect(validateSnapshot(old)).toBe(old);
    expect(validateSnapshot(old).settings.deepRoots ?? false).toBe(false);
  });
  it("accepts booleans and rejects invalid stored values", () => {
    for (const value of [true, false])
      expect(
        validateSnapshot({ ...emptySnapshot(), settings: { ...emptySnapshot().settings, deepRoots: value } }).settings
          .deepRoots,
      ).toBe(value);
    for (const value of ["true", 1, null, {}])
      expect(() =>
        validateSnapshot({ ...emptySnapshot(), settings: { ...emptySnapshot().settings, deepRoots: value } }),
      ).toThrow();
  });
  it("syncs the preference without changing learning progress", () => {
    const before = emptySnapshot();
    const after = { ...before, settings: { ...before.settings, deepRoots: true } };
    const change = createChange(before, after, "deep-roots", "device", "initial")!;
    const restored = materialize([{ change, order: 1, committedAt: 1 }]);
    expect(restored.settings.deepRoots).toBe(true);
    expect(restored.progress).toEqual(before.progress);
    expect(restored.schemaVersion).toBe(2);
  });
});
