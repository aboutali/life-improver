import { FRAMEWORK } from "../data/framework.js";
import { domainReading } from "../lib/trends.js";

// Seven quiet bars: one per domain. The full-assessment average once at least
// half the domain's subs are rated, the quick score otherwise; a partly rated
// domain says "n of m rated". The caption says which source is on show, and the
// focus domain is drawn a little stronger than the rest. Bar colours live in CSS.
export default function Garden({ scores, quickScores = {}, focusDomainId = null }) {
  const rows = FRAMEWORK.map((d) => {
    const r = domainReading(d, scores.scores, quickScores);
    return { id: d.id, name: d.domain, ...r };
  });

  const hasFull = rows.some((r) => r.source === "full");
  const hasQuick = rows.some((r) => r.source === "quick");
  const caption = hasFull && hasQuick
    ? "Full assessment averages, with quick scores where a domain is not yet rated."
    : hasFull
      ? "Averages from your full assessment."
      : hasQuick
        ? "From your quick scores."
        : "Nothing rated yet.";

  return (
    <section className="cd garden" aria-labelledby="garden-title">
      <h3 id="garden-title" className="t-title">Your garden</h3>
      <p className="t-foot garden-cap">{caption}</p>
      <ul className="garden-list">
        {rows.map((r) => {
          const isFocus = r.id === focusDomainId;
          return (
            <li key={r.id} className={`garden-row${isFocus ? " focus" : ""}`}>
              <span className="garden-name">
                {r.name}
                {isFocus && <span className="sr-only">, this week&rsquo;s focus</span>}
                {r.source === "quick" && <span className="garden-tag" aria-hidden="true">quick</span>}
                {r.partial && <span className="t-foot garden-partial">{r.rated} of {r.total} rated</span>}
              </span>
              <span className="garden-track" aria-hidden="true">
                {r.value !== null && (
                  <span
                    className={`garden-fill${r.source === "quick" ? " quick" : ""}`}
                    style={{ width: `${r.value * 10}%` }}
                  />
                )}
              </span>
              <span className="garden-val">
                {r.value === null ? (
                  <>
                    <span aria-hidden="true">&ndash;</span>
                    <span className="sr-only">not rated</span>
                  </>
                ) : (
                  <>
                    {r.value.toFixed(1)}
                    <span className="sr-only"> out of 10{r.source === "quick" ? ", quick score" : ""}</span>
                  </>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
