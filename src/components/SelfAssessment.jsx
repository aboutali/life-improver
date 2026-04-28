import { useState } from "react";
import { FRAMEWORK, TOTAL_SUBS } from "../data/framework.js";
import DomainSidebar from "./DomainSidebar.jsx";

export default function SelfAssessment({ scores }) {
  const [domIdx, setDomIdx] = useState(null);
  const [subIdx, setSubIdx] = useState(0);
  const dom = domIdx !== null ? FRAMEWORK[domIdx] : null;
  const overall = scores.overallAverage();

  const onResetClick = () => {
    if (window.confirm("Clear every score? This cannot be undone.")) scores.reset();
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, marginBottom: 24, flexWrap: "wrap" }}>
        <div>
          <p className="sf" style={{ fontSize: 18, color: "#1A1A1A", marginBottom: 8 }}>
            Honest seeing comes before any action
          </p>
          <p style={{ fontSize: 14, color: "#666", maxWidth: 600 }}>
            Rate each subcategory from 1 (neglected) to 10 (thriving). There is no judgment in the number — only information. The places where you score lowest are not failures. They are where the water wants to go. Your scores are saved to this browser.
          </p>
        </div>
        {scores.scoredCount > 0 && (
          <button className="btn btn-danger" onClick={onResetClick}>Reset all scores</button>
        )}
      </div>

      <div style={{ display: "flex", gap: 24 }}>
        <DomainSidebar
          activeIndex={domIdx}
          onSelect={i => { setDomIdx(i); setSubIdx(0); }}
          accessory={(d, i) => {
            const av = scores.domainAverage(i);
            return av ? <span style={{ fontSize: 13, color: "#2B6CB0", fontWeight: 600 }}>{av}</span> : null;
          }}
        />

        <div className="main-area" style={{ flex: 1, minWidth: 0 }}>
          {domIdx === null ? (
            <div className="cd" style={{ textAlign: "center", padding: 48, color: "#999" }}>
              <p className="sf" style={{ fontSize: 16, marginBottom: 8, color: "#666" }}>Begin by choosing a domain</p>
              <p style={{ fontSize: 13 }}>
                Select one of the seven domains on the left. Rate each of its subcategories. The garden reveals itself one bed at a time.
              </p>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontWeight: 600, fontSize: 16, color: "#1A1A1A", marginBottom: 4 }}>{dom.domain}</p>
                <p style={{ fontSize: 13, color: "#888" }}>{dom.desc.split(".").slice(0, 2).join(".") + "."}</p>
              </div>

              {dom.subs.map((s, si) => {
                const sc = scores.get(dom.id, si);
                return (
                  <div key={si} className="cd" style={{ padding: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 600, fontSize: 14, color: "#1A1A1A", marginBottom: 2 }}>{s.name}</p>
                        <p style={{ fontSize: 12, color: "#888", lineHeight: 1.5 }}>{s.desc}</p>
                      </div>
                      {sc && <span style={{ fontSize: 24, fontWeight: 300, color: "#2B6CB0", marginLeft: 16 }}>{sc}</span>}
                    </div>
                    <div style={{ display: "flex", gap: 7, marginTop: 12, flexWrap: "wrap" }}>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                        <button
                          key={n}
                          className={`sc ${sc === n ? "a" : ""}`}
                          onClick={() => scores.set(dom.id, si, n)}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}

              <div className="cd" style={{ marginTop: 8 }}>
                <p style={{ fontWeight: 600, fontSize: 12, color: "#888", marginBottom: 12, textTransform: "uppercase", letterSpacing: .5 }}>
                  Domain summary
                </p>
                {dom.subs.map((s, si) => {
                  const sc = scores.get(dom.id, si);
                  return (
                    <div key={si} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                      <span style={{ fontSize: 13, color: "#555", width: 180, flexShrink: 0 }}>{s.name}</span>
                      <div className="bbg"><div className="bf" style={{ width: sc ? `${sc * 10}%` : 0 }} /></div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: sc ? "#2B6CB0" : "#CCC", width: 24, textAlign: "right" }}>
                        {sc || "–"}
                      </span>
                    </div>
                  );
                })}
                {scores.domainAverage(domIdx) && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #EBEBEB", display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 14, color: "#888" }}>Average</span>
                    <span style={{ fontSize: 18, fontWeight: 600, color: "#2B6CB0" }}>
                      {scores.domainAverage(domIdx)}
                    </span>
                  </div>
                )}
              </div>
            </>
          )}

          {scores.scoredCount > 0 && (
            <div className="cd" style={{ marginTop: 24, background: "#EBF4FF", borderColor: "#BEE3F8" }}>
              <p style={{ fontWeight: 600, fontSize: 12, color: "#2B6CB0", marginBottom: 12, textTransform: "uppercase", letterSpacing: .5 }}>
                Full assessment
              </p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <span style={{ fontSize: 14, color: "#555" }}>{scores.scoredCount} of {TOTAL_SUBS} rated</span>
                {overall && <span style={{ fontSize: 24, fontWeight: 300, color: "#2B6CB0" }}>{overall}</span>}
              </div>
              {scores.lowestSubs().length > 0 && (
                <div>
                  <p style={{ fontSize: 13, color: "#666", marginBottom: 8 }}>Where the water wants to go:</p>
                  {scores.lowestSubs().slice(0, 5).map((s, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #D4E8F7" }}>
                      <span style={{ fontSize: 13, color: "#333" }}>{s.domain} → {s.sub}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: s.score <= 3 ? "#C53030" : s.score <= 5 ? "#D69E2E" : "#2B6CB0" }}>{s.score}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
