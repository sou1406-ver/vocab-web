"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useStore } from "zustand";
import { createAppStore, connectBrowserStore } from "./store";

const StoreContext = createContext<ReturnType<typeof createAppStore> | null>(null);
export function AppProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createAppStore);
  useEffect(() => {
    void store.getState().init();
    return connectBrowserStore(store);
  }, [store]);
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}
export function useApp() {
  const store = useContext(StoreContext);
  if (!store) throw new Error("Thiếu AppProvider.");
  return useStore(store);
}
