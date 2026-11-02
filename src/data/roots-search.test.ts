import { describe, expect, it } from "vitest";
import { filterRootsCards, foldText, type RootsCard } from "./roots-search";

const card = (kind: RootsCard["kind"], key: string, text: string): RootsCard => ({
  kind,
  key,
  title: key,
  meaning: "",
  href: `/${key}`,
  count: "",
  search: foldText(text),
});
const cards = [
  card("root", "tract", "tract kéo attract thu hút attraction"),
  card("root", "spect", "spect pect nhìn inspect kiểm tra"),
  card("particle", "by", "by ở bên cạnh"),
];

describe("roots explorer search", () => {
  it("matches without Vietnamese accents and through family words", () => {
    expect(filterRootsCards(cards, "keo", "all").map((item) => item.key)).toEqual(["tract"]);
    expect(filterRootsCards(cards, "ATTRACTION", "all").map((item) => item.key)).toEqual(["tract"]);
    expect(filterRootsCards(cards, "kiểm  tra", "all").map((item) => item.key)).toEqual(["spect"]);
  });
  it("narrows by kind and shows everything for an empty query", () => {
    expect(filterRootsCards(cards, "", "all")).toHaveLength(3);
    expect(filterRootsCards(cards, "", "particle").map((item) => item.key)).toEqual(["by"]);
    expect(filterRootsCards(cards, "tract", "particle")).toEqual([]);
  });
});
