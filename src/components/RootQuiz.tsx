"use client";

import { useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RootQuizQuestion } from "../domain/root-quiz";

/** Practice only: nothing here is saved, so it never changes progress or the review schedule. */
export function RootQuiz({ rounds }: { rounds: RootQuizQuestion[][] }) {
  const [round, setRound] = useState(0);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const nextRef = useRef<HTMLButtonElement>(null);
  const promptRef = useRef<HTMLParagraphElement>(null);
  const moved = useRef(false);
  const questions = rounds[round % rounds.length];
  const question = questions[index];
  const done = index >= questions.length;

  useEffect(() => {
    if (picked !== null) nextRef.current?.focus();
  }, [picked]);
  useEffect(() => {
    // Only after the learner moves on, never on first render, so the page does not jump to the quiz.
    if (moved.current) promptRef.current?.focus();
  }, [index, round]);

  if (!questions.length) return null;
  const choose = (option: string) => {
    if (picked !== null) return;
    setPicked(option);
    if (option === question.answer) setScore((value) => value + 1);
  };
  const next = () => {
    moved.current = true;
    setPicked(null);
    setIndex((value) => value + 1);
  };
  const restart = () => {
    moved.current = true;
    setRound((value) => value + 1);
    setIndex(0);
    setScore(0);
    setPicked(null);
  };

  return (
    <section className="panel root-quiz" aria-labelledby="root-quiz-title">
      <div className="root-quiz-heading">
        <h2 id="root-quiz-title">Thử nhanh</h2>
        <span className="muted">{done ? "Xong" : `Câu ${index + 1}/${questions.length}`}</span>
      </div>
      <p className="root-quiz-note muted">Chỉ để luyện, không tính vào tiến độ hay lịch ôn.</p>
      {done ? (
        <div className="root-quiz-result">
          <p ref={promptRef} tabIndex={-1}>
            Bạn đúng <b>{score}</b>/{questions.length} câu.
          </p>
          <Button className="min-h-11" onClick={restart}>
            Làm lượt khác
          </Button>
        </div>
      ) : (
        <>
          <p className="root-quiz-prompt" ref={promptRef} tabIndex={-1}>
            {question.kind === "meaning" ? (
              <>
                <b lang="en">{question.prompt}</b> nghĩa là gì?
              </>
            ) : (
              <>Từ nào nghĩa là “{question.prompt}”?</>
            )}
          </p>
          <div className="answer-options">
            {question.options.map((option, optionIndex) => {
              const isAnswer = picked !== null && option === question.answer;
              const isWrong = picked === option && option !== question.answer;
              return (
                <button
                  key={option}
                  type="button"
                  lang={question.kind === "meaning" ? "vi" : "en"}
                  className={`answer-option${isAnswer ? " correct-option" : ""}${isWrong ? " wrong-option" : ""}`}
                  disabled={picked !== null}
                  onClick={() => choose(option)}
                >
                  <span>{String.fromCharCode(65 + optionIndex)}</span>
                  {option}
                  {isAnswer && <Check aria-hidden="true" size={18} />}
                  {isWrong && <X aria-hidden="true" size={18} />}
                </button>
              );
            })}
          </div>
          {picked !== null && (
            <div className="root-quiz-feedback">
              <div role="status">
                <p>
                  <b>{picked === question.answer ? "Chính xác." : `Chưa đúng — đáp án: ${question.answer}.`}</b>
                </p>
                <p className="root-logic">{question.logic}</p>
              </div>
              <Button ref={nextRef} className="min-h-11" onClick={next}>
                {index + 1 < questions.length ? "Câu tiếp" : "Xem kết quả"}
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
