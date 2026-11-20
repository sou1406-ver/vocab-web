import { describe, expect, it } from "vitest";
import { createAppStore, memoryPersistence } from "./store";
import { defaultBook } from "../data/catalog";
import { dayKey, emptySnapshot } from "../domain/learning";
import { validateSnapshot } from "../data/validation";

const at = Date.now();
const nine = () => {
  const snapshot = emptySnapshot();
  const known = defaultBook.catalog.words.filter((word) => !word.lexeme && word.lesson > 1).slice(0, 9);
  snapshot.progress = Object.fromEntries(
    known.map((word) => [
      word.id,
      {
        startedAt: at - 86400000,
        startedDay: dayKey(at - 86400000),
        tested: true,
        box: 1,
        dueAt: at + 86400000,
        correct: 1,
        incorrect: 0,
        policyVersion: 1 as const,
      },
    ]),
  );
  return snapshot;
};
describe("local milestone presentation", () => {
  it("presents only after this device commits the crossing, and a reopened store does not replay it", async () => {
    const persistence = memoryPersistence(nine());
    const store = createAppStore(persistence);
    await store.getState().init();
    const word = defaultBook.catalog.words.find((word) => !word.lexeme && !store.getState().data.progress[word.id])!;
    await store.getState().start([word], "learn", "test");
    await store.getState().advance();
    await store.getState().answer(store.getState().data.session!.questions[0].answer);
    expect(store.getState().breakthrough).toBe(10);
    expect(store.getState().data.cultivationSeen).toEqual([10]);
    expect(await store.getState().advance()).toBe(false);
    expect(store.getState().data.session!.index).toBe(0);
    store.getState().dismissBreakthrough();
    expect(store.getState().breakthrough).toBeNull();
    const reopened = createAppStore(persistence);
    await reopened.getState().init();
    expect(reopened.getState().breakthrough).toBeNull();
    expect(reopened.getState().data.events.at(-1)?.id).toBe(`${reopened.getState().data.session!.id}:0`);
  });
  it("does not replay another device's acknowledged milestone", async () => {
    const store = createAppStore(memoryPersistence(nine()));
    await store.getState().init();
    store.setState({ data: { ...store.getState().data, cultivationSeen: [10] } });
    expect(store.getState().breakthrough).toBeNull();
  });
  it("does not infer a crossing from a stale tab when the persisted word was already tested", async () => {
    let persisted = nine();
    const store = createAppStore({
      read: async () => persisted,
      change: async (reduce) => {
        persisted = validateSnapshot({ ...reduce(persisted), revision: persisted.revision + 1 });
        return persisted;
      },
    });
    await store.getState().init();
    const word = defaultBook.catalog.words.find((item) => !item.lexeme && !persisted.progress[item.id])!;
    await store.getState().start([word], "learn", "stale tab");
    await store.getState().advance();
    persisted = {
      ...persisted,
      progress: { ...persisted.progress, [word.id]: { ...Object.values(persisted.progress)[0], tested: true } },
      cultivationSeen: [10],
      revision: persisted.revision + 1,
    };
    const progressBeforeAnswer = persisted.progress[word.id];
    expect(store.getState().data.cultivationSeen).toBeUndefined();
    await store.getState().answer(store.getState().data.session!.questions[0].answer);
    expect(store.getState().breakthrough).toBeNull();
    expect(store.getState().data.cultivationSeen).toEqual([10]);
    expect(store.getState().data.progress[word.id].dueAt).toBe(progressBeforeAnswer.dueAt);
  });
  it("rejects malformed new baseline metadata while retaining old sessions", async () => {
    const store = createAppStore(memoryPersistence(nine()));
    await store.getState().init();
    await store.getState().start([defaultBook.catalog.words[0]], "learn", "test");
    const snapshot = store.getState().data;
    const legacy = { ...snapshot, session: { ...snapshot.session! } };
    delete legacy.session.progressBaseline;
    expect(validateSnapshot(legacy)).toEqual(legacy);
    expect(() =>
      validateSnapshot({
        ...snapshot,
        session: { ...snapshot.session, progressBaseline: { learnedIds: ["a", "a"], stableIds: [] } },
      }),
    ).toThrow();
  });
});
