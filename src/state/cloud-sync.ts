import type { StoreApi } from "zustand/vanilla";
import type { AppState } from "./store";
import { readAccount, updateAccount } from "../data/repository";
import { generationOf, materialize, type CommittedChange } from "../data/sync";
import type { CloudTransport } from "../lib/firebase";

export type SyncStatus = "connecting" | "syncing" | "synced" | "offline" | "error" | "conflict";
export function connectAccountSync(
  store: StoreApi<AppState>,
  transport: CloudTransport,
  profile: string,
  report: (status: SyncStatus, error?: unknown) => void,
) {
  let active = true;
  let flushing = false;
  let received = false;
  let failed = false;
  let networkAvailable = navigator.onLine;
  const current = () => active && store.getState().profileKey === profile;
  const refresh = (data: AppState["data"]) => {
    if (current() && data.revision > store.getState().data.revision) store.setState({ data });
  };
  const failure = (error: unknown) => {
    if (!current()) return;
    failed = true;
    report(
      error instanceof Error && /khôi phục/.test(error.message) ? "conflict" : networkAvailable ? "error" : "offline",
      error,
    );
  };
  const receive = async (entries: CommittedChange[]) => {
    if (!current()) return;
    const result = await updateAccount(profile, (record) => {
      const byId = new Map(record.confirmed.map((entry) => [entry.change.id, entry]));
      entries.forEach((entry) => byId.set(entry.change.id, entry));
      const confirmed = [...byId.values()].sort((a, b) => a.order - b.order);
      const pending = record.pending.filter((change) => !byId.has(change.id));
      // Persist the new remote generation even during a conflict, keeping the local copy/export intact.
      try {
        const projected = materialize(confirmed, pending);
        const restored = generationOf(confirmed) !== generationOf(record.confirmed);
        return {
          ...record,
          confirmed,
          pending,
          snapshot: { ...projected, session: restored ? null : record.snapshot.session },
        };
      } catch (error) {
        if (error instanceof Error && /khôi phục/.test(error.message)) return { ...record, confirmed, pending };
        throw error;
      }
    });
    refresh(result.snapshot);
    if (
      result.pending.some((change) => change.generation !== generationOf(result.confirmed) && change.kind !== "restore")
    ) {
      // materialize checks pending restore chains as well.
      materialize(result.confirmed, result.pending);
    }
    return result;
  };
  const flush = async () => {
    if (!current() || flushing || !received || !networkAvailable) return;
    flushing = true;
    try {
      while (current() && networkAvailable) {
        const record = await readAccount(profile);
        if (!current()) break;
        materialize(record.confirmed, record.pending);
        const change = record.pending[0];
        if (!change) {
          report("synced");
          failed = false;
          break;
        }
        report("syncing");
        const committed = await transport.append(change);
        if (!current()) break;
        await receive([committed]);
      }
    } catch (error) {
      failure(error);
    } finally {
      flushing = false;
    }
  };
  let unsubscribe: (() => void) | undefined;
  let subscription = 0;
  const subscribe = () => {
    unsubscribe?.();
    const ticket = ++subscription;
    unsubscribe = transport.subscribe(
      (entries) => {
        if (ticket !== subscription) return;
        void receive(entries)
          .then(() => {
            if (ticket !== subscription) return;
            received = true;
            failed = false;
            return flush();
          })
          .catch(failure);
      },
      (error) => {
        if (ticket === subscription) failure(error);
      },
    );
  };
  subscribe();
  const stopStore = store.subscribe((state, previous) => {
    if (state.data.revision !== previous.data.revision && current() && !failed) void flush();
  });
  const retry = () => {
    networkAvailable = navigator.onLine;
    if (!networkAvailable) {
      report("offline");
      return;
    }
    if (failed || !received) {
      failed = false;
      subscribe();
    } else void flush();
  };
  const offline = () => {
    networkAvailable = false;
    report("offline");
  };
  window.addEventListener("online", retry);
  window.addEventListener("offline", offline);
  const timer = window.setInterval(retry, 30_000);
  report(networkAvailable ? "connecting" : "offline");
  return {
    retry,
    stop: () => {
      active = false;
      subscription++;
      unsubscribe?.();
      stopStore();
      clearInterval(timer);
      window.removeEventListener("online", retry);
      window.removeEventListener("offline", offline);
    },
  };
}
