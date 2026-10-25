import { createStore, type StoreApi } from "zustand/vanilla";
import { readSnapshot, changeSnapshot } from "../data/repository";
import { catalog } from "../data/catalog";
import {
  emptySnapshot,
  beginSession,
  beginExerciseSession,
  advanceSession,
  answerQuestion,
  finishSession,
} from "../domain/learning";
import type { SessionMode, Snapshot, Word, Question } from "../domain/types";

export interface AppState {
  clock: number;
  data: Snapshot;
  ready: boolean;
  busy: boolean;
  error: string;
  init: () => Promise<void>;
  change: (reduce: (data: Snapshot) => Snapshot) => Promise<boolean>;
  start: (words: Word[], mode: SessionMode, title: string, returnTo?: string) => Promise<boolean>;
  startExercises: (questions: Question[], title: string, returnTo?: string) => Promise<boolean>;
  answer: (input: string, assisted?: boolean) => Promise<boolean>;
  advance: () => Promise<boolean>;
  finish: () => Promise<boolean>;
  clearError: () => void;
}
export function createAppStore() {
  return createStore<AppState>((set, get) => ({
    clock: Date.now(),
    data: emptySnapshot(),
    ready: false,
    busy: false,
    error: "",
    init: async () => {
      try {
        const data = await readSnapshot();
        set({ data, ready: true, error: "" });
      } catch (e) {
        set({ ready: false, error: e instanceof Error ? e.message : "Không mở được dữ liệu trên máy. Hãy thử lại." });
      }
    },
    change: async (reduce) => {
      if (get().busy || !get().ready) return false;
      set({ busy: true, error: "" });
      try {
        const data = await changeSnapshot(reduce);
        set({ data, busy: false });
        return true;
      } catch (e) {
        set({ busy: false, error: e instanceof Error ? e.message : "Không lưu được tiến độ. Hãy thử lại." });
        try {
          set({ data: await readSnapshot() });
        } catch {
          /* Preserve the last readable state. */
        }
        return false;
      }
    },
    start: (words, mode, title, returnTo) =>
      get().change((data) => {
        const next = beginSession(data, catalog, words, mode, title, crypto.randomUUID());
        return returnTo && next.session ? { ...next, session: { ...next.session, returnTo } } : next;
      }),
    startExercises: (questions, title, returnTo) =>
      get().change((data) => {
        const next = beginExerciseSession(data, catalog, questions, title, crypto.randomUUID());
        return returnTo && next.session ? { ...next, session: { ...next.session, returnTo } } : next;
      }),
    answer: (input, assisted = false) => {
      const session = get().data.session;
      return session
        ? get().change((data) => answerQuestion(data, session.id, session.index, input, assisted))
        : Promise.resolve(false);
    },
    advance: () => {
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
    void readSnapshot()
      .then((data) => {
        if (data.revision > store.getState().data.revision) store.setState({ data });
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
