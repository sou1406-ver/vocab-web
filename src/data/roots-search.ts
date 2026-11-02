export type RootsKind = "root" | "prefix" | "particle" | "core";
export interface RootsCard {
  kind: RootsKind;
  key: string;
  title: string;
  meaning: string;
  href: string;
  count: string;
  /** Every word and meaning the card covers, so "kéo" or "attract" both find the tract root. */
  search: string;
}

// Accent-free lower case, so learners can type without Vietnamese diacritics.
export const foldText = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").toLowerCase().replace(/\s+/g, " ").trim();

export function filterRootsCards(cards: RootsCard[], query: string, kind: RootsKind | "all") {
  const words = foldText(query).split(" ").filter(Boolean);
  return cards.filter(
    (card) => (kind === "all" || card.kind === kind) && words.every((word) => card.search.includes(word)),
  );
}
