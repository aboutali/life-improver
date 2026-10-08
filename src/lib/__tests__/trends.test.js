import { describe, it, expect } from "vitest";
import { seriesFor, changeSinceFirst, hasCheckinThisWeek, weeksActive, domainReading } from "../trends.js";

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

describe("domainReading (N7)", () => {
  const domain = { id: 4, subs: [{}, {}, {}, {}, {}] };

  it("uses the quick score when under half the subs are rated", () => {
    expect(domainReading(domain, { "4-0": 8 }, { 4: 5 })).toEqual({
      value: 5, source: "quick", rated: 1, total: 5, partial: true,
    });
  });
  it("shows the partial average when there is no quick score", () => {
    expect(domainReading(domain, { "4-0": 8 }, {})).toMatchObject({ value: 8, source: "full", partial: true });
  });
  it("uses the full average from half the subs up, still marked partial", () => {
    const r = domainReading(domain, { "4-0": 8, "4-1": 6, "4-2": 4 }, { 4: 1 });
    expect(r).toMatchObject({ value: 6, source: "full", rated: 3, partial: true });
    expect(domainReading({ id: 4, subs: [{}, {}, {}, {}] }, { "4-0": 8, "4-1": 6 }, { 4: 1 })).toMatchObject({
      value: 7, source: "full",
    });
  });
  it("is not partial when every sub is rated", () => {
    const all = Object.fromEntries([0, 1, 2, 3, 4].map((i) => [`4-${i}`, 6]));
    expect(domainReading(domain, all, {})).toMatchObject({ value: 6, partial: false });
  });
  it("is empty with nothing rated", () => {
    expect(domainReading(domain, {}, {})).toEqual({ value: null, source: null, rated: 0, total: 5, partial: false });
  });
  it("ignores scores for other domains", () => {
    expect(domainReading(domain, { "5-0": 9 }, {}).rated).toBe(0);
  });
});
