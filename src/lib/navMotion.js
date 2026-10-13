// Navigation motion and scroll memory. Pure helpers first, then thin browser wrappers.

// Pushed screens and the screen each one sits on. Back (the app-bar button, a
// swipe or the browser) goes up to the parent.
export const PARENT_OF = {
  "/checkin": "/",
  "/settings": "/",
  "/framework": "/practices",
  "/sources": "/practices",
  "/welcome/rate": "/welcome",
  "/welcome/focus": "/welcome/rate",
};

export function isPushed(path) {
  return Object.prototype.hasOwnProperty.call(PARENT_OF, path);
}

// "push" slides the new screen in from the right, "pop" slides the old one
// away to the right, "tab" cross-fades, "none" means the path did not change.
export function classifyNavigation(from, to) {
  if (!from || from === to) return "none";
  if (PARENT_OF[from] === to) return "pop";
  if (isPushed(to)) return "push";
  if (isPushed(from)) return "pop";
  return "tab";
}

// Where to put the scroll position after landing on `to`. Pushed screens
// always start at the top. Tabs and parents come back where they were left.
export function scrollTargetFor(kind, to, saved = {}) {
  if (kind === "push" || isPushed(to)) return 0;
  const y = saved[to];
  return Number.isFinite(y) && y > 0 ? y : 0;
}

// Remembers one scroll offset per path.
export function createScrollMemory() {
  const saved = {};
  return {
    record(path, y) {
      if (Number.isFinite(y)) saved[path] = Math.max(0, Math.round(y));
    },
    get: (path) => saved[path] ?? 0,
    forget(path) {
      delete saved[path];
    },
    all: () => saved,
  };
}

export function prefersReducedMotion() {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;
}

export function supportsViewTransitions() {
  return typeof document !== "undefined" && typeof document.startViewTransition === "function";
}

export function scrollToTop() {
  try {
    window.scrollTo({ top: 0, left: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  } catch {
    // jsdom and older browsers may not implement scrollTo.
  }
}

export function scrollToInstant(y) {
  try {
    window.scrollTo({ top: y, left: 0, behavior: "instant" });
  } catch {
    // See scrollToTop.
  }
}

// The swipe-back gesture animates the page itself; the route change that
// follows must not animate a second time.
let skipNext = false;
export function skipNextTransition() {
  skipNext = true;
}

// Runs `update` (which must change the DOM synchronously) inside a view
// transition of the given kind. Returns false, and does not run `update`, when
// no transition applies: the caller then updates directly.
export function runNavTransition(kind, update) {
  const skip = skipNext;
  skipNext = false;
  if (skip || kind === "none" || !supportsViewTransitions() || prefersReducedMotion()) return false;
  const root = document.documentElement;
  root.dataset.nav = kind;
  const clear = () => {
    if (root.dataset.nav === kind) delete root.dataset.nav;
  };
  try {
    const transition = document.startViewTransition(update);
    transition.finished.then(clear, clear);
    return true;
  } catch {
    clear();
    return false;
  }
}
