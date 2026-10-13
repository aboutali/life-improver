import { ROUTES, href } from "../lib/router.js";
import { scrollToTop } from "../lib/navMotion.js";

const TABS = ROUTES.filter((r) => r.tab);

const BASE = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": "true",
  focusable: "false",
};
const OUTLINE = { ...BASE, fill: "none", stroke: "currentColor", strokeWidth: 1.6 };
const FILLED = { ...BASE, fill: "currentColor", stroke: "currentColor", strokeWidth: 1.6 };

// SF-Symbols-like pairs: an outline when the tab is idle, a filled variant when
// it is the current one. Sun (Today), line chart (Journey), sliders (Assess), list (Practices).
const ICONS = {
  "/": {
    outline: (
      <svg {...OUTLINE}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" />
      </svg>
    ),
    filled: (
      <svg {...FILLED}>
        <circle cx="12" cy="12" r="4.6" />
        <path strokeWidth="2" d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" />
      </svg>
    ),
  },
  "/journey": {
    outline: (
      <svg {...OUTLINE}>
        <path d="M3 19h18" />
        <path d="M4 15l5-5 4 3 7-8" />
      </svg>
    ),
    filled: (
      <svg {...FILLED}>
        <path d="M4 15l5-5 4 3 7-8v11H4z" fillOpacity=".28" stroke="none" />
        <path d="M3 19.5h18" strokeWidth="2" />
        <path d="M4 15l5-5 4 3 7-8" fill="none" strokeWidth="2.2" />
      </svg>
    ),
  },
  "/assess": {
    outline: (
      <svg {...OUTLINE}>
        <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
        <circle cx="15" cy="7" r="2" />
        <circle cx="9" cy="17" r="2" />
      </svg>
    ),
    filled: (
      <svg {...FILLED}>
        <path strokeWidth="2" d="M4 7h9M17 7h3M4 17h3M11 17h9" />
        <circle cx="15" cy="7" r="2.8" />
        <circle cx="9" cy="17" r="2.8" />
      </svg>
    ),
  },
  "/practices": {
    outline: (
      <svg {...OUTLINE}>
        <path d="M9 6h11M9 12h11M9 18h11" />
        <circle cx="4.5" cy="6" r=".8" />
        <circle cx="4.5" cy="12" r=".8" />
        <circle cx="4.5" cy="18" r=".8" />
      </svg>
    ),
    filled: (
      <svg {...FILLED}>
        <path strokeWidth="2.4" d="M9 6h11M9 12h11M9 18h11" />
        <circle cx="4.5" cy="6" r="1.5" />
        <circle cx="4.5" cy="12" r="1.5" />
        <circle cx="4.5" cy="18" r="1.5" />
      </svg>
    ),
  },
};

// Tapping the tab you are already on scrolls its screen to the top. A hash
// with a query ("#/practices?d=1") still navigates, which clears the query.
function onTabClick(e, active, path) {
  if (!active || (window.location.hash || "#/") !== href(path)) return;
  e.preventDefault();
  scrollToTop();
}

const BOTTOM = TABS.filter((t) => ICONS[t.path]);

// Flows and pushed screens have no bottom tab bar on a phone. The top tabs
// (wide screens only) stay on Check-in and Settings.
const NO_BOTTOM = new Set(["/checkin", "/settings"]);

export default function TabBar({ path }) {
  // The welcome screen is a one-time flow: no navigation there.
  if (path === "/welcome" || path.startsWith("/welcome/")) return null;

  return (
    <>
      <nav className="topnav" aria-label="Main">
        <div className="topnav-in">
          <div className="tabbar">
            {TABS.map((t) => {
              const active = t.path === path;
              return (
                <a
                  key={t.path}
                  href={href(t.path)}
                  className={`ti ${active ? "a" : ""}`}
                  aria-current={active ? "page" : undefined}
                  onClick={(e) => onTabClick(e, active, t.path)}
                >
                  {t.label}
                </a>
              );
            })}
          </div>
        </div>
      </nav>

      {!NO_BOTTOM.has(path) && (
        <nav className="bnav" aria-label="Primary">
          {BOTTOM.map((t) => {
            const active = t.path === path;
            return (
              <a
                key={t.path}
                href={href(t.path)}
                className={`bn ${active ? "a" : ""}`}
                aria-current={active ? "page" : undefined}
                onClick={(e) => onTabClick(e, active, t.path)}
              >
                {active ? ICONS[t.path].filled : ICONS[t.path].outline}
                <span>{t.label}</span>
              </a>
            );
          })}
        </nav>
      )}
    </>
  );
}
