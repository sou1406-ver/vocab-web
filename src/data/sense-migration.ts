import type { Snapshot, Word } from "../domain/types";
import { learningItems } from "../domain/lexicon";

// Versioned identity migration: old word IDs become the primary learning-item aliases.
// Snapshot bytes are retained; old mixed-sense events are never relabelled as sense-specific evidence.
export function senseMigration(words: readonly Word[]) {
  const items = new Map<string, Word>();
  for (const word of words) {
    const projections = learningItems(word);
    if (!projections.length || projections[0].id !== word.id) throw new Error(`Invalid legacy alias: ${word.id}`);
    for (const item of projections) {
      if (items.has(item.id)) throw new Error(`Duplicate learning item: ${item.id}`);
      items.set(item.id, item);
    }
  }
  return { version: 1 as const, items };
}
export function migrateLearningSnapshot(snapshot: Snapshot, words: readonly Word[]) {
  senseMigration(words); // Validate the alias manifest before accepting this content version.
  return snapshot;
}
