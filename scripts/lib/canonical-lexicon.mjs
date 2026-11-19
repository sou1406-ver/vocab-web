const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const text = (value) => typeof value === "string" && value.trim().length > 0 && value.length <= 3000;
const strings = (value) => Array.isArray(value) && value.every(text);
const ipa = (value) => object(value) && text(value.us) && text(value.uk);
const slug = (value) =>
  text(value) && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && !["constructor", "prototype"].includes(value);
function check(condition, message) {
  if (!condition) throw new Error(message);
}
function sourcesValid(value) {
  return (
    Array.isArray(value) &&
    value.every(
      (source) =>
        object(source) &&
        ["book", "editorial", "dictionary"].includes(source.kind) &&
        text(source.reference) &&
        (source.kind !== "dictionary" || /^https?:\/\/[^\s/]+(?:\/[^\s]*)?$/.test(source.reference)),
    )
  );
}
export function inspectCanonical(source, rootIds = new Set()) {
  check(source?.version === 2 && Array.isArray(source.entries), "Invalid canonical lexicon");
  const report = {
    entries: source.entries.length,
    reviewed: 0,
    draft: 0,
    missingByStatus: { draft: {}, reviewed: {} },
    missing: [],
    pendingBindings: [],
  };
  const ids = new Set();
  for (const entry of source.entries) {
    check(
      object(entry) &&
        text(entry.text) &&
        !/[\/~\p{Cc}]/u.test(entry.text) &&
        entry.text === entry.text.trim() &&
        text(entry.id),
      "Invalid entry",
    );
    check(entry.id.length <= 500, "Entry ID exceeds 500 characters");
    const base = "en:" + entry.text.toLowerCase();
    const suffix = entry.id.slice(base.length);
    check(
      entry.id.startsWith(base) && (suffix === "" || /^~(?:[2-9]|[1-9]\d+)$/.test(suffix)) && !ids.has(entry.id),
      "Invalid or duplicate entry ID: " + entry.id,
    );
    ids.add(entry.id);
    check(ipa(entry.ipa), entry.id + ": missing IPA");
    check(
      strings(entry.forms) &&
        Array.isArray(entry.family) &&
        entry.family.every((f) => object(f) && [f.text, f.pos, f.meaning].every(text)),
      entry.id + ": invalid forms/family",
    );
    check(
      entry.rootIds === undefined || (strings(entry.rootIds) && entry.rootIds.every((id) => rootIds.has(id))),
      entry.id + ": unknown rootIds",
    );
    check(
      entry.core === undefined ||
        (object(entry.core) &&
          text(entry.core.meaning) &&
          [entry.core.image, entry.core.note].every((v) => v === undefined || text(v))),
      entry.id + ": invalid core",
    );
    check(
      Array.isArray(entry.senses) && entry.senses.some((s) => s?.rank === "primary"),
      entry.id + ": missing primary sense",
    );
    const senses = new Set();
    for (const s of entry.senses) {
      const key = entry.id + "/" + s?.id;
      check(object(s) && slug(s.id) && !senses.has(s.id), key + ": invalid or duplicate sense ID");
      check(s.id.length <= 500, key + ": sense ID exceeds 500 characters");
      senses.add(s.id);
      check(
        ["primary", "secondary"].includes(s.rank) && ["draft", "reviewed"].includes(s.status),
        key + ": invalid rank/status",
      );
      check(s.ipa === undefined || ipa(s.ipa), key + ": invalid IPA");
      check(s.noSynonyms === undefined || s.noSynonyms === true, key + ": invalid noSynonyms");
      check(
        s.pos === undefined || s.pos === "" || ["n", "v", "adj", "adv", "prep", "conj", "phrase"].includes(s.pos),
        key + ": invalid pos",
      );
      const missing = [];
      for (const field of ["pos", "meaningVi", "explanationVi", "definitionEn"]) {
        check(s[field] === undefined || typeof s[field] === "string", key + ": invalid " + field);
        if (!text(s[field])) missing.push(field);
      }
      for (const field of ["patterns", "synonyms", "antonyms"]) {
        check(s[field] === undefined || strings(s[field]), key + ": invalid " + field);
        if (s[field] === undefined || (field === "synonyms" && !s.synonyms.length && !s.noSynonyms))
          missing.push(field);
      }
      check(
        s.examples === undefined ||
          (Array.isArray(s.examples) &&
            s.examples.length <= 2 &&
            s.examples.every((e) => object(e) && text(e.en) && text(e.vi))),
        key + ": invalid examples",
      );
      if (!s.examples?.length) missing.push("examples");
      check(s.sources === undefined || sourcesValid(s.sources), key + ": invalid sources");
      if (!s.sources?.length) missing.push("sources");
      report[s.status]++;
      if (missing.length) {
        check(s.status === "draft", key + ": missing " + missing.join(", "));
        const counts = report.missingByStatus[s.status];
        for (const field of missing) counts[field] = (counts[field] ?? 0) + 1;
        report.missing.push({ entryId: entry.id, senseId: s.id, status: s.status, fields: missing });
      }
    }
  }
  return report;
}

