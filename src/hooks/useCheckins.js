import { useCallback } from "react";
import { usePersistentState } from "./usePersistentState.js";
import { KEYS, sanitizeCheckins } from "../lib/storage.js";

const MAX_NOTE = 500;

// Weekly reflections, oldest first.
export function useCheckins() {
  const [checkins, setCheckins] = usePersistentState(KEYS.checkins, [], sanitizeCheckins);

  // Appends the check-in; the note is trimmed to 500 characters.
  const addCheckin = useCallback(
    (checkin) => {
      const note = String(checkin.note ?? "").slice(0, MAX_NOTE);
      setCheckins((prev) => [...prev, { ...checkin, note }]);
    },
    [setCheckins]
  );

  const reset = useCallback(() => setCheckins([]), [setCheckins]);

  return { checkins, addCheckin, reset };
}
