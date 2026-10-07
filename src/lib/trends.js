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
