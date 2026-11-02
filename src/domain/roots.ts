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
/** Words grouped under one prefix (e.g. pre-), shown on that prefix's page. */
export interface PrefixFamily {
  affix: string;
  meaning: string;
  image: string;
  note?: string;
  words: RootWord[];
}
export interface ParticleSense {
  example: string;
  meaning: string;
  logic: string;
}
/** A small word such as "on" or "off": one core image that explains its many uses. */
export interface Particle {
  word: string;
  core: string;
  image: string;
  note?: string;
  senses: ParticleSense[];
}
export interface RootsContent {
  version: number;
  source?: string;
  affixes: Record<string, string>;
  roots: RootEntry[];
  prefixFamilies?: PrefixFamily[];
  particles?: Particle[];
}
