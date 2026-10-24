import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { initCloud } from "./state/cloud";
import "./styles/base.css";
import "./styles/layout.css";
import "./features/dashboard/dashboard.css";
import "./features/vocabulary/vocabulary.css";
import "./features/learning/learning.css";
import "./features/everyday/everyday.css";
import "./styles/react.css";

const PRELOAD_RELOAD_KEY = "vocab-preload-reload-at";
const PRELOAD_RELOAD_COOLDOWN_MS = 30_000;

window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  try {
    const lastReload = Number(sessionStorage.getItem(PRELOAD_RELOAD_KEY) ?? 0);
    if (lastReload && Date.now() - lastReload < PRELOAD_RELOAD_COOLDOWN_MS) return;
    sessionStorage.setItem(PRELOAD_RELOAD_KEY, String(Date.now()));
    window.location.reload();
  } catch {
    // If storage is unavailable, don't risk an endless reload loop.
    console.error("Could not safely recover from a stale Vite preload.");
  }
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

void initCloud();
