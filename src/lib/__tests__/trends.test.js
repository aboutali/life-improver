import { describe, it, expect } from "vitest";
import { seriesFor, changeSinceFirst, hasCheckinThisWeek, weeksActive } from "../trends.js";

const ck = (date, week, score, domainId = 1, subIndex = 0) => ({ date, week, score, domainId, subIndex });

describe("seriesFor", () => {
  const checkins = [
    ck("2026-09-23", "2026-W39", 4),
    ck("2026-09-23", "2026-W39", 9, 2, 0),
    ck("2026-09-30", "2026-W40", 5),
    ck("2026-10-07", "2026-W41", 7, 1, 1),
  ];

  it("returns date and score for one sub, oldest first", () => {
    expect(seriesFor(checkins, 1, 0)).toEqual([
      { date: "2026-09-23", score: 4 },
      { date: "2026-09-30", score: 5 },
    ]);
  });

  it("returns an empty list when nothing matches", () => {
    expect(seriesFor(checkins, 3, 0)).toEqual([]);
    expect(seriesFor([], 1, 0)).toEqual([]);
  });
});

describe("changeSinceFirst", () => {
  it("is null for fewer than two points", () => {
    expect(changeSinceFirst([])).toBeNull();
    expect(changeSinceFirst([{ date: "2026-10-07", score: 5 }])).toBeNull();
  });

  it("is latest minus first, negative when scores fall", () => {
    const s = (...scores) => scores.map((score, i) => ({ date: `2026-10-0${i + 1}`, score }));
    expect(changeSinceFirst(s(4, 9, 7))).toBe(3);
    expect(changeSinceFirst(s(8, 5))).toBe(-3);
    expect(changeSinceFirst(s(5, 9, 5))).toBe(0);
  });
});

describe("hasCheckinThisWeek", () => {
  const checkins = [ck("2026-10-05", "2026-W41", 5)];

  it("is true for any day in the same ISO week", () => {
    expect(hasCheckinThisWeek(checkins, "2026-10-07")).toBe(true);
    expect(hasCheckinThisWeek(checkins, "2026-10-11")).toBe(true);
  });

  it("is false in the adjacent weeks", () => {
    expect(hasCheckinThisWeek(checkins, "2026-10-04")).toBe(false);
    expect(hasCheckinThisWeek(checkins, "2026-10-12")).toBe(false);
  });

  it("is false with no check-ins", () => {
    expect(hasCheckinThisWeek([], "2026-10-07")).toBe(false);
  });

  it("accepts a Date and handles the year boundary", () => {
    const c = [ck("2026-12-30", "2026-W53", 5)];
    expect(hasCheckinThisWeek(c, new Date(2027, 0, 1))).toBe(true);
  });

  it("derives the week from the date when week is missing", () => {
    expect(hasCheckinThisWeek([{ date: "2026-10-05" }], "2026-10-07")).toBe(true);
  });
});

describe("weeksActive", () => {
  it("counts distinct weeks", () => {
    const checkins = [
      ck("2026-09-23", "2026-W39", 4),
      ck("2026-09-24", "2026-W39", 5, 2, 0),
      ck("2026-10-07", "2026-W41", 6),
    ];
    expect(weeksActive(checkins)).toBe(2);
  });

  it("is zero with no check-ins", () => {
    expect(weeksActive([])).toBe(0);
  });
});
