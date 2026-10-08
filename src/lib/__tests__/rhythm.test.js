import { describe, it, expect } from "vitest";
import {
  addDays,
  weekdayName,
  formatShortDate,
  checkinOpensOn,
  isCheckinOpen,
  seasonCount,
  seasonDue,
  lapsedWeeks,
  nextOccurrence,
  defaultPracticeSlot,
  defaultCheckinSlot,
  firstOneLabel,
} from "../rhythm.js";

// Wednesday 7 October 2026, local noon.
const wed = new Date(2026, 9, 7, 12, 0);

describe("dates", () => {
  it("adds days across month ends", () => {
    expect(addDays("2026-10-30", 3)).toBe("2026-11-02");
    expect(addDays("2026-10-07", -7)).toBe("2026-09-30");
  });
  it("names weekdays and short dates", () => {
    expect(weekdayName("2026-10-09")).toBe("Friday");
    expect(formatShortDate("2026-10-11")).toBe("Sun 11 Oct");
  });
});

describe("check-in gate (R1)", () => {
  const focus = { startedAt: "2026-10-07" };
  it("opens three days after the focus began", () => {
    expect(checkinOpensOn(focus)).toBe("2026-10-10");
    expect(isCheckinOpen(focus, "2026-10-09")).toBe(false);
    expect(isCheckinOpen(focus, "2026-10-10")).toBe(true);
    expect(isCheckinOpen(focus, "2026-11-01")).toBe(true);
  });
});

describe("seasonDue (R6)", () => {
  const focus = { domainId: 1, subIndex: 0, startedAt: "2026-09-01" };
  const ck = (date, domainId = 1, subIndex = 0) => ({ date, domainId, subIndex });
  const four = [ck("2026-09-08"), ck("2026-09-15"), ck("2026-09-22"), ck("2026-09-29")];

  it("is due after four check-ins on the same sub", () => {
    expect(seasonCount(focus, four)).toBe(4);
    expect(seasonDue(focus, four)).toBe(true);
    expect(seasonDue(focus, four.slice(1))).toBe(false);
  });
  it("ignores other subs and earlier check-ins", () => {
    const mixed = [ck("2026-08-01"), ck("2026-09-08", 1, 1), ck("2026-09-15", 2, 0), ...four.slice(0, 3)];
    expect(seasonDue(focus, mixed)).toBe(false);
  });
  it("counts from reviewedAt when it is set", () => {
    expect(seasonDue({ ...focus, reviewedAt: "2026-09-29" }, four)).toBe(false);
    expect(seasonCount({ ...focus, reviewedAt: "2026-09-22" }, four)).toBe(2);
  });
  it("counts distinct ISO weeks, not check-ins (P1)", () => {
    const sameWeek = [ck("2026-09-08"), ck("2026-09-09"), ck("2026-09-15"), ck("2026-09-22"), ck("2026-09-23")];
    expect(seasonCount(focus, sameWeek)).toBe(3);
    expect(seasonDue(focus, sameWeek)).toBe(false);
    expect(seasonDue(focus, [...sameWeek, ck("2026-09-29")])).toBe(true);
  });
  it("uses the later of startedAt and reviewedAt", () => {
    expect(seasonCount({ ...focus, startedAt: "2026-09-22", reviewedAt: "2026-09-01" }, four)).toBe(2);
  });
  it("is false without a focus", () => {
    expect(seasonDue(null, four)).toBe(false);
  });
});

describe("lapsedWeeks (R7)", () => {
  const ck = (date) => ({ date });
  it("is 0 with no check-ins", () => {
    expect(lapsedWeeks([], "2026-10-07")).toBe(0);
  });
  it("is 0 up to and including 14 days", () => {
    expect(lapsedWeeks([ck("2026-09-23")], "2026-10-07")).toBe(0);
  });
  it("counts whole weeks past 14 days", () => {
    expect(lapsedWeeks([ck("2026-09-22")], "2026-10-07")).toBe(2);
    expect(lapsedWeeks([ck("2026-09-16")], "2026-10-07")).toBe(3);
  });
  it("uses the latest check-in whatever the order", () => {
    expect(lapsedWeeks([ck("2026-10-01"), ck("2026-08-01")], "2026-10-07")).toBe(0);
  });
});

describe("nextOccurrence and defaults (R2)", () => {
  it("practice: tomorrow at 07:30", () => {
    const slot = defaultPracticeSlot(wed);
    expect(slot).toEqual({ day: 4, time: "07:30", minDaysAhead: 1 });
    const start = nextOccurrence(slot.day, slot.time, { now: wed, minDaysAhead: slot.minDaysAhead });
    expect([start.getFullYear(), start.getMonth(), start.getDate(), start.getHours(), start.getMinutes()]).toEqual([
      2026, 9, 8, 7, 30,
    ]);
  });
  it("check-in: the first Sunday at least 3 days out", () => {
    const slot = defaultCheckinSlot();
    expect(firstOneLabel(slot, wed)).toBe("First one: Sun 11 Oct");
    // Thursday: today + 3 is Sunday itself, which counts.
    expect(firstOneLabel(slot, new Date(2026, 9, 8, 12))).toBe("First one: Sun 11 Oct");
    // Friday: today + 3 is Monday, so the next Sunday.
    expect(firstOneLabel(slot, new Date(2026, 9, 9, 12))).toBe("First one: Sun 18 Oct");
    // Sunday: a week later.
    expect(firstOneLabel(slot, new Date(2026, 9, 11, 9))).toBe("First one: Sun 18 Oct");
  });
  it("without a minimum, later today counts and earlier today does not", () => {
    const morning = new Date(2026, 9, 7, 6, 0);
    expect(nextOccurrence(3, "07:30", { now: morning }).getDate()).toBe(7);
    expect(nextOccurrence(3, "07:30", { now: wed }).getDate()).toBe(14);
  });
});
