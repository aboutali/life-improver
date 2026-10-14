import { useEffect, useState } from "react";
import { toLocalDate } from "../lib/dates.js";

const RECHECK_MS = 60 * 1000;

// Today's local date ("YYYY-MM-DD"). Re-read when the tab becomes visible,
// the window gains focus, and once a minute, so a screen left open past
// midnight does not go stale.
export function useToday() {
  const [today, setToday] = useState(() => toLocalDate());

  useEffect(() => {
    const refresh = () => setToday(toLocalDate());
    const onVisible = () => {
      if (document.visibilityState !== "hidden") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", refresh);
    const timer = setInterval(refresh, RECHECK_MS);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", refresh);
      clearInterval(timer);
    };
  }, []);

  return today;
}
