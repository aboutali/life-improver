import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { setNotice, clearNotice, getNotice, useNotice, restoredText, finishRestore } from "../notice.js";

beforeEach(() => sessionStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("notice", () => {
  it("stores text in sessionStorage and tells the page", () => {
    const heard = vi.fn();
    window.addEventListener("life-improver:notice", heard);
    setNotice("Hello.");
    expect(sessionStorage.getItem("life-improver:notice")).toBe("Hello.");
    expect(getNotice()).toBe("Hello.");
    expect(heard).toHaveBeenCalledTimes(1);
    clearNotice();
    expect(getNotice()).toBeNull();
    window.removeEventListener("life-improver:notice", heard);
  });

  it("useNotice follows set and clear", () => {
    const { result } = renderHook(() => useNotice());
    expect(result.current).toBeNull();
    act(() => setNotice("Saved."));
    expect(result.current).toBe("Saved.");
    act(() => clearNotice());
    expect(result.current).toBeNull();
  });

  it("reads a notice left before a reload", () => {
    sessionStorage.setItem("life-improver:notice", "From before.");
    const { result } = renderHook(() => useNotice());
    expect(result.current).toBe("From before.");
  });

  it("falls back to memory when sessionStorage is blocked", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    setNotice("In memory.");
    expect(getNotice()).toBe("In memory.");
  });

  it("words a restore, singular for one", () => {
    expect(restoredText(0)).toBe("Restored 0 check-ins.");
    expect(restoredText(1)).toBe("Restored 1 check-in.");
    expect(restoredText(5)).toBe("Restored 5 check-ins.");
  });

  it("finishRestore sets the notice, goes to Today and reloads", () => {
    const real = window.location;
    const replace = vi.fn();
    const reload = vi.fn();
    Object.defineProperty(window, "location", { configurable: true, value: { ...real, replace, reload } });
    finishRestore(3);
    Object.defineProperty(window, "location", { configurable: true, value: real });
    expect(getNotice()).toBe("Restored 3 check-ins.");
    expect(replace).toHaveBeenCalledWith("#/");
    expect(reload).toHaveBeenCalled();
  });
});
