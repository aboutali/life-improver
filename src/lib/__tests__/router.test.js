import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useRoute, normalisePath } from "../router.js";

// Setting the hash queues a hashchange; let it fire before the test mounts anything.
beforeEach(async () => {
  window.location.hash = "";
  await new Promise((r) => setTimeout(r, 0));
});

describe("normalisePath", () => {
  it("keeps known paths and maps the rest to Today", () => {
    expect(normalisePath("/journey")).toBe("/journey");
    expect(normalisePath("/nowhere")).toBe("/");
  });
});

describe("useRoute", () => {
  it("replaces an unknown hash with #/ and reports the Today path", async () => {
    window.location.hash = "#/nowhere";
    const { result } = renderHook(() => useRoute());
    expect(result.current.path).toBe("/");
    await waitFor(() => expect(window.location.hash).toBe("#/"));
  });

  it("navigate pushes by default and replaces on request", async () => {
    const { result } = renderHook(() => useRoute());
    const before = window.history.length;
    act(() => result.current.navigate("/journey"));
    await waitFor(() => expect(result.current.path).toBe("/journey"));
    expect(window.history.length).toBe(before + 1);

    act(() => result.current.navigate("/settings", { replace: true }));
    await waitFor(() => expect(result.current.path).toBe("/settings"));
    expect(window.history.length).toBe(before + 1);
    expect(window.location.hash).toBe("#/settings");
  });

  it("bumps focusKey on a hashchange, but not for a quiet redirect", async () => {
    const { result } = renderHook(() => useRoute());
    expect(result.current.focusKey).toBe(0);
    act(() => result.current.navigate("/journey"));
    await waitFor(() => expect(result.current.focusKey).toBe(1));
    act(() => result.current.navigate("/welcome", { replace: true, quiet: true }));
    await waitFor(() => expect(result.current.path).toBe("/welcome"));
    expect(result.current.focusKey).toBe(1);
  });
});

import { parseQuery, normalisePath as np2 } from "../router.js";

describe("router query and welcome steps", () => {
  it("parses hash query parameters", () => {
    expect(parseQuery("#/practices?d=1&s=2")).toEqual({ d: "1", s: "2" });
    expect(parseQuery("#/practices")).toEqual({});
  });
  it("keeps welcome sub-steps", () => {
    expect(np2("/welcome/rate")).toBe("/welcome/rate");
    expect(np2("/welcome/focus")).toBe("/welcome/focus");
    expect(np2("/welcome/other")).toBe("/");
  });
});

import { vi } from "vitest";

describe("useRoute motion and scroll memory", () => {
  let scrollTo;
  let y;
  beforeEach(() => {
    y = 0;
    scrollTo = vi.fn((opts) => {
      y = opts.top;
    });
    window.scrollTo = scrollTo;
    Object.defineProperty(window, "scrollY", { configurable: true, get: () => y });
  });
  afterEach(() => {
    delete document.startViewTransition;
    delete document.documentElement.dataset.nav;
    delete window.scrollTo;
    delete window.scrollY;
  });

  it("applies the route inside a view transition, classified as push", async () => {
    const kinds = [];
    document.startViewTransition = vi.fn((cb) => {
      kinds.push(document.documentElement.dataset.nav);
      cb();
      return { finished: Promise.resolve() };
    });
    const { result } = renderHook(() => useRoute());
    act(() => result.current.navigate("/checkin"));
    await waitFor(() => expect(result.current.path).toBe("/checkin"));
    expect(kinds).toEqual(["push"]);
    act(() => result.current.navigate("/"));
    await waitFor(() => expect(result.current.path).toBe("/"));
    expect(kinds).toEqual(["push", "pop"]);
  });

  it("remembers each tab's scroll, restores it, and starts pushed screens at the top", async () => {
    const { result } = renderHook(() => useRoute());
    y = 480;
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });
    act(() => result.current.navigate("/journey"));
    await waitFor(() => expect(result.current.path).toBe("/journey"));
    expect(y).toBe(0);
    y = 150;
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });
    act(() => result.current.navigate("/"));
    await waitFor(() => expect(result.current.path).toBe("/"));
    expect(y).toBe(480);
    act(() => result.current.navigate("/settings"));
    await waitFor(() => expect(result.current.path).toBe("/settings"));
    expect(y).toBe(0);
    act(() => result.current.navigate("/"));
    await waitFor(() => expect(result.current.path).toBe("/"));
    expect(y).toBe(480);
  });
});
