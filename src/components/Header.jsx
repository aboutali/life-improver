// Moves focus to <main> without touching the hash, which would change the route.
function skipToMain(e) {
  e.preventDefault();
  const main = document.getElementById("main");
  if (main) main.focus();
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

// A slim bar on every route: skip link, accent line, then the wordmark
// linking home and a Settings link on the right.
export default function Header({ path }) {
  const onSettings = path === "/settings";
  return (
    <header>
      <a className="skip-link" href="#main" onClick={skipToMain}>
        Skip to content
      </a>
      <div className="bl" />
      <div style={{ background: "#fff", borderBottom: "1px solid #D5D5D5" }}>
        <div
          style={{
            maxWidth: 960,
            margin: "0 auto",
            padding: "0 24px",
            minHeight: 44,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 400 }}>
            <a
              href="#/"
              className="sf"
              style={{ fontSize: 18, fontWeight: 400, color: "#1A1A1A", textDecoration: "none", display: "inline-flex", alignItems: "center", minHeight: 44 }}
            >
              Life Improver
            </a>
          </h1>
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
