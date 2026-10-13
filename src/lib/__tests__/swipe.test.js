import { describe, it, expect } from "vitest";
import {
  ACTION_WIDTH,
  FULL_FRACTION,
  LOCK_PX,
  actionsWidth,
  decideRelease,
  isFullSwipe,
  lockAxis,
  restingOffset,
  rubberBand,
  swipeOffset,
} from "../swipe.js";

const W = 360;
const AW = ACTION_WIDTH;

describe("lockAxis", () => {
  it("waits until the finger has moved 8px", () => {
    expect(lockAxis(LOCK_PX - 1, 0)).toBe("pending");
    expect(lockAxis(0, -(LOCK_PX - 1))).toBe("pending");
  });
  it("picks the dominant axis", () => {
    expect(lockAxis(-12, 3)).toBe("horizontal");
    expect(lockAxis(3, 12)).toBe("vertical");
    expect(lockAxis(8, 9)).toBe("vertical");
  });
});

describe("actionsWidth", () => {
  it("is one slot per action", () => {
    expect(actionsWidth(0)).toBe(0);
    expect(actionsWidth(1)).toBe(AW);
    expect(actionsWidth(2)).toBe(2 * AW);
  });
});

describe("rubberBand", () => {
  it("is zero without overshoot and never reaches the limit", () => {
    expect(rubberBand(0, 100)).toBe(0);
    expect(rubberBand(-5, 100)).toBe(0);
    expect(rubberBand(10_000, 100)).toBeLessThan(100);
  });
  it("moves less than the finger", () => {
    expect(rubberBand(40, 200)).toBeLessThan(40);
    expect(rubberBand(40, 200)).toBeGreaterThan(0);
  });
});

describe("swipeOffset", () => {
  it("follows the finger leftward one to one inside the actions", () => {
    expect(swipeOffset({ dx: -40, aw: AW, rowWidth: W })).toBe(-40);
    expect(swipeOffset({ dx: -AW, aw: AW, rowWidth: W })).toBe(-AW);
  });
  it("does not move right of closed", () => {
    expect(swipeOffset({ dx: 50, aw: AW, rowWidth: W })).toBe(0);
  });
  it("resists past the actions", () => {
    const o = swipeOffset({ dx: -AW - 60, aw: AW, rowWidth: W });
    expect(o).toBeLessThan(-AW);
    expect(o).toBeGreaterThan(-AW - 60);
  });
  it("starts from the open position", () => {
    expect(swipeOffset({ startOffset: -AW, dx: 30, aw: AW, rowWidth: W })).toBe(-AW + 30);
    expect(swipeOffset({ startOffset: -AW, dx: 200, aw: AW, rowWidth: W })).toBe(0);
  });
  it("stays closed without actions", () => {
    expect(swipeOffset({ dx: -100, aw: 0, rowWidth: W })).toBe(0);
  });
});

describe("isFullSwipe", () => {
  it("needs more than 60% of the row", () => {
    expect(isFullSwipe({ dx: -(FULL_FRACTION * W) + 1, rowWidth: W })).toBe(false);
    expect(isFullSwipe({ dx: -(FULL_FRACTION * W), rowWidth: W })).toBe(true);
  });
  it("counts from the open position", () => {
    expect(isFullSwipe({ startOffset: -AW, dx: -(FULL_FRACTION * W - AW), rowWidth: W })).toBe(true);
  });
  it("is off without actions or width", () => {
    expect(isFullSwipe({ dx: -300, rowWidth: W, hasActions: false })).toBe(false);
    expect(isFullSwipe({ dx: -300, rowWidth: 0 })).toBe(false);
  });
});

describe("decideRelease", () => {
  it("runs the first action on a full swipe", () => {
    expect(decideRelease({ dx: -250, aw: AW, rowWidth: W })).toBe("full");
  });
  it("opens past half the actions", () => {
    expect(decideRelease({ dx: -60, aw: AW, rowWidth: W })).toBe("open");
  });
  it("closes a short, slow drag", () => {
    expect(decideRelease({ dx: -20, aw: AW, rowWidth: W })).toBe("close");
  });
  it("opens on a short flick", () => {
    expect(decideRelease({ dx: -25, velocity: -0.9, aw: AW, rowWidth: W })).toBe("open");
  });
  it("closes an open row dragged back", () => {
    expect(decideRelease({ startOffset: -AW, dx: 60, aw: AW, rowWidth: W })).toBe("close");
  });
  it("closes an open row on a rightward flick", () => {
    expect(decideRelease({ startOffset: -AW, dx: 20, velocity: 0.9, aw: AW, rowWidth: W })).toBe("close");
  });
  it("keeps an open row open after a small nudge", () => {
    expect(decideRelease({ startOffset: -AW, dx: 10, aw: AW, rowWidth: W })).toBe("open");
  });
  it("closes when there are no actions", () => {
    expect(decideRelease({ dx: -200, aw: 0, rowWidth: W })).toBe("close");
  });
});

describe("restingOffset", () => {
  it("maps each decision to a place", () => {
    expect(restingOffset("close", AW, W)).toBe(0);
    expect(restingOffset("open", AW, W)).toBe(-AW);
    expect(restingOffset("full", AW, W)).toBe(-W);
  });
});
