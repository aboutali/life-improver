import { useState } from "react";
import { FRAMEWORK, TOTAL_SUBS } from "../data/framework.js";
import ShareButton from "./ShareButton.jsx";
import { makeFocus } from "../lib/recommend.js";
import { toLocalDate } from "../lib/dates.js";

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

export default function SelfAssessment({ scores, focus, checkins, navigate }) {
  const [domIdx, setDomIdx] = useState(null);
  const dom = domIdx !== null ? FRAMEWORK[domIdx] : null;

  return (
    <div>
      <h2 className="t-large cat-title">How are you, really?</h2>
      <p className="t-sub cat-intro">
        Pick a domain. Drag each slider to where you honestly stand. The lowest scores aren't problems — they're where to begin.
      </p>

      <div className="sh cat-chips">
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
          <div className="cd cat-empty">
            <p className="t-title">Pick a domain to start.</p>
            <p className="t-sub">Choose any of the seven above. Rate it honestly. Repeat.</p>
          </div>
        ) : (
          <>
            <div className="cat-subhead">
              <p className="t-title">{dom.domain}</p>
              <p className="t-sub">{dom.desc.split(".").slice(0, 2).join(".") + "."}</p>
            </div>

            <div className="cd cat-legend">
              <p className="t-eyebrow">How to rate</p>
              <ul className="cat-tiers">
                {TIERS.map((t) => (
                  <li key={t.name}>
                    <span className="cat-dot" style={{ background: t.color }} />
                    <span className="t-foot">
                      <strong className="cat-tier-name">{t.name} · {t.range}</strong> — {t.desc}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {dom.subs.map((s, si) => {
              const sc = scores.get(dom.id, si);
              const color = sc ? tierColor(sc) : null;
              const label = sc ? tierLabel(sc) : null;
              return (
                <div key={si} className="cd cat-rate">
                  <p className="t-head">{s.name}</p>
                  <p className="t-foot">{s.desc}</p>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={sc || 5}
                    className={`slider${sc ? "" : " unset"}`}
                    style={{ "--tier": color || "var(--text-3)", "--pct": `${(((sc || 5) - 1) / 9) * 100}%` }}
                    aria-label={`${s.name} score`}
                    aria-valuetext={sc ? `${sc} — ${label}` : "unscored"}
                    onChange={(e) => scores.set(dom.id, si, Number(e.target.value))}
                  />
                  <div className="cat-readout">
                    {sc ? (
                      <>
                        <span className="cat-pill" style={{ background: color + "22" }}>
                          <span className="cat-dot" style={{ background: color }} />
                          {label}
                        </span>
                        <span className="cat-score sf">{sc}</span>
                      </>
                    ) : (
                      <span className="cat-pill cat-pill-idle">Drag to rate</span>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {scores.scoredCount > 0 && <Dashboard scores={scores} focus={focus} checkins={checkins} navigate={navigate} />}
      </div>
    </div>
  );
}

function Dashboard({ scores, focus, checkins, navigate }) {
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
    if (sc) allSubs.push({ domainId: d.id, subIndex: si, domain: d.domain, sub: s.name, score: sc });
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

  const current = focus?.focus || null;
  const makeThisMyFocus = (s) => {
    focus?.setFocus(
      makeFocus({
        domainId: s.domainId,
        subIndex: s.subIndex,
        origin: "picked",
        today: toLocalDate(),
        checkins: checkins?.checkins || [],
      })
    );
    navigate?.("/");
  };

  const onResetClick = () => {
    if (window.confirm("Clear every score? This cannot be undone.")) scores.reset();
  };

  const subRow = (s, i, withAction) => {
    const isFocus = current && current.domainId === s.domainId && current.subIndex === s.subIndex;
    return (
      <div key={i} className="row cat-drow">
        <div className="cat-drow-text">
          <p className="t-head cat-clip">{s.sub}</p>
          <p className="t-foot cat-clip">{s.domain}</p>
        </div>
        <span className="cat-dscore" style={{ color: tierColor(s.score) }}>{s.score}</span>
        {withAction && !isFocus && (
          <button
            type="button"
            className="btn cat-pick"
            aria-label={`Make this my focus: ${s.sub}`}
            onClick={() => makeThisMyFocus(s)}
          >
            Make this my focus
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="cat-dash">
      <button type="button" className="btn btn-primary btn-block cat-toweek" onClick={() => navigate?.("/")}>
        See this week&apos;s focus
      </button>

      <div className="cat-hero">
        <div className="cat-hero-top">
          <p className="cat-hero-eyebrow">Life Framework</p>
          <p className="cat-hero-date">{date}</p>
        </div>
        <div className="cat-hero-score">
          <p className="sf cat-hero-num" style={{ color: brightTierColor(parseFloat(avg)) }}>{avg}</p>
          <p className="cat-hero-cap">Overall · {scores.scoredCount}/{TOTAL_SUBS}</p>
        </div>
        <div className="cat-bars">
          {domains.map((d, i) => (
            <div key={i} className="cat-bar">
              <span className="cat-bar-name">{d.name}</span>
              <div className="cat-bar-track">
                <div style={{ height: "100%", borderRadius: 3, width: d.avg ? `${d.avg * 10}%` : 0, background: d.avg ? brightTierColor(d.avg) : "#334155", transition: "width .3s" }} />
              </div>
              <span className="cat-bar-val">{d.avg ? d.avg.toFixed(1) : "—"}</span>
            </div>
          ))}
        </div>
        {strongest && weakest && (
          <div className="cat-hero-foot">
            <div className="cat-hero-col">
              <p className="cat-hero-eyebrow cat-muted">Strongest</p>
              <p className="cat-hero-name" style={{ color: "#22C55E" }}>{strongest.name}</p>
            </div>
            <div className="cat-hero-col cat-right">
              <p className="cat-hero-eyebrow cat-muted">Focus</p>
              <p className="cat-hero-name" style={{ color: "#F87171" }}>{weakest.name}</p>
            </div>
          </div>
        )}
      </div>

      <ShareButton domains={domains} overall={avg} />

      <div className="cd">
        <p className="t-eyebrow cat-card-title">Distribution</p>
        <div className="cat-dist">
          {tiers.map((t) => t.count > 0 && (
            <div key={t.name} style={{ background: t.color, flex: t.count }}>{t.count}</div>
          ))}
        </div>
        <div className="cat-dist-legend">
          {tiers.map((t) => (
            <span key={t.name} className="t-foot">
              <span className="cat-dot" style={{ background: t.color }} />
              {t.name} ({t.count})
            </span>
          ))}
        </div>
      </div>

      <div className="cat-lists">
        <section>
          <h3 className="t-eyebrow list-title cat-focus-title">Focus here</h3>
          <div className="list">{bot3.map((s, i) => subRow(s, i, true))}</div>
        </section>
        <section>
          <h3 className="t-eyebrow list-title cat-thrive-title">Thriving</h3>
          <div className="list">{top3.map((s, i) => subRow(s, i, false))}</div>
        </section>
      </div>

      {insight && (
        <div className="cd cat-insight">
          <p className="t-eyebrow cat-card-title">The pattern</p>
          <p className="t-body">{insight}</p>
        </div>
      )}

      <button className="btn btn-danger btn-block cat-reset" onClick={onResetClick}>Reset all scores</button>
    </div>
  );
}
