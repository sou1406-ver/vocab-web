import { describe, expect, it, vi } from "vitest";
import { createAppStore } from "./store";
import { changeSnapshot, readSnapshot } from "../data/repository";
import { beginSession, emptySnapshot, finishSession } from "../domain/learning";
import { catalog } from "../data/catalog";

vi.mock("../data/repository", () => ({ readSnapshot: vi.fn(), changeSnapshot: vi.fn() }));

describe("App store isolation", () => {
  it("creates independent stores for separate React trees/SSR requests", () => {
    const first = createAppStore();
    const second = createAppStore();
    first.setState({ ready: true, error: "first only" });
    expect(second.getState().ready).toBe(false);
    expect(second.getState().error).toBe("");
    expect(first.getState().data).not.toBe(second.getState().data);
  });
  it("refuses a stale tab ending a different session started in another tab", async () => {
    const displayed = beginSession(emptySnapshot(), catalog, [catalog.words[0]], "learn", "A", "a", 1);
    let persisted = beginSession(finishSession(displayed, true, 2), catalog, [catalog.words[1]], "learn", "B", "b", 3);
    vi.mocked(changeSnapshot).mockImplementation(async (reduce) => {
      persisted = reduce(persisted);
      return persisted;
    });
    vi.mocked(readSnapshot).mockImplementation(async () => persisted);
    const staleTab = createAppStore();
    staleTab.setState({ ready: true, data: displayed });
    expect(await staleTab.getState().finish()).toBe(false);
    expect(persisted.session).toMatchObject({ id: "b", phase: "learn" });
    expect(persisted.history.map((item) => item.id)).toEqual(["a"]);
    expect(staleTab.getState().error).toContain("Lượt học đã thay đổi");
  });
});
