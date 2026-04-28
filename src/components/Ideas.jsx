import { useState } from "react";
import { FRAMEWORK } from "../data/framework.js";
import DomainSidebar from "./DomainSidebar.jsx";

export default function Ideas({ customPractices }) {
  const [domIdx, setDomIdx] = useState(null);
  const [subIdx, setSubIdx] = useState(0);
  const [draft, setDraft] = useState("");

  const dom = domIdx !== null ? FRAMEWORK[domIdx] : null;
  const sub = dom ? dom.subs[subIdx] : null;
  const userPractices = dom ? customPractices.list(dom.id, subIdx) : [];

  const onAdd = () => {
    customPractices.add(dom.id, subIdx, draft);
    setDraft("");
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <p className="sf" style={{ fontSize: 18, color: "#1A1A1A", marginBottom: 8 }}>
          Three hundred and ten ways to begin
        </p>
        <p style={{ fontSize: 14, color: "#666", maxWidth: 600 }}>
          You do not need all of them. You do not need most of them. Choose one practice in one area, and do it until it becomes part of you. Then choose another. A garden is planted one seed at a time. You can also add your own practices — they live in this browser.
        </p>
      </div>
      <div style={{ display: "flex", gap: 24 }}>
        <DomainSidebar
          activeIndex={domIdx}
          onSelect={i => { setDomIdx(i); setSubIdx(0); setDraft(""); }}
          accessory={d => (
            <span style={{ fontSize: 12, color: "#999" }}>
              {d.subs.reduce((a, s) => a + s.ideas.length, 0)}
            </span>
          )}
        />

        <div className="main-area" style={{ flex: 1, minWidth: 0 }}>
          {domIdx === null ? (
            <div className="cd" style={{ textAlign: "center", padding: 48, color: "#999" }}>
              <p className="sf" style={{ fontSize: 16, marginBottom: 8, color: "#666" }}>Select a domain to explore</p>
              <p style={{ fontSize: 13 }}>
                Choose a domain on the left. Each contains practices drawn from psychology, philosophy, and contemplative tradition.
              </p>
            </div>
          ) : (
            <>
              <div className="sh" style={{ display: "flex", gap: 6, marginBottom: 20, paddingBottom: 4 }}>
                {dom.subs.map((s, si) => (
                  <button
                    key={si}
                    className={`sp ${subIdx === si ? "a" : ""}`}
                    onClick={() => { setSubIdx(si); setDraft(""); }}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontWeight: 600, fontSize: 18, color: "#1A1A1A", marginBottom: 4 }}>{sub.name}</p>
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
                {userPractices.map((idea, i) => (
                  <div key={`u-${i}`} className="ir" style={{ background: "#FAFCFF" }}>
                    <span style={{ color: "#2B6CB0", fontWeight: 600, fontSize: 13, minWidth: 24, paddingTop: 1 }}>
                      {String(sub.ideas.length + i + 1).padStart(2, "0")}
                    </span>
                    <span style={{ flex: 1, fontSize: 14, color: "#444", lineHeight: 1.6 }}>
                      <span className="custom-tag">yours</span>
                      {idea}
                    </span>
                    <button
                      className="btn btn-danger"
                      style={{ padding: "2px 8px", fontSize: 11 }}
                      onClick={() => customPractices.remove(dom.id, subIdx, i)}
                      aria-label="Remove practice"
                    >
                      remove
                    </button>
                  </div>
                ))}
              </div>

              <div className="cd" style={{ marginTop: 16, padding: 16, background: "#FAFAFA" }}>
                <p style={{ fontSize: 12, color: "#888", marginBottom: 8, textTransform: "uppercase", letterSpacing: .5, fontWeight: 600 }}>
                  Add your own practice
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    className="input"
                    type="text"
                    placeholder={`A practice for ${sub.name.toLowerCase()}…`}
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") onAdd(); }}
                  />
                  <button className="btn btn-primary" onClick={onAdd} disabled={!draft.trim()}>
                    Add
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
