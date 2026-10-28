"use client";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { StoreApi } from "zustand/vanilla";
import type { AppState } from "./store";
import type { AccountUser } from "../lib/firebase";
import { deviceId, readAccount, readSnapshot, updateAccount } from "../data/repository";
import { generationOf, importChange, materialize } from "../data/sync";
import { connectAccountSync, type SyncStatus } from "./cloud-sync";

type FirebaseModule = typeof import("../lib/firebase");
interface CloudState {
  user: AccountUser | null;
  loading: boolean;
  working: boolean;
  status: SyncStatus;
  error: string;
  guestAvailable: boolean;
}
interface CloudActions {
  login: () => Promise<void>;
  logout: () => Promise<void>;
  decideGuest: (merge: boolean) => Promise<void>;
  retry: () => void;
  acceptRestored: () => Promise<void>;
}
const CloudContext = createContext<(CloudState & CloudActions) | null>(null);
export function CloudProvider({ store, children }: { store: StoreApi<AppState>; children: ReactNode }) {
  const [state, setState] = useState<CloudState>({
    user: null,
    loading: true,
    working: false,
    status: "connecting",
    error: "",
    guestAvailable: false,
  });
  const service = useRef<FirebaseModule | null>(null);
  const sync = useRef<ReturnType<typeof connectAccountSync> | null>(null);
  const lifetime = useRef(0);
  const action = useRef(false);
  useEffect(() => {
    let active = true;
    let request = 0;
    let unsubscribe: (() => void) | undefined;
    void import("../lib/firebase")
      .then((firebase) => {
        if (!active) return;
        service.current = firebase;
        unsubscribe = firebase.observeUser(
          (user) => {
            const ticket = ++request;
            lifetime.current++;
            sync.current?.stop();
            sync.current = null;
            setState((previous) => ({
              ...previous,
              user,
              loading: true,
              error: "",
              guestAvailable: false,
              working: false,
              status: "connecting",
            }));
            const profile = user ? `user:${user.uid}` : "guest";
            void store
              .getState()
              .switchProfile(profile)
              .then(async () => {
                if (!active || ticket !== request) return;
                if (!store.getState().ready) throw new Error(store.getState().error);
                if (user) {
                  const account = await readAccount(profile);
                  const guest = await readSnapshot();
                  if (!active || ticket !== request) return;
                  const guestAvailable =
                    !account.guestDecision &&
                    Boolean(
                      Object.keys(guest.progress).length ||
                        guest.events.length ||
                        guest.customWords.length ||
                        guest.savedWords?.length ||
                        guest.imports.length,
                    );
                  setState((previous) => ({ ...previous, loading: false, guestAvailable }));
                  sync.current = connectAccountSync(
                    store,
                    firebase.firestoreTransport(user.uid),
                    profile,
                    (status, error) => {
                      if (active && ticket === request)
                        setState((previous) => ({
                          ...previous,
                          status,
                          error: error ? firebase.cloudError(error) : "",
                        }));
                    },
                  );
                } else setState((previous) => ({ ...previous, loading: false, status: "synced" }));
              })
              .catch((error) => {
                if (active && ticket === request)
                  setState((previous) => ({ ...previous, loading: false, error: firebase.cloudError(error) }));
              });
          },
          (error) => {
            if (!active) return;
            void store.getState().switchProfile("guest");
            setState((previous) => ({ ...previous, loading: false, error: firebase.cloudError(error) }));
          },
        );
      })
      .catch(() => {
        if (!active) return;
        void store.getState().switchProfile("guest");
        setState((previous) => ({
          ...previous,
          loading: false,
          error: "Chưa tải được đăng nhập. Bạn vẫn có thể học trên máy; tải lại trang để thử lại.",
        }));
      });
    return () => {
      active = false;
      request++;
      lifetime.current++;
      unsubscribe?.();
      sync.current?.stop();
    };
  }, [store]);
  const run = async (work: (firebase: FirebaseModule) => Promise<unknown>) => {
    if (!service.current || action.current) return;
    const ticket = lifetime.current;
    action.current = true;
    setState((previous) => ({ ...previous, working: true, error: "" }));
    try {
      await work(service.current);
    } catch (error) {
      if (ticket === lifetime.current)
        setState((previous) => ({ ...previous, error: service.current!.cloudError(error) }));
    } finally {
      action.current = false;
      if (ticket === lifetime.current) setState((previous) => ({ ...previous, working: false }));
    }
  };
  const actions: CloudActions = {
    login: () => run((firebase) => firebase.loginGoogle()),
    logout: () => run((firebase) => firebase.logoutGoogle()),
    retry: () => sync.current?.retry(),
    decideGuest: (merge) =>
      run(async () => {
        const profile = store.getState().profileKey;
        const ticket = lifetime.current;
        if (!profile.startsWith("user:")) return;
        const guest = merge ? await readSnapshot() : null;
        const result = await updateAccount(profile, (record) => {
          if (record.guestDecision) return record;
          const pending = guest
            ? [
                ...record.pending,
                importChange(guest, crypto.randomUUID(), deviceId(), generationOf(record.confirmed, record.pending)),
              ]
            : record.pending;
          const data = materialize(record.confirmed, pending);
          return { ...record, pending, guestDecision: true, snapshot: { ...data, session: record.snapshot.session } };
        });
        if (ticket === lifetime.current && store.getState().profileKey === profile) {
          if (result.snapshot.revision >= store.getState().data.revision) store.setState({ data: result.snapshot });
          setState((previous) => ({ ...previous, guestAvailable: false }));
          sync.current?.retry();
        }
      }),
    acceptRestored: () =>
      run(async () => {
        const profile = store.getState().profileKey;
        const ticket = lifetime.current;
        if (!profile.startsWith("user:")) return;
        const result = await updateAccount(profile, (record) => {
          const snapshot = materialize(record.confirmed);
          return { ...record, pending: [], snapshot };
        });
        if (ticket === lifetime.current && store.getState().profileKey === profile) {
          if (result.snapshot.revision >= store.getState().data.revision) store.setState({ data: result.snapshot });
          sync.current?.retry();
        }
      }),
  };
  return <CloudContext.Provider value={{ ...state, ...actions }}>{children}</CloudContext.Provider>;
}
export function useCloud() {
  const context = useContext(CloudContext);
  if (!context) throw new Error("Thiếu CloudProvider.");
  return context;
}
