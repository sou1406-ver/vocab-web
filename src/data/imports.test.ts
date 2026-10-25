import { describe, expect, it } from "vitest";
import { catalog } from "./catalog";
import { applyImport, previewImport } from "./imports";
import { validateSnapshot } from "./validation";
import { emptySnapshot } from "../domain/learning";

const id = catalog.words[0].id;
describe("Import and restore", () => {
  it("previews legacy progress, keeps unknown IDs, and never overwrites new progress", async () => {
    const source = {
      app: "VocabLearn-600",
      profile: { name: "An" },
      status: { [id]: "confirming", unknown: "mastered" },
      srs: { [id]: { box: 5, due: 2, confirming: true } },
      stats: { [id]: { c: 2, w: 1 } },
      book: { old: { right: 8 } },
    };
    const preview = await previewImport(JSON.stringify(source), catalog);
    expect(preview.count).toBe(1);
    expect(preview.warnings).toHaveLength(1);
    expect(preview.progress![id].box).toBe(1);
    const imported = applyImport(emptySnapshot(), preview);
    expect(imported.events).toEqual([]);
    expect(validateSnapshot(imported)).toBe(imported);
    expect(imported.legacyArchives[0]).toMatchObject({ source });
    expect(() => applyImport(imported, preview)).toThrow("đã được nhập");
  });
  it("validates every restored snapshot before changing current data", async () => {
    const broken = emptySnapshot();
    broken.settings.dailyNew = -3;
    await expect(previewImport(JSON.stringify({ app: "VocabLearn-v2", data: broken }), catalog)).rejects.toThrow(
      "không hợp lệ",
    );
    expect(() => validateSnapshot({ schemaVersion: 2 })).toThrow();
    const invalidDates = emptySnapshot();
    invalidDates.history.push({
      id: "bad",
      title: "bad",
      mode: "learn",
      at: 1e100,
      correct: 0,
      total: 1,
      finished: true,
    });
    expect(() => validateSnapshot(invalidDates)).toThrow("không hợp lệ");
  });
  it("round-trips a valid backup and preserves data from before restore", async () => {
    const source = emptySnapshot();
    source.settings.name = "An";
    const preview = await previewImport(JSON.stringify({ app: "VocabLearn-v2", data: source }), catalog);
    const current = emptySnapshot();
    current.settings.name = "Bình";
    const restored = applyImport(current, preview);
    expect(restored.settings.name).toBe("An");
    expect(restored.legacyArchives[0]).toMatchObject({ beforeRestore: { settings: { name: "Bình" } } });
  });
  it("accepts old settings and preserves an optional avatar through backup restore", async () => {
    const old = emptySnapshot();
    expect(old.schemaVersion).toBe(2);
    expect(validateSnapshot(old).settings).not.toHaveProperty("avatarSeed");
    const source = { ...old, settings: { ...old.settings, avatarSeed: "avatar-test-seed" } };
    const preview = await previewImport(JSON.stringify({ app: "VocabLearn-v2", data: source }), catalog);
    expect(applyImport(emptySnapshot(), preview).settings).toEqual(source.settings);
  });
  it.each([null, 12, "", "  ", "x".repeat(201)])("rejects invalid avatar seeds: %s", (avatarSeed) => {
    const source = emptySnapshot();
    expect(() => validateSnapshot({ ...source, settings: { ...source.settings, avatarSeed } })).toThrow("không hợp lệ");
  });
  it("preserves valid legacy custom words without allowing collisions", async () => {
    const source = {
      app: "VocabLearn-600",
      status: { "my-word": "learning" },
      custom: [
        { id: "my-word", word: "hello", vi: "xin chào", pos: "n" },
        { id, word: "collision", vi: "x" },
      ],
    };
    const preview = await previewImport(JSON.stringify(source), catalog);
    const imported = applyImport(emptySnapshot(), preview);
    expect(imported.customWords).toHaveLength(1);
    expect(imported.customWords[0].text).toBe("hello");
    expect(preview.warnings).toHaveLength(1);
    validateSnapshot(imported);
  });
});
