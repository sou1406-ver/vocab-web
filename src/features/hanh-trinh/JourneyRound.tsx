"use client";

import { useEffect, useId, useRef, useState } from "react";
import { questionAnswerText } from "../../domain/learning";
import type { Question, Word } from "../../domain/types";
import { useApp } from "../../state/provider";

export function JourneyRound({
  words,
  backLabel,
  onCompleted,
}: {
  words: readonly Word[];
  backLabel: string;
  onCompleted?: () => void;
}) {
  const { data, busy, error, answer, advance, finish, dismissBreakthrough } = useApp();
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const session = data.session;
  const active = session && session.phase !== "complete";
  useEffect(() => {
    const node = dialog.current;
    if (!node || !active) return;
    node.showModal();
    return () => node.close();
  }, [active]);
  if (!active) return null;
  const question = session.questions[session.index];
  const word = words.find(({ id }) => id === question.wordId);
  const last = session.index + 1 === session.questions.length;
  const next = () => {
    dismissBreakthrough();
    void advance().then((advanced) => {
      if (advanced && last && session.phase === "feedback") onCompleted?.();
    });
  };
  const close = () => {
    dismissBreakthrough();
    void finish();
  };

  return (
    <dialog
      className="journey-dialog"
      ref={dialog}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) close();
      }}
    >
      <header>
        <h2 id={titleId}>{session.title}</h2>
        <button type="button" className="text-link" disabled={busy} onClick={close}>
          Dừng lượt
        </button>
      </header>
      <p className="muted">
        Câu {session.index + 1}/{session.questions.length}
      </p>
      {session.phase === "learn" && word ? (
        <div className="journey-question">
          <h3 lang="en">{word.text}</h3>
          <p>{word.meaning}</p>
          {word.examples[0] && <p lang="en">{word.examples[0].text}</p>}
          <button className="button primary" disabled={busy} onClick={next}>
            Thử nhớ lại
          </button>
        </div>
      ) : session.phase === "feedback" ? (
        <div className="journey-question">
          <p role="status">{session.feedback?.correct ? "Chính xác!" : "Gặp lại thêm một lần nhé."}</p>
          <p>
            Đáp án: <strong lang={question.kind === "meaning" ? "vi" : "en"}>{questionAnswerText(question)}</strong>
          </p>
          <button className="button primary" disabled={busy} onClick={next}>
            {last ? backLabel : "Tiếp tục"}
          </button>
        </div>
      ) : (
        <JourneyQuestion key={`${session.id}:${session.index}`} question={question} busy={busy} answer={answer} />
      )}
      {error && <p role="alert">{error}</p>}
    </dialog>
  );
}

function JourneyQuestion({
  question,
  busy,
  answer,
}: {
  question: Question;
  busy: boolean;
  answer: (input: string, assisted?: boolean) => Promise<boolean>;
}) {
  const [input, setInput] = useState("");
  return (
    <div className="journey-question">
      <p>
        {question.kind === "meaning"
          ? "Chọn nghĩa phù hợp"
          : question.kind === "word-choice"
            ? "Chọn từ phù hợp"
            : "Nhập từ hoặc cụm từ"}
      </p>
      <p lang={question.kind === "recall" || question.kind === "word-choice" ? "vi" : "en"}>{question.prompt}</p>
      {question.options?.length ? (
        <div className="journey-choices">
          {question.options.map((option) => (
            <button key={option} className="button secondary" disabled={busy} onClick={() => void answer(option)}>
              {option}
            </button>
          ))}
        </div>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (input.trim() && !busy) void answer(input);
          }}
        >
          <label>
            Đáp án của bạn
            <input
              lang="en"
              value={input}
              autoComplete="off"
              spellCheck={false}
              onChange={(event) => setInput(event.target.value)}
            />
          </label>
          <button className="button primary" disabled={busy || !input.trim()}>
            Kiểm tra
          </button>
        </form>
      )}
      <button className="text-link" disabled={busy} onClick={() => void answer("", true)}>
        Chưa nhớ, xem đáp án
      </button>
    </div>
  );
}
