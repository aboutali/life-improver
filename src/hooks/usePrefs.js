import { useCallback, useEffect } from "react";
import { usePersistentState } from "./usePersistentState.js";
import { DEFAULT_PREFS, KEYS, sanitizePrefs } from "../lib/storage.js";
import { setHapticsEnabled } from "../lib/haptics.js";

// Small settings kept on this device. Exposes `prefs` and `setHaptics(on)`.
export function usePrefs() {
  const [prefs, setPrefs] = usePersistentState(KEYS.prefs, DEFAULT_PREFS, sanitizePrefs);

  useEffect(() => {
    setHapticsEnabled(prefs.haptics);
  }, [prefs.haptics]);

  const setHaptics = useCallback((on) => setPrefs((p) => ({ ...p, haptics: Boolean(on) })), [setPrefs]);

  return { prefs, setHaptics };
}
