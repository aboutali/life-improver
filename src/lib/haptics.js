import { readPrefs } from "./storage.js";

// Haptic feedback, as far as the web platform allows.
//   Android and others: navigator.vibrate with a short pulse.
//   iOS 18+ Safari: toggling a hidden <input type="checkbox" switch> through
//   its label plays the system switch haptic. It is one tick, not the full
//   UIFeedbackGenerator range, so every kind maps to the same tick there.
// Everything is feature-detected and swallowed: a haptic never throws.

const PATTERNS = {
  light: 8,
  medium: 15,
  warning: [15, 50, 15],
  success: [10, 40, 10],
};

let enabled = null; // null until first read from storage
let label = null;

export function setHapticsEnabled(on) {
  enabled = Boolean(on);
}

export function hapticsEnabled() {
  if (enabled === null) enabled = readPrefs().haptics;
  return enabled;
}

function canVibrate() {
  return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
}

// Does this browser draw <input switch> natively? (Safari 17.4+ parses the
// attribute; the haptic only plays on iOS 18+, where the click is a real tap.)
function ensureSwitch() {
  if (typeof document === "undefined" || !document.body) return null;
  if (label && label.isConnected) return label;
  const l = document.createElement("label");
  l.setAttribute("aria-hidden", "true");
  l.setAttribute("data-haptic", "");
  l.style.cssText =
    "position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.setAttribute("switch", "");
  input.tabIndex = -1;
  input.setAttribute("aria-hidden", "true");
  l.appendChild(input);
  document.body.appendChild(l);
  label = l;
  return l;
}

function isIos() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

// Play a haptic. kind: "light" | "medium" | "success" | "warning".
export function haptic(kind = "light") {
  try {
    if (!hapticsEnabled()) return;
    if (canVibrate()) {
      navigator.vibrate(PATTERNS[kind] ?? PATTERNS.light);
      return;
    }
    if (!isIos()) return;
    const l = ensureSwitch();
    if (!l) return;
    const active = document.activeElement;
    l.click();
    if (active && active !== document.activeElement && active.isConnected && typeof active.focus === "function") {
      active.focus({ preventScroll: true });
    }
  } catch {
    // Haptics are a nicety; never break the action they decorate.
  }
}

// Test helper: forget the cached preference and the hidden switch.
export function resetHaptics() {
  enabled = null;
  if (label) label.remove();
  label = null;
}
