import { describe, it, expect, vi, afterEach } from "vitest";
import {
  classifyNavigation,
  scrollTargetFor,
  createScrollMemory,
  isPushed,
  runNavTransition,
  skipNextTransition,
  PARENT_OF,
} from "../navMotion.js";

describe("classifyNavigation", () => {
  it("is none when the path does not change", () => {
    expect(classifyNavigation("/journey", "/journey")).toBe("none");
    expect(classifyNavigation(undefined, "/")).toBe("none");
  });
  it("pushes to every pushed screen", () => {
    for (const to of ["/checkin", "/settings", "/framework", "/sources", "/welcome/rate", "/welcome/focus"]) {
      expect(isPushed(to)).toBe(true);
    }
    expect(classifyNavigation("/", "/checkin")).toBe("push");
    expect(classifyNavigation("/", "/settings")).toBe("push");
    expect(classifyNavigation("/practices", "/framework")).toBe("push");
    expect(classifyNavigation("/practices", "/sources")).toBe("push");
    expect(classifyNavigation("/welcome", "/welcome/rate")).toBe("push");
    expect(classifyNavigation("/welcome/rate", "/welcome/focus")).toBe("push");
  });
  it("pops back to the parent or to any non-pushed screen", () => {
    for (const [from, to] of Object.entries(PARENT_OF)) expect(classifyNavigation(from, to)).toBe("pop");
    expect(classifyNavigation("/checkin", "/journey")).toBe("pop");
    expect(classifyNavigation("/settings", "/welcome")).toBe("pop");
  });
  it("cross-fades between tab screens", () => {
    expect(classifyNavigation("/", "/journey")).toBe("tab");
    expect(classifyNavigation("/assess", "/practices")).toBe("tab");
    expect(classifyNavigation("/welcome", "/")).toBe("tab");
  });
  it("treats pushed screen to pushed screen as a push", () => {
    expect(classifyNavigation("/checkin", "/settings")).toBe("push");
  });
});

describe("scrollTargetFor", () => {
  it("starts pushed screens at the top", () => {
    expect(scrollTargetFor("push", "/checkin", { "/checkin": 300 })).toBe(0);
    expect(scrollTargetFor("pop", "/settings", { "/settings": 300 })).toBe(0);
  });
  it("restores a saved offset for tabs and parents", () => {
    expect(scrollTargetFor("tab", "/journey", { "/journey": 420 })).toBe(420);
    expect(scrollTargetFor("pop", "/practices", { "/practices": 90 })).toBe(90);
  });
  it("falls back to the top", () => {
    expect(scrollTargetFor("tab", "/assess", {})).toBe(0);
    expect(scrollTargetFor("tab", "/assess", { "/assess": NaN })).toBe(0);
  });
});

describe("createScrollMemory", () => {
  it("records, rounds, clamps and forgets", () => {
    const m = createScrollMemory();
    expect(m.get("/")).toBe(0);
    m.record("/", 120.6);
    m.record("/journey", -5);
    m.record("/assess", NaN);
    expect(m.get("/")).toBe(121);
    expect(m.get("/journey")).toBe(0);
    expect(m.all()).not.toHaveProperty("/assess");
    m.forget("/");
    expect(m.get("/")).toBe(0);
  });
});

describe("runNavTransition", () => {
  afterEach(() => {
    delete document.startViewTransition;
    delete document.documentElement.dataset.nav;
    vi.unstubAllGlobals();
  });

  it("does nothing without the View Transitions API", () => {
    const update = vi.fn();
    expect(runNavTransition("push", update)).toBe(false);
    expect(update).not.toHaveBeenCalled();
  });

  it("runs the update inside a transition and tags the root while it runs", async () => {
    let finish;
    const finished = new Promise((r) => (finish = r));
    document.startViewTransition = vi.fn((cb) => {
      cb();
      return { finished };
    });
    const update = vi.fn();
    expect(runNavTransition("pop", update)).toBe(true);
    expect(update).toHaveBeenCalledTimes(1);
    expect(document.documentElement.dataset.nav).toBe("pop");
    finish();
    await finished;
    await Promise.resolve();
    expect(document.documentElement.dataset.nav).toBeUndefined();
  });

  it("skips under reduced motion, for none, and after skipNextTransition", () => {
    document.startViewTransition = vi.fn((cb) => (cb(), { finished: Promise.resolve() }));
    vi.stubGlobal("matchMedia", (q) => ({ matches: q.includes("reduce"), addEventListener() {}, removeEventListener() {} }));
    expect(runNavTransition("push", vi.fn())).toBe(false);
    vi.unstubAllGlobals();
    expect(runNavTransition("none", vi.fn())).toBe(false);
    skipNextTransition();
    expect(runNavTransition("push", vi.fn())).toBe(false);
    expect(runNavTransition("push", vi.fn())).toBe(true);
    expect(document.startViewTransition).toHaveBeenCalledTimes(1);
  });
});
