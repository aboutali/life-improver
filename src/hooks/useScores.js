import { usePersistentState } from "./usePersistentState.js";
import { FRAMEWORK } from "../data/framework.js";

const STORAGE_KEY = "life-improver:scores:v1";

// Score keys are `${domainId}-${subIndex}` so they survive sub reordering by
// position only — renaming or removing a sub will orphan a stored score.
const key = (domainId, subIndex) => `${domainId}-${subIndex}`;

export function useScores() {
  const [scores, setScores] = usePersistentState(STORAGE_KEY, {});

  const get = (domainId, subIndex) => scores[key(domainId, subIndex)] || null;

  const set = (domainId, subIndex, value) =>
    setScores(prev => ({ ...prev, [key(domainId, subIndex)]: value }));

  const clear = (domainId, subIndex) =>
    setScores(prev => {
      const next = { ...prev };
      delete next[key(domainId, subIndex)];
      return next;
    });

  const reset = () => setScores({});

  const domainAverage = (domainIndex) => {
    const d = FRAMEWORK[domainIndex];
    if (!d) return null;
    const values = d.subs.map((_, si) => get(d.id, si)).filter(Boolean);
    return values.length
      ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)
      : null;
  };

  const overallAverage = () => {
    const values = Object.values(scores);
    return values.length
      ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)
      : null;
  };

  // All scored subs sorted ascending — the lowest are "where the water wants
  // to go" in the original copy.
  const lowestSubs = () => {
    const all = [];
    FRAMEWORK.forEach((d, di) =>
      d.subs.forEach((s, si) => {
        const sc = get(d.id, si);
        if (sc) all.push({ domain: d.domain, sub: s.name, score: sc, di, si });
      })
    );
    return all.sort((a, b) => a.score - b.score);
  };

  const scoredCount = Object.keys(scores).length;

  return { scores, get, set, clear, reset, domainAverage, overallAverage, lowestSubs, scoredCount };
}
