// A slim bar on every route: accent line, then the wordmark linking home.
export default function Header() {
  return (
    <header>
      <div className="bl" />
      <div style={{ background: "#fff", borderBottom: "1px solid #D5D5D5" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 24px", minHeight: 44, display: "flex", alignItems: "center" }}>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 400 }}>
            <a
              href="#/"
              className="sf"
              style={{ fontSize: 18, fontWeight: 400, color: "#1A1A1A", textDecoration: "none", display: "inline-flex", alignItems: "center", minHeight: 44 }}
            >
              Life Improver
            </a>
          </h1>
        </div>
      </div>
    </header>
  );
}
