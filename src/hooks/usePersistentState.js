import { useEffect, useState } from "react";

// useState that mirrors its value into localStorage. Reads happen lazily on
// mount; writes happen on every change. Falls back gracefully if storage is
// unavailable (private mode, disabled cookies, etc.).
export function usePersistentState(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore quota / privacy errors — data just won't persist.
    }
  }, [key, value]);

  return [value, setValue];
}
