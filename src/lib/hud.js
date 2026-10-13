import { useSyncExternalStore } from "react";

// A short confirmation shown in the middle of the screen, like the iOS HUD:
// "Added to calendar", "Focus set". Any code may call showHud(text). The host
// component (Hud.jsx) creates its own root on the first call, so no screen has
// to mount anything.

// How long a HUD stays up, including its fade in and out.
export const HUD_MS = 1600;

let current = null; // { id, text, icon } or null
let seq = 0;
let timer = null;
let mountHost = null;
const listeners = new Set();

const emit = () => listeners.forEach((fn) => fn());

// Hud.jsx registers how to create the host. Kept apart so this file holds no
// React components and tests can use the store alone.
export function registerHudHost(fn) {
  mountHost = fn;
}

// Show `text` for HUD_MS. A newer call replaces the current one.
// opts.icon: "check" (default) or "info".
export function showHud(text, { icon = "check" } = {}) {
  const clean = String(text ?? "").trim();
  if (!clean) return;
  current = { id: ++seq, text: clean, icon };
  if (mountHost) mountHost();
  emit();
  clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    current = null;
    emit();
  }, HUD_MS);
}

export function dismissHud() {
  clearTimeout(timer);
  timer = null;
  if (current) {
    current = null;
    emit();
  }
}

export function getHud() {
  return current;
}

export function subscribeHud(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// The HUD on screen, or null.
export function useHud() {
  return useSyncExternalStore(subscribeHud, getHud, () => null);
}
