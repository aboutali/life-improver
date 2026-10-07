import { FRAMEWORK } from "../data/framework.js";

// Seven quiet bars: one per domain. Full-assessment averages where they exist,
// quick scores otherwise. The caption says which source is on show.
export default function Garden({ scores, quickScores = {} }) {
  const rows = FRAMEWORK.map((d, di) => {
    const full = scores.domainAverage(di);
    if (full !== null) return { id: d.id, name: d.domain, value: Number(full), source: "full" };
    const q = quickScores[d.id];
    if (typeof q === "number") return { id: d.id, name: d.domain, value: q, source: "quick" };
    return { id: d.id, name: d.domain, value: null, source: null };
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
      <h3 id="garden-title" className="sf garden-title">Your garden</h3>
      <p className="garden-cap">{caption}</p>
      <ul className="garden-list">
        {rows.map((r) => (
          <li key={r.id} className="garden-row">
            <span className="garden-name">{r.name}</span>
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
                <span aria-label="not rated">–</span>
              ) : (
                <>
                  {r.value % 1 === 0 ? r.value : r.value.toFixed(1)}
                  <span className="sr-only"> out of 10{r.source === "quick" ? ", quick score" : ""}</span>
                </>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
