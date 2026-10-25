"use client";

import { useRef, useState, type RefObject } from "react";

interface Props {
  id: string;
  answer: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  inputRef?: RefObject<HTMLInputElement | null>;
}

// One native input keeps selection, paste and mobile keyboard behavior intact.
// The cells only display the entered value; they never contain answer letters.
export function LetterSlotsInput({ id, answer, value, onChange, disabled, inputRef }: Props) {
  const native = useRef<HTMLInputElement | null>(null);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const template = Array.from(answer);
  const entered = Array.from(value);
  const count = Math.max(template.length, entered.length);
  const updateSelection = (node: HTMLInputElement) =>
    setSelection({ start: node.selectionStart ?? value.length, end: node.selectionEnd ?? value.length });

  return (
    <div
      className={`letter-slots${disabled ? " is-disabled" : ""}`}
      onPointerDown={(event) => {
        if (disabled) return;
        event.preventDefault();
        const cell = (event.target as HTMLElement).closest<HTMLElement>("[data-slot-index]");
        const index = cell ? Math.min(Number(cell.dataset.slotIndex), value.length) : value.length;
        native.current?.focus({ preventScroll: true });
        native.current?.setSelectionRange(index, index);
        setSelection({ start: index, end: index });
      }}
    >
      <input
        ref={(node) => {
          native.current = node;
          if (inputRef) inputRef.current = node;
        }}
        id={id}
        className="letter-slots-input"
        type="text"
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        value={value}
        disabled={disabled}
        onChange={(event) => {
          onChange(event.target.value);
          updateSelection(event.target);
        }}
        onSelect={(event) => updateSelection(event.currentTarget)}
      />
      <div className="letter-slots-cells" aria-hidden="true">
        {Array.from({ length: count }, (_, index) => {
          const char = entered[index] ?? "";
          const gap = /\s/.test(template[index] ?? "") && (!char || /\s/.test(char));
          const selected = selection.end > selection.start && index >= selection.start && index < selection.end;
          const active = selection.start === selection.end && index === selection.start;
          return (
            <span
              key={index}
              data-slot-index={index}
              className={`${gap ? "letter-gap" : "letter-slot"}${active ? " is-active" : ""}${selected ? " is-selected" : ""}`}
            >
              {char}
            </span>
          );
        })}
      </div>
    </div>
  );
}
