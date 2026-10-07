import { describe, it, expect } from "vitest";
import {
  groupLogByWeek,
  isNewcomer,
  mondayOfWeek,
  nextCheckinDate,
  weekdayName,
  weekHeading,
  weeklySeriesFor,
} from "../journey.js";

const mk = (date, week, score, extra = {}) => ({
  id: `${date}-${score}`,
  date,
  week,
  domainId: 1,
  subIndex: 0,
  practiceIndex: 0,
  practised: "yes",
  score,
  note: "",
  ...extra,
});

describe("nextCheckinDate", () => {
  it("is the next Sunday after a weekday", () => {
    expect(nextCheckinDate("2026-10-07")).toBe("2026-10-11"); // Wednesday
    expect(nextCheckinDate("2026-10-05")).toBe("2026-10-11"); // Monday
    expect(nextCheckinDate("2026-10-10")).toBe("2026-10-11"); // Saturday
  });
  it("is the following Sunday when today is Sunday", () => {
    expect(nextCheckinDate("2026-10-11")).toBe("2026-10-18");
  });
  it("crosses month and year ends", () => {
    expect(nextCheckinDate("2026-12-30")).toBe("2027-01-03");
    expect(nextCheckinDate("2026-10-27")).toBe("2026-11-01");
  });
  it("names the weekday", () => {
    expect(weekdayName(nextCheckinDate("2026-10-07"))).toBe("Sunday");
  });
});

describe("isNewcomer", () => {
  it("needs no quick scores and no full scores", () => {
    expect(isNewcomer({}, 0)).toBe(true);
    expect(isNewcomer(undefined, undefined)).toBe(true);
    expect(isNewcomer({ 1: 5 }, 0)).toBe(false);
    expect(isNewcomer({}, 2)).toBe(false);
  });
});

describe("mondayOfWeek", () => {
  it("finds the Monday of an ISO week", () => {
    expect(weekHeading(mondayOfWeek("2026-W41"))).toBe("Week of Oct 5");
    expect(weekHeading(mondayOfWeek("2026-W01"))).toBe("Week of Dec 29");
    expect(weekHeading(mondayOfWeek("2026-W53"))).toBe("Week of Dec 28");
  });
  it("falls back to the date's Monday", () => {
    expect(weekHeading(mondayOfWeek("bad", "2026-10-11"))).toBe("Week of Oct 5");
  });
});

describe("groupLogByWeek", () => {
  it("returns nothing for an empty log", () => {
    expect(groupLogByWeek([])).toEqual([]);
  });
  it("orders weeks newest first and entries newest first", () => {
    const list = [
      mk("2026-09-30", "2026-W40", 4),
      mk("2026-10-05", "2026-W41", 5),
      mk("2026-10-07", "2026-W41", 7),
    ];
    const groups = groupLogByWeek(list);
    expect(groups.map((g) => g.heading)).toEqual(["Week of Oct 5", "Week of Sep 28"]);
    expect(groups[0].entries.map((e) => e.checkin.score)).toEqual([7, 5]);
    expect(groups[0].entries.map((e) => e.later)).toEqual([true, false]);
    expect(groups[1].entries.map((e) => e.later)).toEqual([false]);
  });
  it("derives the week when it is missing", () => {
    const groups = groupLogByWeek([mk("2026-10-07", undefined, 5)]);
    expect(groups[0].week).toBe("2026-W41");
  });
});

describe("weeklySeriesFor", () => {
  it("keeps the latest check-in of each week for one sub", () => {
    const list = [
      mk("2026-09-30", "2026-W40", 4),
      mk("2026-10-05", "2026-W41", 2),
      mk("2026-10-07", "2026-W41", 8),
      mk("2026-10-06", "2026-W41", 9, { subIndex: 1 }),
    ];
    expect(weeklySeriesFor(list, 1, 0)).toEqual([
      { date: "2026-09-30", score: 4 },
      { date: "2026-10-07", score: 8 },
    ]);
    expect(weeklySeriesFor(list, 1, 1)).toEqual([{ date: "2026-10-06", score: 9 }]);
    expect(weeklySeriesFor(list, 2, 0)).toEqual([]);
  });
});
