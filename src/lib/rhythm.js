import { parseLocalDate, toLocalDate, daysBetween, isoWeek } from "./dates.js";

// The weekly rhythm: when the check-in opens, when a season is over, when
// someone has been away, and where calendar events begin. Pure functions;
// dates are local "YYYY-MM-DD" unless noted.

const DAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const CHECKIN_OPENS_AFTER_DAYS = 3;
export const SEASON_CHECKINS = 4;
export const LAPSE_DAYS = 14;

// "2026-10-07" + 3 -> "2026-10-10".
export function addDays(date, n) {
  const d = new Date(parseLocalDate(date).getTime());
  d.setDate(d.getDate() + n);
  return toLocalDate(d);
}

// "Friday" for a date string or Date.
export function weekdayName(date) {
  return DAYS_LONG[parseLocalDate(date).getDay()];
}

// "Sun 11 Oct" for a date string or Date.
export function formatShortDate(date) {
  const d = parseLocalDate(date);
  return `${DAYS_SHORT[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

// R1: the first check-in for a focus opens 3 days after it was planted.
export function checkinOpensOn(focus) {
  return addDays(focus.startedAt, CHECKIN_OPENS_AFTER_DAYS);
}

export function isCheckinOpen(focus, today) {
  return today >= checkinOpensOn(focus);
}

// R6 / P1: how many distinct ISO weeks hold a check-in on the focus sub since
// it began (or was last reviewed). Two entries in one week count once.
export function seasonCount(focus, checkins) {
  if (!focus) return 0;
  const since = focus.reviewedAt && focus.reviewedAt > focus.startedAt ? focus.reviewedAt : focus.startedAt;
  const weeks = new Set(
    checkins
      .filter((c) => c.domainId === focus.domainId && c.subIndex === focus.subIndex && c.date >= since)
      .map((c) => isoWeek(c.date))
  );
  return weeks.size;
}

export function seasonDue(focus, checkins) {
  return seasonCount(focus, checkins) >= SEASON_CHECKINS;
}

// R7: whole weeks since the last check-in when it is more than 14 days ago,
// else 0. Also 0 when there are no check-ins.
export function lapsedWeeks(checkins, today) {
  if (!checkins.length) return 0;
  const last = checkins.reduce((a, c) => (c.date > a ? c.date : a), checkins[0].date);
  const days = daysBetween(last, today);
  return days > LAPSE_DAYS ? Math.floor(days / 7) : 0;
}

// R2: the first moment on weekday `day` (0 = Sunday) at "HH:MM" local time
// whose date is at least `minDaysAhead` days after today's, and which is
// after `now`.
export function nextOccurrence(day, time, { now = new Date(), minDaysAhead = 0 } = {}) {
  const [h, m] = String(time || "00:00").split(":").map(Number);
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h || 0, m || 0, 0, 0);
  start.setDate(start.getDate() + minDaysAhead);
  start.setDate(start.getDate() + ((day - start.getDay() + 7) % 7));
  if (start.getTime() <= now.getTime()) start.setDate(start.getDate() + 7);
  return start;
}

// Practice event: tomorrow at 07:30.
export function defaultPracticeSlot(now = new Date()) {
  return { day: (now.getDay() + 1) % 7, time: "07:30", minDaysAhead: 1 };
}

// Check-in event: Sunday 18:00, at least 3 days after today.
export function defaultCheckinSlot() {
  return { day: 0, time: "18:00", minDaysAhead: CHECKIN_OPENS_AFTER_DAYS };
}

// "First one: Sun 11 Oct" text for a slot.
export function firstOneLabel({ day, time, minDaysAhead = 0 }, now = new Date()) {
  return `First one: ${formatShortDate(nextOccurrence(day, time, { now, minDaysAhead }))}`;
}
