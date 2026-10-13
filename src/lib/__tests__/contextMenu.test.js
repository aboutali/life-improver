import { describe, it, expect } from "vitest";
import { LONG_PRESS_MS, MOVE_CANCEL_PX, isMenuKey, movedTooFar, placeMenu, shortLabel, stepIndex } from "../contextMenu.js";

describe("long press constants", () => {
  it("are 500ms and 10px", () => {
    expect(LONG_PRESS_MS).toBe(500);
    expect(MOVE_CANCEL_PX).toBe(10);
  });
});

describe("movedTooFar", () => {
  it("cancels past 10px in any direction", () => {
    expect(movedTooFar(0, 0)).toBe(false);
    expect(movedTooFar(6, 6)).toBe(false);
    expect(movedTooFar(8, 8)).toBe(true);
    expect(movedTooFar(0, -11)).toBe(true);
  });
});

describe("isMenuKey", () => {
  it("accepts the context-menu key and Shift+F10 only", () => {
    expect(isMenuKey({ key: "ContextMenu", shiftKey: false })).toBe(true);
    expect(isMenuKey({ key: "F10", shiftKey: true })).toBe(true);
    expect(isMenuKey({ key: "F10", shiftKey: false })).toBe(false);
    expect(isMenuKey({ key: "Enter", shiftKey: true })).toBe(false);
  });
});

describe("stepIndex", () => {
  it("wraps with the arrow keys", () => {
    expect(stepIndex(0, "ArrowDown", 3)).toBe(1);
    expect(stepIndex(2, "ArrowDown", 3)).toBe(0);
    expect(stepIndex(0, "ArrowUp", 3)).toBe(2);
    expect(stepIndex(-1, "ArrowDown", 3)).toBe(0);
    expect(stepIndex(-1, "ArrowUp", 3)).toBe(2);
  });
  it("jumps with Home and End and ignores other keys", () => {
    expect(stepIndex(1, "Home", 3)).toBe(0);
    expect(stepIndex(1, "End", 3)).toBe(2);
    expect(stepIndex(1, "a", 3)).toBe(1);
    expect(stepIndex(0, "ArrowDown", 0)).toBe(-1);
  });
});

describe("placeMenu", () => {
  const viewport = { width: 390, height: 844 };
  const menu = { width: 220, height: 100 };

  it("puts the menu below the row when it fits, right-aligned", () => {
    const row = { top: 200, left: 16, width: 358, height: 80 };
    const p = placeMenu({ row, menu, viewport });
    expect(p.placement).toBe("below");
    expect(p.menuTop).toBeGreaterThan(280);
    expect(p.menuLeft).toBe(16 + 358 - 220);
    expect(p.rowShift).toBe(0);
  });
  it("puts the menu above a row near the bottom", () => {
    const row = { top: 700, left: 16, width: 358, height: 80 };
    const p = placeMenu({ row, menu, viewport });
    expect(p.placement).toBe("above");
    expect(p.menuTop + menu.height).toBeLessThan(700);
    expect(p.rowShift).toBe(0);
  });
  it("slides a tall row up when neither side has room", () => {
    const row = { top: 110, left: 16, width: 358, height: 640 };
    const p = placeMenu({ row, menu, viewport });
    expect(p.rowShift).toBeLessThan(0);
    expect(p.menuTop + menu.height).toBeLessThanOrEqual(viewport.height);
    expect(row.top + p.rowShift).toBeGreaterThanOrEqual(0);
  });
  it("pins the menu to the bottom for a row taller than the screen", () => {
    const row = { top: 0, left: 16, width: 358, height: 900 };
    const p = placeMenu({ row, menu, viewport });
    expect(p.menuTop + menu.height).toBeLessThanOrEqual(viewport.height);
    expect(p.rowShift).toBe(0);
  });
  it("keeps the menu on screen for a narrow row at the left edge", () => {
    const row = { top: 200, left: 0, width: 100, height: 60 };
    expect(placeMenu({ row, menu, viewport }).menuLeft).toBe(12);
  });
});

describe("shortLabel", () => {
  it("collapses space and cuts long text", () => {
    expect(shortLabel("  a   b ")).toBe("a b");
    expect(shortLabel("x".repeat(100), 10)).toHaveLength(10);
    expect(shortLabel("x".repeat(100), 10).endsWith("…")).toBe(true);
    expect(shortLabel(null)).toBe("");
  });
});
