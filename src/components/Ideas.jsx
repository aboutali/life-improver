import { useEffect, useRef, useState } from "react";
import { FRAMEWORK, TOTAL_IDEAS } from "../data/framework.js";
import { makeFocus } from "../lib/recommend.js";
import { toLocalDate } from "../lib/dates.js";

// "?d=<domainId>&s=<subIndex>" -> { domIdx, subIdx }, or null when not valid.
function fromQuery(query) {
  if (!query || query.d === undefined) return null;
  const domIdx = FRAMEWORK.findIndex((d) => String(d.id) === String(query.d));
  if (domIdx < 0) return null;
  const subs = FRAMEWORK[domIdx].subs;
  const s = query.s === undefined ? 0 : Number(query.s);
  const subIdx = Number.isInteger(s) && s >= 0 && s < subs.length ? s : 0;
  return { domIdx, subIdx };
}

export default function Ideas({ focus, checkins, navigate, query }) {
  const initial = fromQuery(query);
  const [domIdx, setDomIdx] = useState(initial ? initial.domIdx : null);
  const [subIdx, setSubIdx] = useState(initial ? initial.subIdx : 0);

  // A link to another sub while this screen is open moves the selection.
  // Adjusted during render (not in an effect) when the query changes.
  const queryKey = `${query?.d ?? ""}|${query?.s ?? ""}`;
  const [seenKey, setSeenKey] = useState(queryKey);
  if (seenKey !== queryKey) {
    setSeenKey(queryKey);
    const next = fromQuery(query);
    if (next) {
      setDomIdx(next.domIdx);
      setSubIdx(next.subIdx);
    }
  }

  const dom = domIdx !== null ? FRAMEWORK[domIdx] : null;
  const sub = dom ? dom.subs[subIdx] : null;

  // P5: keep the chosen domain and sub pills in view on a narrow screen.
  const rootRef = useRef(null);
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    for (const el of root.querySelectorAll(".dp.a, .sp.a")) {
      if (typeof el.scrollIntoView === "function") el.scrollIntoView({ inline: "center", block: "nearest" });
    }
  }, [domIdx, subIdx]);

  // P5: a manual choice updates the address, so a reload or a shared link keeps it.
  const choose = (nextDom, nextSub) => {
    if (nextDom === domIdx && nextSub === subIdx) return;
    setDomIdx(nextDom);
    setSubIdx(nextSub);
    navigate?.(`/practices?d=${FRAMEWORK[nextDom].id}&s=${nextSub}`, { replace: true, quiet: true });
  };

  const current = focus?.focus || null;
  const adopt = (practiceIndex) => {
    if (current && current.domainId === dom.id && current.subIndex === subIdx) {
      // P2: the same sub keeps its clock, review and nudge choice; only the practice changes.
      focus?.setFocus({ ...current, practiceIndex, skipped: [] });
    } else {
      focus?.setFocus(
        makeFocus({
          domainId: dom.id,
          subIndex: subIdx,
          practiceIndex,
          origin: "practice",
          today: toLocalDate(),
          checkins: checkins?.checkins || [],
        })
      );
    }
    navigate?.("/");
  };

  return (
    <div ref={rootRef}>
      <div style={{ marginBottom: 24 }}>
        <h2 className="sf cat-title">{TOTAL_IDEAS} ways forward.</h2>
        <p style={{ fontSize: 14, color: "#666", maxWidth: 600 }}>
          Pick one. Make it part of your life. Then pick another. That's how this works.
        </p>
        <p className="cat-links">
          <a href="#/framework">About the framework</a>
          <span aria-hidden="true"> &middot; </span>
          <a href="#/sources">Sources</a>
        </p>
      </div>

      <div className="sh" style={{ display: "flex", gap: 8, marginBottom: 24, paddingBottom: 4 }}>
        {FRAMEWORK.map((d, i) => (
          <button
            key={d.id}
            className={`dp ${domIdx === i ? "a" : ""}`}
            onClick={() => choose(i, 0)}
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
                  onClick={() => choose(domIdx, si)}
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
              {sub.ideas.map((idea, i) => {
                const isCurrent =
                  current && current.domainId === dom.id && current.subIndex === subIdx && current.practiceIndex === i;
                return (
                  <div key={i} className="ir cat-row">
                    <span style={{ color: "#2B6CB0", fontWeight: 600, fontSize: 13, minWidth: 24, paddingTop: 1 }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="cat-text">{idea}</span>
                    {isCurrent ? (
                      <span className="cat-tag">This week</span>
                    ) : (
                      <button
                        type="button"
                        className="btn-text cat-act"
                        aria-label={`Practise this week: ${idea}`}
                        onClick={() => adopt(i)}
                      >
                        Practise this week
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
