export const avatarSeeds = Array.from({ length: 20 }, (_, i) => `notionists-${String(i + 1).padStart(2, "0")}`);

export function avatarSource(seed: string): string {
  const preset = avatarSeeds.indexOf(seed);
  let hash = 2166136261;
  for (const char of seed) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  const index = preset >= 0 ? preset : (hash >>> 0) % avatarSeeds.length;
  return `/avatars/notionists/${String(index + 1).padStart(2, "0")}.svg`;
}
