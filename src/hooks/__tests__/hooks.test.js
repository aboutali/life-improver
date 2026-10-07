import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePersistentState } from "../usePersistentState.js";
import { useToday } from "../useToday.js";
import { vi } from "vitest";
import { useQuickScores } from "../useQuickScores.js";
import { useFocus } from "../useFocus.js";
import { useCheckins } from "../useCheckins.js";
import { useScores } from "../useScores.js";
import { KEYS } from "../../lib/storage.js";

const stored = (key) => JSON.parse(localStorage.getItem(key));

describe("useQuickScores", () => {
  it("starts empty", () => {
    const { result } = renderHook(() => useQuickScores());
    expect(result.current.quick).toEqual({});
  });

  it("sets scores by domain id and persists them", () => {
    const { result } = renderHook(() => useQuickScores());
    act(() => result.current.setQuick(1, 4));
    act(() => result.current.setQuick(3, 8));
    act(() => result.current.setQuick(1, 6));
    expect(result.current.quick).toEqual({ 1: 6, 3: 8 });
    expect(stored(KEYS.quick)).toEqual({ 1: 6, 3: 8 });
  });

  it("loads stored values and resets", () => {
    localStorage.setItem(KEYS.quick, JSON.stringify({ 2: 5 }));
    const { result } = renderHook(() => useQuickScores());
    expect(result.current.quick).toEqual({ 2: 5 });
    act(() => result.current.reset());
    expect(result.current.quick).toEqual({});
    expect(stored(KEYS.quick)).toEqual({});
  });
});

describe("useFocus", () => {
  const focus = { domainId: 1, subIndex: 0, practiceIndex: 3, startedAt: "2026-10-07", skipped: [] };

  it("starts null", () => {
    const { result } = renderHook(() => useFocus());
    expect(result.current.focus).toBeNull();
  });

  it("sets, persists and clears the focus", () => {
    const { result } = renderHook(() => useFocus());
    act(() => result.current.setFocus(focus));
    expect(result.current.focus).toEqual(focus);
    expect(stored(KEYS.focus)).toEqual(focus);
    act(() => result.current.clearFocus());
    expect(result.current.focus).toBeNull();
    expect(stored(KEYS.focus)).toBeNull();
  });

  it("loads a stored focus", () => {
    localStorage.setItem(KEYS.focus, JSON.stringify(focus));
    const { result } = renderHook(() => useFocus());
    expect(result.current.focus).toEqual(focus);
  });
});

describe("useCheckins", () => {
  const make = (id, extra = {}) => ({
    id,
    date: "2026-10-07",
    week: "2026-W41",
    domainId: 1,
    subIndex: 0,
    practiceIndex: 0,
    practised: "yes",
    score: 6,
    note: "",
    ...extra,
  });

  it("starts empty", () => {
    const { result } = renderHook(() => useCheckins());
    expect(result.current.checkins).toEqual([]);
  });

  it("appends check-ins oldest first and persists", () => {
    const { result } = renderHook(() => useCheckins());
    act(() => result.current.addCheckin(make("a")));
    act(() => result.current.addCheckin(make("b")));
    expect(result.current.checkins.map((c) => c.id)).toEqual(["a", "b"]);
    expect(stored(KEYS.checkins).map((c) => c.id)).toEqual(["a", "b"]);
  });

  it("caps the note at 500 characters", () => {
    const { result } = renderHook(() => useCheckins());
    act(() => result.current.addCheckin(make("a", { note: "x".repeat(800) })));
    expect(result.current.checkins[0].note).toHaveLength(500);
  });

  it("keeps a short note whole and tolerates a missing note", () => {
    const { result } = renderHook(() => useCheckins());
    act(() => result.current.addCheckin(make("a", { note: "short" })));
    act(() => result.current.addCheckin({ ...make("b"), note: undefined }));
    expect(result.current.checkins[0].note).toBe("short");
    expect(result.current.checkins[1].note).toBe("");
  });

  it("appends several check-ins added in the same tick", () => {
    const { result } = renderHook(() => useCheckins());
    act(() => {
      result.current.addCheckin(make("a"));
      result.current.addCheckin(make("b"));
    });
    expect(result.current.checkins).toHaveLength(2);
  });

  it("resets", () => {
    localStorage.setItem(KEYS.checkins, JSON.stringify([make("a")]));
    const { result } = renderHook(() => useCheckins());
    expect(result.current.checkins).toHaveLength(1);
    act(() => result.current.reset());
    expect(result.current.checkins).toEqual([]);
  });
});

describe("useScores", () => {
  it("still persists under the unchanged v1 key", () => {
    const { result } = renderHook(() => useScores());
    act(() => result.current.set(1, 0, 7));
    expect(stored("life-improver:scores:v1")).toEqual({ "1-0": 7 });
    expect(result.current.get(1, 0)).toBe(7);
  });
});

