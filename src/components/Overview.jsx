import { useState } from "react";
import { FRAMEWORK } from "../data/framework.js";

export default function Overview() {
  const [expanded, setExpanded] = useState({});

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <p className="sf" style={{ fontSize: 18, color: "#1A1A1A", marginBottom: 8 }}>
          The seven grounds of a life
        </p>
        <p style={{ fontSize: 14, color: "#666", maxWidth: 600 }}>
          Each domain is a ground you stand on daily, whether you tend to it or not. Neglect does not empty the ground — it lets weeds grow. Expand each below to see its full landscape.
        </p>
      </div>
      {FRAMEWORK.map((d, i) => (
        <div
          key={d.id}
          style={{ border: "1px solid #D5D5D5", background: "#fff", marginBottom: i < FRAMEWORK.length - 1 ? -1 : 0 }}
        >
          <div className="oh" onClick={() => setExpanded(p => ({ ...p, [i]: !p[i] }))}>
            <div>
              <p style={{ fontWeight: 600, fontSize: 16, color: "#1A1A1A", marginBottom: 2 }}>{d.domain}</p>
              <p style={{ fontSize: 13, color: "#999" }}>
                {d.subs.length} subcategories · {d.subs.reduce((a, s) => a + s.ideas.length, 0)} practices
              </p>
            </div>
            <span style={{ fontSize: 18, color: "#999", transform: expanded[i] ? "rotate(180deg)" : "none", transition: "transform .2s", display: "inline-block" }}>
              ▾
            </span>
          </div>
          {expanded[i] && (
            <div className="ob">
              <p style={{ fontSize: 14, color: "#555", lineHeight: 1.7, marginTop: 12, marginBottom: 16 }}>{d.desc}</p>
              {d.subs.map((s, si) => (
                <div key={si} className="os">
                  <p style={{ fontWeight: 600, fontSize: 14, color: "#2B6CB0", marginBottom: 4 }}>{s.name}</p>
                  <p style={{ fontSize: 13, color: "#666", lineHeight: 1.6 }}>{s.desc}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
