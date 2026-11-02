import { describe, expect, it } from "vitest";
import { createAppStore, memoryPersistence } from "./store";
import { emptySnapshot } from "../domain/learning";
import { defaultBook } from "../data/catalog";

describe("memory-backed app store", () => {
  it("runs a session entirely in memory", async () => {
    const store = createAppStore(memoryPersistence(emptySnapshot()));
    await store.getState().init();
    expect(store.getState().ready).toBe(true);
    const words = defaultBook.catalog.words.slice(0, 2);
    expect(await store.getState().start(words, "practice", "Sandbox")).toBe(true);
    const session = store.getState().data.session!;
    expect(session.questions).toHaveLength(2);
    expect(await store.getState().answer(session.questions[0].answer)).toBe(true);
    expect(store.getState().data.events).toHaveLength(1);
    expect(store.getState().data.revision).toBe(2);
  });
  it("rejects a change that would make the snapshot invalid", async () => {
    const store = createAppStore(memoryPersistence(emptySnapshot()));
    await store.getState().init();
    expect(await store.getState().change((data) => ({ ...data, schemaVersion: 9 as 2 }))).toBe(false);
    expect(store.getState().data.schemaVersion).toBe(2);
  });
});
