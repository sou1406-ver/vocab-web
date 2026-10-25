export function singleWordMatch(sentence: string, target: string): { start: number; end: number } | null {
  if (!target.trim()) return null;
  const escaped = target.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = [...sentence.matchAll(new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "giu"))];
  return matches.length === 1 ? { start: matches[0].index!, end: matches[0].index! + matches[0][0].length } : null;
}
