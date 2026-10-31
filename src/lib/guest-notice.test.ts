import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => vi.resetModules());
afterEach(() => vi.unstubAllGlobals());

describe("Guest notice preference", () => {
  it("does not access browser storage during server rendering", async () => {
    const notice = await import("./guest-notice");
    expect(notice.hasAcknowledgedGuestNotice()).toBe(false);
  });
  it("persists acknowledgement independently from learning snapshots", async () => {
    const values = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => values.get(key),
        setItem: (key: string, value: string) => values.set(key, value),
      },
    });
    const notice = await import("./guest-notice");
    expect(notice.hasAcknowledgedGuestNotice()).toBe(false);
    notice.acknowledgeGuestNotice();
    vi.resetModules();
    expect((await import("./guest-notice")).hasAcknowledgedGuestNotice()).toBe(true);
    expect([...values.keys()]).toEqual(["vocab:guest-notice:v1"]);
  });
  it("lets guests continue when storage is blocked and remembers within the page", async () => {
    vi.stubGlobal("window", {
      get localStorage() {
        throw new Error("blocked");
      },
    });
    const notice = await import("./guest-notice");
    expect(notice.hasAcknowledgedGuestNotice()).toBe(false);
    expect(() => notice.acknowledgeGuestNotice()).not.toThrow();
    expect(notice.hasAcknowledgedGuestNotice()).toBe(true);
  });
});
