import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { initCloud } from "./state/cloud";
import "./styles/style.css";
import "./styles/react.css";

window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  window.location.reload();
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

void initCloud();
