import { describe, it, expect } from "vitest";
import {
  DISMISS_RATIO,
  DISMISS_VELOCITY,
  MAX_STRETCH,
  backdropOpacity,
  dragOffset,
  shouldDismiss,
  velocityFrom,
} from "../sheetDrag.js";

describe("dragOffset", () => {
  it("follows the finger downward one to one", () => {
    expect(dragOffset(0)).toBe(0);
    expect(dragOffset(120)).toBe(120);
  });

  it("stretches only a little upward, and never past the limit", () => {
    expect(dragOffset(-20)).toBeLessThan(0);
    expect(dragOffset(-20)).toBeGreaterThan(-20);
    expect(dragOffset(-5000)).toBe(-MAX_STRETCH);
  });

  it("ignores values that are not numbers", () => {
    expect(dragOffset(NaN)).toBe(0);
    expect(dragOffset(undefined)).toBe(0);
  });
});

describe("velocityFrom", () => {
  it("reads the speed of the last 100 ms, downward positive", () => {
    const samples = [{ t: 0, y: 0 }, { t: 50, y: 5 }, { t: 100, y: 40 }, { t: 150, y: 90 }];
    // Window starts at t=50: (90 - 5) / 100.
    expect(velocityFrom(samples, 150)).toBeCloseTo(0.85);
  });

  it("is negative for an upward move", () => {
    expect(velocityFrom([{ t: 0, y: 100 }, { t: 50, y: 60 }], 50)).toBeCloseTo(-0.8);
  });

  it("is zero when the finger rested before release or has too few samples", () => {
    expect(velocityFrom([{ t: 0, y: 0 }, { t: 40, y: 80 }], 400)).toBe(0);
    expect(velocityFrom([{ t: 0, y: 0 }], 10)).toBe(0);
    expect(velocityFrom([], 10)).toBe(0);
    expect(velocityFrom([{ t: 5, y: 0 }, { t: 5, y: 50 }], 5)).toBe(0);
  });
});

describe("shouldDismiss", () => {
  it("closes when dragged past the share of its height", () => {
    expect(shouldDismiss({ dy: 400 * DISMISS_RATIO + 1, height: 400, velocity: 0 })).toBe(true);
    expect(shouldDismiss({ dy: 400 * DISMISS_RATIO - 1, height: 400, velocity: 0 })).toBe(false);
  });

  it("closes on a quick flick even over a short distance", () => {
    expect(shouldDismiss({ dy: 30, height: 600, velocity: DISMISS_VELOCITY + 0.1 })).toBe(true);
  });

  it("does not close for a tremor", () => {
    expect(shouldDismiss({ dy: 3, height: 600, velocity: 2 })).toBe(false);
  });

  it("stays when the finger flicks back up after a long drag", () => {
    expect(shouldDismiss({ dy: 300, height: 400, velocity: -1 })).toBe(false);
  });

  it("never closes on an upward drag or an unmeasured sheet", () => {
    expect(shouldDismiss({ dy: -50, height: 400, velocity: 3 })).toBe(false);
    expect(shouldDismiss({ dy: 100, height: 0, velocity: 0 })).toBe(false);
  });
});

describe("backdropOpacity", () => {
  it("fades as the sheet leaves", () => {
    expect(backdropOpacity(0, 400)).toBe(1);
    expect(backdropOpacity(200, 400)).toBe(0.5);
    expect(backdropOpacity(900, 400)).toBe(0);
    expect(backdropOpacity(50, 0)).toBe(1);
  });
});
