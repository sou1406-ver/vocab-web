import { describe, expect, it, vi } from "vitest";
import { readAccount } from "./repository";
import { readSyncedCultivatorSummary } from "./cultivation-summary";
import { newAccount, importChange } from "./sync";
import { emptySnapshot } from "../domain/learning";
import { defaultBook } from "./catalog";

vi.mock("./repository", () => ({ readAccount: vi.fn() }));

describe("Confirmed leaderboard summaries", () => {
  const word = defaultBook.catalog.words[0];
  const p = {
    startedAt: 1,
    startedDay: "2026-10-31",
    box: 1,
    dueAt: 2,
    correct: 1,
    incorrect: 0,
    tested: true,
    policyVersion: 1 as const,
  };
  it("blocks publication while a fresh local answer is still pending, even if the UI status lags", async () => {
    const account = newAccount();
    account.snapshot.progress[word.id] = p;
    account.pending = [importChange(account.snapshot, "pending", "device", "initial")];
    vi.mocked(readAccount).mockResolvedValue(account);
    await expect(readSyncedCultivatorSummary("alice")).rejects.toThrow(/đồng bộ/);
    expect(readAccount).toHaveBeenCalledWith("user:alice");
  });
  it("derives count and avatar from confirmed history rather than a possibly newer local snapshot", async () => {
    const confirmed = emptySnapshot();
    confirmed.progress[word.id] = p;
    confirmed.settings.avatarSeed = "notionists-05";
    const account = newAccount();
    account.confirmed = [
      { change: importChange(confirmed, "confirmed", "device", "initial"), order: 1, committedAt: 1 },
    ];
    account.snapshot.settings.avatarSeed = "notionists-20";
    vi.mocked(readAccount).mockResolvedValue(account);
    await expect(readSyncedCultivatorSummary("alice")).resolves.toEqual({ count: 1, avatar: 4 });
  });
});
