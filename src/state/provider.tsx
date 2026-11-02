"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useStore } from "zustand";
import { createAppStore, connectBrowserStore, memoryPersistence } from "./store";
import { CloudProvider } from "./cloud-provider";
import { startContentEdits } from "./content-sync";
import type { Snapshot } from "../domain/types";

const StoreContext = createContext<ReturnType<typeof createAppStore> | null>(null);
const SandboxContext = createContext(false);
export function AppProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createAppStore);
  useEffect(() => {
    // Admin content edits (cached) apply before the store opens, so screens never show stale words.
    startContentEdits(store);
    void store.getState().init();
    return connectBrowserStore(store);
  }, [store]);
  return (
    <StoreContext.Provider value={store}>
      <CloudProvider store={store}>{children}</CloudProvider>
    </StoreContext.Provider>
  );
}
// Screens inside read and write an in-memory snapshot: no IndexedDB, no cloud sync, no other tabs.
export function SandboxProvider({ initial, children }: { initial: Snapshot; children: ReactNode }) {
  const [store] = useState(() => createAppStore(memoryPersistence(initial)));
  useEffect(() => {
    void store.getState().init();
  }, [store]);
  return (
    <SandboxContext.Provider value={true}>
      <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
    </SandboxContext.Provider>
  );
}
export function useApp() {
  const store = useContext(StoreContext);
  if (!store) throw new Error("Thiếu AppProvider.");
  return useStore(store);
}
export const useSandbox = () => useContext(SandboxContext);
// The raw store, for code that must act outside React renders (e.g. applying freshly saved content edits).
export function useAppStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error("Thiếu AppProvider.");
  return store;
}
