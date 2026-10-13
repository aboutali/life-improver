import { describe, it, expect, vi, afterEach } from "vitest";
import { copyText } from "../clipboard.js";

afterEach(() => {
  vi.restoreAllMocks();
  delete navigator.clipboard;
  delete document.execCommand;
});

describe("copyText", () => {
  it("uses the async clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue();
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    expect(await copyText("hello")).toBe(true);
    expect(writeText).toHaveBeenCalledWith("hello");
  });
  it("falls back to a textarea when the clipboard is missing", async () => {
    document.execCommand = vi.fn().mockReturnValue(true);
    expect(await copyText("hi")).toBe(true);
    expect(document.execCommand).toHaveBeenCalledWith("copy");
    expect(document.querySelector("textarea")).toBeNull();
  });
  it("falls back when the clipboard rejects, and reports failure", async () => {
    Object.defineProperty(navigator, "clipboard", { value: { writeText: vi.fn().mockRejectedValue(new Error("no")) }, configurable: true });
    document.execCommand = vi.fn().mockReturnValue(false);
    expect(await copyText("x")).toBe(false);
  });
});
