import { FRAMEWORK } from "../data/framework.js";
import { daysBetween } from "./dates.js";

// How long a practice rests after being used in a check-in.
const REST_DAYS = 28;

// Pick the subcategory to tend this week.
// 1. Lowest full score (ties: earlier domain, then lower sub index).
// 2. Else lowest quick domain score (ties: earlier domain), sub 0.
// 3. Else null.
export function suggestFocus({ scores = {}, quick = {}, framework = FRAMEWORK } = {}) {
  let best = null;
  for (const domain of framework) {
    domain.subs.forEach((sub, subIndex) => {
      const score = scores[`${domain.id}-${subIndex}`];
      // Strict "<" keeps the first (earliest) entry on ties.
      if (typeof score === "number" && (best === null || score < best.score)) {
        best = { domainId: domain.id, subIndex, score, name: sub.name };
      }
    });
  }
  if (best) {
    return {
      domainId: best.domainId,
      subIndex: best.subIndex,
      reason: `Your lowest score: ${best.name} (${best.score}/10).`,
    };
  }

  let lowest = null;
  for (const domain of framework) {
    const score = quick[domain.id];
    if (typeof score === "number" && (lowest === null || score < lowest.score)) {
      lowest = { domainId: domain.id, score, name: domain.domain };
    }
  }
  if (lowest) {
    return {
      domainId: lowest.domainId,
      subIndex: 0,
      reason: `Your lowest domain: ${lowest.name} (${lowest.score}/10).`,
    };
  }
  return null;
}

// Pick the next practice for a sub: the lowest index that is not skipped and
// was not used in a check-in within the last 28 days.
export function suggestPractice({
  framework = FRAMEWORK,
  domainId,
  subIndex,
  checkins = [],
  skipped = [],
  today,
}) {
  const sub = framework.find((d) => d.id === domainId)?.subs[subIndex];
  const count = sub ? sub.ideas.length : 0;
  const all = Array.from({ length: count }, (_, i) => i);

  const notSkipped = all.filter((i) => !skipped.includes(i));
  const recent = new Set(
    checkins
      .filter((c) => c.domainId === domainId && c.subIndex === subIndex)
      .filter((c) => daysBetween(c.date, today) <= REST_DAYS)
      .map((c) => c.practiceIndex)
  );

  const fresh = notSkipped.filter((i) => !recent.has(i));
  if (fresh.length) {
    return { practiceIndex: fresh[0], reason: "A practice you have not tried lately." };
  }
  // Everything is skipped or recent: drop the 28-day rest, keep the skips.
  if (notSkipped.length) {
    return { practiceIndex: notSkipped[0], reason: "Returning to a practice worth repeating." };
  }
  return { practiceIndex: 0, reason: "Starting again from the first practice." };
}

// Swap away from the current practice: it joins `skipped`, a new one is picked.
// When that leaves nothing unskipped, the skips start over (just the current
// practice) and the next index after it, wrapping, is chosen, so a swap always
// changes the practice when the sub has more than one.
export function nextPractice(focus, framework = FRAMEWORK, checkins = [], today) {
  let skipped = [...(Array.isArray(focus.skipped) ? focus.skipped : [])];
  if (!skipped.includes(focus.practiceIndex)) skipped.push(focus.practiceIndex);

  const sub = framework.find((d) => d.id === focus.domainId)?.subs[focus.subIndex];
  const count = sub ? sub.ideas.length : 0;
  if (count > 0 && Array.from({ length: count }, (_, i) => i).every((i) => skipped.includes(i))) {
    skipped = [focus.practiceIndex];
    return { ...focus, practiceIndex: (focus.practiceIndex + 1) % count, skipped };
  }

  const { practiceIndex } = suggestPractice({
    framework,
    domainId: focus.domainId,
    subIndex: focus.subIndex,
    checkins,
    skipped,
    today,
  });
  return { ...focus, practiceIndex, skipped };
}

