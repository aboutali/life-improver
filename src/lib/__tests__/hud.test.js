import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { HUD_MS, dismissHud, getHud, registerHudHost, showHud, subscribeHud } from "../hud.js";

beforeEach(() => {
  vi.useFakeTimers();
  dismissHud();
  registerHudHost(null);
});
afterEach(() => {
  dismissHud();
  vi.useRealTimers();
});

describe("hud store", () => {
  it("shows a message with a check icon, then clears it after 1.6 seconds", () => {
    showHud("Focus set");
    expect(getHud()).toMatchObject({ text: "Focus set", icon: "check" });
    vi.advanceTimersByTime(HUD_MS - 1);
    expect(getHud()).not.toBeNull();
    vi.advanceTimersByTime(1);
    expect(getHud()).toBeNull();
  });

  it("lets a newer message replace the old one and restart the clock", () => {
    showHud("New practice");
    const first = getHud().id;
    vi.advanceTimersByTime(1000);
    showHud("Copy saved", { icon: "info" });
    expect(getHud()).toMatchObject({ text: "Copy saved", icon: "info" });
    expect(getHud().id).not.toBe(first);
    vi.advanceTimersByTime(1000);
    expect(getHud()).not.toBeNull();
    vi.advanceTimersByTime(HUD_MS);
    expect(getHud()).toBeNull();
  });

  it("ignores empty text", () => {
    showHud("   ");
    expect(getHud()).toBeNull();
  });

  it("tells subscribers, and the host hook runs on each call", () => {
    const mount = vi.fn();
    const seen = vi.fn();
    registerHudHost(mount);
    const off = subscribeHud(seen);
    showHud("Added to calendar");
    expect(mount).toHaveBeenCalledTimes(1);
    expect(seen).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(HUD_MS);
    expect(seen).toHaveBeenCalledTimes(2);
    off();
    showHud("Again");
    expect(seen).toHaveBeenCalledTimes(2);
  });
});
