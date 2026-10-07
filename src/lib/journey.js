import { isoWeek, parseLocalDate, toLocalDate } from "./dates.js";

// Pure helpers for the check-in reward and the Journey log.

// How many weeks the Journey log shows before "Show earlier weeks".
export const MAX_WEEKS = 6;

const addDays = (date, n) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);

// The next Sunday after `today` ("YYYY-MM-DD"). On a Sunday it is the
// following Sunday, never today.
export function nextCheckinDate(today) {
  const d = parseLocalDate(today);
  const add = d.getDay() === 0 ? 7 : 7 - d.getDay();
  return toLocalDate(addDays(d, add));
}

// "Sunday" for a "YYYY-MM-DD" date.
export function weekdayName(date) {
  return parseLocalDate(date).toLocaleDateString("en-US", { weekday: "long" });
}

// A newcomer has no quick scores and no full scores.
export function isNewcomer(quick, scoredCount) {
  const hasQuick = Object.keys(quick || {}).length > 0;
  return !hasQuick && !(scoredCount > 0);
}

const weekOf = (c) => c.week || isoWeek(c.date);

// Monday of an ISO week id ("2026-W41") as a local Date. Falls back to the
// Monday of `fallbackDate` when the id cannot be read.
export function mondayOfWeek(weekId, fallbackDate) {
  const m = /^(\d{4})-W(\d{2})$/.exec(weekId || "");
  if (m) {
    const year = Number(m[1]);
    const week = Number(m[2]);
    const jan4 = new Date(year, 0, 4);
    const dow = jan4.getDay() || 7;
    return addDays(jan4, -(dow - 1) + (week - 1) * 7);
  }
  const d = parseLocalDate(fallbackDate);
  return addDays(d, -((d.getDay() || 7) - 1));
}

// "Week of Oct 5"
export function weekHeading(monday) {
  return `Week of ${monday.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

// Group the log by ISO week, newest week first. Inside a week, newest entry
// first. Entries after the first one of a week are marked `later: true`.
// `list` is the stored check-ins, oldest first.
export function groupLogByWeek(list) {
  const byWeek = new Map();
  list.forEach((checkin, index) => {
    const week = weekOf(checkin);
    if (!byWeek.has(week)) byWeek.set(week, []);
    byWeek.get(week).push({ checkin, index });
  });
  return [...byWeek.entries()]
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([week, items]) => {
      const oldestFirst = [...items].sort(
        (a, b) => (a.checkin.date < b.checkin.date ? -1 : a.checkin.date > b.checkin.date ? 1 : a.index - b.index)
      );
      const entries = oldestFirst.map(({ checkin }, i) => ({ checkin, later: i > 0 })).reverse();
      const monday = mondayOfWeek(week, oldestFirst[0].checkin.date);
      return { week, heading: weekHeading(monday), entries };
    });
}

// Score series for one sub with the latest check-in of each week, oldest
// week first. Several entries in one week count once.
export function weeklySeriesFor(list, domainId, subIndex) {
  const latest = new Map();
  list.forEach((c) => {
    if (c.domainId !== domainId || c.subIndex !== subIndex) return;
    const week = weekOf(c);
    const prev = latest.get(week);
    if (!prev || c.date >= prev.date) latest.set(week, c);
  });
  return [...latest.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([, c]) => ({ date: c.date, score: c.score }));
}
