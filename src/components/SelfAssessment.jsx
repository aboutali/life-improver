import { useState } from "react";
import { FRAMEWORK, TOTAL_SUBS } from "../data/framework.js";

const tierColor = (sc) =>
  sc <= 2 ? "#C53030" : sc <= 4 ? "#DD6B20" : sc <= 6 ? "#D69E2E" : sc <= 8 ? "#38A169" : "#2B6CB0";
const tierLabel = (sc) =>
  sc <= 2 ? "Critical" : sc <= 4 ? "Neglected" : sc <= 6 ? "Adequate" : sc <= 8 ? "Strong" : "Thriving";
const brightTierColor = (sc) =>
  sc <= 2 ? "#EF4444" : sc <= 4 ? "#F97316" : sc <= 6 ? "#EAB308" : sc <= 8 ? "#22C55E" : "#3B82F6";

const TIERS = [
  { name: "Critical",  color: "#C53030", range: "1–2",  desc: "Actively suffering. This is hurting you." },
  { name: "Neglected", color: "#DD6B20", range: "3–4",  desc: "Not in crisis, but clearly underinvested." },
  { name: "Adequate",  color: "#D69E2E", range: "5–6",  desc: "Functional. Nothing to celebrate or worry about." },
  { name: "Strong",    color: "#38A169", range: "7–8",  desc: "Working well. You feel good about it." },
  { name: "Thriving",  color: "#2B6CB0", range: "9–10", desc: "A genuine source of energy and meaning." }
];

export default function SelfAssessment({ scores }) {
  const [domIdx, setDomIdx] = useState(null);
  const dom = domIdx !== null ? FRAMEWORK[domIdx] : null;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <p className="sf" style={{ fontSize: 18, color: "#1A1A1A", marginBottom: 8 }}>
          How are you, really?
        </p>
        <p style={{ fontSize: 14, color: "#666", maxWidth: 600 }}>
          Pick a domain. Drag each slider to where you honestly stand. The lowest scores aren't problems — they're where to begin.
        </p>
      </div>

      <div className="sh" style={{ display: "flex", gap: 8, marginBottom: 24, paddingBottom: 4 }}>
        {FRAMEWORK.map((d, i) => {
          const rc = d.subs.filter((_, si) => scores.get(d.id, si)).length;
          const tot = d.subs.length;
          return (
            <button
              key={d.id}
              className={`dp ${domIdx === i ? "a" : ""}`}
              onClick={() => setDomIdx(i)}
            >
              <span>{d.domain}</span>
              <span className="prog">{rc}/{tot}</span>
            </button>
          );
        })}
      </div>

      <div>
        {domIdx === null ? (
          <div className="cd" style={{ textAlign: "center", padding: 48, color: "#999" }}>
            <p className="sf" style={{ fontSize: 16, marginBottom: 8, color: "#666" }}>Pick a domain to start.</p>
            <p style={{ fontSize: 13 }}>Choose any of the seven above. Rate it honestly. Repeat.</p>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontWeight: 600, fontSize: 16, color: "#1A1A1A", marginBottom: 4 }}>{dom.domain}</p>
              <p style={{ fontSize: 13, color: "#888" }}>
                {dom.desc.split(".").slice(0, 2).join(".") + "."}
              </p>
            </div>

            <div className="cd" style={{ padding: 16, background: "#FAFAFA", marginBottom: 16 }}>
              <p style={{ fontWeight: 600, fontSize: 12, color: "#888", marginBottom: 10, textTransform: "uppercase", letterSpacing: .5 }}>
                How to rate
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 14px", alignItems: "center", fontSize: 13 }}>
                {TIERS.map((t) => (
                  <span key={t.name} style={{ display: "contents" }}>
                    <span style={{ display: "inline-block", width: 14, height: 14, background: t.color, borderRadius: 2 }} />
                    <span style={{ color: "#444" }}>
                      <strong style={{ color: t.color }}>{t.name} · {t.range}</strong> — {t.desc}
                    </span>
                  </span>
                ))}
              </div>
            </div>

            {dom.subs.map((s, si) => {
              const sc = scores.get(dom.id, si);
              const color = sc ? tierColor(sc) : "#999";
              const label = sc ? tierLabel(sc) : null;
              return (
                <div key={si} className="cd" style={{ padding: 20 }}>
                  <div style={{ marginBottom: 14 }}>
                    <p style={{ fontWeight: 600, fontSize: 14, color: "#1A1A1A", marginBottom: 2 }}>{s.name}</p>
                    <p style={{ fontSize: 12, color: "#888", lineHeight: 1.5 }}>{s.desc}</p>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={sc || 5}
                      aria-label={`${s.name} score`}
                      aria-valuetext={sc ? `${sc} — ${label}` : "unscored"}
                      onChange={(e) => scores.set(dom.id, si, Number(e.target.value))}
                      style={{ width: "100%", accentColor: sc ? color : "#CCC", height: 6, marginBottom: 10, cursor: "pointer", display: "block" }}
                    />
                    <div style={{ position: "relative", height: 16, marginTop: -4, padding: "0 12px" }}>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                        <span
                          key={n}
                          style={{
                            position: "absolute",
                            left: `calc(12px + ${(n - 1) / 9} * (100% - 24px))`,
                            transform: "translateX(-50%)",
                            fontSize: 11,
                            color: sc === n ? color : "#AAA",
                            fontWeight: sc === n ? 600 : 400
                          }}
                        >
                          {n}
                        </span>
                      ))}
                    </div>
                    {sc && (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, padding: "10px 14px", background: color + "15", borderLeft: `3px solid ${color}` }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color }}>{label}</span>
                        <span style={{ fontSize: 20, fontWeight: 300, color }}>{sc}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {scores.scoredCount > 0 && <Dashboard scores={scores} />}
      </div>
    </div>
  );
}

