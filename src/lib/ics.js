// Minimal RFC 5545 calendar events for the weekly check-in and practice.

const CRLF = "\r\n";
const encoder = new TextEncoder();

// Escape TEXT values: backslash first, then ; , and newlines.
function escapeText(text = "") {
  return String(text)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

// Fold a content line so no physical line exceeds 75 octets (UTF-8). Each
// continuation starts with one space, which counts toward the 75. Folds
// never split a multi-byte character.
export function foldLine(line) {
  const parts = [];
  let current = "";
  let size = 0;
  let limit = 75;
  for (const ch of line) {
    const bytes = encoder.encode(ch).length;
    if (size + bytes > limit) {
      parts.push(current);
      current = " ";
      size = 1;
      limit = 75;
    }
    current += ch;
    size += bytes;
  }
  parts.push(current);
  return parts.join(CRLF);
}

// Date -> "YYYYMMDDTHHMMSSZ" in UTC.
function utcStamp(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

// Date -> "YYYYMMDDTHHMMSS" as floating local time (no Z, no TZID), built from
// local getters. A weekly reminder then stays at the same wall-clock time
// across daylight saving changes.
function localStamp(date) {
  const p = (n, w = 2) => String(n).padStart(w, "0");
  return (
    `${p(date.getFullYear(), 4)}${p(date.getMonth() + 1)}${p(date.getDate())}` +
    `T${p(date.getHours())}${p(date.getMinutes())}${p(date.getSeconds())}`
  );
}

// Build a VCALENDAR string holding one VEVENT. DTSTART/DTEND are floating local
// time; DTSTAMP is UTC. `now` only exists so tests can pin DTSTAMP.
export function buildEvent({
  uid = `${Date.now().toString(36)}@life-improver`,
  title,
  description,
  url,
  start,
  durationMin = 15,
  rrule,
  now = new Date(),
}) {
  const end = new Date(start.getTime() + durationMin * 60000);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Life Improver//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${utcStamp(now)}`,
    `DTSTART:${localStamp(start)}`,
    `DTEND:${localStamp(end)}`,
    `SUMMARY:${escapeText(title)}`,
  ];
  if (description) lines.push(`DESCRIPTION:${escapeText(description)}`);
  if (url) lines.push(`URL:${url}`);
  if (rrule) lines.push(`RRULE:${rrule}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.map(foldLine).join(CRLF) + CRLF;
}

// Weekly 15-minute reminder to open the check-in screen.
export function checkinEvent({ start, appUrl, now }) {
  return buildEvent({
    uid: "weekly-checkin@life-improver",
    title: "Weekly check-in · Life Improver",
    description: "Pause. Notice how the week went, and rate the one thing you tended.",
    url: appUrl + "#/checkin",
    start,
    durationMin: 15,
    rrule: "FREQ=WEEKLY",
    now,
  });
}

// Weekly 20-minute slot for this week's practice. Title: practice text cut to 60 chars.
export function practiceEvent({ start, practiceText, subName, appUrl, now }) {
  const title = practiceText.length > 60 ? practiceText.slice(0, 59) + "…" : practiceText;
  return buildEvent({
    title,
    description: `${subName}: ${practiceText}`,
    url: appUrl,
    start,
    durationMin: 20,
    rrule: "FREQ=WEEKLY",
    now,
  });
}

// Offer the text as a .ics download via a temporary anchor. Browser only.
export function downloadIcs(filename, text) {
  const blob = new Blob([text], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
