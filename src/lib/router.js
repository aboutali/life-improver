import { useCallback, useEffect, useRef, useState } from "react";

// Hash router. GitHub Pages serves the app under a sub-path, so hashes avoid 404s.
export const ROUTES = [
  { path: "/", label: "Today", tab: true },
  { path: "/journey", label: "Journey", tab: true },
  { path: "/assess", label: "Assess", tab: true },
  { path: "/practices", label: "Practices", tab: true },
  { path: "/framework", label: "Framework", tab: true },
  { path: "/sources", label: "Sources", tab: true },
  { path: "/welcome", label: "Welcome", tab: false },
  { path: "/checkin", label: "Check-in", tab: false },
  { path: "/settings", label: "Settings & privacy", tab: false },
];

export function href(path) {
  return "#" + path;
}

function parseHash(hash) {
  let p = (hash || "").replace(/^#/, "").split("?")[0];
  if (!p.startsWith("/")) p = "/" + p;
  if (p.length > 1) p = p.replace(/\/+$/, "");
  return p || "/";
}

function currentPath() {
  return typeof window === "undefined" ? "/" : parseHash(window.location.hash);
}

function scrollToTop() {
  const reduce =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  try {
    window.scrollTo({ top: 0, left: 0, behavior: reduce ? "auto" : "smooth" });
  } catch {
    // jsdom and older browsers may not implement scrollTo.
  }
}

const KNOWN = new Set(ROUTES.map((r) => r.path));

// Unknown hashes resolve to Today ("/").
export function normalisePath(path) {
  return KNOWN.has(path) ? path : "/";
}

// Returns { path, focusKey, navigate }. `focusKey` changes after every
// user-driven hashchange (never on first load, never on a silent redirect) so
// the app can move focus to the new screen's heading.
export function useRoute() {
  const [state, setState] = useState(() => ({ path: normalisePath(currentPath()), focusKey: 0 }));
  const silent = useRef(false);

  useEffect(() => {
    // An unknown hash is replaced by "#/" so Back does not return to it.
    if (!KNOWN.has(currentPath())) {
      silent.current = true;
      window.location.replace(href("/"));
    }
    const onChange = () => {
      const quiet = silent.current;
      silent.current = false;
      const next = normalisePath(currentPath());
      setState((prev) => ({ path: next, focusKey: quiet ? prev.focusKey : prev.focusKey + 1 }));
      if (!KNOWN.has(currentPath())) {
        silent.current = true;
        window.location.replace(href("/"));
      }
      if (!quiet) scrollToTop();
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  // navigate(path, { replace, quiet }): replace swaps the current history
  // entry, so a redirect does not trap the Back button. quiet skips the focus
  // move and the scroll (for automatic redirects).
  const navigate = useCallback((next, { replace = false, quiet = false } = {}) => {
    if (replace) {
      if (quiet && currentPath() !== next) silent.current = true;
      window.location.replace(href(next));
    } else {
      window.location.hash = next;
    }
  }, []);

  return { path: state.path, focusKey: state.focusKey, navigate };
}
