"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import {
  editRevealed,
  isFixedSeparator,
  projectRevealed,
  revealedIndices,
  slotSelection,
  type NativeSlotEdit,
} from "./letter-slots-edit";

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
  const nativeEdit = useRef<NativeSlotEdit | undefined>(undefined);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const template = Array.from(answer);
  const displayed = projectRevealed(value, answer, revealed);
  const locked = revealedIndices(answer, revealed);
  const entered = Array.from(displayed);
  const updateSelection = (node: HTMLInputElement) =>
    setSelection({ start: node.selectionStart ?? value.length, end: node.selectionEnd ?? value.length });
  useEffect(() => {
    const node = native.current;
    if (!node) return;
    const beforeInput = (event: InputEvent) => {
      nativeEdit.current = { start: node.selectionStart ?? 0, end: node.selectionEnd ?? 0, inputType: event.inputType };
    };
    node.addEventListener("beforeinput", beforeInput);
    return () => node.removeEventListener("beforeinput", beforeInput);
  }, []);

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
        lang="en"
        inputMode="text"
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        value={displayed}
        disabled={disabled}
        onChange={(event) => {
          const edited = editRevealed(displayed, event.target.value, answer, revealed, nativeEdit.current);
          nativeEdit.current = undefined;
          onChange(edited.value);
          requestAnimationFrame(() => {
            if (native.current && document.activeElement === native.current) {
              native.current.setSelectionRange(edited.caret, edited.caret);
              setSelection({ start: edited.caret, end: edited.caret });
            }
          });
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
          const index = cell ? Number(cell.dataset.slotIndex) : entered.length;
          const range = slotSelection(displayed, index, answer, revealed);
          event.currentTarget.setSelectionRange(range.start, range.end);
          setSelection(range);
        }}
        onSelect={(event) => updateSelection(event.currentTarget)}
      />
      <div className="letter-slots-cells" aria-hidden="true">
        {template.map((expected, index) => {
          const fixed = isFixedSeparator(expected);
          const char = fixed ? expected : (entered[index] ?? "");
          const gap = fixed && /\s/.test(expected);
          const offset = entered.slice(0, index).join("").length;
          const selected =
            !!char &&
            selection.end > selection.start &&
            selection.start < offset + char.length &&
            selection.end > offset;
          const active =
            !fixed &&
            !locked.has(index) &&
            selection.start === selection.end &&
            index <= entered.length &&
            offset === selection.start;
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
