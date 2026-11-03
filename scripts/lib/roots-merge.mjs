// Merges a roots batch delta (the JSON the content builder exports per batch) into the existing roots content.
// Existing entries are never replaced, so fixes made in the repo survive new batches; anything skipped is reported.

const clone = (value) => structuredClone(value);
const key = (word) => `${word.text.toLowerCase()}|${word.pos}`;

/**
 * @param {import("../../src/domain/roots").RootsContent} content
 * @param {Record<string, any>} delta
 * @returns {{ content: import("../../src/domain/roots").RootsContent, added: string[], skipped: string[] }}
 */
export function mergeRootsBatch(content, delta) {
  const next = clone(content);
  const added = [];
  const skipped = [];

  for (const [affix, meaning] of Object.entries(delta.newAffixes ?? {})) {
    if (Object.hasOwn(next.affixes, affix)) {
      if (next.affixes[affix] !== meaning) skipped.push(`affix ${affix} (kept "${next.affixes[affix]}")`);
      continue;
    }
    next.affixes[affix] = meaning;
    added.push(`affix ${affix}`);
  }
  next.affixes = Object.fromEntries(Object.entries(next.affixes).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));

  for (const root of delta.newRoots ?? []) {
    if (next.roots.some((item) => item.id === root.id)) skipped.push(`root ${root.id} (already exists)`);
    else {
      next.roots.push(clone(root));
      added.push(`root ${root.id}`);
    }
  }

  for (const [rootId, words] of Object.entries(delta.addedWords ?? {})) {
    const root = next.roots.find((item) => item.id === rootId);
    if (!root) {
      skipped.push(`words for unknown root ${rootId}`);
      continue;
    }
    for (const word of words) {
      if (root.words.some((item) => key(item) === key(word))) skipped.push(`${rootId}: ${word.text} (already listed)`);
      else {
        root.words.push(clone(word));
        added.push(`${rootId}: ${word.text}`);
      }
    }
  }

  for (const family of delta.newPrefixFamilies ?? delta.prefixFamilies ?? []) {
    const families = (next.prefixFamilies ??= []);
    const existing = families.find((item) => item.affix === family.affix);
    if (!existing) {
      families.push(clone(family));
      added.push(`prefix family ${family.affix}`);
      continue;
    }
    for (const word of family.words)
      if (existing.words.some((item) => key(item) === key(word))) skipped.push(`${family.affix}: ${word.text}`);
      else {
        existing.words.push(clone(word));
        added.push(`${family.affix}: ${word.text}`);
      }
  }

  const addEntries = (list, items, label) => {
    for (const item of items ?? []) {
      if (list.some((entry) => entry.word === item.word)) skipped.push(`${label} ${item.word} (already exists)`);
      else {
        list.push(clone(item));
        added.push(`${label} ${item.word}`);
      }
    }
  };
  addEntries((next.particles ??= []), delta.newParticles, "particle");
  addEntries((next.coreWords ??= []), delta.newCoreWords ?? delta.coreWords, "core word");

  for (const [word, senses] of Object.entries(delta.addedParticleSenses ?? {})) {
    const particle = next.particles.find((item) => item.word === word);
    if (!particle) {
      skipped.push(`senses for unknown particle ${word}`);
      continue;
    }
    for (const sense of senses)
      if (particle.senses.some((item) => item.example === sense.example)) skipped.push(`${word}: "${sense.example}"`);
      else {
        particle.senses.push(clone(sense));
        added.push(`${word}: "${sense.example}"`);
      }
  }

  if (!next.prefixFamilies.length) delete next.prefixFamilies;
  if (!next.particles.length) delete next.particles;
  if (!next.coreWords.length) delete next.coreWords;
  return { content: next, added, skipped };
}
