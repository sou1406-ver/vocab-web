export interface RootBookLink {
  wordId: string;
  match?: string;
  lesson?: number;
}
export interface RootFamilyWord {
  text: string;
  pos: string;
  meaning: string;
  book?: RootBookLink;
}
export interface RootPart {
  text: string;
  role: "prefix" | "root" | "suffix" | "word";
}
export interface RootWord extends RootFamilyWord {
  parts: RootPart[];
  logic: string;
  family: RootFamilyWord[];
}
export interface RootEntry {
  id: string;
  forms: string[];
  origin: string;
  meaning: string;
  image: string;
  note?: string;
  words: RootWord[];
}
export interface RootsContent {
  version: number;
  source?: string;
  affixes: Record<string, string>;
  roots: RootEntry[];
}
