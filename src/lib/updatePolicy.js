// Decides when a waiting service-worker update may be applied. Applying it
// reloads the page, so it must never happen while someone is typing: only at
// a safe moment, which is a route change or the page going out of sight.
export function createUpdatePolicy({ apply }) {
  let pending = false;

  // Apply once, if an update is waiting. The flag clears first so a second
  // safe moment cannot trigger a second reload.
  function flush() {
    if (!pending) return;
    pending = false;
    apply();
  }

  return {
    // A new version has installed and is waiting.
    onNeedRefresh() {
      pending = true;
    },
    // The route changed: the screen is about to be replaced anyway.
    onHashChange() {
      flush();
    },
    // The page was hidden (tab switch, app backgrounded).
    onVisibilityChange(state) {
      if (state === "hidden") flush();
    },
    // Whether an update is waiting; handy for tests.
    isPending: () => pending,
  };
}
