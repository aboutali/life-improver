import { useEffect, useId, useRef, useState } from "react";
import { FRAMEWORK } from "../data/framework.js";
import { pickerSuggestions } from "../lib/recommend.js";
import { Chevron } from "./TodayIcons.jsx";

// Shared "choose where to begin" list, used by Today and Onboarding.
// Two parts: "Suggested" (three subs from what has been rated) and "All areas"
// (the seven domains as groups that open to every sub).
// `scores` is the useScores return; `quickScores` is a plain { domainId: 1..10 } map.
// `current` is { domainId, subIndex } or null; it is marked in both parts.
export default function FocusPicker({
  scores,
  quickScores = {},
  current,
  onPick,
  onClose,
  currentLabel = "Suggested",
  closeLabel = "Keep the suggestion",
  framework = FRAMEWORK,
}) {
  const uid = useId();
  const headingRef = useRef(null);
  // The group holding the current sub starts open, so it can be seen in place.
  const [open, setOpen] = useState(() => (current ? [current.domainId] : []));
  // Opening the picker moves focus to its heading so keyboard and screen-reader
  // users land on the new content.
  useEffect(() => {
    if (headingRef.current) headingRef.current.focus();
  }, []);

  const scoreMap = scores.scores || {};
  const suggestions = pickerSuggestions({ scores: scoreMap, quick: quickScores, framework, current });
  const hint = suggestions.some((s) => s.source === "full")
    ? "Where the water wants to go."
    : "From your first ratings.";
  const isCurrent = (domainId, subIndex) =>
    Boolean(current) && current.domainId === domainId && current.subIndex === subIndex;
  const toggle = (id) => setOpen((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]));

  return (
    <div className="fp" role="group" aria-labelledby={`${uid}-title`}>
      <h3 id={`${uid}-title`} ref={headingRef} tabIndex={-1} className="t-title fp-title">Choose where to begin</h3>

      {suggestions.length > 0 && (
        <section aria-labelledby={`${uid}-sug`}>
          <h4 id={`${uid}-sug`} className="t-eyebrow fp-part">Suggested</h4>
          <p className="t-foot fp-hint">{hint}</p>
          <ul className="list fp-list">
            {suggestions.map((o) => (
              <li key={`${o.domainId}-${o.subIndex}`}>
                <button
                  type="button"
                  className="row fp-opt"
                  aria-current={o.current ? "true" : undefined}
                  onClick={() => onPick(o.domainId, o.subIndex)}
                >
                  <span className="fp-opt-main">
                    <span className="t-eyebrow">{o.domainName}</span>
                    <span className="t-head fp-name">{o.name}</span>
                  </span>
                  <span className="t-foot fp-opt-note">
                    {o.current ? currentLabel : o.source === "quick" ? `${o.score}/10 quick` : `${o.score}/10`}
                  </span>
                  <Chevron />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby={`${uid}-all`}>
        <h4 id={`${uid}-all`} className="t-eyebrow fp-part">All areas</h4>
        <ul className="list fp-groups">
          {framework.map((d) => {
            const isOpen = open.includes(d.id);
            const panelId = `${uid}-g${d.id}`;
            return (
              <li key={d.id}>
                <button
                  type="button"
                  className="row fp-group"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => toggle(d.id)}
                >
                  <span className="t-head">{d.domain}</span>
                  <Chevron />
                </button>
                {isOpen && (
                  <ul id={panelId} className="fp-subs">
                    {d.subs.map((sub, si) => {
                      const mine = isCurrent(d.id, si);
                      const score = scoreMap[`${d.id}-${si}`];
                      return (
                        <li key={si}>
                          <button
                            type="button"
                            className="row fp-opt fp-sub"
                            aria-current={mine ? "true" : undefined}
                            onClick={() => onPick(d.id, si)}
                          >
                            <span className="fp-name">{sub.name}</span>
                            <span className="t-foot fp-opt-note">
                              {mine ? currentLabel : typeof score === "number" ? `${score}/10` : ""}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <button type="button" className="btn btn-block fp-close" onClick={onClose}>
        {closeLabel}
      </button>
    </div>
  );
}
