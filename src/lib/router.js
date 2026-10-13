import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  classifyNavigation,
  createScrollMemory,
  runNavTransition,
  scrollTargetFor,
  scrollToInstant,
  scrollToTop,
} from "./navMotion.js";

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

// Query parameters after "?" in the hash, e.g. "#/practices?d=1&s=2".
export function parseQuery(hash) {
  const q = (hash || "").split("?")[1] || "";
  return Object.fromEntries(new URLSearchParams(q));
}

function currentQuery() {
  return typeof window === "undefined" ? {} : parseQuery(window.location.hash);
}

function currentPath() {
  return typeof window === "undefined" ? "/" : parseHash(window.location.hash);
}

const PATHS = new Set(ROUTES.map((r) => r.path));
// Sub-steps of the welcome wizard, so Back moves between steps.
export const WELCOME_STEPS = ["/welcome", "/welcome/rate", "/welcome/focus"];
const KNOWN = { has: (p) => PATHS.has(p) || WELCOME_STEPS.includes(p) };

// Unknown hashes resolve to Today ("/").
export function normalisePath(path) {
  return KNOWN.has(path) ? path : "/";
}

// Returns { path, query, focusKey, navigate }. `query` holds hash parameters. `focusKey` changes after every
// user-driven hashchange (never on first load, never on a silent redirect) so
// the app can move focus to the new screen's heading.
export function useRoute() {
  const [state, setState] = useState(() => ({
    path: normalisePath(currentPath()),
    query: currentQuery(),
    focusKey: 0,
  }));
  const silent = useRef(false);
  const active = useRef(state.path); // the path on screen, for scroll memory
  const [memory] = useState(createScrollMemory);

  useEffect(() => {
    // The router restores scroll itself, per tab (see navMotion.js).
    try {
      if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
    } catch {
      // Some embedded browsers forbid it.
    }
    const onScroll = () => memory.record(active.current, window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });

    // An unknown hash is replaced by "#/" so Back does not return to it.
    if (!KNOWN.has(currentPath())) {
      silent.current = true;
      window.location.replace(href("/"));
    }
    const onChange = () => {
      const quiet = silent.current;
      silent.current = false;
      const next = normalisePath(currentPath());
      const query = currentQuery();
      const from = active.current;
      const kind = quiet ? "none" : classifyNavigation(from, next);
      memory.record(from, window.scrollY);

      // One synchronous update: state, then scroll. Inside a view transition it
      // runs as the transition's callback, so the new screen is what gets captured.
      const apply = () => {
        flushSync(() =>
          setState((prev) => ({
            path: next,
            query,
            focusKey: quiet ? prev.focusKey : prev.focusKey + 1,
          }))
        );
        active.current = next;
        if (quiet) return;
        if (kind === "none") scrollToTop();
        else scrollToInstant(scrollTargetFor(kind, next, memory.all()));
      };
      if (!runNavTransition(kind, apply)) apply();

      if (!KNOWN.has(currentPath())) {
        silent.current = true;
        window.location.replace(href("/"));
      }
    };
    window.addEventListener("hashchange", onChange);
    return () => {
      window.removeEventListener("hashchange", onChange);
      window.removeEventListener("scroll", onScroll);
    };
  }, [memory]);

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

  return { path: state.path, query: state.query, focusKey: state.focusKey, navigate };
}