function project(s, entry) {
  return {
    id: s.id,
    pos: s.pos,
    meaning: s.meaningVi,
    definition: s.definitionEn,
    explanation: s.explanationVi,
    ipa: (s.ipa ?? entry.ipa).us,
    pronunciation: s.ipa ?? entry.ipa,
    rank: s.rank,
    examples: s.examples.map(({ en, vi }) => ({ text: en, translation: vi })),
    patterns: s.patterns,
    synonyms: s.synonyms,
    antonyms: s.antonyms,
    status: s.status,
    sources: s.sources,
  };
}
export function compileCanonical(words, source, bindings, bookId, rootIds = new Set()) {
  const report = inspectCanonical(source, rootIds);
  check(bindings?.version === 2 && Array.isArray(bindings.items), "Invalid canonical bindings");
  const entries = new Map(source.entries.map((e) => [e.id, e]));
  const flat = new Map(words.map((w) => [w.id, w]));
  const resolved = new Map();
  for (const b of bindings.items) {
    const word = flat.get(b?.wordId);
    const entry = entries.get(b?.entryId);
    check(
      word &&
        !resolved.has(b.wordId) &&
        entry &&
        entry.text === word.text &&
        strings(b.taught) &&
        b.taught.length &&
        new Set(b.taught).size === b.taught.length,
      "Invalid binding: " + b?.wordId,
    );
    const senses = new Map(entry.senses.map((s) => [s.id, s]));
    for (const id of b.taught) check(senses.has(id), b.wordId + ": nonexistent taught sense " + id);
    const primary = entry.senses.filter((s) => s.rank === "primary" && s.status === "reviewed");
    const required = [...new Set([...b.taught, ...primary.map((s) => s.id)])];
    check(required.length <= 16, b.wordId + ": at most 16 required senses can be persisted");
    const learningItems = required.map((senseId, index) => ({
      id: index ? bookId + ":" + word.id + ":" + senseId : word.id,
      senseId,
    }));
    for (const item of learningItems) {
      check(
        text(item.id) && item.id.length <= 500 && !["prototype", "constructor", "__proto__"].includes(item.id),
        b.wordId + ": learning item ID must be safe and at most 500 characters",
      );
    }
    if (!primary.length || b.taught.some((id) => senses.get(id).status === "draft")) {
      report.pendingBindings.push({ wordId: word.id, entryId: entry.id, status: "chờ duyệt" });
      resolved.set(word.id, word);
      continue;
    }
    const published = entry.senses.filter((s) => s.status === "reviewed").map((s) => project(s, entry));
    const first = published.find((s) => s.id === required[0]);
    resolved.set(word.id, {
      ...word,
      pos: first.pos,
      meaning: first.meaning,
      definition: first.definition,
      ipa: first.ipa,
      family: entry.family,
      examples: first.examples,
      synonyms: first.synonyms,
      antonyms: first.antonyms,
      lexeme: {
        id: entry.id,
        text: entry.text,
        core: entry.core,
        forms: entry.forms,
        rootIds: entry.rootIds,
        pronunciation: entry.ipa,
        senses: published,
      },
      senseId: first.id,
      groupWordId: word.id,
      learningItems,
    });
  }
  return { words: words.map((w) => resolved.get(w.id) ?? w), report };
}
