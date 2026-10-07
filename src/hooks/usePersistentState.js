import { useEffect, useState } from "react";

// Copy the raw stored text to `${key}:bad`, once. Never overwrites an earlier
// backup, so the first damaged copy is the one kept.
function backUpBad(key, raw) {
  try {
    const badKey = `${key}:bad`;
    if (localStorage.getItem(badKey) === null) localStorage.setItem(badKey, raw);
  } catch {
    // Storage full or blocked: the backup is best effort.
  }
}

// Read one key. With `sanitize`, the parsed value is cleaned (invalid entries
// dropped); undefined means nothing usable, so `initial` is used. When the
// cleaned value differs from what was stored, the raw text is backed up first.
function load(key, initial, sanitize) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return initial;
    const parsed = JSON.parse(raw);
    if (!sanitize) return parsed;
    const cleaned = sanitize(parsed);
    if (JSON.stringify(cleaned) !== JSON.stringify(parsed)) backUpBad(key, raw);
    return cleaned === undefined ? initial : cleaned;
  } catch {
    return initial;
  }
}

// useState that mirrors its value into localStorage. Reads happen lazily on
// mount; writes happen on every change. Falls back gracefully if storage is
// unavailable (private mode, disabled cookies, etc.).
export function usePersistentState(key, initial, sanitize) {
  const [value, setValue] = useState(() => load(key, initial, sanitize));

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore quota / privacy errors — data just won't persist.
    }
  }, [key, value]);

  return [value, setValue];
}