// Build a new Focus. Every screen that plants a focus uses this, so the
// shape stays one thing. `origin` says how the focus was chosen:
// "suggested" (the app's pick), "picked" (chosen from a list) or
// "practice" (adopted from the practice catalogue).
// Pass practiceIndex to adopt a specific practice; else one is suggested.
export function makeFocus({
  domainId,
  subIndex,
  practiceIndex,
  origin = "suggested",
  today,
  checkins = [],
  framework = FRAMEWORK,
}) {
  const index =
    typeof practiceIndex === "number"
      ? practiceIndex
      : suggestPractice({ framework, domainId, subIndex, checkins, skipped: [], today }).practiceIndex;
  return { domainId, subIndex, practiceIndex: index, startedAt: today, skipped: [], origin };
}

// The "Suggested" list in the focus picker: up to three subs. The lowest full
// scores come first (ties: earlier domain, then lower sub index). When fewer
// than three are scored, sub 0 of the lowest quick-rated domains not yet
// represented tops the list up (ties: earlier domain).
// `scores` is the { "<domainId>-<subIndex>": 1..10 } map, `quick` is
// { "<domainId>": 1..10 }, `current` is a focus-like { domainId, subIndex }.
export function pickerSuggestions({
  scores = {},
  quick = {},
  framework = FRAMEWORK,
  current = null,
  limit = 3,
} = {}) {
  const isCurrent = (domainId, subIndex) =>
    Boolean(current) && current.domainId === domainId && current.subIndex === subIndex;

  const full = [];
  framework.forEach((domain, di) => {
    domain.subs.forEach((sub, si) => {
      const score = scores[`${domain.id}-${si}`];
      if (typeof score === "number") full.push({ domain, di, sub, si, score });
    });
  });
  full.sort((a, b) => a.score - b.score || a.di - b.di || a.si - b.si);

  const picks = full.slice(0, limit).map(({ domain, sub, si, score }) => ({
    domainId: domain.id,
    subIndex: si,
    domainName: domain.domain,
    name: sub.name,
    score,
    source: "full",
    current: isCurrent(domain.id, si),
  }));

  if (picks.length < limit) {
    const represented = new Set(picks.map((p) => p.domainId));
    framework
      .map((domain, di) => ({ domain, di, score: quick[domain.id] }))
      .filter((q) => typeof q.score === "number" && !represented.has(q.domain.id) && q.domain.subs.length > 0)
      .sort((a, b) => a.score - b.score || a.di - b.di)
      .slice(0, limit - picks.length)
      .forEach(({ domain, score }) => {
        picks.push({
          domainId: domain.id,
          subIndex: 0,
          domainName: domain.domain,
          name: domain.subs[0].name,
          score,
          source: "quick",
          current: isCurrent(domain.id, 0),
        });
      });
  }
  return picks;
}

// F5: another scored sub sits at least 2 points below the focus sub. Returns
// { domainId, subIndex, score } for the lowest such sub (ties: earlier domain,
// then lower sub index), or null. Needs a full score on the focus sub. A nudge
// the person dismissed ({ key, score } on the focus) stays hidden until that
// sub's score changes.
export function lowerSubNudge({ scores = {}, focus, framework = FRAMEWORK } = {}) {
  if (!focus) return null;
  const focusScore = scores[`${focus.domainId}-${focus.subIndex}`];
  if (typeof focusScore !== "number") return null;

  let lowest = null;
  for (const domain of framework) {
    domain.subs.forEach((_, subIndex) => {
      if (domain.id === focus.domainId && subIndex === focus.subIndex) return;
      const score = scores[`${domain.id}-${subIndex}`];
      // Strict "<" keeps the earliest entry on ties.
      if (typeof score === "number" && (lowest === null || score < lowest.score)) {
        lowest = { domainId: domain.id, subIndex, score };
      }
    });
  }
  if (!lowest || focusScore - lowest.score < 2) return null;

  const dismissed = focus.dismissedNudge;
  if (
    dismissed &&
    dismissed.key === `${lowest.domainId}-${lowest.subIndex}` &&
    dismissed.score === lowest.score
  ) {
    return null;
  }
  return lowest;
}
