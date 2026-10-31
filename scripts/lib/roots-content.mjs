const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const text = (value) => typeof value === "string" && value.trim().length > 0;

/**
 * @param {unknown} value
 * @param {ReadonlySet<string>} wordIds
 * @returns {import("../../src/domain/roots").RootsContent}
 */
export function validateRootsContent(value, wordIds) {
  if (!object(value) || value.version !== 1 || !object(value.affixes) || !Array.isArray(value.roots))
    throw new Error("Invalid roots content");
  for (const [affix, meaning] of Object.entries(value.affixes))
    if (!text(affix) || !text(meaning)) throw new Error(`Invalid affix: ${affix}`);
  const seen = new Set();
  const validateWord = (word) => {
    if (!object(word) || ![word.text, word.pos, word.meaning].every(text)) throw new Error("Invalid root word");
    if (word.book !== undefined) {
      if (!object(word.book) || !text(word.book.wordId) || !wordIds.has(word.book.wordId))
        throw new Error(`Unknown book word: ${word.book?.wordId}`);
    }
  };
  for (const root of value.roots) {
    if (!object(root) || !text(root.id) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(root.id))
      throw new Error("Invalid root id");
    if (seen.has(root.id)) throw new Error(`Duplicate root id: ${root.id}`);
    seen.add(root.id);
    if (
      ![root.origin, root.meaning, root.image].every(text) ||
      !Array.isArray(root.forms) ||
      !root.forms.length ||
      !root.forms.every(text) ||
      !Array.isArray(root.words) ||
      !root.words.length ||
      (root.note !== undefined && !text(root.note))
    )
      throw new Error(`Invalid root: ${root.id}`);
    for (const word of root.words) {
      validateWord(word);
      if (!text(word.logic) || !Array.isArray(word.parts) || !word.parts.length || !Array.isArray(word.family))
        throw new Error(`Invalid analysis for ${word.text}`);
      for (const part of word.parts) {
        if (!object(part) || !text(part.text) || !["prefix", "root", "suffix", "word"].includes(part.role))
          throw new Error(`Invalid part for ${word.text}`);
        if (
          (["prefix", "suffix"].includes(part.role) || part.text.startsWith("-") || part.text.endsWith("-")) &&
          !Object.hasOwn(value.affixes, part.text)
        )
          throw new Error(`Unknown affix ${part.text} in ${word.text}`);
      }
      word.family.forEach(validateWord);
    }
  }
  return /** @type {import("../../src/domain/roots").RootsContent} */ (value);
}
