import { describe, it, expect } from "vitest";
import {
  isStandalone,
  startsAtEdge,
  lockDirection,
  dragOffset,
  flickVelocity,
  decideRelease,
} from "../gestures.js";

describe("isStandalone", () => {
  it("is true for navigator.standalone or the display-mode query", () => {
    expect(isStandalone({ navigator: { standalone: true } })).toBe(true);
    expect(isStandalone({ navigator: {}, matchMedia: (q) => ({ matches: q.includes("standalone") }) })).toBe(true);
    expect(isStandalone({ navigator: {}, matchMedia: () => ({ matches: false }) })).toBe(false);
    expect(isStandalone({ navigator: {} })).toBe(false);
    expect(isStandalone(undefined)).toBe(false);
  });
});

describe("startsAtEdge", () => {
  it("accepts touches within 20px of the left edge", () => {
    expect(startsAtEdge(0)).toBe(true);
    expect(startsAtEdge(20)).toBe(true);
    expect(startsAtEdge(21)).toBe(false);
    expect(startsAtEdge(NaN)).toBe(false);
  });
});

describe("lockDirection", () => {
  it("waits, then swipes right or yields to scrolling", () => {
    expect(lockDirection(4, 3)).toBe("pending");
    expect(lockDirection(14, 3)).toBe("swipe");
    expect(lockDirection(5, 14)).toBe("scroll");
    expect(lockDirection(-14, 2)).toBe("scroll");
    expect(lockDirection(12, 12)).toBe("scroll");
  });
});

describe("dragOffset", () => {
  it("follows the finger within the screen", () => {
    expect(dragOffset(-20, 390)).toBe(0);
    expect(dragOffset(120, 390)).toBe(120);
    expect(dragOffset(900, 390)).toBe(390);
    expect(dragOffset(50, 0)).toBe(0);
  });
});

describe("flickVelocity", () => {
  it("measures the last 100ms", () => {
    expect(flickVelocity([])).toBe(0);
    expect(flickVelocity([{ x: 0, t: 0 }])).toBe(0);
    expect(
      flickVelocity([
        { x: 0, t: 0 },
        { x: 10, t: 200 },
        { x: 50, t: 240 },
        { x: 90, t: 280 },
      ])
    ).toBeCloseTo(1, 5);
    expect(flickVelocity([{ x: 5, t: 10 }, { x: 5, t: 10 }])).toBe(0);
  });
});

describe("decideRelease", () => {
  it("commits past 35% of the width", () => {
    expect(decideRelease({ dx: 137, width: 390 })).toBe("commit");
    expect(decideRelease({ dx: 130, width: 390 })).toBe("cancel");
  });
  it("commits a fast flick that has travelled a little", () => {
    expect(decideRelease({ dx: 60, width: 390, velocity: 0.8 })).toBe("commit");
    expect(decideRelease({ dx: 10, width: 390, velocity: 2 })).toBe("cancel");
  });
  it("cancels a slow short drag, a leftward drag and a missing width", () => {
    expect(decideRelease({ dx: 60, width: 390, velocity: 0.1 })).toBe("cancel");
    expect(decideRelease({ dx: -50, width: 390, velocity: 1 })).toBe("cancel");
    expect(decideRelease({ dx: 100, width: 0 })).toBe("cancel");
  });
});
