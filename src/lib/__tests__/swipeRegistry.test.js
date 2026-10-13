import { describe, it, expect, vi } from "vitest";
import { closeSwipeRows, openRowId, registerOpenRow, unregisterRow } from "../swipeRegistry.js";

describe("swipeRegistry", () => {
  it("closes the previous row when another opens", () => {
    const a = vi.fn();
    const b = vi.fn();
    registerOpenRow("a", a);
    registerOpenRow("b", b);
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).not.toHaveBeenCalled();
    expect(openRowId()).toBe("b");
    closeSwipeRows();
    expect(b).toHaveBeenCalledTimes(1);
    expect(openRowId()).toBeNull();
  });
  it("forgets a row that unmounts", () => {
    const a = vi.fn();
    registerOpenRow("a", a);
    unregisterRow("a");
    closeSwipeRows();
    expect(a).not.toHaveBeenCalled();
  });
  it("does not close a row that re-registers itself", () => {
    const a = vi.fn();
    registerOpenRow("a", a);
    registerOpenRow("a", a);
    expect(a).not.toHaveBeenCalled();
    unregisterRow("a");
  });
});
