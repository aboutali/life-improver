import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ShareButton from "../ShareButton.jsx";
import { drawShareCard } from "../../lib/shareCard.js";

const domains = [
  { name: "Body", avg: 4.5 },
  { name: "Mind", avg: null },
  { name: "Work", avg: 8 },
];

function makeCtx() {
  return new Proxy(
    { measureText: (t) => ({ width: String(t).length * 10 }), calls: [] },
    {
      get(target, prop) {
        if (prop in target) return target[prop];
        return (...args) => target.calls.push([prop, ...args]);
      },
      set(target, prop, value) {
        target[prop] = value;
        return true;
      },
    }
  );
}

let ctx;
beforeEach(() => {
  ctx = makeCtx();
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ctx);
  HTMLCanvasElement.prototype.toBlob = vi.fn((cb) => cb(new Blob(["png"], { type: "image/png" })));
  URL.createObjectURL = vi.fn(() => "blob:card");
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
  delete navigator.share;
  delete navigator.canShare;
});

describe("drawShareCard", () => {
  it("draws a 1080x1350 card with the footer line", async () => {
    const canvas = document.createElement("canvas");
    const ok = await drawShareCard(canvas, { domains, overall: "5.8", hideScores: false, date: "Oct 7, 2026" });
    expect(ok).toBe(true);
    expect(canvas.width).toBe(1080);
    expect(canvas.height).toBe(1350);
    const texts = ctx.calls.filter((c) => c[0] === "fillText").map((c) => c[1]);
    expect(texts).toContain("My seven grounds");
    expect(texts).toContain("5.8");
    expect(texts).toContain("4.5");
    expect(texts).toContain("Before you arrange the stones, first see the whole garden.");
  });

  it("omits numbers when scores are hidden", async () => {
    const canvas = document.createElement("canvas");
    await drawShareCard(canvas, { domains, overall: "5.8", hideScores: true, date: "Oct 7, 2026" });
    const texts = ctx.calls.filter((c) => c[0] === "fillText").map((c) => c[1]);
    expect(texts).not.toContain("5.8");
    expect(texts).not.toContain("4.5");
    expect(texts).toContain("Body");
  });

  it("returns false when the canvas has no 2D context", async () => {
    HTMLCanvasElement.prototype.getContext = vi.fn(() => null);
    const ok = await drawShareCard(document.createElement("canvas"), { domains, hideScores: true, date: "" });
    expect(ok).toBe(false);
  });
});

describe("ShareButton", () => {
  it("hides numbers by default and can toggle", async () => {
    const user = userEvent.setup();
    render(<ShareButton domains={domains} overall="5.8" />);
    const box = screen.getByRole("checkbox", { name: "Hide numbers" });
    expect(box).toBeChecked();
    await user.click(box);
    expect(box).not.toBeChecked();
  });

  it("downloads a PNG when the share sheet cannot take files", async () => {
    const user = userEvent.setup();
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    render(<ShareButton domains={domains} overall="5.8" />);
    await user.click(screen.getByRole("button", { name: "Share image" }));
    await waitFor(() => expect(click).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/saved to your downloads/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Share image" })).toBeEnabled();
  });

  it("uses navigator.share with a file when available and swallows AbortError", async () => {
    const user = userEvent.setup();
    navigator.canShare = vi.fn(() => true);
    navigator.share = vi.fn().mockRejectedValue(Object.assign(new Error("cancelled"), { name: "AbortError" }));
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    render(<ShareButton domains={domains} overall="5.8" />);
    await user.click(screen.getByRole("button", { name: "Share image" }));
    await waitFor(() => expect(navigator.share).toHaveBeenCalled());
    const arg = navigator.share.mock.calls[0][0];
    expect(arg.title).toBe("Life Improver");
    expect(arg.files[0].name).toMatch(/^life-improver-\d{4}-\d{2}-\d{2}\.png$/);
    await waitFor(() => expect(screen.getByRole("button", { name: "Share image" })).toBeEnabled());
    expect(click).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeEmptyDOMElement();
  });

  it("reports a failure inline when no canvas context exists", async () => {
    const user = userEvent.setup();
    HTMLCanvasElement.prototype.getContext = vi.fn(() => null);
    render(<ShareButton domains={domains} overall="5.8" />);
    await user.click(screen.getByRole("button", { name: "Share image" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/cannot draw/i));
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("keeps both live regions mounted from the start", () => {
    render(<ShareButton domains={domains} overall="5.8" />);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(screen.getByRole("alert")).toBeEmptyDOMElement();
  });
});