function Dashboard({ scores }) {
  const allScores = Object.values(scores.scores);
  const avg = (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(1);

  const tiers = TIERS.map((t) => ({
    ...t,
    count: allScores.filter((s) => {
      if (t.name === "Critical")  return s <= 2;
      if (t.name === "Neglected") return s >= 3 && s <= 4;
      if (t.name === "Adequate")  return s >= 5 && s <= 6;
      if (t.name === "Strong")    return s >= 7 && s <= 8;
      return s >= 9;
    }).length
  }));

  const date = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const domains = FRAMEWORK.map((d) => {
    const v = d.subs.map((_, si) => scores.get(d.id, si)).filter(Boolean);
    return {
      name: d.domain,
      avg: v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
    };
  });

  const allSubs = [];
  FRAMEWORK.forEach((d) => d.subs.forEach((s, si) => {
    const sc = scores.get(d.id, si);
    if (sc) allSubs.push({ domain: d.domain, sub: s.name, score: sc });
  }));
  const top3 = [...allSubs].sort((a, b) => b.score - a.score).slice(0, 3);
  const bot3 = [...allSubs].sort((a, b) => a.score - b.score).slice(0, 3);

  const validD = domains.filter((d) => d.avg !== null);
  const sortedD = [...validD].sort((a, b) => b.avg - a.avg);
  const strongest = sortedD[0];
  const weakest = sortedD[sortedD.length - 1];

  let insight = null;
  if (validD.length >= 2) {
    const gap = strongest.avg - weakest.avg;
    const oa = parseFloat(avg);
    if (gap > 3) {
      insight = `${strongest.name} is your strongest foundation (${strongest.avg.toFixed(1)}). ${weakest.name} is asking for your attention (${weakest.avg.toFixed(1)}). The imbalance between them is significant — closing this gap will likely have the largest effect on how you feel.`;
    } else if (oa >= 7) {
      insight = `You're in a generally strong place across the board. The lowest area, ${weakest.name} (${weakest.avg.toFixed(1)}), is still worth attention — even thriving lives have weak links.`;
    } else if (oa <= 4) {
      insight = `Multiple areas need attention right now. Don't try to fix everything. Pick the one that, if better, would change the most — likely ${weakest.name}.`;
    } else {
      insight = `Your strongest area is ${strongest.name} (${strongest.avg.toFixed(1)}). The area calling for focus is ${weakest.name} (${weakest.avg.toFixed(1)}). Start there.`;
    }
  }

  const onResetClick = () => {
    if (window.confirm("Clear every score? This cannot be undone.")) scores.reset();
  };

  return (
    <div style={{ marginTop: 32 }}>
      <div style={{ background: "#0F172A", color: "#F1F5F9", padding: "32px 28px", marginBottom: 8, position: "relative", border: "1px solid #1E293B" }}>
        <div style={{ height: 3, background: "#3B82F6", position: "absolute", top: 0, left: 0, right: 0 }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 24 }}>
          <p style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#3B82F6", fontWeight: 700 }}>Life Framework</p>
          <p style={{ fontSize: 11, color: "#64748B", letterSpacing: .5 }}>{date}</p>
        </div>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <p className="sf" style={{ fontSize: 80, fontWeight: 200, color: brightTierColor(parseFloat(avg)), lineHeight: .95, letterSpacing: -2 }}>{avg}</p>
          <p style={{ fontSize: 10, letterSpacing: 2, color: "#64748B", marginTop: 10, textTransform: "uppercase", fontWeight: 600 }}>
            Overall · {scores.scoredCount}/{TOTAL_SUBS}
          </p>
        </div>
        <div style={{ marginBottom: 24 }}>
          {domains.map((d, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 11 }}>
              <span style={{ fontSize: 12, color: "#CBD5E1", flex: "0 0 130px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</span>
              <div style={{ flex: 1, height: 6, background: "#1E293B", minWidth: 0 }}>
                <div style={{ height: "100%", width: d.avg ? `${d.avg * 10}%` : 0, background: d.avg ? brightTierColor(d.avg) : "#334155", transition: "width .3s" }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#fff", width: 32, textAlign: "right", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
                {d.avg ? d.avg.toFixed(1) : "—"}
              </span>
            </div>
          ))}
        </div>
        {strongest && weakest && (
          <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 18, borderTop: "1px solid #1E293B", gap: 16 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ color: "#64748B", marginBottom: 4, textTransform: "uppercase", letterSpacing: 1.2, fontSize: 10, fontWeight: 700 }}>Strongest</p>
              <p style={{ color: "#22C55E", fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{strongest.name}</p>
            </div>
            <div style={{ textAlign: "right", minWidth: 0, flex: 1 }}>
              <p style={{ color: "#64748B", marginBottom: 4, textTransform: "uppercase", letterSpacing: 1.2, fontSize: 10, fontWeight: 700 }}>Focus</p>
              <p style={{ color: "#EF4444", fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{weakest.name}</p>
            </div>
          </div>
        )}
      </div>
      <p style={{ textAlign: "center", fontSize: 11, color: "#999", marginBottom: 24, marginTop: 4, letterSpacing: .5 }}>↑ Screenshot to share</p>

      <div className="cd">
        <p style={{ fontWeight: 600, fontSize: 11, color: "#888", marginBottom: 14, textTransform: "uppercase", letterSpacing: .5 }}>Distribution</p>
        <div style={{ display: "flex", height: 32, marginBottom: 12 }}>
          {tiers.map((t) => t.count > 0 && (
            <div key={t.name} style={{ background: t.color, flex: t.count, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 600, minWidth: 36 }}>
              {t.count}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 11, color: "#666" }}>
          {tiers.map((t) => (
            <span key={t.name} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 8, height: 8, background: t.color, display: "inline-block" }} />
              {t.name} ({t.count})
            </span>
          ))}
        </div>
      </div>

      <div className="split">
        <div className="cd">
          <p style={{ fontWeight: 600, fontSize: 11, color: "#38A169", marginBottom: 14, textTransform: "uppercase", letterSpacing: .5 }}>Thriving</p>
          {top3.map((s, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < top3.length - 1 ? "1px solid #F0F0F0" : "none", gap: 8 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ fontSize: 13, color: "#333", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.sub}</p>
                <p style={{ fontSize: 11, color: "#999", marginTop: 2 }}>{s.domain}</p>
              </div>
              <span style={{ fontSize: 15, fontWeight: 600, color: tierColor(s.score), flexShrink: 0 }}>{s.score}</span>
            </div>
          ))}
        </div>
        <div className="cd">
          <p style={{ fontWeight: 600, fontSize: 11, color: "#C53030", marginBottom: 14, textTransform: "uppercase", letterSpacing: .5 }}>Focus here</p>
          {bot3.map((s, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < bot3.length - 1 ? "1px solid #F0F0F0" : "none", gap: 8 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ fontSize: 13, color: "#333", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.sub}</p>
                <p style={{ fontSize: 11, color: "#999", marginTop: 2 }}>{s.domain}</p>
              </div>
              <span style={{ fontSize: 15, fontWeight: 600, color: tierColor(s.score), flexShrink: 0 }}>{s.score}</span>
            </div>
          ))}
        </div>
      </div>

      {insight && (
        <div className="cd" style={{ background: "#EBF4FF", borderColor: "#BEE3F8" }}>
          <p style={{ fontWeight: 600, fontSize: 11, color: "#2B6CB0", marginBottom: 10, textTransform: "uppercase", letterSpacing: .5 }}>The pattern</p>
          <p style={{ fontSize: 14, color: "#1A4A7A", lineHeight: 1.7 }}>{insight}</p>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
        <button className="btn btn-danger" onClick={onResetClick}>Reset all scores</button>
      </div>
    </div>
  );
}
