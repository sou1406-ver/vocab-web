import { describe, expect, it } from "vitest";
import { validUsername, readAccountProfile } from "./account";

describe("Account usernames", () => {
  it("accepts only three to twenty lowercase letters, digits and underscores", () => {
    for (const name of ["sou", "dao_huu_01", "a".repeat(20), "123"]) expect(validUsername(name)).toBe(true);
    for (const name of [
      "",
      "ab",
      "a".repeat(21),
      "Sou",
      "tên",
      "a-b",
      "a.b",
      " sou",
      "sou ",
      "sou@example.com",
      "a\nb",
    ])
      expect(validUsername(name)).toBe(false);
  });
  it("requires a complete profile and never uses a Google name as a username", () => {
    const profile = { version: 1, username: "dao_huu", hiddenLeaderboard: false, updatedAt: 1 };
    expect(readAccountProfile(profile)).toEqual(profile);
    for (const patch of [
      { username: "Google Name" },
      { username: undefined },
      { hiddenLeaderboard: undefined },
      { hiddenLeaderboard: "true" },
      { email: "private@example.com" },
    ])
      expect(() => readAccountProfile({ ...profile, ...patch })).toThrow();
  });
});
