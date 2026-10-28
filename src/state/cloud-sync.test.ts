import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAppStore } from "./store";
import { connectAccountSync } from "./cloud-sync";
import { createChange, newAccount, type AccountRecord, type CommittedChange } from "../data/sync";
import type { CloudTransport } from "../lib/firebase";
import { emptySnapshot } from "../domain/learning";

const memory = vi.hoisted(() => new Map<string, AccountRecord>());
vi.mock("../data/repository", () => ({
  readSnapshot: vi.fn(async (profile = "guest") => memory.get(profile)?.snapshot ?? emptySnapshot()),
  changeSnapshot: vi.fn(),
  readAccount: vi.fn(async (profile: string) => structuredClone(memory.get(profile) ?? newAccount())),
  updateAccount: vi.fn(async (profile: string, reduce: (record: AccountRecord) => AccountRecord) => {
    const before = memory.get(profile) ?? newAccount();
    const next = reduce(structuredClone(before));
    next.snapshot.revision = before.snapshot.revision + 1;
    memory.set(profile, next);
    return structuredClone(next);
  }),
}));

describe("Durable account outbox", () => {
  const stops: (() => void)[] = [];
  beforeEach(() => {
    memory.clear();
    vi.stubGlobal("navigator", { onLine: true });
    vi.stubGlobal("window", Object.assign(new EventTarget(), { setInterval, clearInterval }));
  });
  afterEach(() => {
    stops.splice(0).forEach((stop) => stop());
    vi.unstubAllGlobals();
  });
  function setup(append?: CloudTransport["append"]) {
    const store = createAppStore();
    store.setState({ profileKey: "user:a", ready: true });
    let deliver!: (entries: CommittedChange[]) => void;
    let fail!: (error: unknown) => void;
    let order = 0;
    const transport: CloudTransport = {
      subscribe: vi.fn((next, error) => {
        deliver = next;
        fail = error;
        return () => {};
      }),
      append: vi.fn(append ?? (async (change) => ({ change, order: ++order, committedAt: Date.now() }))),
    };
    const report = vi.fn();
    const connection = connectAccountSync(store, transport, "user:a", report);
    stops.push(connection.stop);
    return {
      store,
      transport,
      report,
      connection,
      deliver: (entries: CommittedChange[] = []) => deliver(entries),
      fail: (error: unknown) => fail(error),
    };
  }
  function queued() {
    const record = newAccount();
    record.pending = [
      createChange(record.snapshot, { ...record.snapshot, savedWords: ["a"] }, "op", "device", "initial")!,
    ];
    memory.set("user:a", record);
    return record.pending[0];
  }
  it("uploads a durable pending change after receiving remote state and removes it only after acknowledgement", async () => {
    queued();
    const test = setup();
    expect(test.transport.append).not.toHaveBeenCalled();
    test.deliver();
    await vi.waitFor(() => expect(memory.get("user:a")!.pending).toHaveLength(0));
    expect(test.store.getState().data.savedWords).toEqual(["a"]);
    expect(memory.get("user:a")!.confirmed).toHaveLength(1);
    expect(test.transport.append).toHaveBeenCalledTimes(1);
  });
  it("retains failed writes across reconnect and retries the identical operation ID", async () => {
    queued();
    let attempts = 0;
    const test = setup(async (change) => {
      if (!attempts++) throw new Error("Network disconnected");
      return { change, order: 1, committedAt: Date.now() };
    });
    test.deliver();
    await vi.waitFor(() => expect(test.report).toHaveBeenCalledWith("error", expect.any(Error)));
    expect(memory.get("user:a")!.pending[0].id).toBe("op");
    test.connection.retry();
    test.deliver();
    await vi.waitFor(() => expect(memory.get("user:a")!.pending).toHaveLength(0));
    expect(vi.mocked(test.transport.append).mock.calls.map(([change]) => change.id)).toEqual(["op", "op"]);
  });
  it("late cloud responses cannot expose data after switching account", async () => {
    const op = queued();
    const test = setup();
    test.store.setState({ profileKey: "user:b", data: emptySnapshot() });
    test.deliver([{ change: op, order: 1, committedAt: Date.now() }]);
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(test.store.getState().data.savedWords).toBeUndefined();
    expect(memory.get("user:a")!.pending).toHaveLength(1);
  });
  it("keeps stale offline data exportable when another device restores a backup", async () => {
    queued();
    const record = memory.get("user:a")!;
    record.snapshot.savedWords = ["local-unsent"];
    const test = setup();
    const reset = {
      version: 1 as const,
      id: "reset",
      deviceId: "other",
      generation: "initial",
      kind: "restore" as const,
      patch: {},
      restored: emptySnapshot(),
    };
    test.deliver([{ change: reset, order: 1, committedAt: Date.now() }]);
    await vi.waitFor(() => expect(test.report).toHaveBeenCalledWith("conflict", expect.any(Error)));
    expect(memory.get("user:a")!.snapshot.savedWords).toEqual(["local-unsent"]);
    expect(memory.get("user:a")!.confirmed).toHaveLength(1);
    expect(test.transport.append).not.toHaveBeenCalled();
  });
  it("retry replaces a terminated initial listener", async () => {
    const test = setup();
    test.fail(new Error("Rules not deployed"));
    test.connection.retry();
    expect(test.transport.subscribe).toHaveBeenCalledTimes(2);
    test.deliver();
    await vi.waitFor(() => expect(test.report).toHaveBeenCalledWith("synced"));
  });
  it("a remote restore clears this device's old session even with an empty outbox", async () => {
    const record = newAccount();
    record.snapshot.session = {
      id: "old-session",
      contentVersion: "old",
      title: "Old",
      mode: "learn",
      questions: [{ kind: "recall", wordId: "w", prompt: "word", answer: "word" }],
      index: 0,
      phase: "question",
      feedback: null,
      startedAt: Date.now(),
    };
    memory.set("user:a", record);
    const test = setup();
    const reset = {
      version: 1 as const,
      id: "reset",
      deviceId: "other",
      generation: "initial",
      kind: "restore" as const,
      patch: {},
      restored: emptySnapshot(),
    };
    test.deliver([{ change: reset, order: 1, committedAt: Date.now() }]);
    await vi.waitFor(() => expect(memory.get("user:a")!.confirmed).toHaveLength(1));
    expect(memory.get("user:a")!.snapshot.session).toBeNull();
  });
});
