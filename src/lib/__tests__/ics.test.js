import { describe, it, expect } from "vitest";
import { buildEvent, checkinEvent, practiceEvent, foldLine } from "../ics.js";

const enc = new TextEncoder();
const octets = (s) => enc.encode(s).length;
const now = new Date(Date.UTC(2026, 9, 1, 12, 0, 0));
const start = new Date(Date.UTC(2026, 9, 11, 18, 0, 0));
const lines = (text) => text.split("\r\n");

describe("foldLine", () => {
  it("leaves a 75-octet line alone", () => {
    const line = "X".repeat(75);
    expect(foldLine(line)).toBe(line);
  });

  it("folds at 75 octets with CRLF and a leading space", () => {
    const folded = foldLine("X".repeat(76));
    expect(folded).toBe("X".repeat(75) + "\r\n " + "X");
  });

  it("keeps every physical line at 75 octets or fewer and loses nothing", () => {
    const line = "DESCRIPTION:" + "word ".repeat(80);
    const parts = foldLine(line).split("\r\n");
    expect(parts.length).toBeGreaterThan(2);
    parts.forEach((p) => expect(octets(p)).toBeLessThanOrEqual(75));
    parts.slice(1).forEach((p) => expect(p.startsWith(" ")).toBe(true));
    const unfolded = parts[0] + parts.slice(1).map((p) => p.slice(1)).join("");
    expect(unfolded).toBe(line);
  });

  it("counts octets, not characters, and never splits a character", () => {
    const line = "SUMMARY:" + "é".repeat(60) + "·" + "日".repeat(30);
    const parts = foldLine(line).split("\r\n");
    parts.forEach((p) => expect(octets(p)).toBeLessThanOrEqual(75));
    const unfolded = parts[0] + parts.slice(1).map((p) => p.slice(1)).join("");
    expect(unfolded).toBe(line);
  });
});

describe("buildEvent", () => {
  const ics = buildEvent({
    uid: "abc@test",
    title: "Walk, then rest; breathe",
    description: "Line one\nLine two \\ done",
    url: "https://example.com/app/#/checkin",
    start,
    durationMin: 15,
    rrule: "FREQ=WEEKLY",
    now,
  });

  it("uses CRLF for every line break and ends with one", () => {
    expect(ics.endsWith("\r\n")).toBe(true);
    expect(ics.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
  });

  it("wraps one VEVENT in a VCALENDAR with version and product id", () => {
    const l = lines(ics);
    expect(l[0]).toBe("BEGIN:VCALENDAR");
    expect(l).toContain("VERSION:2.0");
    expect(l).toContain("PRODID:-//Life Improver//EN");
    expect(l.filter((x) => x === "BEGIN:VEVENT")).toHaveLength(1);
    expect(l.filter((x) => x === "END:VEVENT")).toHaveLength(1);
    expect(l[l.length - 2]).toBe("END:VCALENDAR");
  });

  it("writes DTSTAMP, DTSTART and DTEND in UTC", () => {
    const l = lines(ics);
    expect(l).toContain("DTSTAMP:20261001T120000Z");
    expect(l).toContain("DTSTART:20261011T180000Z");
    expect(l).toContain("DTEND:20261011T181500Z");
    expect(l).toContain("UID:abc@test");
  });

  it("escapes commas, semicolons, backslashes and newlines in text", () => {
    expect(ics).toContain("SUMMARY:Walk\\, then rest\\; breathe");
    expect(ics).toContain("DESCRIPTION:Line one\\nLine two \\\\ done");
  });

  it("includes RRULE and URL (unescaped) when given", () => {
    const l = lines(ics);
    expect(l).toContain("RRULE:FREQ=WEEKLY");
    expect(l).toContain("URL:https://example.com/app/#/checkin");
  });

  it("omits RRULE, URL and DESCRIPTION when not given", () => {
    const plain = buildEvent({ title: "Once", start, durationMin: 10, now });
    expect(plain).not.toMatch(/RRULE|URL:|DESCRIPTION/);
    expect(plain).toMatch(/UID:.+@life-improver/);
  });

  it("folds long lines to 75 octets", () => {
    const long = buildEvent({ title: "T".repeat(200), start, durationMin: 10, now });
    long.split("\r\n").forEach((p) => expect(octets(p)).toBeLessThanOrEqual(75));
  });

  it("rolls DTEND across midnight", () => {
    const late = buildEvent({ title: "Late", start: new Date(Date.UTC(2026, 11, 31, 23, 50)), durationMin: 20, now });
    expect(late).toContain("DTEND:20270101T001000Z");
  });
});

describe("checkinEvent", () => {
  const ics = checkinEvent({ start, appUrl: "https://example.com/life-improver/", now });

  it("is a 15-minute weekly event pointing at the check-in screen", () => {
    expect(ics).toContain("RRULE:FREQ=WEEKLY");
    expect(ics).toContain("DTEND:20261011T181500Z");
    expect(ics).toContain("URL:https://example.com/life-improver/#/checkin");
  });

  it("has the standard title", () => {
    // The title holds a non-ASCII dot; unfold before comparing.
    const unfolded = ics.replace(/\r\n /g, "");
    expect(unfolded).toContain("SUMMARY:Weekly check-in · Life Improver");
  });
});

describe("practiceEvent", () => {
  const args = { start, subName: "Sleep & Recovery", appUrl: "https://example.com/life-improver/", now };

  it("is a 20-minute weekly event titled with the practice text", () => {
    const ics = practiceEvent({ ...args, practiceText: "Keep a fixed wake time" });
    expect(ics).toContain("SUMMARY:Keep a fixed wake time");
    expect(ics).toContain("DTEND:20261011T182000Z");
    expect(ics).toContain("RRULE:FREQ=WEEKLY");
  });

  it("cuts a long title to 60 characters", () => {
    const text = "A".repeat(100);
    const unfolded = practiceEvent({ ...args, practiceText: text }).replace(/\r\n /g, "");
    const summary = unfolded.split("\r\n").find((l) => l.startsWith("SUMMARY:")).slice(8);
    expect(summary).toHaveLength(60);
    expect(summary.endsWith("…")).toBe(true);
  });

  it("keeps a 60-character title whole", () => {
    const text = "B".repeat(60);
    const unfolded = practiceEvent({ ...args, practiceText: text }).replace(/\r\n /g, "");
    expect(unfolded).toContain("SUMMARY:" + text + "\r\n");
  });
});
