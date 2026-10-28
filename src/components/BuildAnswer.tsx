"use client";
import { useRef, useState, type RefObject } from "react";
import type { BuildQuestion, Feedback } from "../domain/types";

export function BuildAnswer({
  question,
  feedback,
  busy,
  onAnswer,
  firstTileRef,
}: {
  question: BuildQuestion;
  feedback: Feedback | null;
  busy: boolean;
  onAnswer: (parts: string[]) => void;
  firstTileRef?: RefObject<HTMLButtonElement | null>;
}) {
  const [chosen, setChosen] = useState<string[]>([]);
  const tiles = useRef(new Map<string, HTMLButtonElement>());
  const selected = feedback?.selectedParts ?? chosen;
  const disabled = busy || Boolean(feedback);
  const toggle = (part: string) =>
    setChosen((current) => (current.includes(part) ? current.filter((item) => item !== part) : [...current, part]));
  return (
    <form
      className="build-answer"
      onSubmit={(event) => {
        event.preventDefault();
        if (!disabled && selected.length) onAnswer([...selected]);
      }}
    >
      <p id="build-instructions" className="muted">
        Bấm mảnh để ghép theo thứ tự. Bấm lại để gỡ.
      </p>
      <div
        className="build-selection"
        role="group"
        aria-label="Các mảnh đã ghép"
        aria-describedby="build-instructions"
        aria-live="polite"
      >
        {selected.length ? (
          selected.map((part, index) => (
            <button
              key={part}
              type="button"
              className="button secondary"
              disabled={disabled}
              aria-label={`Gỡ mảnh ${index + 1}: ${part}`}
              onClick={() => {
                toggle(part);
                requestAnimationFrame(() => tiles.current.get(part)?.focus({ preventScroll: true }));
              }}
            >
              {part}
            </button>
          ))
        ) : (
          <span className="muted">Chọn các mảnh bên dưới</span>
        )}
      </div>
      <div className="build-tiles" role="group" aria-label="Các mảnh để ghép">
        {question.tiles.map((part, index) => (
          <button
            ref={(node) => {
              if (node) tiles.current.set(part, node);
              else tiles.current.delete(part);
              if (index === 0 && firstTileRef) firstTileRef.current = node;
            }}
            type="button"
            className="button secondary"
            key={part}
            disabled={disabled}
            aria-pressed={selected.includes(part)}
            onClick={() => toggle(part)}
          >
            {part}
          </button>
        ))}
      </div>
      {!feedback && (
        <button className="button primary" type="submit" disabled={busy || !selected.length}>
          Kiểm tra
        </button>
      )}
    </form>
  );
}
