export type AffixRole = "prefix" | "suffix";
export const bareAffix = (text: string) =>
  text
    .trim()
    .toLowerCase()
    .replace(/^-+|-+$/g, "");
// "con-" → "prefix-con", "-ary" → "suffix-ary": URL-safe and never ambiguous between a prefix and a suffix.
export const affixSlug = (role: AffixRole, text: string) => `${role}-${bareAffix(text)}`;
export const isAffixRole = (role: string): role is AffixRole => role === "prefix" || role === "suffix";
