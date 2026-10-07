// Date helpers. All dates are LOCAL calendar dates written "YYYY-MM-DD".
// Never go through toISOString() — it shifts to UTC and can change the day.

const pad = (n) => String(n).padStart(2, "0");

// "2026-10-07" -> Date at local midnight. Date objects pass through.
export function parseLocalDate(value) {
  if (value instanceof Date) return value;
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Date -> "YYYY-MM-DD" in local time.
export function toLocalDate(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// ISO 8601 week id ("2026-W41"): weeks start Monday, and week 1 is the week
// holding the year's first Thursday. Accepts a Date or "YYYY-MM-DD".
export function isoWeek(date = new Date()) {
  const local = parseLocalDate(date);
  // Work in UTC from the local Y/M/D so DST never moves the day.
  const d = new Date(Date.UTC(local.getFullYear(), local.getMonth(), local.getDate()));
  const dayNum = d.getUTCDay() || 7; // Mon=1 .. Sun=7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // jump to this week's Thursday
  const year = d.getUTCFullYear(); // the Thursday decides the ISO year
  const yearStart = Date.UTC(year, 0, 1);
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${year}-W${pad(week)}`;
}

// Whole days from a to b (positive when b is later). Both "YYYY-MM-DD".
export function daysBetween(a, b) {
  const toUtc = (s) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(b) - toUtc(a)) / 86400000);
}
