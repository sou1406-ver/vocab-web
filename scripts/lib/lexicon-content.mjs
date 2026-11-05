const object = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const text = (v) => typeof v === "string" && v.trim().length > 0 && v.length <= 3000;
const id = (v) => text(v) && /^[a-z0-9][a-z0-9:-]*$/.test(v) && !["constructor", "prototype", "__proto__"].includes(v);
const strings = (v) => Array.isArray(v) && v.every(text);

/** Validate authoring data before filtering it for publication. */
export function validateLexicon(value) {
  if (!object(value) || value.version !== 1 || !Array.isArray(value.entries)) throw new Error("Invalid lexicon");
  const seen = new Set();
  for (const entry of value.entries) {
    if (!object(entry) || !id(entry.id) || !text(entry.text) || seen.has(entry.id) || "pos" in entry)
      throw new Error(`Invalid lexeme: ${entry?.id}`);
    seen.add(entry.id);
    if (
      entry.core !== undefined &&
      (!object(entry.core) ||
        !text(entry.core.meaning) ||
        (entry.core.image !== undefined && !text(entry.core.image)) ||
        (entry.core.note !== undefined && !text(entry.core.note)))
    )
      throw new Error(`Invalid core: ${entry.id}`);
    if (!Array.isArray(entry.senses) || !entry.senses.length) throw new Error(`Missing senses: ${entry.id}`);
    const senses = new Set();
    for (const sense of entry.senses) {
      if (
        !object(sense) ||
        !id(sense.id) ||
        senses.has(sense.id) ||
        !["n", "v", "adj", "adv", "prep", "conj", "phrase"].includes(sense.pos) ||
        !["draft", "reviewed"].includes(sense.status) ||
        ![sense.meaning, sense.explanation, sense.definition].every(text) ||
        !Array.isArray(sense.examples) ||
        !sense.examples.length ||
        !sense.examples.every((e) => object(e) && text(e.text) && text(e.translation)) ||
        ![sense.patterns, sense.synonyms, sense.antonyms].every(strings) ||
        !Array.isArray(sense.sources) ||
        !sense.sources.length ||
        !sense.sources.every(
          (s) => object(s) && ["book", "dictionary", "editorial"].includes(s.kind) && text(s.reference),
        )
      )
        throw new Error(`Invalid sense: ${entry.id}/${sense?.id}`);
      senses.add(sense.id);
    }
  }
  return value;
}

/** Compile authored, book-selected senses into backward-compatible word groups. */
export function compileLexicon(words, source, bindings, bookId) {
  validateLexicon(source);
  if (!object(bindings) || bindings.version !== 1 || !Array.isArray(bindings.items))
    throw new Error("Invalid sense bindings");
  const entries = new Map(source.entries.map((e) => [e.id, e]));
  const ids = new Set(words.map((w) => w.id));
  const byWord = new Map();
  for (const binding of bindings.items) {
    const entry = entries.get(binding.lexemeId);
    if (
      !ids.has(binding.wordId) ||
      byWord.has(binding.wordId) ||
      !entry ||
      !Array.isArray(binding.required) ||
      !binding.required.length ||
      new Set(binding.required).size !== binding.required.length ||
      !binding.required.every((s) => entry.senses.some((sense) => sense.id === s && sense.status === "reviewed"))
    )
      throw new Error(`Invalid required senses: ${binding.wordId}`);
    byWord.set(binding.wordId, binding);
  }
  return words.map((word) => {
    const binding = byWord.get(word.id);
    if (!binding) return word;
    const entry = entries.get(binding.lexemeId);
    if (entry.text !== word.text) throw new Error(`Lexeme text mismatch: ${word.id}`);
    const senses = entry.senses.filter((s) => s.status === "reviewed");
    const primary = senses.find((s) => s.id === binding.required[0]);
    const learningItems = binding.required.map((senseId, index) => ({
      id: index ? `${bookId}:${word.id}:${senseId}` : word.id,
      senseId,
    }));
    return {
      ...word,
      pos: primary.pos,
      meaning: primary.meaning,
      definition: primary.definition,
      examples: primary.examples,
      synonyms: primary.synonyms,
      antonyms: primary.antonyms,
      lexeme: { ...entry, senses },
      senseId: primary.id,
      groupWordId: word.id,
      learningItems,
    };
  });
}

// Lookup-only explanations and editorial metadata do not invalidate active study sessions.
export function learningFingerprintPayload(payload) {
  return {
    ...payload,
    words: payload.words.map((word) => {
      if (!word.lexeme) return word;
      const { lexeme, ...flat } = word;
      return {
        ...flat,
        lexeme: {
          id: lexeme.id,
          text: lexeme.text,
          senses: word.learningItems.map((item) => {
            const {
              status: _status,
              sources: _sources,
              review: _review,
              ...content
            } = lexeme.senses.find((sense) => sense.id === item.senseId);
            return content;
          }),
        },
      };
    }),
  };
}
