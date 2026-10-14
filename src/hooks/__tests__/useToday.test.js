import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useToday } from "../useToday.js";

describe("useToday timer", () => {
  it("re-checks the date every 60 seconds", () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date(2026, 9, 7, 23, 59, 30));
      const { result } = renderHook(() => useToday());
      expect(result.current).toBe("2026-10-07");
      act(() => {
        vi.advanceTimersByTime(60 * 1000); // clock moves past midnight
      });
      expect(result.current).toBe("2026-10-08");
    } finally {
      vi.useRealTimers();
    }
  });

  it("clears the timer on unmount", () => {
    vi.useFakeTimers();
    try {
      const { unmount } = renderHook(() => useToday());
      expect(vi.getTimerCount()).toBe(1);
      unmount();
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
