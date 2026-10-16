import { create } from "zustand";
import type { Question } from "@/lib/quiz";
import type { OptionKey } from "@/lib/types";

/* Trạng thái giao diện của từng trang — giữ nguyên khi chuyển tab (như bản cũ). */

export interface NetState {
  unit: string;
  lesson: string;
  q: string;
  status: string;
  pos: string;
  affix: string;
  sort: string;
}
export const NET_DEFAULT: NetState = {
  unit: "all",
  lesson: "all",
  q: "",
  status: "all",
  pos: "all",
  affix: "all",
  sort: "book",
};

export interface FcState {
  unit: string;
  lesson: string;
  status: string;
  deck: string[];
  i: number;
  flipped: boolean;
  /** true khi bộ thẻ cần dựng lại theo bộ lọc */
  stale: boolean;
}

export type QuizType = "formation" | "synonym" | "meaning" | "build" | "mixed";
export interface QuizState {
  mode: "book" | "auto";
  type: QuizType;
  unit: string;
  lesson: string;
  only: string;
  style: "choice" | "typing";
  forWord: string | null;
  qs: Question[];
  i: number;
  right: number;
  wrong: number;
  answered: boolean;
  picked: number[];
  last: { ok: boolean; pick?: number } | null;
  stale: boolean;
}

export interface WicFill {
  w: string;
  chip: number;
}
export interface BookState {
  unit: string;
  lesson: string;
  touched: boolean;
  wic: Record<number, WicFill>;
  picks: Record<string, Record<number, OptionKey>>;
  checked: Record<string, { right: number; total: number }>;
  active: number | null;
}

export type ModalState = { kind: "profile"; isNew: boolean } | { kind: "word"; id?: string } | null;

interface Toast {
  id: number;
  msg: string;
}

interface UIState {
  net: NetState;
  fc: FcState;
  quiz: QuizState;
  book: BookState;
  toasts: Toast[];
  modal: ModalState;
  menuOpen: boolean;
  setModal: (m: ModalState) => void;
  setMenuOpen: (v: boolean) => void;
  setNet: (p: Partial<NetState>) => void;
  setFc: (p: Partial<FcState>) => void;
  setQuiz: (p: Partial<QuizState>) => void;
  setBook: (p: Partial<BookState>) => void;
  resetBook: () => void;
  resetSession: () => void;
  toast: (msg: string) => void;
}

const freshBook = { wic: {}, picks: {}, checked: {}, active: null };

export const useUI = create<UIState>()((set, get) => ({
  net: { ...NET_DEFAULT },
  fc: { unit: "all", lesson: "1", status: "all", deck: [], i: 0, flipped: false, stale: true },
  quiz: {
    mode: "book",
    type: "formation",
    unit: "all",
    lesson: "1",
    only: "all",
    style: "choice",
    forWord: null,
    qs: [],
    i: 0,
    right: 0,
    wrong: 0,
    answered: false,
    picked: [],
    last: null,
    stale: true,
  },
  book: { unit: "business", lesson: "1", touched: false, ...freshBook },
  toasts: [],
  modal: null,
  menuOpen: false,
  setModal: (modal) => set({ modal, menuOpen: false }),
  setMenuOpen: (menuOpen) => set({ menuOpen }),
  setNet: (p) => set({ net: { ...get().net, ...p } }),
  setFc: (p) => set({ fc: { ...get().fc, ...p } }),
  setQuiz: (p) => set({ quiz: { ...get().quiz, ...p } }),
  setBook: (p) => set({ book: { ...get().book, ...p } }),
  resetBook: () => set({ book: { ...get().book, ...freshBook } }),
  /** Khi đổi hồ sơ: bỏ các phiên học đang dở */
  resetSession: () =>
    set({
      fc: { ...get().fc, deck: [], i: 0, flipped: false, stale: true },
      quiz: { ...get().quiz, qs: [], i: 0, stale: true },
      book: { ...get().book, touched: false, ...freshBook },
    }),
  toast: (msg) => {
    const id = Date.now() + Math.random();
    set({ toasts: [...get().toasts, { id, msg }] });
    setTimeout(() => set({ toasts: get().toasts.filter((t) => t.id !== id) }), 2600);
  },
}));

export const toast = (msg: string) => useUI.getState().toast(msg);
