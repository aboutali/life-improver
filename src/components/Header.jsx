import { useEffect, useState } from "react";
import { ROUTES, href } from "../lib/router.js";

// Moves focus to <main> without touching the hash, which would change the route.
function skipToMain(e) {
  e.preventDefault();
  const main = document.getElementById("main");
  if (main) main.focus();
}

// Screens pushed on top of another: the app bar shows a Back button instead of
// the Settings gear. `to` is the parent route; `label` is its visible name and
// `name` the accessible name.
const PARENT = {
  "/checkin": { to: "/", label: "Today", name: "Back to Today" },
  "/settings": { to: "/", label: "Today", name: "Back to Today" },
  "/framework": { to: "/practices", label: "Practices", name: "Back to Practices" },
  "/sources": { to: "/practices", label: "Practices", name: "Back to Practices" },
  "/welcome/rate": { to: "/welcome", label: "Welcome", name: "Back to Welcome" },
  "/welcome/focus": { to: "/welcome/rate", label: "Back", name: "Back to the ratings" },
};

function titleFor(path) {
  if (path.startsWith("/welcome")) return "Welcome";
  return ROUTES.find((r) => r.path === path)?.label ?? "";
}

function Gear() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" />
      <circle cx="12" cy="12" r="6.6" />
    </svg>
  );
}

function BackChevron() {
  return (
    <svg
      width="12"
      height="20"
      viewBox="0 0 12 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M10 2L2 10l8 8" />
    </svg>
  );
}

// True once the screen's large title (the first h2 in <main>) has scrolled
// under the app bar. Without IntersectionObserver (jsdom, old browsers) or
// without a title to watch, the small title simply stays on.
function useLargeTitleGone(path) {
  const [gone, setGone] = useState(() => typeof IntersectionObserver === "undefined");

  useEffect(() => {
    const main = document.getElementById("main");
    // Without IntersectionObserver the initial state (title on) stays.
    if (typeof IntersectionObserver === "undefined" || !main) return undefined;
    const barHeight = Math.round(document.querySelector("header")?.getBoundingClientRect().height || 0);
    let observer = null;
    let target = null;
    let frame = 0;

    const watch = () => {
      frame = 0;
      const h2 = main.querySelector("h2");
      if (h2 === target) return;
      if (observer) observer.disconnect();
      observer = null;
      target = h2;
      if (!h2) {
        setGone(true);
        return;
      }
      observer = new IntersectionObserver(
        (entries) => {
          const last = entries[entries.length - 1];
          if (last) setGone(!last.isIntersecting);
        },
        { rootMargin: `-${barHeight}px 0px 0px 0px` }
      );
      observer.observe(h2);
    };

    // The screen may swap its heading after the first paint; follow it.
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(watch);
    };
    const mutations = new MutationObserver(schedule);
    mutations.observe(main, { childList: true, subtree: true });
    schedule();

    return () => {
      mutations.disconnect();
      if (observer) observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [path]);

  return gone;
}

// A hairline under the app bar once content scrolls beneath it.
function useScrolled() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 2);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return scrolled;
}

// True below 700px. Without matchMedia (jsdom) it is false: the wide look.
const PHONE_QUERY = "(max-width: 699px)";
function usePhone() {
  const [phone, setPhone] = useState(() => typeof matchMedia === "function" && matchMedia(PHONE_QUERY).matches);
  useEffect(() => {
    if (typeof matchMedia !== "function") return undefined;
    const mq = matchMedia(PHONE_QUERY);
    const onChange = () => setPhone(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return phone;
}

// One header, two looks. From 700px up: skip link, accent line, then the
// wordmark linking home and a Settings link on the right. Below 700px: an app
// bar with a Back button on pushed screens, the small screen title in the
// middle and the Settings gear on the tab screens.
export default function Header({ path }) {
  const onSettings = path === "/settings";
  const parent = PARENT[path];
  const welcome = path === "/welcome";
  const titleGone = useLargeTitleGone(path);
  const scrolled = useScrolled();
  const phone = usePhone();
  const classes = ["app-header", scrolled ? "is-scrolled" : "", parent ? "is-pushed" : "", welcome ? "is-bare" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <header className={classes}>
      <a className="skip-link" href="#main" onClick={skipToMain}>
        Skip to content
      </a>
      <div className="bl" />
      <div className="hd-bar">
        <div className="hd-inner">
          {/* The one h1 on every screen. On a phone it is for screen readers only
              and is not a link: the tab bar already leads to Today. */}
          <h1 className="hd-mark">
            {phone ? (
              "Life Improver"
            ) : (
              <a href="#/" className="sf">
                Life Improver
              </a>
            )}
          </h1>
          {parent && (
            <a className="hd-back" href={href(parent.to)} aria-label={parent.name}>
              <BackChevron />
              <span>{parent.label}</span>
            </a>
          )}
          <div className={`hd-title ${titleGone ? "on" : ""}`} aria-hidden="true">
            {titleFor(path)}
          </div>
          <a
            href="#/settings"
            className={`hd-settings ${onSettings ? "a" : ""}`}
            aria-label="Settings"
            aria-current={onSettings ? "page" : undefined}
          >
            <Gear />
            <span className="hd-settings-text">Settings</span>
          </a>
        </div>
      </div>
    </header>
  );
}
