export function revealedIndices(answer: string, revealed: readonly number[]) {
  const template = Array.from(answer);
  return new Set(
    revealed.filter(
      (index) => Number.isInteger(index) && index >= 0 && index < template.length && !/\s/.test(template[index]),
    ),
  );
}

export function projectRevealed(value: string, answer: string, revealed: readonly number[]) {
  const chars = Array.from(value);
  const template = Array.from(answer);
  for (const index of revealedIndices(answer, revealed)) {
    while (chars.length <= index) chars.push(" ");
    chars[index] = template[index];
  }
  return chars.join("");
}

// Apply a native-input edit to editable cells while preserving locked hint positions.
export function editRevealed(previous: string, next: string, answer: string, revealed: readonly number[]) {
  const old = Array.from(previous);
  const incoming = Array.from(next);
  const template = Array.from(answer);
  const locked = revealedIndices(answer, revealed);
  let start = 0;
  while (start < old.length && start < incoming.length && old[start] === incoming[start]) start++;
  let oldEnd = old.length;
  let newEnd = incoming.length;
  while (oldEnd > start && newEnd > start && old[oldEnd - 1] === incoming[newEnd - 1]) {
    oldEnd--;
    newEnd--;
  }
  const before = old.slice(0, start).filter((_, index) => !locked.has(index));
  const after = old.slice(oldEnd).filter((_, index) => !locked.has(oldEnd + index));
  const inserted = incoming
    .slice(start, newEnd)
    .filter(
      (char, index) =>
        !(
          oldEnd > start &&
          start + index < oldEnd &&
          locked.has(start + index) &&
          char.toLowerCase() === template[start + index].toLowerCase()
        ),
    );
  const editable = [...before, ...inserted, ...after];
  const chars: string[] = [];
  const lastLocked = Math.max(-1, ...locked);
  let used = 0;
  let caret = 0;
  const editableCaret = before.length + inserted.length;
  for (let index = 0; index <= lastLocked || used < editable.length; index++) {
    if (locked.has(index)) chars.push(template[index]);
    else {
      chars.push(editable[used++] ?? " ");
      if (used === editableCaret) caret = index + 1;
    }
  }
  while (locked.has(caret)) caret++;
  return { value: chars.join(""), caret: Math.min(caret, chars.length) };
}
