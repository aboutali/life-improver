import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
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
