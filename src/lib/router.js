import { useCallback, useEffect, useState } from "react";

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

export function useRoute() {
  const [path, setPath] = useState(currentPath);

  useEffect(() => {
    const onChange = () => {
      setPath(currentPath());
      scrollToTop();
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  const navigate = useCallback((next) => {
    window.location.hash = next;
  }, []);

  return { path, navigate };
}
