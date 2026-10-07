import { useCallback } from "react";
import { usePersistentState } from "./usePersistentState.js";
import { KEYS } from "../lib/storage.js";

// One 1..10 gut rating per domain, from onboarding. Keyed by domain id.
export function useQuickScores() {
  const [quick, setQuickState] = usePersistentState(KEYS.quick, {});

  const setQuick = useCallback(
    (domainId, value) => setQuickState((prev) => ({ ...prev, [domainId]: value })),
    [setQuickState]
  );

  const reset = useCallback(() => setQuickState({}), [setQuickState]);

  return { quick, setQuick, reset };
}
