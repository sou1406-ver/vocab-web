import { useSyncExternalStore } from "react";

export type ThemePref = "light" | "dark" | "system";
export const THEMES: [ThemePref, "sun" | "moon" | "monitor", string][] = [
  ["light", "sun", "Sáng"],
  ["dark", "moon", "Tối"],
  ["system", "monitor", "Theo máy"],
];

const darkQuery = typeof window !== "undefined" ? window.matchMedia?.("(prefers-color-scheme: dark)") : undefined;
const listeners = new Set<() => void>();

export function themePref(): ThemePref {
  try {
    return (localStorage.getItem("vn-theme") as ThemePref) || "system";
  } catch {
    return "system";
  }
}

export function applyTheme(pref: ThemePref) {
  const dark = pref === "dark" || (pref === "system" && !!darkQuery?.matches);
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  try {
    localStorage.setItem("vn-theme", pref);
  } catch {
    /* bỏ qua */
  }
  listeners.forEach((f) => f());
}

darkQuery?.addEventListener("change", () => {
  if (themePref() === "system") applyTheme("system");
});

export const useThemePref = () =>
  useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    themePref,
    () => "system" as ThemePref,
  );
