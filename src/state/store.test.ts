import { describe, expect, it, vi } from "vitest";
import { createAppStore } from "./store";
import { changeSnapshot, readSnapshot } from "../data/repository";
import { beginSession, emptySnapshot, finishSession, makeRecognitionQuestions } from "../domain/learning";
import { catalog } from "../data/catalog";

vi.mock("../data/repository", () => ({ readSnapshot: vi.fn(), changeSnapshot: vi.fn() }));

describe("App store isolation", () => {
  it("seeds recognition with the actual saved session ID", async () => {
    let persisted = emptySnapshot();
    vi.mocked(changeSnapshot).mockImplementation(async (reduce) => {
      persisted = reduce(persisted);
      return persisted;
    });
    const store = createAppStore();
    store.setState({ ready: true, data: persisted });
    let seed = "";
    expect(
      await store.getState().startExercises((id) => {
        seed = id;
        return makeRecognitionQuestions(catalog.words.slice(0, 2), catalog.words, id);
      }, "Recognition"),
    ).toBe(true);
    expect(persisted.session!.id).toBe(seed);
    expect(persisted.session!.questions).toEqual(
      makeRecognitionQuestions(catalog.words.slice(0, 2), catalog.words, seed),
    );
  });
  it("creates independent stores for separate React trees/SSR requests", () => {
    const first = createAppStore();
    const second = createAppStore();
    first.setState({ ready: true, error: "first only" });
    expect(second.getState().ready).toBe(false);
    expect(second.getState().error).toBe("");
    expect(first.getState().data).not.toBe(second.getState().data);
  });
  it("refuses a stale tab ending a different session started in another tab", async () => {
    const displayed = beginSession(emptySnapshot(), catalog, [catalog.words[0]], "learn", "A", "a", 1);
    let persisted = beginSession(finishSession(displayed, true, 2), catalog, [catalog.words[1]], "learn", "B", "b", 3);
    vi.mocked(changeSnapshot).mockImplementation(async (reduce) => {
      persisted = reduce(persisted);
      return persisted;
    });
    vi.mocked(readSnapshot).mockImplementation(async () => persisted);
    const staleTab = createAppStore();
    staleTab.setState({ ready: true, data: displayed });
    expect(await staleTab.getState().finish()).toBe(false);
    expect(persisted.session).toMatchObject({ id: "b", phase: "learn" });
    expect(persisted.history.map((item) => item.id)).toEqual(["a"]);
    expect(staleTab.getState().error).toContain("Lượt học đã thay đổi");
  });
});
