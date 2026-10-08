import { ROUTES, href } from "../lib/router.js";

const TABS = ROUTES.filter((r) => r.tab);

const ICON_PROPS = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": "true",
  focusable: "false",
};

// Simple 1.6px stroke icons: sun, line chart, sliders, list.
const ICONS = {
  "/": (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" />
    </svg>
  ),
  "/journey": (
    <svg {...ICON_PROPS}>
      <path d="M3 19h18" />
      <path d="M4 15l5-5 4 3 7-8" />
    </svg>
  ),
  "/assess": (
    <svg {...ICON_PROPS}>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
    </svg>
  ),
  "/practices": (
    <svg {...ICON_PROPS}>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <circle cx="4.5" cy="6" r=".8" />
      <circle cx="4.5" cy="12" r=".8" />
      <circle cx="4.5" cy="18" r=".8" />
    </svg>
  ),
};

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
              >
                {ICONS[t.path]}
                <span>{t.label}</span>
              </a>
            );
          })}
        </nav>
      )}
    </>
  );
}
