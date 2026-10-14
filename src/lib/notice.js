import { useSyncExternalStore } from "react";

// A one-shot message shown above the screen, e.g. "Restored 3 check-ins." Any
// code may call setNotice(text), including just before a reload: the text is
// kept in sessionStorage until the person dismisses it.
export const NOTICE_KEY = "life-improver:notice";
export const NOTICE_EVENT = "life-improver:notice";

// Used only when sessionStorage is blocked, so the notice still shows.
let memory = null;

function read() {
  try {
    return sessionStorage.getItem(NOTICE_KEY);
  } catch {
    return memory;
  }
}

function announce() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(NOTICE_EVENT));
}

export function setNotice(text) {
  memory = String(text);
  try {
    sessionStorage.setItem(NOTICE_KEY, memory);
  } catch {
    // Blocked: the in-memory copy still serves this page.
  }
  announce();
}

export function clearNotice() {
  memory = null;
  try {
    sessionStorage.removeItem(NOTICE_KEY);
  } catch {
    // Nothing to remove.
  }
  announce();
}

export function getNotice() {
  return read();
}

function subscribe(fn) {
  window.addEventListener(NOTICE_EVENT, fn);
  return () => window.removeEventListener(NOTICE_EVENT, fn);
}

// The current notice text, or null. Call clearNotice() to dismiss it.
export function useNotice() {
  return useSyncExternalStore(subscribe, read, () => null);
}

export const restoredText = (n) => `Restored ${n} ${n === 1 ? "check-in" : "check-ins"}.`;

// Shared tail of a successful restore: leave a notice, land on Today, reload
// so every hook reads the restored data.
export function finishRestore(checkinCount) {
  setNotice(restoredText(checkinCount));
  window.location.replace("#/");
  window.location.reload();
}
