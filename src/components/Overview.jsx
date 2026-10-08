import { useState } from "react";
import { FRAMEWORK } from "../data/framework.js";

function Chevron() {
  return (
    <svg className="chev" width="8" height="14" viewBox="0 0 8 14" fill="none" aria-hidden="true">
      <path d="M1 1l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Overview() {
  const [expanded, setExpanded] = useState({});

  return (
    <div>
      <h2 className="t-large cat-title">The seven dimensions.</h2>
      <p className="t-sub cat-intro">Every meaningful life moves between these seven. Tap any to see what's inside.</p>

      <div className="list cat-fw">
        {FRAMEWORK.map((d, i) => (
          <div key={d.id} className={`cat-dim${expanded[i] ? " open" : ""}`}>
            <button
              type="button"
              className="row cat-oh"
              aria-expanded={!!expanded[i]}
              aria-controls={`dim-${d.id}`}
              onClick={() => setExpanded((p) => ({ ...p, [i]: !p[i] }))}
            >
              <span className="cat-oh-text">
                <span className="t-head">{d.domain}</span>
                <span className="t-foot">
                  {d.subs.length} subcategories · {d.subs.reduce((a, s) => a + s.ideas.length, 0)} practices
                </span>
              </span>
              <Chevron />
            </button>
            {expanded[i] && (
              <div className="cat-ob" id={`dim-${d.id}`}>
                <p className="t-sub cat-ob-desc">{d.desc}</p>
                <div className="cat-subs">
                  {d.subs.map((s, si) => (
                    <a
                      key={si}
                      className="row cat-sublink"
                      href={`#/practices?d=${d.id}&s=${si}`}
                      aria-label={s.name}
                      aria-describedby={`sub-${d.id}-${si}`}
                    >
                      <span className="cat-oh-text">
                        <span className="t-head">{s.name}</span>
                        <span className="t-foot" id={`sub-${d.id}-${si}`}>{s.desc}</span>
                      </span>
                      <Chevron />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
