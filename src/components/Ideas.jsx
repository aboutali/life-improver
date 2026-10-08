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

// The current focus as a selection, or null when there is none (or it is stale).
function fromFocus(current) {
  if (!current) return null;
  const domIdx = FRAMEWORK.findIndex((d) => d.id === current.domainId);
  if (domIdx < 0 || !FRAMEWORK[domIdx].subs[current.subIndex]) return null;
  return { domIdx, subIdx: current.subIndex };
}

export default function Ideas({ focus, checkins, navigate, query }) {
  const current = focus?.focus || null;
  // What the person chose, by link or by tapping. Until then the screen opens on
  // this week's focus, or on the first domain; the address is left alone.
  const [chosen, setChosen] = useState(() => fromQuery(query));
  const { domIdx, subIdx } = chosen || fromFocus(current) || { domIdx: 0, subIdx: 0 };

  // A link to another sub while this screen is open moves the selection.
  // Adjusted during render (not in an effect) when the query changes.
  const queryKey = `${query?.d ?? ""}|${query?.s ?? ""}`;
  const [seenKey, setSeenKey] = useState(queryKey);
  if (seenKey !== queryKey) {
    setSeenKey(queryKey);
    const next = fromQuery(query);
    if (next) setChosen(next);
  }

  const dom = FRAMEWORK[domIdx];
  const sub = dom.subs[subIdx];

  // P5: keep the chosen domain and sub pills in view on a narrow screen.
  const rootRef = useRef(null);
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    // Centre each active pill in its own scroller. scrollIntoView would also move
    // the keyboard's starting point, so Tab after a load would skip the skip link.
    for (const el of root.querySelectorAll(".dp.a, .sp.a")) {
      const box = el.parentElement;
      if (!box) continue;
      const a = el.getBoundingClientRect();
      const b = box.getBoundingClientRect();
      box.scrollLeft += a.left + a.width / 2 - (b.left + b.width / 2);
    }
  }, [domIdx, subIdx]);

  // P5: a manual choice updates the address, so a reload or a shared link keeps it.
  const choose = (nextDom, nextSub) => {
    if (nextDom === domIdx && nextSub === subIdx) return;
    setChosen({ domIdx: nextDom, subIdx: nextSub });
    navigate?.(`/practices?d=${FRAMEWORK[nextDom].id}&s=${nextSub}`, { replace: true, quiet: true });
  };

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
      <h2 className="t-large cat-title">{TOTAL_IDEAS} ways forward.</h2>
      <p className="t-sub cat-intro">Pick one. Make it part of your life. Then pick another. That's how this works.</p>
      <p className="cat-links">
        <a className="btn-text" href="#/framework">About the framework</a>
        <a className="btn-text" href="#/sources">Sources</a>
      </p>

      <div className="sh cat-chips">
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

      <div className="sh cat-chips">
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

      <div className="cat-subhead">
        <p className="t-title">{sub.name}</p>
        <p className="t-sub">{sub.desc}</p>
      </div>

      <div className="list">
        {sub.ideas.map((idea, i) => {
          const isCurrent =
            current && current.domainId === dom.id && current.subIndex === subIdx && current.practiceIndex === i;
          return (
            <div key={i} className="ir cat-row">
              <span className="cat-num">{String(i + 1).padStart(2, "0")}</span>
              <span className="cat-text">{idea}</span>
              {isCurrent ? (
                <span className="cat-tag">This week</span>
              ) : (
                <button
                  type="button"
                  className="cat-act"
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
    </div>
  );
}
