export interface AccountProfile {
  version: 1;
  username: string;
  hiddenLeaderboard: boolean;
  updatedAt: number;
}

export const validUsername = (value: string) => /^[a-z0-9_]{3,20}$/.test(value);

export function readAccountProfile(value: unknown): AccountProfile {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Hồ sơ tài khoản không hợp lệ.");
  const raw = value as Record<string, unknown>;
  if (
    Object.keys(raw).some((key) => !["version", "username", "hiddenLeaderboard", "updatedAt"].includes(key)) ||
    raw.version !== 1 ||
    typeof raw.username !== "string" ||
    !validUsername(raw.username) ||
    typeof raw.hiddenLeaderboard !== "boolean" ||
    typeof raw.updatedAt !== "number" ||
    !Number.isFinite(raw.updatedAt) ||
    raw.updatedAt < 0
  )
    throw new Error("Hồ sơ tài khoản không hợp lệ.");
  return { version: 1, username: raw.username, hiddenLeaderboard: raw.hiddenLeaderboard, updatedAt: raw.updatedAt };
}
