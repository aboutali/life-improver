import { useState } from "react";
import { FRAMEWORK, TOTAL_IDEAS } from "../data/framework.js";

export default function Ideas() {
  const [domIdx, setDomIdx] = useState(null);
  const [subIdx, setSubIdx] = useState(0);

  const dom = domIdx !== null ? FRAMEWORK[domIdx] : null;
  const sub = dom ? dom.subs[subIdx] : null;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <p className="sf" style={{ fontSize: "var(--fs-lead)", color: "#1A1A1A", marginBottom: 8 }}>
          {TOTAL_IDEAS} ways forward.
        </p>
        <p style={{ fontSize: 14, color: "#666", maxWidth: 600 }}>
          Pick one. Make it part of your life. Then pick another. That's how this works.
        </p>
      </div>

      <div className="sh" style={{ display: "flex", gap: 8, marginBottom: 24, paddingBottom: 4 }}>
        {FRAMEWORK.map((d, i) => (
          <button
            key={d.id}
            className={`dp ${domIdx === i ? "a" : ""}`}
            onClick={() => { setDomIdx(i); setSubIdx(0); }}
          >
            <span>{d.domain}</span>
          </button>
        ))}
      </div>

      <div>
        {domIdx === null ? (
          <div className="cd" style={{ textAlign: "center", padding: 48, color: "#999" }}>
            <p className="sf" style={{ fontSize: 16, marginBottom: 8, color: "#666" }}>Pick a domain.</p>
            <p style={{ fontSize: 13 }}>Each one holds dozens of practices, drawn from research and tradition.</p>
          </div>
        ) : (
          <>
            <div className="sh" style={{ display: "flex", gap: 6, marginBottom: 20, paddingBottom: 4 }}>
              {dom.subs.map((s, si) => (
                <button
                  key={si}
                  className={`sp ${subIdx === si ? "a" : ""}`}
                  onClick={() => setSubIdx(si)}
                >
                  {s.name}
                </button>
              ))}
            </div>

            <div style={{ marginBottom: 16 }}>
              <p style={{ fontWeight: 600, fontSize: "var(--fs-lead)", color: "#1A1A1A", marginBottom: 4 }}>{sub.name}</p>
              <p style={{ fontSize: 13, color: "#888", lineHeight: 1.6 }}>{sub.desc}</p>
            </div>

            <div className="cd" style={{ padding: 0 }}>
              {sub.ideas.map((idea, i) => (
                <div key={i} className="ir">
                  <span style={{ color: "#2B6CB0", fontWeight: 600, fontSize: 13, minWidth: 24, paddingTop: 1 }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span style={{ fontSize: 14, color: "#444", lineHeight: 1.6 }}>{idea}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
