import { createStore, type StoreApi } from "zustand/vanilla";
import { readSnapshot, changeSnapshot } from "../data/repository";
import { validateSnapshot } from "../data/validation";
import { activeBook, bookOfWord } from "../data/catalog";
import {
  emptySnapshot,
  beginSession,
  beginExerciseSession,
  advanceSession,
  answerQuestion,
  applyStudyHint,
  beginSkillReview,
  finishSession,
} from "../domain/learning";
import type { Skill } from "../domain/skills";
import { acknowledgeCultivation, crossedCultivation } from "../domain/study-progress";
import type { StudyHintOffer } from "../domain/study-hints";
import type { SessionMode, Snapshot, StudySession, Word, Question } from "../domain/types";

export interface AppState {
  breakthrough: number | null;
  dismissBreakthrough: () => void;
  profileKey: string;
  clock: number;
  data: Snapshot;
  ready: boolean;
  busy: boolean;
  error: string;
  init: () => Promise<void>;
  switchProfile: (profile: string) => Promise<void>;
  change: (reduce: (data: Snapshot) => Snapshot) => Promise<boolean>;
  start: (words: Word[], mode: SessionMode, title: string, returnTo?: string) => Promise<boolean>;
  /** Review session with one question per word in its planned skill (recognition or recall). */
  startReview: (items: { word: Word; skill: Skill }[], title: string) => Promise<boolean>;
  startExercises: (
    questions: Question[] | ((sessionId: string, snapshot: Snapshot) => Question[]),
    title: string,
    returnTo?: string,
  ) => Promise<boolean>;
  answer: (input: string | string[], assisted?: boolean) => Promise<boolean>;
  saveHint: (sessionId: string, index: number, offer: StudyHintOffer) => Promise<StudySession | null>;
  advance: () => Promise<boolean>;
  finish: () => Promise<boolean>;
  clearError: () => void;
}
// A session draws distractors and its content version from the book its words belong to.
// Custom words belong to no book, so an all-custom session uses the active book.
function sessionCatalog(data: Snapshot, wordIds: readonly string[]) {
  const owned = wordIds.map((id) => bookOfWord(id)).find((book) => book !== undefined);
  return (owned ?? activeBook(data.settings)).catalog;
}
export interface SnapshotPersistence {
  read: (profile: string) => Promise<Snapshot>;
  change: (reduce: (data: Snapshot) => Snapshot, profile: string) => Promise<Snapshot>;
}
const browserPersistence: SnapshotPersistence = { read: readSnapshot, change: changeSnapshot };
// Keeps one snapshot in memory only: the admin sandbox runs real screens without touching IndexedDB or sync.
export function memoryPersistence(initial: Snapshot): SnapshotPersistence {
  let current = validateSnapshot(initial);
  return {
    read: async () => current,
    change: async (reduce) => {
      current = validateSnapshot({ ...reduce(current), revision: current.revision + 1 });
      return current;
    },
  };
}
export function createAppStore(persistence: SnapshotPersistence = browserPersistence) {
  let profileRequest = 0;
  return createStore<AppState>((set, get) => ({
    breakthrough: null,
    dismissBreakthrough: () => set({ breakthrough: null }),
    profileKey: "guest",
    clock: Date.now(),
    data: emptySnapshot(),
    ready: false,
    busy: false,
    error: "",
    init: async () => get().switchProfile(get().profileKey),
    switchProfile: async (profileKey) => {
      const request = ++profileRequest;
      set({ profileKey, ready: false, busy: false, data: emptySnapshot(), error: "", breakthrough: null });
      try {
        const data = await persistence.read(profileKey);
        if (request === profileRequest) set({ data, ready: true, error: "" });
      } catch (e) {
        if (request === profileRequest)
          set({ ready: false, error: e instanceof Error ? e.message : "Không mở được dữ liệu trên máy. Hãy thử lại." });
      }
    },
    change: async (reduce) => {
      if (get().busy || !get().ready) return false;
      set({ busy: true, error: "" });
      const profileKey = get().profileKey;
      const request = profileRequest;
      try {
        const data = await persistence.change(reduce, profileKey);
        if (request !== profileRequest) return false;
        set({ ...(data.revision >= get().data.revision ? { data } : {}), busy: false });
        return true;
      } catch (e) {
        if (request !== profileRequest) return false;
        set({ busy: false, error: e instanceof Error ? e.message : "Không lưu được tiến độ. Hãy thử lại." });
        try {
          const data = await persistence.read(profileKey);
          if (request === profileRequest) set({ data });
        } catch {
          /* Preserve the last readable state. */
        }
        return false;
      }
    },
    start: (words, mode, title, returnTo) =>
      get().change((data) => {
        const catalog = sessionCatalog(
          data,
          words.map((word) => word.id),
        );
        const next = beginSession(data, catalog, words, mode, title, crypto.randomUUID());
        return returnTo && next.session ? { ...next, session: { ...next.session, returnTo } } : next;
      }),
    startReview: (items, title) =>
      get().change((data) =>
        beginSkillReview(
          data,
          sessionCatalog(
            data,
            items.map((item) => item.word.id),
          ),
          items,
          title,
          crypto.randomUUID(),
        ),
      ),
    startExercises: (questions, title, returnTo) =>
      get().change((data) => {
        const id = crypto.randomUUID();
        const list = typeof questions === "function" ? questions(id, data) : questions;
        const catalog = sessionCatalog(
          data,
          list.map((q) => q.wordId),
        );
        const next = beginExerciseSession(data, catalog, list, title, id);
        return returnTo && next.session ? { ...next, session: { ...next.session, returnTo } } : next;
      }),
    saveHint: async (sessionId, index, { hint, price, blocked }) => {
      if (blocked) return null;
      let position = -1;
      const saved = await get().change((data) => {
        const next = applyStudyHint(data, sessionId, index, hint, price);
        position = next === data ? -1 : (next.session!.hints?.length ?? 0) - 1;
        return next;
      });
      const current = get().data.session;
      return saved &&
        position >= 0 &&
        current?.id === sessionId &&
        current.index === index &&
        current.phase === "question" &&
        current.hints?.[position] === hint
        ? current
        : null;
    },
    answer: async (input, assisted = false) => {
      const session = get().data.session;
      if (!session) return false;
      const isCatalogWord = (id: string) => Boolean(bookOfWord(id));
      let crossed: number[] = [];
      const saved = await get().change((data) => {
        const answered = answerQuestion(data, session.id, session.index, input, assisted);
        crossed = crossedCultivation(data, answered, isCatalogWord);
        return acknowledgeCultivation(data, answered, isCatalogWord);
      });
      if (saved && crossed.length) set({ breakthrough: crossed.at(-1)! });
      return saved;
    },
    advance: () => {
      if (get().breakthrough !== null) return Promise.resolve(false);
      const session = get().data.session;
      return session ? get().change((data) => advanceSession(data, session.id, session.index)) : Promise.resolve(false);
    },
    finish: () => {
      const sessionId = get().data.session?.id;
      if (!sessionId) return Promise.resolve(false);
      return get().change((data) => {
        if (data.session?.id !== sessionId) throw new Error("Lượt học đã thay đổi. Hãy tiếp tục từ vị trí mới nhất.");
        return finishSession(data, false);
      });
    },
    clearError: () => set({ error: "" }),
  }));
}

// Called by the client provider effect, never during SSR/module evaluation.
export function connectBrowserStore(store: StoreApi<AppState>) {
  const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("vocab-learn-v2") : null;
  const refresh = () => {
    if (!store.getState().ready || store.getState().busy) return;
    const profile = store.getState().profileKey;
    void readSnapshot(profile)
      .then((data) => {
        if (profile === store.getState().profileKey && data.revision > store.getState().data.revision)
          store.setState({ data });
      })
      .catch(() => {
        /* Keep the last readable state. */
      });
  };
  channel?.addEventListener("message", refresh);
  const unsubscribe = store.subscribe((state, previous) => {
    if (state.data.revision !== previous.data.revision) channel?.postMessage(state.data.revision);
  });
  const tick = () => {
    store.setState({ clock: Date.now() });
    refresh();
  };
  const timer = window.setInterval(tick, 60_000);
  window.addEventListener("focus", tick);
  return () => {
    unsubscribe();
    channel?.close();
    window.clearInterval(timer);
    window.removeEventListener("focus", tick);
  };
}
