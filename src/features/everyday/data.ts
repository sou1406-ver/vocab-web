import entriesJson from "@/data/everyday.json";

export type EverydayKind = "phrase" | "phrasal" | "idiom" | "slang";
export type UsageLevel = 0 | 1 | 2 | 3;

export interface EverydaySense {
  definition: string;
  meaning: string;
  example: string;
  exampleVi: string;
}

export interface EverydayEntry {
  id: string;
  text: string;
  kind: EverydayKind;
  usageLevel: UsageLevel;
  meaning: string;
  definition: string;
  example?: string;
  exampleVi?: string;
  usage?: string;
  otherSenses?: EverydaySense[];
}

export const EVERYDAY_ENTRIES = entriesJson as EverydayEntry[];
export const EVERYDAY_KIND_LABEL: Record<EverydayKind, string> = {
  phrase: "Cụm từ",
  phrasal: "Phrasal verb",
  idiom: "Thành ngữ",
  slang: "Từ lóng",
};
