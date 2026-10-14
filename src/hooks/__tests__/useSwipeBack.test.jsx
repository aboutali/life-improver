import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";
import { useRef } from "react";
import { useSwipeBack } from "../useSwipeBack.js";

function Harness({ enabled = true, path = "/checkin", onBack }) {
  const ref = useRef(null);
  useSwipeBack({ enabled, path, targetRef: ref, onBack });
  return <main ref={ref} data-testid="main" />;
}

function touch(type, x, y, t) {
  const e = new Event(type, { bubbles: true, cancelable: true });
  e.touches = type === "touchend" ? [] : [{ clientX: x, clientY: y }];
  Object.defineProperty(e, "timeStamp", { value: t });
  document.dispatchEvent(e);
  return e;
}

describe("useSwipeBack", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.matchMedia = (q) => ({ matches: q.includes("standalone"), addEventListener() {}, removeEventListener() {} });
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 400 });
  });
  afterEach(() => {
    vi.useRealTimers();
    delete window.matchMedia;
  });

  it("drags the page and goes back past 35% of the width", () => {
    const onBack = vi.fn();
    const { getByTestId } = render(<Harness onBack={onBack} />);
    const main = getByTestId("main");
    touch("touchstart", 5, 300, 0);
    touch("touchmove", 30, 304, 20);
    const move = touch("touchmove", 180, 306, 400);
    expect(move.defaultPrevented).toBe(true);
    expect(main.style.transform).toBe("translateX(175px)");
    expect(main).toHaveClass("is-swiping");
    touch("touchend", 0, 0, 420);
    act(() => vi.advanceTimersByTime(300));
    expect(main.style.transform).toBe("translateX(400px)");
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("springs back on a short slow drag", () => {
    const onBack = vi.fn();
    const { getByTestId } = render(<Harness onBack={onBack} />);
    const main = getByTestId("main");
    touch("touchstart", 5, 300, 0);
    touch("touchmove", 40, 300, 500);
    touch("touchmove", 70, 300, 1000);
    touch("touchend", 0, 0, 1010);
    act(() => vi.advanceTimersByTime(400));
    expect(onBack).not.toHaveBeenCalled();
    expect(main.style.transform).toBe("");
    expect(main).not.toHaveClass("is-swiping");
  });

  it("ignores touches that start away from the edge, vertical moves, and browser tabs", () => {
    const onBack = vi.fn();
    const { getByTestId, unmount } = render(<Harness onBack={onBack} />);
    const main = getByTestId("main");
    touch("touchstart", 80, 300, 0);
    touch("touchmove", 300, 300, 50);
    touch("touchend", 0, 0, 60);
    touch("touchstart", 5, 300, 100);
    const v = touch("touchmove", 8, 340, 120);
    touch("touchmove", 300, 345, 140);
    touch("touchend", 0, 0, 150);
    expect(v.defaultPrevented).toBe(false);
    act(() => vi.advanceTimersByTime(400));
    expect(main.style.transform).toBe("");
    expect(onBack).not.toHaveBeenCalled();
    unmount();

    window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
    render(<Harness onBack={onBack} />);
    touch("touchstart", 5, 300, 0);
    const m = touch("touchmove", 200, 300, 50);
    expect(m.defaultPrevented).toBe(false);
  });

  it("does nothing when disabled (a tab screen)", () => {
    const onBack = vi.fn();
    const { getByTestId } = render(<Harness enabled={false} onBack={onBack} />);
    touch("touchstart", 5, 300, 0);
    const m = touch("touchmove", 250, 300, 50);
    touch("touchend", 0, 0, 60);
    expect(m.defaultPrevented).toBe(false);
    expect(getByTestId("main").style.transform).toBe("");
    expect(onBack).not.toHaveBeenCalled();
  });
});
