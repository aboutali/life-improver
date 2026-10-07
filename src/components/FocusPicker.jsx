import { FRAMEWORK } from "../data/framework.js";

// Where could the week's focus begin? The three lowest full-scored subs; when
// only quick scores exist, the subs of the lowest-rated domain.
function optionsFor(scores, quickScores) {
  if (scores.scoredCount > 0) {
    return scores
      .lowestSubs()
      .slice(0, 3)
      .map((s) => ({
        domainId: FRAMEWORK[s.di].id,
        subIndex: s.si,
        domainName: s.domain,
        name: s.sub,
        note: `${s.score}/10`,
      }));
  }
  let lowest = null;
  for (const d of FRAMEWORK) {
    const v = quickScores[d.id];
    if (typeof v === "number" && (lowest === null || v < lowest.v)) lowest = { d, v };
  }
  if (!lowest) return [];
  return lowest.d.subs.map((sub, subIndex) => ({
    domainId: lowest.d.id,
    subIndex,
    domainName: lowest.d.domain,
    name: sub.name,
    note: null,
  }));
}

// Shared "choose another" list, used by Today and Onboarding.
// `scores` is the useScores return; `quickScores` is a plain { domainId: 1..10 } map.
export default function FocusPicker({ scores, quickScores = {}, current, onPick, onClose }) {
  const options = optionsFor(scores, quickScores);
  const hint =
    scores.scoredCount > 0 ? "Your three lowest scores." : "The subjects within your lowest domain.";

  return (
    <div className="fp" role="group" aria-labelledby="fp-title">
      <h3 id="fp-title" className="sf fp-title">Choose where to begin</h3>
      <p className="fp-hint">{hint}</p>
      <ul className="fp-list">
        {options.map((o) => {
          const isCurrent =
            current && current.domainId === o.domainId && current.subIndex === o.subIndex;
          return (
            <li key={`${o.domainId}-${o.subIndex}`}>
              <button
                type="button"
                className="fp-opt"
                aria-current={isCurrent ? "true" : undefined}
                onClick={() => onPick(o.domainId, o.subIndex)}
              >
                <span className="fp-opt-main">
                  <span className="fp-eyebrow">{o.domainName}</span>
                  <span className="sf fp-name">{o.name}</span>
                </span>
                <span className="fp-opt-note">
                  {isCurrent ? "Suggested" : o.note}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <button type="button" className="btn btn-tap" onClick={onClose}>
        Keep the suggestion
      </button>
    </div>
  );
}
