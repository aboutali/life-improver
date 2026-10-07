import { describe, it, expect } from "vitest";
import { toLocalDate, isoWeek, daysBetween, parseLocalDate } from "../dates.js";

describe("toLocalDate", () => {
  it("formats local year, month and day with padding", () => {
    expect(toLocalDate(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(toLocalDate(new Date(2026, 9, 7, 23, 59))).toBe("2026-10-07");
  });

  it("keeps the local day just after midnight (no UTC shift)", () => {
    expect(toLocalDate(new Date(2026, 2, 1, 0, 0, 1))).toBe("2026-03-01");
  });

  it("defaults to today", () => {
    expect(toLocalDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("parseLocalDate", () => {
  it("builds a local-midnight Date", () => {
    const d = parseLocalDate("2026-10-07");
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 9, 7, 0]);
  });
});

describe("isoWeek", () => {
  it("returns the week id for an ordinary date", () => {
    expect(isoWeek(new Date(2026, 9, 7))).toBe("2026-W41");
  });

  it("handles 2026-12-31 and 2027-01-01 inside 2026-W53", () => {
    expect(isoWeek(new Date(2026, 11, 31))).toBe("2026-W53");
    expect(isoWeek(new Date(2027, 0, 1))).toBe("2026-W53");
  });

  it("puts 2024-12-30 in 2025-W01", () => {
    expect(isoWeek(new Date(2024, 11, 30))).toBe("2025-W01");
  });

  it("starts weeks on Monday", () => {
    expect(isoWeek(new Date(2026, 9, 4))).toBe("2026-W40"); // Sunday
    expect(isoWeek(new Date(2026, 9, 5))).toBe("2026-W41"); // Monday
  });

  it("accepts a YYYY-MM-DD string", () => {
    expect(isoWeek("2027-01-01")).toBe("2026-W53");
  });

  it("is stable across the DST switch", () => {
    expect(isoWeek(new Date(2026, 2, 29, 0, 30))).toBe("2026-W13");
    expect(isoWeek(new Date(2026, 9, 25, 23, 30))).toBe("2026-W43");
  });
});

describe("daysBetween", () => {
  it("counts whole days, signed", () => {
    expect(daysBetween("2026-10-01", "2026-10-07")).toBe(6);
    expect(daysBetween("2026-10-07", "2026-10-01")).toBe(-6);
    expect(daysBetween("2026-10-07", "2026-10-07")).toBe(0);
  });

  it("spans month, year and leap-day boundaries", () => {
    expect(daysBetween("2026-12-31", "2027-01-01")).toBe(1);
    expect(daysBetween("2024-02-28", "2024-03-01")).toBe(2);
  });

  it("is not thrown off by DST", () => {
    expect(daysBetween("2026-03-28", "2026-03-30")).toBe(2);
    expect(daysBetween("2026-10-24", "2026-10-26")).toBe(2);
  });
});
