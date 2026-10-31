export const avatarSeeds = Array.from({ length: 20 }, (_, i) => `notionists-${String(i + 1).padStart(2, "0")}`);

export function avatarIndex(seed: string): number {
  const preset = avatarSeeds.indexOf(seed);
  let hash = 2166136261;
  for (const char of seed) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return preset >= 0 ? preset : (hash >>> 0) % avatarSeeds.length;
}

export function avatarSource(seed: string): string {
  const index = avatarIndex(seed);
  return `/avatars/notionists/${String(index + 1).padStart(2, "0")}.svg`;
}
