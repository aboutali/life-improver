import { useEffect, useState } from "react";

// useState that mirrors its value into localStorage. Reads happen lazily on
// mount; writes happen on every change. Falls back gracefully if storage is
// unavailable (private mode, disabled cookies, etc.). When `validate` is given
// and returns false for the stored value, `initial` is used instead.
export function usePersistentState(key, initial, validate) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return initial;
      const parsed = JSON.parse(raw);
      return validate && !validate(parsed) ? initial : parsed;
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
