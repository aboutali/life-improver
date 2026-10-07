import { useCallback } from "react";
import { usePersistentState } from "./usePersistentState.js";
import { KEYS, sanitizeFocus } from "../lib/storage.js";

// This week's chosen subcategory and practice, or null when none is chosen.
export function useFocus() {
  const [focus, setFocus] = usePersistentState(KEYS.focus, null, sanitizeFocus);

  const clearFocus = useCallback(() => setFocus(null), [setFocus]);

  return { focus, setFocus, clearFocus };
}
