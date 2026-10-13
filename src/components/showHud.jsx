import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import HudHost from "./Hud.jsx";
import { registerHudHost, showHud } from "../lib/hud.js";

// Creates the HUD's own React root on the first call, outside #root, so no
// screen and no App code has to mount it. Call showHud(text, { icon }) from
// anywhere in the UI.
let host = null;

function ensureHost() {
  if (typeof document === "undefined") return;
  if (host && host.isConnected) return;
  host = document.createElement("div");
  host.setAttribute("data-hud-root", "");
  document.body.appendChild(host);
  const root = createRoot(host);
  // Synchronous, so the live region exists before the first message lands.
  flushSync(() => root.render(<HudHost />));
}

registerHudHost(ensureHost);

export { showHud };
