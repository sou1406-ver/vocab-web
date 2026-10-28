"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useStore } from "zustand";
import { createAppStore, connectBrowserStore } from "./store";
import { CloudProvider } from "./cloud-provider";

const StoreContext = createContext<ReturnType<typeof createAppStore> | null>(null);
export function AppProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createAppStore);
  useEffect(() => {
    return connectBrowserStore(store);
  }, [store]);
  return (
    <StoreContext.Provider value={store}>
      <CloudProvider store={store}>{children}</CloudProvider>
    </StoreContext.Provider>
  );
}
export function useApp() {
  const store = useContext(StoreContext);
  if (!store) throw new Error("Thiếu AppProvider.");
  return useStore(store);
}
