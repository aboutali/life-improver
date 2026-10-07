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
export function nextPractice(focus, framework = FRAMEWORK, checkins = [], today) {
  const skipped = [...(focus.skipped || [])];
  if (!skipped.includes(focus.practiceIndex)) skipped.push(focus.practiceIndex);
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
