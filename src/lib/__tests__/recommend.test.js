import { describe, it, expect } from "vitest";
import { suggestFocus, suggestPractice, nextPractice } from "../recommend.js";

// A small framework: two domains, ids 1 and 5, to prove ids are not positions.
const fw = [
  {
    id: 1,
    domain: "Body",
    subs: [
      { name: "Movement", ideas: ["a", "b", "c", "d"] },
      { name: "Sleep", ideas: ["e", "f", "g"] },
    ],
  },
  {
    id: 5,
    domain: "Mind",
    subs: [{ name: "Focus", ideas: ["h", "i"] }],
  },
];

describe("suggestFocus", () => {
  it("picks the lowest full score with a readable reason", () => {
    const r = suggestFocus({ scores: { "1-0": 6, "1-1": 3, "5-0": 8 }, quick: {}, framework: fw });
    expect(r).toEqual({ domainId: 1, subIndex: 1, reason: "Your lowest score: Sleep (3/10)." });
  });

  it("breaks ties by domain order, then sub index", () => {
    const tie = suggestFocus({ scores: { "5-0": 4, "1-1": 4, "1-0": 4 }, framework: fw });
    expect([tie.domainId, tie.subIndex]).toEqual([1, 0]);
    const tie2 = suggestFocus({ scores: { "5-0": 4, "1-1": 4 }, framework: fw });
    expect([tie2.domainId, tie2.subIndex]).toEqual([1, 1]);
  });

  it("prefers full scores over quick scores", () => {
    const r = suggestFocus({ scores: { "1-0": 9 }, quick: { 5: 1 }, framework: fw });
    expect(r.domainId).toBe(1);
  });

  it("falls back to the lowest quick domain score, sub 0", () => {
    const r = suggestFocus({ scores: {}, quick: { 1: 7, 5: 2 }, framework: fw });
    expect(r.domainId).toBe(5);
    expect(r.subIndex).toBe(0);
    expect(r.reason).toContain("Mind");
    expect(r.reason).toContain("2/10");
  });

  it("breaks quick ties by domain order", () => {
    expect(suggestFocus({ quick: { 5: 3, 1: 3 }, framework: fw }).domainId).toBe(1);
  });

  it("ignores scores for subs that do not exist", () => {
    const r = suggestFocus({ scores: { "9-0": 1, "1-0": 5 }, framework: fw });
    expect(r.domainId).toBe(1);
  });

  it("returns null with no data", () => {
    expect(suggestFocus({ scores: {}, quick: {}, framework: fw })).toBeNull();
    expect(suggestFocus({ framework: fw })).toBeNull();
  });

  it("uses the real framework by default", () => {
    const r = suggestFocus({ scores: { "1-0": 2 } });
    expect(r.domainId).toBe(1);
    expect(r.reason).toContain("Movement & Fitness");
  });
});

describe("suggestPractice", () => {
  const base = { framework: fw, domainId: 1, subIndex: 0, today: "2026-10-07" };
  const ck = (practiceIndex, date, extra = {}) => ({ domainId: 1, subIndex: 0, practiceIndex, date, ...extra });

  it("returns the lowest index when nothing is excluded", () => {
    expect(suggestPractice({ ...base, checkins: [] }).practiceIndex).toBe(0);
  });

  it("excludes skipped indices", () => {
    expect(suggestPractice({ ...base, checkins: [], skipped: [0, 1] }).practiceIndex).toBe(2);
  });

  it("excludes practices used within 28 days", () => {
    const checkins = [ck(0, "2026-09-20"), ck(1, "2026-09-09")]; // 17 and 28 days ago
    expect(suggestPractice({ ...base, checkins }).practiceIndex).toBe(2);
  });

  it("allows a practice used more than 28 days ago", () => {
    const checkins = [ck(0, "2026-09-08")]; // 29 days ago
    expect(suggestPractice({ ...base, checkins }).practiceIndex).toBe(0);
  });

  it("ignores check-ins for other subs", () => {
    const checkins = [{ domainId: 1, subIndex: 1, practiceIndex: 0, date: "2026-10-01" }];
    expect(suggestPractice({ ...base, checkins }).practiceIndex).toBe(0);
  });

  it("drops the 28-day rule when nothing else remains, keeping skips", () => {
    const checkins = [ck(0, "2026-10-01"), ck(2, "2026-10-02"), ck(3, "2026-10-03")];
    // 1 is skipped; 0, 2, 3 are all recent -> fall back to lowest non-skipped.
    expect(suggestPractice({ ...base, checkins, skipped: [1] }).practiceIndex).toBe(0);
  });

  it("returns index 0 when every practice is skipped", () => {
    expect(suggestPractice({ ...base, checkins: [], skipped: [0, 1, 2, 3] }).practiceIndex).toBe(0);
  });

  it("returns index 0 for an unknown sub", () => {
    expect(suggestPractice({ ...base, domainId: 99, checkins: [] }).practiceIndex).toBe(0);
  });

  it("always includes a reason", () => {
    expect(suggestPractice({ ...base, checkins: [] }).reason).toEqual(expect.any(String));
  });
});

describe("nextPractice", () => {
  const focus = { domainId: 1, subIndex: 0, practiceIndex: 0, startedAt: "2026-10-07", skipped: [] };

  it("adds the current index to skipped and picks a new one", () => {
    const next = nextPractice(focus, fw, [], "2026-10-07");
    expect(next.practiceIndex).toBe(1);
    expect(next.skipped).toEqual([0]);
  });

  it("keeps earlier skips and does not mutate the input", () => {
    const f = { ...focus, practiceIndex: 1, skipped: [0] };
    const next = nextPractice(f, fw, [], "2026-10-07");
    expect(next.skipped).toEqual([0, 1]);
    expect(next.practiceIndex).toBe(2);
    expect(f.skipped).toEqual([0]);
    expect(next.startedAt).toBe("2026-10-07");
  });

  it("does not duplicate an index already skipped", () => {
    const f = { ...focus, practiceIndex: 0, skipped: [0] };
    expect(nextPractice(f, fw, [], "2026-10-07").skipped).toEqual([0]);
  });

  it("skips practices rested by recent check-ins", () => {
    const checkins = [{ domainId: 1, subIndex: 0, practiceIndex: 1, date: "2026-10-01" }];
    expect(nextPractice(focus, fw, checkins, "2026-10-07").practiceIndex).toBe(2);
  });

  it("falls back to index 0 once everything is skipped", () => {
    const f = { ...focus, practiceIndex: 3, skipped: [0, 1, 2] };
    expect(nextPractice(f, fw, [], "2026-10-07").practiceIndex).toBe(0);
  });
});
