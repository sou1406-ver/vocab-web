import { createContext, useContext, useEffect, useRef, useState, type RefObject } from "react";
import { typedAnswerQuality } from "@/lib/quiz";
import type { Question } from "@/lib/quiz";
import type { QuizState } from "@/state/ui";
import { applyFixedHintLetters } from "./LetterSlotsInput";
import { useUI } from "@/state/ui";

export type AnswerHandler = (ok: boolean, pick?: number, close?: boolean, masteryCredit?: boolean, reviewResults?: { id: string; ok: boolean }[]) => void;
export type QuestionProps = { q: Question; onAnswer: AnswerHandler; onNext: () => void };
export type TypedAnswerState = {
  st: QuizState; setQuiz: (patch: Partial<QuizState>) => void; inputRef: RefObject<HTMLInputElement>;
  hintCount: number; hintPenalty: boolean; typedValue: string; setTypedValue: (value: string) => void;
  typingError: boolean; setTypingError: (value: boolean) => void; wrongAttempts: number;
  matchWord: number | null; setMatchWord: (value: number | null) => void;
  matchPairs: Record<number, number>; setMatchPairs: (value: Record<number, number> | ((pairs: Record<number, number>) => Record<number, number>)) => void;
  submitTypedAnswer: (answer: string, target: string, alternatives?: string[]) => void;
  revealNextLetter: (word: string) => void;
};
export const TypedAnswerContext = createContext<TypedAnswerState | null>(null);
export function useTypedAnswerState() {
  const value = useContext(TypedAnswerContext);
  if (!value) throw new Error("Question view must be inside TypedAnswerContext");
  return value;
}
export function useTypedAnswer(q: Question, onAnswer: AnswerHandler): TypedAnswerState {
  const st = useUI((s) => s.quiz);
  const setQuiz = useUI((s) => s.setQuiz);
  const inputRef = useRef<HTMLInputElement>(null);
  const [hintCount, setHintCount] = useState(0);
  const [hintPenalty, setHintPenalty] = useState(false);
  const [typedValue, setTypedValue] = useState("");
  const [typingError, setTypingError] = useState(false);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const wrongAttemptsRef = useRef(0);
  const [matchWord, setMatchWord] = useState<number | null>(null);
  const [matchPairs, setMatchPairs] = useState<Record<number, number>>({});
  useEffect(() => {
    setHintCount(0); setHintPenalty(false); setTypedValue(""); setTypingError(false);
    setWrongAttempts(0); wrongAttemptsRef.current = 0; setMatchWord(null); setMatchPairs({});
    inputRef.current?.focus();
  }, [q]);
  const submitTypedAnswer = (answer: string, target: string, alternatives?: string[]) => {
    if (!answer.trim()) return;
    const quality = typedAnswerQuality(answer, target, alternatives);
    if (quality === "correct") { setTypingError(false); onAnswer(true, undefined, false, !hintPenalty); return; }
    if (quality === "close") { setTypingError(false); onAnswer(false, undefined, true); return; }
    setTypingError(true); setTypedValue("");
    const attempts = wrongAttemptsRef.current + 1; wrongAttemptsRef.current = attempts; setWrongAttempts(attempts);
    if (attempts >= 3) onAnswer(false);
  };
  const revealNextLetter = (word: string) => {
    const letterCount = Array.from(word).filter((letter) => letter !== " ").length;
    if (hintCount >= letterCount) return;
    const nextCount = hintCount + 1; setHintCount(nextCount);
    setTypedValue((value) => applyFixedHintLetters(value, word, nextCount));
    inputRef.current?.focus();
    if (nextCount > 2 && !hintPenalty) { setHintPenalty(true); setTypingError(true); }
  };
  return { st, setQuiz, inputRef, hintCount, hintPenalty, typedValue, setTypedValue, typingError, setTypingError, wrongAttempts, matchWord, setMatchWord, matchPairs, setMatchPairs, submitTypedAnswer, revealNextLetter };
}
