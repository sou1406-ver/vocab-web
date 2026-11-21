import { describe, expect, it, vi } from "vitest";
import { createAppStore, memoryPersistence } from "./store";
import { changeSnapshot, readSnapshot } from "../data/repository";
import {
  advanceSession,
  answerQuestion,
  beginSession,
  emptySnapshot,
  finishSession,
  makeRecognitionQuestions,
} from "../domain/learning";
import { defaultBook } from "../data/catalog";
const catalog = defaultBook.catalog;

vi.mock("../data/repository", () => ({ readSnapshot: vi.fn(), changeSnapshot: vi.fn() }));

describe("App store isolation", () => {
  it("does not let a delayed profile read expose another account", async () => {
    let finish!: (data: ReturnType<typeof emptySnapshot>) => void;
    vi.mocked(readSnapshot).mockImplementation(async (profile) =>
      profile === "user:a"
        ? new Promise((resolve) => {
            finish = resolve;
          })
        : { ...emptySnapshot(), settings: { ...emptySnapshot().settings, name: "B" } },
    );
    const store = createAppStore();
    const first = store.getState().switchProfile("user:a");
    await store.getState().switchProfile("user:b");
    finish({ ...emptySnapshot(), settings: { ...emptySnapshot().settings, name: "A" } });
    await first;
    expect(store.getState().profileKey).toBe("user:b");
    expect(store.getState().data.settings.name).toBe("B");
  });
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
      await store.getState().startExercises((id, snapshot) => {
        expect(snapshot).toBe(persisted);
        seed = id;
        return makeRecognitionQuestions(catalog.words.slice(0, 2), catalog.words, id, snapshot.progress);
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

describe("Saving study hints", () => {
  function displayed() {
    const word = catalog.words[0];
    const state = advanceSession(beginSession(emptySnapshot(), catalog, [word], "learn", "A", "hint", 1), "hint", 0, 2);
    state.session!.questions[0] = { kind: "recall", wordId: word.id, prompt: word.meaning, answer: word.text };
    return state;
  }

  const pronunciation = { hint: { kind: "pronunciation" }, price: "assisted" } as const;

  it("returns a committed pronunciation exactly once", async () => {
    const initial = displayed();
    const store = createAppStore(memoryPersistence(initial));
    await store.getState().init();
    const saved = await store.getState().saveHint("hint", 0, pronunciation);
    expect(saved?.hints).toEqual([{ kind: "pronunciation" }]);
    expect(await store.getState().saveHint("hint", 0, pronunciation)).toBeNull();
    expect(store.getState().data.session?.hints).toHaveLength(1);
  });

  it("returns no pronunciation when the saved question advanced in another tab", async () => {
    const initial = displayed();
    const advanced = answerQuestion(initial, "hint", 0, "", false, 3);
    const store = createAppStore(memoryPersistence(advanced));
    store.setState({ ready: true, data: initial });
    expect(await store.getState().saveHint("hint", 0, pronunciation)).toBeNull();
    expect(store.getState().data.session).toMatchObject({ phase: "feedback" });
    expect(store.getState().data.session?.hints).toBeUndefined();
  });

  it("returns no pronunciation when persistence fails after applying the reducer", async () => {
    const initial = displayed();
    const store = createAppStore({
      read: async () => initial,
      change: async (reduce) => {
        reduce(initial);
        throw new Error("Write failed");
      },
    });
    await store.getState().init();
    expect(await store.getState().saveHint("hint", 0, pronunciation)).toBeNull();
    expect(store.getState().data.session?.hints).toBeUndefined();
  });

  it("leaves the existing practice schedule intact when a second semantic cue is used", async () => {
    const initial = displayed();
    initial.session!.mode = "practice";
    const { wordId, answer } = initial.session!.questions[0];
    const schedule = { box: 3, dueAt: 700, reviewedDay: "2026-10-24" };
    initial.progress[wordId] = {
      ...initial.progress[wordId],
      ...schedule,
      tested: true,
    };
    const store = createAppStore(memoryPersistence(initial));
    await store.getState().init();
    const one = { hint: { kind: "example", value: "They used the ___ there." }, price: "free" } as const;
    const two = { hint: { kind: "definition", value: "An agreed course of action." }, price: "assisted" } as const;
    expect(await store.getState().saveHint("hint", 0, one)).not.toBeNull();
    expect(await store.getState().saveHint("hint", 0, { ...two, price: "free" })).toBeNull();
    expect(await store.getState().saveHint("hint", 0, two)).not.toBeNull();
    expect(await store.getState().answer(answer)).toBe(true);
    expect(store.getState().data.events[0]).toMatchObject({
      correct: false,
      assisted: true,
      mode: "practice",
      scoringVersion: 6,
      hintKinds: ["example", "definition"],
    });
    expect(store.getState().data.progress[wordId]).toMatchObject(schedule);
  });
});
