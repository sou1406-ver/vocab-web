export function revealedIndices(answer: string, revealed: readonly number[]) {
  const template = Array.from(answer);
  return new Set(
    revealed.filter(
      (index) => Number.isInteger(index) && index >= 0 && index < template.length && /\p{L}/u.test(template[index]),
    ),
  );
}

export function projectRevealed(value: string, answer: string, revealed: readonly number[]) {
  const chars = Array.from(value).slice(0, Array.from(answer).length);
  const template = Array.from(answer);
  for (const index of revealedIndices(answer, revealed)) {
    while (chars.length <= index) chars.push(" ");
    chars[index] = template[index];
  }
  for (let index = 0; index < chars.length; index++) {
    if (isFixedSeparator(template[index])) chars[index] = template[index];
  }
  return chars.join("");
}

export const isFixedSeparator = (char: string) => /[\s-]/.test(char ?? "");

function fixedIndices(answer: string, revealed: readonly number[]) {
  return new Set([
    ...revealedIndices(answer, revealed),
    ...Array.from(answer).flatMap((char, index) => (isFixedSeparator(char) ? [index] : [])),
  ]);
}

export function remainingSlots(value: string, answer: string, revealed: readonly number[] = []) {
  const entered = Array.from(projectRevealed(value, answer, revealed));
  return Array.from(answer).filter(
    (char, index) => !isFixedSeparator(char) && (!entered[index] || /\s/.test(entered[index])),
  ).length;
}

// Visible cells use code points; native selection ranges use UTF-16 offsets.
export function slotSelection(value: string, index: number, answer: string, revealed: readonly number[] = []) {
  const chars = Array.from(value);
  const locked = fixedIndices(answer, revealed);
  let slot = Math.min(index, chars.length);
  while (locked.has(slot)) slot++;
  const start = chars.slice(0, slot).join("").length;
  return { start, end: start + (chars[slot]?.length ?? 0) };
}

// Apply a native-input edit to editable cells while preserving locked hint positions.
export interface NativeSlotEdit {
  start: number;
  end: number;
  inputType: string;
}

export function editRevealed(
  previous: string,
  next: string,
  answer: string,
  revealed: readonly number[],
  nativeEdit?: NativeSlotEdit,
) {
  const old = Array.from(previous);
  const incoming = Array.from(next);
  const template = Array.from(answer);
  const locked = fixedIndices(answer, revealed);
  const hints = revealedIndices(answer, revealed);
  const separators = new Set(template.filter(isFixedSeparator));
  let start = 0;
  while (start < old.length && start < incoming.length && old[start] === incoming[start]) start++;
  let oldEnd = old.length;
  let newEnd = incoming.length;
  while (oldEnd > start && newEnd > start && old[oldEnd - 1] === incoming[newEnd - 1]) {
    oldEnd--;
    newEnd--;
  }
  if (nativeEdit) {
    let nativeStart = Array.from(previous.slice(0, nativeEdit.start)).length;
    let nativeEnd = Array.from(previous.slice(0, nativeEdit.end)).length;
    const removed = old.length - incoming.length;
    if (nativeStart === nativeEnd && removed > 0) {
      if (nativeEdit.inputType.endsWith("Backward")) nativeStart -= removed;
      else if (nativeEdit.inputType.endsWith("Forward")) nativeEnd += removed;
    }
    const incomingEnd = nativeEnd + incoming.length - old.length;
    // Ignore stale/unsupported native ranges (for example a browser replacement).
    if (
      nativeStart >= 0 &&
      nativeEnd <= old.length &&
      incomingEnd >= nativeStart &&
      incomingEnd <= incoming.length &&
      old.slice(0, nativeStart).join("") === incoming.slice(0, nativeStart).join("") &&
      old.slice(nativeEnd).join("") === incoming.slice(incomingEnd).join("")
    ) {
      start = nativeStart;
      oldEnd = nativeEnd;
      newEnd = incomingEnd;
    }
  }
  if (oldEnd === start && newEnd > start && remainingSlots(previous, answer, revealed) === 0) {
    return { value: projectRevealed(previous, answer, revealed), caret: old.slice(0, start).join("").length };
  }
  const replacingAll = start === 0 && oldEnd === old.length;
  const insertion = replacingAll
    ? Array.from(incoming.slice(start, newEnd).join("").trim())
    : incoming.slice(start, newEnd);
  if (start === oldEnd && start >= template.length && insertion.length) {
    const chars = Array.from(projectRevealed(previous, answer, revealed));
    const blanks = template.flatMap((_, index) =>
      !locked.has(index) && (!chars[index] || /\s/.test(chars[index])) ? [index] : [],
    );
    let used = 0;
    let caret = start;
    for (const char of insertion) {
      if (separators.has(char)) continue;
      const index = blanks[used++];
      if (index === undefined) break;
      chars[index] = char;
      caret = index + 1;
    }
    while (locked.has(caret)) caret++;
    return { value: chars.join(""), caret: chars.slice(0, caret).join("").length };
  }
  const before = old.slice(0, start).filter((_, index) => !locked.has(index));
  const after = old.slice(oldEnd).filter((_, index) => !locked.has(oldEnd + index));
  let position = start;
  const inserted = insertion.filter((char) => {
    if (separators.has(char)) return false;
    while (isFixedSeparator(template[position])) position++;
    const replacesHint =
      oldEnd > start &&
      position < oldEnd &&
      hints.has(position) &&
      char.toLowerCase() === template[position].toLowerCase();
    position++;
    return !replacesHint;
  });
  const editable = [...before, ...inserted, ...after];
  const chars: string[] = [];
  const lastLocked = Math.max(-1, ...hints);
  let used = 0;
  let caret = 0;
  const capacity = template.length - locked.size;
  const editableCaret = Math.min(before.length + inserted.length, capacity);
  for (let index = 0; index < template.length && (index <= lastLocked || used < editable.length); index++) {
    if (locked.has(index)) chars.push(template[index]);
    else {
      chars.push(editable[used++] ?? " ");
      if (used === editableCaret) caret = index + 1;
    }
  }
  while (locked.has(caret)) caret++;
  return { value: chars.join(""), caret: chars.slice(0, Math.min(caret, chars.length)).join("").length };
}
