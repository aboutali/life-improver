import { isoWeek } from "./dates.js";

// Scores over time for one subcategory. Check-ins are stored oldest first,
// and filtering keeps that order.
export function seriesFor(checkins, domainId, subIndex) {
  return checkins
    .filter((c) => c.domainId === domainId && c.subIndex === subIndex)
    .map((c) => ({ date: c.date, score: c.score }));
}

// Latest minus first. null until there are two points to compare.
export function changeSinceFirst(series) {
  if (series.length < 2) return null;
  return series[series.length - 1].score - series[0].score;
}

// True when any check-in belongs to the same ISO week as `today`
// ("YYYY-MM-DD" or Date).
export function hasCheckinThisWeek(checkins, today) {
  const week = isoWeek(today);
  return checkins.some((c) => (c.week || isoWeek(c.date)) === week);
}

// Number of distinct weeks with at least one check-in.
export function weeksActive(checkins) {
  return new Set(checkins.map((c) => c.week || isoWeek(c.date))).size;
}

// N7: what the garden shows for one domain. `scoreMap` is
// { "<domainId>-<subIndex>": 1..10 }, `quick` is { "<domainId>": 1..10 }.
// The full average is used when at least half the subs are rated; otherwise
// the quick score, if there is one. With neither, a partial average still
// shows, so a rating is never hidden. `partial` is true whenever some, but not
// all, subs are rated (the screen then says "n of m rated").
export function domainReading(domain, scoreMap = {}, quick = {}) {
  const values = domain.subs
    .map((_, si) => scoreMap[`${domain.id}-${si}`])
    .filter((v) => typeof v === "number");
  const rated = values.length;
  const total = domain.subs.length;
  const partial = rated > 0 && rated < total;
  const average = rated ? values.reduce((a, b) => a + b, 0) / rated : null;
  const q = quick[domain.id];

  let value = null;
  let source = null;
  if (rated > 0 && rated * 2 >= total) {
    value = average;
    source = "full";
  } else if (typeof q === "number") {
    value = q;
    source = "quick";
  } else if (rated > 0) {
    value = average;
    source = "full";
  }
  return { value, source, rated, total, partial };
}
