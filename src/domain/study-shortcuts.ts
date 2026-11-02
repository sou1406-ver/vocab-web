import type { Question, StudySession } from "./types";

export type ShortcutAction = { type: "choose"; index: number } | { type: "next" } | { type: "replay" } | null;

// Question kinds answered by picking one of the lettered options.
export const CHOICE_KINDS: readonly Question["kind"][] = [
  "meaning",
  "word-choice",
  "cloze-choice",
  "word-form-choice",
  "synonym-choice",
  "synonym-context",
  "listen-choice",
];

// Maps a key to a study action: 1–9 or A–I pick an option, Enter moves on, R replays listening audio.
export function studyShortcut(
  key: string,
  context: { phase: StudySession["phase"]; choices: number; listening: boolean },
): ShortcutAction {
  if (context.phase === "learn" || context.phase === "feedback") return key === "Enter" ? { type: "next" } : null;
  if (context.phase !== "question") return null;
  if (context.listening && (key === "r" || key === "R")) return { type: "replay" };
  if (!context.choices) return null;
  const digit = /^[1-9]$/.test(key) ? Number(key) - 1 : -1;
  const letter = /^[a-i]$/i.test(key) ? key.toLowerCase().charCodeAt(0) - 97 : -1;
  const index = digit >= 0 ? digit : letter;
  return index >= 0 && index < context.choices ? { type: "choose", index } : null;
}
