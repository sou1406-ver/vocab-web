import type { ReactNode } from "react";
import { wordsById } from "../../data/catalog";
import { VocabularyTerm } from "./VocabularyTerm";

// Server component: resolve authored IDs before passing the selected word to the client island.
export function Term({ itemId, label, children }: { itemId: string; label: string; children: ReactNode }) {
  const word = wordsById.get(itemId);
  if (!word) throw new Error(`Liên kết từ bị hỏng: ${itemId}`);
  return (
    <VocabularyTerm word={word} label={label}>
      {children}
    </VocabularyTerm>
  );
}
