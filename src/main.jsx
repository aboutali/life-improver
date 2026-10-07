import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";
import { runMigrations } from "./lib/storage.js";
import { registerSW } from "virtual:pwa-register";
import { createUpdatePolicy } from "./lib/updatePolicy.js";

// Stamp storage metadata before anything reads it.
runMigrations();

// registerType "prompt": a new version installs and waits. It is applied (the
// page reloads) only at a safe moment, so unsaved input is never lost.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  const policy = createUpdatePolicy({ apply: () => updateSW(true) });
  const updateSW = registerSW({ immediate: true, onNeedRefresh: policy.onNeedRefresh });
  window.addEventListener("hashchange", policy.onHashChange);
  document.addEventListener("visibilitychange", () =>
    policy.onVisibilityChange(document.visibilityState)
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
