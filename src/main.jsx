import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";
import { runMigrations } from "./lib/storage.js";
import { registerSW } from "virtual:pwa-register";

// Stamp storage metadata before anything reads it.
runMigrations();

// registerType "autoUpdate": a new version installs and reloads the page by itself.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  registerSW({ immediate: true });
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