describe("sanitizing stored values", () => {
  const validCheckin = {
    id: "a", date: "2026-10-07", week: "2026-W41", domainId: 1, subIndex: 0,
    practiceIndex: 0, practised: "yes", score: 6, note: "ok",
  };

  it("usePersistentState uses the sanitized value and backs up the raw text once", () => {
    const sanitize = (v) => (isPlain(v) ? Object.fromEntries(Object.entries(v).filter(([, n]) => n > 0)) : undefined);
    const isPlain = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
    const raw = JSON.stringify({ a: 1, b: -1 });
    localStorage.setItem("k", raw);
    const { result } = renderHook(() => usePersistentState("k", {}, sanitize));
    expect(result.current[0]).toEqual({ a: 1 });
    expect(localStorage.getItem("k:bad")).toBe(raw);
    // A later bad value does not overwrite the first backup.
    localStorage.setItem("k", JSON.stringify({ c: -5 }));
    renderHook(() => usePersistentState("k", {}, sanitize));
    expect(localStorage.getItem("k:bad")).toBe(raw);
  });

  it("falls back to initial when sanitize returns undefined, and backs up", () => {
    localStorage.setItem("k", JSON.stringify([1]));
    const { result } = renderHook(() => usePersistentState("k", {}, () => undefined));
    expect(result.current[0]).toEqual({});
    expect(localStorage.getItem("k:bad")).toBe("[1]");
  });

  it("writes no backup when the value is already clean", () => {
    localStorage.setItem("k", JSON.stringify({ a: 1 }));
    renderHook(() => usePersistentState("k", {}, (v) => v));
    expect(localStorage.getItem("k:bad")).toBeNull();
  });

  it("scores and quick drop only the bad entries", () => {
    localStorage.setItem(KEYS.scores, JSON.stringify({ "1-0": 7, "1-1": 11, "1-2": 5.5, "1-3": "4" }));
    localStorage.setItem(KEYS.quick, JSON.stringify({ 1: 4, 2: 0, 3: 42 }));
    expect(renderHook(() => useScores()).result.current.scores).toEqual({ "1-0": 7 });
    expect(renderHook(() => useQuickScores()).result.current.quick).toEqual({ 1: 4 });
    expect(localStorage.getItem(`${KEYS.scores}:bad`)).not.toBeNull();
  });

  it("scores and quick ignore a stored value of the wrong shape", () => {
    localStorage.setItem(KEYS.scores, JSON.stringify([1, 2]));
    localStorage.setItem(KEYS.quick, JSON.stringify("x"));
    expect(renderHook(() => useScores()).result.current.scores).toEqual({});
    expect(renderHook(() => useQuickScores()).result.current.quick).toEqual({});
  });

  it("focus keeps a valid object, coerces skipped, and rejects junk", () => {
    localStorage.setItem(KEYS.focus, JSON.stringify("oops"));
    expect(renderHook(() => useFocus()).result.current.focus).toBeNull();
    localStorage.setItem(KEYS.focus, JSON.stringify({ domainId: "1", subIndex: 0, practiceIndex: 0 }));
    expect(renderHook(() => useFocus()).result.current.focus).toBeNull();
    localStorage.setItem(KEYS.focus, JSON.stringify({ domainId: 1, subIndex: -1, practiceIndex: 0 }));
    expect(renderHook(() => useFocus()).result.current.focus).toBeNull();
    const ok = { domainId: 1, subIndex: 0, practiceIndex: 2 };
    localStorage.setItem(KEYS.focus, JSON.stringify(ok));
    expect(renderHook(() => useFocus()).result.current.focus).toEqual({ ...ok, skipped: [] });
    localStorage.setItem(KEYS.focus, JSON.stringify({ ...ok, skipped: 3 }));
    expect(renderHook(() => useFocus()).result.current.focus.skipped).toEqual([]);
    localStorage.setItem(KEYS.focus, JSON.stringify({ ...ok, skipped: [1, "x", -2, 4.5, 6] }));
    expect(renderHook(() => useFocus()).result.current.focus.skipped).toEqual([1, 6]);
  });

  it("checkins keep only valid entries", () => {
    localStorage.setItem(KEYS.checkins, JSON.stringify({ a: 1 }));
    expect(renderHook(() => useCheckins()).result.current.checkins).toEqual([]);
    localStorage.setItem(KEYS.checkins, JSON.stringify([1, 2]));
    expect(renderHook(() => useCheckins()).result.current.checkins).toEqual([]);
    localStorage.setItem(KEYS.checkins, JSON.stringify([{ id: 1, date: 5 }]));
    expect(renderHook(() => useCheckins()).result.current.checkins).toEqual([]);
    localStorage.setItem(KEYS.checkins, JSON.stringify([validCheckin, null, {}]));
    expect(renderHook(() => useCheckins()).result.current.checkins).toEqual([validCheckin]);
  });
});

describe("useToday", () => {
  it("returns the local date and refreshes on focus and visibility", () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date(2026, 9, 7, 23, 50));
      const { result } = renderHook(() => useToday());
      expect(result.current).toBe("2026-10-07");
      vi.setSystemTime(new Date(2026, 9, 8, 7, 0));
      act(() => {
        window.dispatchEvent(new Event("focus"));
      });
      expect(result.current).toBe("2026-10-08");
      vi.setSystemTime(new Date(2026, 9, 9, 7, 0));
      act(() => {
        document.dispatchEvent(new Event("visibilitychange"));
      });
      expect(result.current).toBe("2026-10-09");
    } finally {
      vi.useRealTimers();
    }
  });
});
