/** @param {import("../../src/domain/types").Word} word
 * @returns {import("../../src/domain/types").Word[]} */
export function learningItems(word) {
  if (!word.lexeme || !word.learningItems) return [word];
  return word.learningItems.flatMap((item) => {
    const sense = word.lexeme.senses.find((s) => s.id === item.senseId && s.status === "reviewed");
    return sense
      ? [
          {
            ...word,
            ...sense,
            id: item.id,
            text: word.text,
            senseId: sense.id,
            groupWordId: word.groupWordId ?? word.id,
          },
        ]
      : [];
  });
}
