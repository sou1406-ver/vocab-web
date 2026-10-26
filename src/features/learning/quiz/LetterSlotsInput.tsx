import type { RefObject } from "react";
import { cx } from "@/lib/util";

export function LetterSlotsInput({
  word,
  value,
  onChange,
  inputRef,
  revealCount = 0,
  lockedCount = revealCount,
  placeholder,
}: {
  word: string;
  value: string;
  onChange: (value: string) => void;
  inputRef: RefObject<HTMLInputElement>;
  revealCount?: number;
  lockedCount?: number;
  placeholder: string;
}) {
  const letters = Array.from(word);
  const typed = Array.from(value.toLocaleLowerCase().replace(/\s/g, ""));
  let typedIndex = 0;
  return (
    <div className="letter-slot-input" aria-label={`${letters.filter((char) => char !== " ").length} ô chữ cái`}>
      <div className="letter-slots" aria-hidden="true">
        {letters.map((char, index) => {
          if (char === " ") {
            return <span className="letter-slot-space" key={`space-${index}`} />;
          }
          const typedChar = typed[typedIndex++];
          const revealedLetters = Array.from(word.slice(0, index)).filter((letter) => letter !== " ").length;
          const shown = typedChar || (revealedLetters < revealCount ? char.toLocaleLowerCase() : "");
          return (
            <span className={cx("letter-slot", shown && "filled")} key={`${char}-${index}`}>
              {shown || "_"}
            </span>
          );
        })}
      </div>
      <input
        ref={inputRef}
        className="letter-slot-native-input"
        value={value}
        onChange={(event) => onChange(applyFixedHintLetters(event.target.value, word, lockedCount))}
        maxLength={word.length}
        autoComplete="off"
        spellCheck={false}
        placeholder={placeholder}
        aria-label={placeholder}
      />
    </div>
  );
}

export function applyFixedHintLetters(value: string, word: string, lockedCount: number) {
  const answerLetters = Array.from(word.toLocaleLowerCase().replace(/\s/g, ""));
  const inputLetters = Array.from(value.toLocaleLowerCase().replace(/\s/g, "")).slice(0, answerLetters.length);
  for (let index = 0; index < Math.min(lockedCount, answerLetters.length); index++)
    inputLetters[index] = answerLetters[index];

  let letterIndex = 0;
  let result = "";
  for (const character of word) {
    if (character === " ") {
      if (inputLetters.length > letterIndex) result += " ";
    } else {
      result += inputLetters[letterIndex] ?? "";
      letterIndex++;
    }
  }
  return result.trimEnd();
}
