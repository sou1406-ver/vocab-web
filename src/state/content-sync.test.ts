import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAppStore, memoryPersistence } from "./store";
import { fetchContentEdits, refreshContentEdits, startContentEdits } from "./content-sync";
import { applyContentEdits, originalOf } from "../data/content-edits";
import { defaultBook, wordsById } from "../data/catalog";
import { emptySnapshot } from "../domain/learning";

const base = originalOf(defaultBook);
const first = base.words[0];
const restDoc = (meaning: string) => ({
  fields: {
    kind: { stringValue: "word" },
    bookId: { stringValue: defaultBook.id },
    target: { stringValue: first.id },
    data: { stringValue: JSON.stringify({ ...first, meaning }) },
    hidden: { booleanValue: false },
    updatedAt: { timestampValue: "2026-11-03T00:00:00Z" },
  },
});
let storage: Record<string, string>;
const serve = (pages: unknown[][]) => {
  let call = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      const documents = pages[call] ?? [];
      call++;
      return new Response(JSON.stringify({ documents, ...(call < pages.length ? { nextPageToken: `p${call}` } : {}) }));
    }),
  );
};
beforeEach(() => {
  storage = {};
  vi.stubGlobal("location", { hostname: "example.test" });
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage[key] ?? null,
    setItem: (key: string, value: string) => void (storage[key] = value),
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  applyContentEdits([]);
});

describe("content edit sync", () => {
  it("reads every REST page", async () => {
    serve([[restDoc("một")], [restDoc("hai")]]);
    const edits = await fetchContentEdits();
    expect(edits).toHaveLength(2);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
  });
  it("applies new edits right away when no session is open, and caches them", async () => {
    serve([[restDoc("nghĩa mới")]]);
    const store = createAppStore(memoryPersistence(emptySnapshot()));
    await store.getState().init();
    expect(await refreshContentEdits(store)).toBe(true);
    expect(wordsById.get(first.id)?.meaning).toBe("nghĩa mới");
    applyContentEdits([]);
    startContentEdits(store);
    expect(wordsById.get(first.id)?.meaning).toBe("nghĩa mới");
  });
  it("waits for the next visit while a study session is open", async () => {
    serve([[restDoc("nghĩa mới")]]);
    const store = createAppStore(memoryPersistence(emptySnapshot()));
    await store.getState().init();
    await store.getState().start([first], "practice", "Đang học");
    expect(await refreshContentEdits(store)).toBe(false);
    expect(wordsById.get(first.id)?.meaning).toBe(first.meaning);
    expect(storage["vocab:content-edits:v1"]).toContain("nghĩa mới");
  });
});

describe("content edit sync failures", () => {
  it("keeps bundled content and does not ask again right away", async () => {
    vi.stubGlobal("location", { hostname: "example.test" });
    const store: Record<string, string> = {};
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => void (store[key] = value),
    });
    const failing = vi.fn(async () => new Response("denied", { status: 403 }));
    vi.stubGlobal("fetch", failing);
    const app = createAppStore(memoryPersistence(emptySnapshot()));
    startContentEdits(app);
    await vi.waitFor(() => expect(store["vocab:content-edits:v1"]).toBeDefined());
    startContentEdits(app);
    expect(failing).toHaveBeenCalledTimes(1);
    expect(wordsById.get(first.id)?.meaning).toBe(first.meaning);
  });
});
