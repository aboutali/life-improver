export const TABS = ["Overview", "Self-Assessment", "Ideas to Improve", "Sources"];

export default function TabBar({ tab, onChange }) {
  return (
    <div style={{ background: "#fff", borderBottom: "1px solid #D5D5D5", position: "sticky", top: 0, zIndex: 10 }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 24px" }}>
        <div className="tabbar" style={{ borderBottom: "none" }}>
          {TABS.map((t, i) => (
            <button
              key={t}
              className={`ti ${tab === i ? "a" : ""}`}
              onClick={() => onChange(i)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
