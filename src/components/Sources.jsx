import { SOURCES } from "../data/sources.js";

export default function Sources() {
  const total = SOURCES.reduce((a, c) => a + c.items.length, 0);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <p className="sf" style={{ fontSize: 18, color: "#1A1A1A", marginBottom: 8 }}>
          The roots beneath the garden
        </p>
        <p style={{ fontSize: 14, color: "#666", maxWidth: 600 }}>
          This framework does not emerge from one mind. It is a synthesis of work spanning millennia — from Aristotle to attachment theory, from the Dhammapada to the Harvard Study of Adult Development. Below are the key sources, organized by discipline.
        </p>
        <p style={{ fontSize: 13, color: "#999", marginTop: 8 }}>
          {total} sources across {SOURCES.length} categories
        </p>
      </div>

      {SOURCES.map((cat, ci) => (
        <div key={ci} style={{ marginBottom: 24 }}>
          <div style={{ borderBottom: "2px solid #2B6CB0", paddingBottom: 8, marginBottom: 16 }}>
            <p style={{ fontWeight: 600, fontSize: 15, color: "#1A1A1A" }}>{cat.category}</p>
          </div>
          {cat.items.map((src, si) => (
            <div key={si} className="cd" style={{ padding: 16, marginBottom: 8 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span style={{ color: "#2B6CB0", fontWeight: 600, fontSize: 12, minWidth: 28, paddingTop: 2, textAlign: "right" }}>
                  {typeof src.year === "number" ? src.year : src.year || "—"}
                </span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, color: "#1A1A1A", marginBottom: 2 }}>
                    <span style={{ fontWeight: 600 }}>{src.author}</span>
                    {src.author && " — "}
                    <span className="sf" style={{ fontStyle: "italic" }}>{src.title}</span>
                  </p>
                  <p style={{ fontSize: 13, color: "#666", lineHeight: 1.6 }}>{src.note}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
