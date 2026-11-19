import { compileCanonical } from "./canonical-lexicon.mjs";
import { compileLexicon } from "./lexicon-content.mjs";

export async function readBookLexicon(read, words, bookId) {
  const letters = await Promise.all(
    Array.from("abcdefghijklmnopqrstuvwxyz", (letter) => read("content/lexicon/" + letter + ".json")),
  );
  for (const [index, file] of letters.entries()) {
    const letter = String.fromCharCode(97 + index);
    if (
      file.version !== 2 ||
      !Array.isArray(file.entries) ||
      file.entries.some((e) => !e.text?.toLowerCase().startsWith(letter))
    )
      throw new Error("Invalid lexicon letter: " + letter);
  }
  const entries = letters.flatMap((file) => file.entries);
  const entryIds = new Set(entries.map((e) => e.id));
  const bindings = await read(`content/books/${bookId}/senses.json`);
  if (
    bindings.version !== 2 ||
    !Array.isArray(bindings.items) ||
    new Set(bindings.items.map((b) => b.wordId)).size !== bindings.items.length
  )
    throw new Error("Invalid book bindings");
  const canonicalBindings = { version: 2, items: bindings.items.filter((b) => entryIds.has(b.entryId)) };
  const legacyBindings = { version: 2, items: bindings.items.filter((b) => !entryIds.has(b.entryId)) };
  const rootIds = (await read("content/roots/roots.json")).roots.map((root) => root.id);
  const canonical = compileCanonical(words, { version: 2, entries }, canonicalBindings, bookId, new Set(rootIds));
  const boundIds = new Set(bindings.items.map((b) => b.wordId));
  const lexiconSource = {
    flatWords: words.filter((w) => boundIds.has(w.id)),
    entries,
    bindings: canonicalBindings,
    rootIds,
  };
  return {
    lexiconSource,
    lexiconReport: canonical.report,
    words: compileLexicon(canonical.words, await read("content/lexicon/pilot.json"), legacyBindings, bookId),
  };
}
