import { describe, it, expect, beforeEach } from "vitest";
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
