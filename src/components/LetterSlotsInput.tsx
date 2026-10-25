"use client";

import { useRef, useState, type RefObject } from "react";
import { editRevealed, projectRevealed, revealedIndices } from "./letter-slots-edit";

interface Props {
  id: string;
  answer: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  inputRef?: RefObject<HTMLInputElement | null>;
  revealed?: readonly number[];
}

// One native input keeps selection, paste and mobile keyboard behavior intact.
// The cells only display the entered value; they never contain answer letters.
export function LetterSlotsInput({ id, answer, value, onChange, disabled, inputRef, revealed = [] }: Props) {
  const native = useRef<HTMLInputElement | null>(null);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const template = Array.from(answer);
  const displayed = projectRevealed(value, answer, revealed);
  const locked = revealedIndices(answer, revealed);
  const entered = Array.from(displayed);
  const count = Math.max(template.length, entered.length);
  const updateSelection = (node: HTMLInputElement) =>
    setSelection({ start: node.selectionStart ?? value.length, end: node.selectionEnd ?? value.length });

  return (
    <div className={`letter-slots${disabled ? " is-disabled" : ""}`}>
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
        value={displayed}
        disabled={disabled}
        onChange={(event) => {
          if (!locked.size) {
            onChange(event.target.value);
            updateSelection(event.target);
          } else {
            const edited = editRevealed(displayed, event.target.value, answer, revealed);
            onChange(edited.value);
            requestAnimationFrame(() => {
              if (native.current && document.activeElement === native.current) {
                native.current.setSelectionRange(edited.caret, edited.caret);
                setSelection({ start: edited.caret, end: edited.caret });
              }
            });
          }
        }}
        onClick={(event) => {
          // Native pointer focus happens first: no preventDefault/programmatic focus on tap.
          const cells = event.currentTarget.parentElement?.querySelectorAll<HTMLElement>("[data-slot-index]");
          const cell = Array.from(cells ?? []).find((node) => {
            const box = node.getBoundingClientRect();
            return (
              event.clientX >= box.left &&
              event.clientX <= box.right &&
              event.clientY >= box.top &&
              event.clientY <= box.bottom
            );
          });
          let index = cell ? Math.min(Number(cell.dataset.slotIndex), displayed.length) : displayed.length;
          while (locked.has(index)) index++;
          event.currentTarget.setSelectionRange(index, index);
          setSelection({ start: index, end: index });
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
              className={`${gap ? "letter-gap" : "letter-slot"}${active ? " is-active" : ""}${selected ? " is-selected" : ""}${locked.has(index) ? " is-revealed" : ""}`}
            >
              {char}
            </span>
          );
        })}
      </div>
    </div>
  );
}
