import { useEffect, useState } from "react";
import { toLocalDate } from "../lib/dates.js";

// Today's local date ("YYYY-MM-DD"). Re-read when the tab becomes visible or
// the window gains focus, so a screen left open overnight does not go stale.
export function useToday() {
  const [today, setToday] = useState(() => toLocalDate());

  useEffect(() => {
    const refresh = () => setToday(toLocalDate());
    const onVisible = () => {
      if (document.visibilityState !== "hidden") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", refresh);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  return today;
}
